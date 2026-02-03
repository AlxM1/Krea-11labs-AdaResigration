/**
 * Notification Helper Functions
 * Used to create notifications from various parts of the application
 */

import { prisma } from "@/lib/db";

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

export type NotificationType = keyof typeof NotificationTypes;

/**
 * Create a notification for a user
 */
export async function createNotification(
  userId: string,
  type: NotificationType,
  title: string,
  message: string,
  data?: Record<string, unknown>
) {
  return prisma.notification.create({
    data: {
      userId,
      type: NotificationTypes[type],
      title,
      message,
      data: data || {},
    },
  });
}

/**
 * Helper functions for common notification types
 */
export const NotificationHelpers = {
  generationComplete: (userId: string, generationId: string, prompt: string) =>
    createNotification(
      userId,
      "GENERATION_COMPLETE",
      "Generation Complete",
      `Your image "${prompt.slice(0, 50)}${prompt.length > 50 ? "..." : ""}" is ready!`,
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

  newFeature: (userId: string, featureName: string, description: string) =>
    createNotification(
      userId,
      "NEW_FEATURE",
      `New Feature: ${featureName}`,
      description,
      { featureName }
    ),

  system: (userId: string, title: string, message: string, data?: Record<string, unknown>) =>
    createNotification(userId, "SYSTEM", title, message, data),
};

/**
 * Clean up old notifications (run periodically)
 */
export async function cleanupOldNotifications(daysToKeep: number = 30) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

  return prisma.notification.deleteMany({
    where: {
      createdAt: { lt: cutoffDate },
      read: true, // Only delete read notifications
    },
  });
}
