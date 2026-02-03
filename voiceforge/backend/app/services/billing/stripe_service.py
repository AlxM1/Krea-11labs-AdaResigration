"""
Stripe Billing Service
Handles subscriptions, payments, and credit management
"""
import stripe
from typing import Optional, Dict, List, Any
from datetime import datetime, timedelta
from enum import Enum
import os

from app.core.config import settings


class PlanType(str, Enum):
    FREE = "free"
    STARTER = "starter"
    CREATOR = "creator"
    PRO = "pro"
    SCALE = "scale"
    ENTERPRISE = "enterprise"


# Plan configurations
PLANS = {
    PlanType.FREE: {
        "name": "Free",
        "price_monthly": 0,
        "credits": 10_000,
        "features": [
            "10,000 characters/month",
            "Standard voices",
            "API access",
        ],
        "stripe_price_id": None,
    },
    PlanType.STARTER: {
        "name": "Starter",
        "price_monthly": 5,
        "credits": 30_000,
        "features": [
            "30,000 characters/month",
            "Instant voice cloning",
            "Commercial license",
            "API access",
        ],
        "stripe_price_id": os.environ.get("STRIPE_STARTER_PRICE_ID"),
    },
    PlanType.CREATOR: {
        "name": "Creator",
        "price_monthly": 22,
        "credits": 100_000,
        "features": [
            "100,000 characters/month",
            "Professional voice cloning",
            "192kbps audio quality",
            "Priority support",
        ],
        "stripe_price_id": os.environ.get("STRIPE_CREATOR_PRICE_ID"),
    },
    PlanType.PRO: {
        "name": "Pro",
        "price_monthly": 99,
        "credits": 500_000,
        "features": [
            "500,000 characters/month",
            "44.1kHz PCM audio",
            "Custom voice training",
            "Dedicated support",
        ],
        "stripe_price_id": os.environ.get("STRIPE_PRO_PRICE_ID"),
    },
    PlanType.SCALE: {
        "name": "Scale",
        "price_monthly": 330,
        "credits": 2_000_000,
        "features": [
            "2,000,000 characters/month",
            "Team workspaces",
            "Usage analytics",
            "SLA guarantee",
        ],
        "stripe_price_id": os.environ.get("STRIPE_SCALE_PRICE_ID"),
    },
    PlanType.ENTERPRISE: {
        "name": "Enterprise",
        "price_monthly": None,  # Custom pricing
        "credits": None,  # Custom
        "features": [
            "Custom volume",
            "SSO/SAML",
            "HIPAA compliance",
            "Dedicated infrastructure",
            "24/7 support",
        ],
        "stripe_price_id": None,
    },
}


class StripeService:
    """Stripe billing service"""

    def __init__(self):
        self.api_key = settings.STRIPE_SECRET_KEY
        stripe.api_key = self.api_key

    async def create_customer(
        self,
        user_id: str,
        email: str,
        name: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> str:
        """
        Create a Stripe customer for a user.

        Returns:
            Stripe customer ID
        """
        customer = stripe.Customer.create(
            email=email,
            name=name,
            metadata={
                "user_id": user_id,
                **(metadata or {})
            }
        )
        return customer.id

    async def create_checkout_session(
        self,
        customer_id: str,
        plan: PlanType,
        success_url: str,
        cancel_url: str
    ) -> Dict[str, str]:
        """
        Create a Stripe Checkout session for subscription.

        Returns:
            Dict with session_id and checkout_url
        """
        plan_config = PLANS.get(plan)
        if not plan_config or not plan_config.get("stripe_price_id"):
            raise ValueError(f"Invalid plan or plan not available: {plan}")

        session = stripe.checkout.Session.create(
            customer=customer_id,
            payment_method_types=["card"],
            line_items=[{
                "price": plan_config["stripe_price_id"],
                "quantity": 1,
            }],
            mode="subscription",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata={"plan": plan.value}
        )

        return {
            "session_id": session.id,
            "checkout_url": session.url
        }

    async def create_portal_session(
        self,
        customer_id: str,
        return_url: str
    ) -> str:
        """
        Create a Stripe Customer Portal session for managing subscription.

        Returns:
            Portal URL
        """
        session = stripe.billing_portal.Session.create(
            customer=customer_id,
            return_url=return_url
        )
        return session.url

    async def get_subscription(
        self,
        subscription_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get subscription details"""
        try:
            subscription = stripe.Subscription.retrieve(subscription_id)
            return {
                "id": subscription.id,
                "status": subscription.status,
                "plan": subscription.metadata.get("plan"),
                "current_period_start": datetime.fromtimestamp(
                    subscription.current_period_start
                ),
                "current_period_end": datetime.fromtimestamp(
                    subscription.current_period_end
                ),
                "cancel_at_period_end": subscription.cancel_at_period_end
            }
        except stripe.error.InvalidRequestError:
            return None

    async def cancel_subscription(
        self,
        subscription_id: str,
        at_period_end: bool = True
    ) -> bool:
        """
        Cancel a subscription.

        Args:
            subscription_id: Stripe subscription ID
            at_period_end: If True, cancel at end of billing period

        Returns:
            Success status
        """
        try:
            if at_period_end:
                stripe.Subscription.modify(
                    subscription_id,
                    cancel_at_period_end=True
                )
            else:
                stripe.Subscription.delete(subscription_id)
            return True
        except stripe.error.StripeError:
            return False

    async def create_usage_record(
        self,
        subscription_item_id: str,
        quantity: int,
        action: str = "increment"
    ) -> bool:
        """
        Record usage for metered billing.

        Args:
            subscription_item_id: Stripe subscription item ID
            quantity: Usage quantity (e.g., characters used)
            action: "increment" or "set"

        Returns:
            Success status
        """
        try:
            stripe.SubscriptionItem.create_usage_record(
                subscription_item_id,
                quantity=quantity,
                action=action,
                timestamp=int(datetime.utcnow().timestamp())
            )
            return True
        except stripe.error.StripeError:
            return False

    async def process_webhook(
        self,
        payload: bytes,
        signature: str
    ) -> Dict[str, Any]:
        """
        Process Stripe webhook event.

        Returns:
            Event data with type and relevant information
        """
        webhook_secret = settings.STRIPE_WEBHOOK_SECRET

        try:
            event = stripe.Webhook.construct_event(
                payload, signature, webhook_secret
            )
        except ValueError:
            raise ValueError("Invalid payload")
        except stripe.error.SignatureVerificationError:
            raise ValueError("Invalid signature")

        event_type = event["type"]
        data = event["data"]["object"]

        result = {"type": event_type, "data": {}}

        if event_type == "checkout.session.completed":
            result["data"] = {
                "customer_id": data["customer"],
                "subscription_id": data.get("subscription"),
                "plan": data["metadata"].get("plan")
            }

        elif event_type == "customer.subscription.updated":
            result["data"] = {
                "subscription_id": data["id"],
                "customer_id": data["customer"],
                "status": data["status"],
                "plan": data["metadata"].get("plan")
            }

        elif event_type == "customer.subscription.deleted":
            result["data"] = {
                "subscription_id": data["id"],
                "customer_id": data["customer"]
            }

        elif event_type == "invoice.payment_failed":
            result["data"] = {
                "customer_id": data["customer"],
                "subscription_id": data.get("subscription"),
                "amount_due": data["amount_due"],
                "attempt_count": data["attempt_count"]
            }

        return result

    def get_plan_credits(self, plan: PlanType) -> int:
        """Get credits for a plan"""
        return PLANS.get(plan, {}).get("credits", 0) or 0

    def get_plan_features(self, plan: PlanType) -> List[str]:
        """Get features for a plan"""
        return PLANS.get(plan, {}).get("features", [])


# Singleton instance
_stripe_service: Optional[StripeService] = None


def get_stripe_service() -> StripeService:
    """Get or create Stripe service singleton"""
    global _stripe_service
    if _stripe_service is None:
        _stripe_service = StripeService()
    return _stripe_service
