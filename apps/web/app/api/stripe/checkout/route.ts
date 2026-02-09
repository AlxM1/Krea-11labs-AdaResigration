import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import {
  createCheckoutSession,
  createCreditsCheckout,
  SubscriptionTier,
  subscriptionTiers,
} from "@/lib/stripe";
import { z } from "zod";

const checkoutSchema = z.object({
  tier: z.enum(["BASIC", "PRO", "MAX"]).optional(),
  credits: z.number().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const session = await auth(req);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const validated = checkoutSchema.safeParse(body);

    if (!validated.success) {
      return NextResponse.json(
        { error: "Invalid request", details: validated.error.issues },
        { status: 400 }
      );
    }

    const { tier, credits } = validated.data;

    // Get user info
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        email: true,
        subscriptionTier: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const successUrl = `${baseUrl}/settings?tab=billing`;
    const cancelUrl = `${baseUrl}/pricing`;

    let result;

    if (credits) {
      // One-time credit purchase
      result = await createCreditsCheckout({
        userId: user.id,
        email: user.email!,
        credits,
        successUrl,
        cancelUrl,
      });
    } else if (tier) {
      // Subscription checkout
      if (!subscriptionTiers[tier].priceId) {
        return NextResponse.json(
          { error: "Subscription tier not available" },
          { status: 400 }
        );
      }

      result = await createCheckoutSession({
        userId: user.id,
        email: user.email!,
        tier: tier as SubscriptionTier,
        successUrl,
        cancelUrl,
      });
    } else {
      return NextResponse.json(
        { error: "Must specify tier or credits" },
        { status: 400 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
