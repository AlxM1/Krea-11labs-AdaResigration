"""
API v1 Router - combines all endpoint routers
"""
from fastapi import APIRouter

from app.api.v1.endpoints import tts, voices, stt, sound_effects, audio_tools, auth, websocket

api_router = APIRouter()

# ==========================================
# Authentication & User Management
# ==========================================
api_router.include_router(
    auth.router,
    prefix="/auth",
    tags=["Authentication"]
)

# ==========================================
# Text-to-Speech
# ==========================================
api_router.include_router(
    tts.router,
    prefix="",
    tags=["Text-to-Speech"]
)

# ==========================================
# Voice Management
# ==========================================
api_router.include_router(
    voices.router,
    prefix="/voices",
    tags=["Voices"]
)

# ==========================================
# Speech-to-Text
# ==========================================
api_router.include_router(
    stt.router,
    prefix="",
    tags=["Speech-to-Text"]
)

# ==========================================
# Sound Effects
# ==========================================
api_router.include_router(
    sound_effects.router,
    prefix="",
    tags=["Sound Effects"]
)

# ==========================================
# Audio Tools (Isolation, Enhancement)
# ==========================================
api_router.include_router(
    audio_tools.router,
    prefix="",
    tags=["Audio Tools"]
)

# ==========================================
# WebSocket Endpoints
# ==========================================
api_router.include_router(
    websocket.router,
    tags=["WebSocket"]
)


# ==========================================
# Billing Endpoints
# ==========================================
from fastapi import Depends, HTTPException, Request
from app.core.security import get_current_user
from app.services.billing import get_stripe_service, PLANS, PlanType

billing_router = APIRouter(prefix="/billing", tags=["Billing"])


@billing_router.get("/plans")
async def list_plans():
    """List all available subscription plans"""
    plans_list = []
    for plan_type, config in PLANS.items():
        plans_list.append({
            "id": plan_type.value,
            "name": config["name"],
            "price_monthly": config["price_monthly"],
            "credits": config["credits"],
            "features": config["features"]
        })
    return {"plans": plans_list}


@billing_router.post("/checkout")
async def create_checkout_session(
    plan: str,
    success_url: str,
    cancel_url: str,
    current_user: dict = Depends(get_current_user)
):
    """Create Stripe checkout session for subscription"""
    try:
        plan_type = PlanType(plan)
    except ValueError:
        raise HTTPException(status_code=400, detail=f"Invalid plan: {plan}")

    stripe_service = get_stripe_service()

    # Get or create Stripe customer
    customer_id = current_user.get("stripe_customer_id")
    if not customer_id:
        customer_id = await stripe_service.create_customer(
            user_id=current_user["user_id"],
            email=current_user.get("email", ""),
            name=current_user.get("name")
        )

    result = await stripe_service.create_checkout_session(
        customer_id=customer_id,
        plan=plan_type,
        success_url=success_url,
        cancel_url=cancel_url
    )

    return result


@billing_router.post("/portal")
async def create_portal_session(
    return_url: str,
    current_user: dict = Depends(get_current_user)
):
    """Create Stripe customer portal session"""
    customer_id = current_user.get("stripe_customer_id")
    if not customer_id:
        raise HTTPException(status_code=400, detail="No billing account found")

    stripe_service = get_stripe_service()
    portal_url = await stripe_service.create_portal_session(
        customer_id=customer_id,
        return_url=return_url
    )

    return {"url": portal_url}


@billing_router.post("/webhook")
async def stripe_webhook(request: Request):
    """Handle Stripe webhook events"""
    payload = await request.body()
    signature = request.headers.get("stripe-signature", "")

    stripe_service = get_stripe_service()

    try:
        event = await stripe_service.process_webhook(payload, signature)

        # Handle different event types
        if event["type"] == "checkout.session.completed":
            # Activate subscription
            pass
        elif event["type"] == "customer.subscription.updated":
            # Update subscription status
            pass
        elif event["type"] == "customer.subscription.deleted":
            # Cancel subscription
            pass
        elif event["type"] == "invoice.payment_failed":
            # Handle failed payment
            pass

        return {"status": "ok"}

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


api_router.include_router(billing_router)
