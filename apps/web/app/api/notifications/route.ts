import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

// Note: This requires adding a Notification model to the Prisma schema
// For now, we'll use a simplified in-memory approach that can be easily
// migrated to a database model later

interface Notification {
  id: string;
  userId: string;
  type: string;
  title: string;
  message: string;
  data?: Record<string, unknown>;
  read: boolean;
  createdAt: Date;
}

// In-memory store (replace with database in production)
const notificationStore = new Map<string, Notification[]>();

// Notification types
export const NotificationTypes = {
  GENERATION_COMPLETE: "generation_complete",
  GENERATION_FAILED: "generation_failed",
  TRAINING_COMPLETE: "training_complete",
  TRAINING_FAILED: "training_failed",
  CREDITS_LOW: "credits_low",
  CREDITS_DEPLETED: "credits_depleted",
  SUBSCRIPTION_RENEWED: "subscription_renewed",
  SUBSCRIPTION_EXPIRING: "subscription_expiring",
  NEW_FEATURE: "new_feature",
  SYSTEM: "system",
} as const;

// Get user notifications
export async function GET(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get("limit") || "50");
    const unreadOnly = searchParams.get("unreadOnly") === "true";

    let notifications = notificationStore.get(session.user.id) || [];

    // Filter unread only if requested
    if (unreadOnly) {
      notifications = notifications.filter(n => !n.read);
    }

    // Sort by date descending and limit
    notifications = notifications
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);

    const unreadCount = (notificationStore.get(session.user.id) || [])
      .filter(n => !n.read).length;

    return NextResponse.json({
      notifications,
      unreadCount,
      total: notifications.length,
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Mark notifications as read
export async function PATCH(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { notificationIds, markAllRead } = z.object({
      notificationIds: z.array(z.string()).optional(),
      markAllRead: z.boolean().optional(),
    }).parse(body);

    const userNotifications = notificationStore.get(session.user.id) || [];

    if (markAllRead) {
      userNotifications.forEach(n => n.read = true);
    } else if (notificationIds?.length) {
      userNotifications.forEach(n => {
        if (notificationIds.includes(n.id)) {
          n.read = true;
        }
      });
    }

    notificationStore.set(session.user.id, userNotifications);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Delete notifications
export async function DELETE(req: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const notificationId = searchParams.get("id");
    const deleteAll = searchParams.get("deleteAll") === "true";

    if (deleteAll) {
      notificationStore.set(session.user.id, []);
    } else if (notificationId) {
      const userNotifications = notificationStore.get(session.user.id) || [];
      notificationStore.set(
        session.user.id,
        userNotifications.filter(n => n.id !== notificationId)
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting notifications:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// Helper function to create notifications (used by other parts of the app)
export function createNotification(
  userId: string,
  type: keyof typeof NotificationTypes,
  title: string,
  message: string,
  data?: Record<string, unknown>
): Notification {
  const notification: Notification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    userId,
    type: NotificationTypes[type],
    title,
    message,
    data,
    read: false,
    createdAt: new Date(),
  };

  const userNotifications = notificationStore.get(userId) || [];
  userNotifications.unshift(notification);

  // Keep only last 100 notifications
  if (userNotifications.length > 100) {
    userNotifications.pop();
  }

  notificationStore.set(userId, userNotifications);

  return notification;
}

// Helper to send common notification types
export const NotificationHelpers = {
  generationComplete: (userId: string, generationId: string, prompt: string) =>
    createNotification(
      userId,
      "GENERATION_COMPLETE",
      "Generation Complete",
      `Your image "${prompt.slice(0, 50)}..." is ready!`,
      { generationId }
    ),

  generationFailed: (userId: string, generationId: string, error: string) =>
    createNotification(
      userId,
      "GENERATION_FAILED",
      "Generation Failed",
      `Generation failed: ${error}`,
      { generationId }
    ),

  trainingComplete: (userId: string, modelId: string, modelName: string) =>
    createNotification(
      userId,
      "TRAINING_COMPLETE",
      "Model Training Complete",
      `Your model "${modelName}" is ready to use!`,
      { modelId }
    ),

  trainingFailed: (userId: string, modelId: string, error: string) =>
    createNotification(
      userId,
      "TRAINING_FAILED",
      "Model Training Failed",
      `Training failed: ${error}`,
      { modelId }
    ),

  creditsLow: (userId: string, remaining: number) =>
    createNotification(
      userId,
      "CREDITS_LOW",
      "Credits Running Low",
      `You have ${remaining} credits remaining. Consider upgrading your plan.`,
      { remaining }
    ),

  creditsDepleted: (userId: string) =>
    createNotification(
      userId,
      "CREDITS_DEPLETED",
      "Credits Depleted",
      "You've used all your credits. Upgrade to continue generating.",
      {}
    ),

  subscriptionRenewed: (userId: string, tier: string, credits: number) =>
    createNotification(
      userId,
      "SUBSCRIPTION_RENEWED",
      "Subscription Renewed",
      `Your ${tier} subscription has been renewed with ${credits} credits.`,
      { tier, credits }
    ),

  subscriptionExpiring: (userId: string, daysLeft: number) =>
    createNotification(
      userId,
      "SUBSCRIPTION_EXPIRING",
      "Subscription Expiring",
      `Your subscription expires in ${daysLeft} days. Renew to keep your benefits.`,
      { daysLeft }
    ),
};
