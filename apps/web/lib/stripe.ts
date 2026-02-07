import Stripe from "stripe";

// Initialize Stripe
export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  // @ts-expect-error - Using latest Stripe API version
  apiVersion: "2024-12-18.acacia",
  typescript: true,
});

// Subscription tier configuration
export const subscriptionTiers = {
  FREE: {
    name: "Free",
    price: 0,
    credits: 50,
    features: [
      "50 credits per month",
      "Basic image generation",
      "Standard quality",
      "Community support",
    ],
  },
  BASIC: {
    name: "Basic",
    price: 12,
    priceId: process.env.STRIPE_BASIC_PRICE_ID,
    credits: 300,
    features: [
      "300 credits per month",
      "All image generation models",
      "Image enhancement",
      "Priority queue",
      "Email support",
    ],
  },
  PRO: {
    name: "Pro",
    price: 36,
    priceId: process.env.STRIPE_PRO_PRICE_ID,
    credits: 1500,
    features: [
      "1,500 credits per month",
      "All features",
      "Real-time canvas",
      "Video generation",
      "Model training",
      "Priority support",
    ],
  },
  MAX: {
    name: "Max",
    price: 60,
    priceId: process.env.STRIPE_MAX_PRICE_ID,
    credits: 5000,
    features: [
      "5,000 credits per month",
      "All Pro features",
      "3D generation",
      "API access",
      "Custom models",
      "Dedicated support",
    ],
  },
};

export type SubscriptionTier = keyof typeof subscriptionTiers;

// Create a checkout session
export async function createCheckoutSession({
  userId,
  email,
  tier,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  email: string;
  tier: SubscriptionTier;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ sessionId: string; url: string }> {
  const tierConfig = subscriptionTiers[tier] as typeof subscriptionTiers.BASIC;

  if (!tierConfig.priceId) {
    throw new Error(`No price ID configured for tier: ${tier}`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: email,
    client_reference_id: userId,
    line_items: [
      {
        price: tierConfig.priceId!,
        quantity: 1,
      },
    ],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      tier,
    },
    subscription_data: {
      metadata: {
        userId,
        tier,
      },
    },
  });

  return {
    sessionId: session.id,
    url: session.url!,
  };
}

// Create a portal session for managing subscription
export async function createPortalSession({
  customerId,
  returnUrl,
}: {
  customerId: string;
  returnUrl: string;
}): Promise<{ url: string }> {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  });

  return {
    url: session.url,
  };
}

// Get subscription details
export async function getSubscription(subscriptionId: string) {
  return stripe.subscriptions.retrieve(subscriptionId);
}

// Cancel subscription
export async function cancelSubscription(subscriptionId: string) {
  return stripe.subscriptions.cancel(subscriptionId);
}

// Update subscription
export async function updateSubscription(
  subscriptionId: string,
  newPriceId: string
) {
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);

  return stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: subscription.items.data[0].id,
        price: newPriceId,
      },
    ],
    proration_behavior: "always_invoice",
  });
}

// Create or get customer
export async function getOrCreateCustomer({
  userId,
  email,
  name,
}: {
  userId: string;
  email: string;
  name?: string;
}): Promise<string> {
  // Search for existing customer
  const existingCustomers = await stripe.customers.list({
    email,
    limit: 1,
  });

  if (existingCustomers.data.length > 0) {
    return existingCustomers.data[0].id;
  }

  // Create new customer
  const customer = await stripe.customers.create({
    email,
    name: name || undefined,
    metadata: {
      userId,
    },
  });

  return customer.id;
}

// Add credits to user (for one-time purchases)
export async function createCreditsCheckout({
  userId,
  email,
  credits,
  successUrl,
  cancelUrl,
}: {
  userId: string;
  email: string;
  credits: number;
  successUrl: string;
  cancelUrl: string;
}): Promise<{ sessionId: string; url: string }> {
  // Credit packages
  const creditPackages = {
    100: process.env.STRIPE_CREDITS_100_PRICE_ID,
    500: process.env.STRIPE_CREDITS_500_PRICE_ID,
    1000: process.env.STRIPE_CREDITS_1000_PRICE_ID,
  };

  const priceId = creditPackages[credits as keyof typeof creditPackages];
  if (!priceId) {
    throw new Error(`No price ID configured for ${credits} credits`);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    customer_email: email,
    client_reference_id: userId,
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      userId,
      credits: credits.toString(),
      type: "credits",
    },
  });

  return {
    sessionId: session.id,
    url: session.url!,
  };
}

// Webhook event handlers
export interface WebhookHandlers {
  onSubscriptionCreated: (subscription: Stripe.Subscription) => Promise<void>;
  onSubscriptionUpdated: (subscription: Stripe.Subscription) => Promise<void>;
  onSubscriptionDeleted: (subscription: Stripe.Subscription) => Promise<void>;
  onPaymentSucceeded: (session: Stripe.Checkout.Session) => Promise<void>;
  onPaymentFailed: (invoice: Stripe.Invoice) => Promise<void>;
}

export async function handleWebhookEvent(
  event: Stripe.Event,
  handlers: WebhookHandlers
): Promise<void> {
  switch (event.type) {
    case "customer.subscription.created":
      await handlers.onSubscriptionCreated(
        event.data.object as Stripe.Subscription
      );
      break;

    case "customer.subscription.updated":
      await handlers.onSubscriptionUpdated(
        event.data.object as Stripe.Subscription
      );
      break;

    case "customer.subscription.deleted":
      await handlers.onSubscriptionDeleted(
        event.data.object as Stripe.Subscription
      );
      break;

    case "checkout.session.completed":
      await handlers.onPaymentSucceeded(
        event.data.object as Stripe.Checkout.Session
      );
      break;

    case "invoice.payment_failed":
      await handlers.onPaymentFailed(event.data.object as Stripe.Invoice);
      break;
  }
}

// Verify webhook signature
export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  return stripe.webhooks.constructEvent(
    payload,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET!
  );
}
