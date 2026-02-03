import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  constructWebhookEvent,
  handleWebhookEvent,
  subscriptionTiers,
  SubscriptionTier,
} from "@/lib/stripe";
import Stripe from "stripe";

export async function POST(req: NextRequest) {
  try {
    const payload = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing signature" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = constructWebhookEvent(payload, signature);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    await handleWebhookEvent(event, {
      // Handle new subscription
      onSubscriptionCreated: async (subscription) => {
        const userId = subscription.metadata.userId;
        const tier = subscription.metadata.tier as SubscriptionTier;

        if (!userId || !tier) {
          console.error("Missing userId or tier in subscription metadata");
          return;
        }

        const tierConfig = subscriptionTiers[tier];

        // Update user subscription
        await prisma.user.update({
          where: { id: userId },
          data: {
            subscriptionTier: tier,
            creditsRemaining: tierConfig.credits,
            creditsResetAt: new Date(subscription.current_period_end * 1000),
          },
        });

        // Create subscription record
        await prisma.subscription.create({
          data: {
            userId,
            stripeSubscriptionId: subscription.id,
            stripeCustomerId: subscription.customer as string,
            stripePriceId: subscription.items.data[0].price.id,
            status: subscription.status.toUpperCase(),
            currentPeriodStart: new Date(subscription.current_period_start * 1000),
            currentPeriodEnd: new Date(subscription.current_period_end * 1000),
          },
        });

        console.log(`Subscription created for user ${userId}: ${tier}`);
      },

      // Handle subscription update
      onSubscriptionUpdated: async (subscription) => {
        const userId = subscription.metadata.userId;
        const tier = subscription.metadata.tier as SubscriptionTier;

        if (!userId) {
          // Try to find user by subscription
          const existingSub = await prisma.subscription.findFirst({
            where: { stripeSubscriptionId: subscription.id },
          });
          if (existingSub) {
            await updateSubscriptionRecord(subscription, existingSub.userId, tier);
          }
          return;
        }

        await updateSubscriptionRecord(subscription, userId, tier);
      },

      // Handle subscription cancellation
      onSubscriptionDeleted: async (subscription) => {
        const sub = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId: subscription.id },
        });

        if (sub) {
          // Update subscription status
          await prisma.subscription.update({
            where: { id: sub.id },
            data: {
              status: "CANCELED",
              canceledAt: new Date(),
            },
          });

          // Downgrade user to free tier
          await prisma.user.update({
            where: { id: sub.userId },
            data: {
              subscriptionTier: "FREE",
              creditsRemaining: subscriptionTiers.FREE.credits,
            },
          });

          console.log(`Subscription canceled for user ${sub.userId}`);
        }
      },

      // Handle successful payment (for one-time purchases)
      onPaymentSucceeded: async (session) => {
        const userId = session.client_reference_id;
        const credits = session.metadata?.credits;
        const type = session.metadata?.type;

        if (!userId) return;

        // Handle credit purchase
        if (type === "credits" && credits) {
          await prisma.user.update({
            where: { id: userId },
            data: {
              creditsRemaining: {
                increment: parseInt(credits),
              },
            },
          });

          console.log(`Added ${credits} credits to user ${userId}`);
        }
      },

      // Handle failed payment
      onPaymentFailed: async (invoice) => {
        const subscriptionId = invoice.subscription as string;

        if (subscriptionId) {
          const sub = await prisma.subscription.findFirst({
            where: { stripeSubscriptionId: subscriptionId },
          });

          if (sub) {
            await prisma.subscription.update({
              where: { id: sub.id },
              data: {
                status: "PAST_DUE",
              },
            });

            // Could also send email notification here
            console.log(`Payment failed for user ${sub.userId}`);
          }
        }
      },
    });

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

async function updateSubscriptionRecord(
  subscription: Stripe.Subscription,
  userId: string,
  tier?: SubscriptionTier
) {
  // Update subscription record
  await prisma.subscription.updateMany({
    where: { stripeSubscriptionId: subscription.id },
    data: {
      status: subscription.status.toUpperCase(),
      stripePriceId: subscription.items.data[0].price.id,
      currentPeriodStart: new Date(subscription.current_period_start * 1000),
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
    },
  });

  // Update user if tier changed
  if (tier) {
    const tierConfig = subscriptionTiers[tier];
    await prisma.user.update({
      where: { id: userId },
      data: {
        subscriptionTier: tier,
        creditsResetAt: new Date(subscription.current_period_end * 1000),
      },
    });
  }

  console.log(`Subscription updated for user ${userId}`);
}

// Disable body parsing - we need raw body for signature verification
export const config = {
  api: {
    bodyParser: false,
  },
};
