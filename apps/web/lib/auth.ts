/**
 * Authentik Forward Auth Integration
 *
 * Authentik sits as a forward-auth proxy in front of Krya.
 * When a user hits Krya, Authentik injects identity headers.
 * This module reads those headers to identify the user.
 *
 * Headers used:
 * - X-authentik-email: User's email
 * - X-authentik-name: User's display name
 * - X-authentik-uid: Authentik user ID
 * - X-authentik-groups: Comma-separated group names
 */

import { prisma } from "./db";
import { headers } from "next/headers";

export interface AuthUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  authentikId: string | null;
}

const PERSONAL_USER_ID = "personal-user";
const PERSONAL_USER_EMAIL = "personal@localhost";

/**
 * Read Authentik headers from a Request or from Next.js headers()
 */
export function getUserFromHeaders(
  hdrs: Headers
): { email: string; name: string | null; authentikId: string | null } | null {
  const email = hdrs.get("x-authentik-email");
  if (!email) return null;

  return {
    email,
    name: hdrs.get("x-authentik-name") || null,
    authentikId: hdrs.get("x-authentik-uid") || null,
  };
}

/**
 * Upsert user in DB by email (auto-create on first visit)
 */
export async function getOrCreateUser(
  hdrs: Headers
): Promise<AuthUser | null> {
  const authInfo = getUserFromHeaders(hdrs);

  if (!authInfo) {
    // No Authentik headers — fall back to personal user for dev/personal use
    const user = await prisma.user.upsert({
      where: { email: PERSONAL_USER_EMAIL },
      update: {},
      create: {
        id: PERSONAL_USER_ID,
        email: PERSONAL_USER_EMAIL,
        name: "Personal User",
      },
      select: { id: true, email: true, name: true, image: true, authentikId: true },
    });

    return {
      id: user.id,
      email: user.email || PERSONAL_USER_EMAIL,
      name: user.name,
      image: user.image,
      authentikId: user.authentikId,
    };
  }

  // Upsert user by email
  const user = await prisma.user.upsert({
    where: { email: authInfo.email },
    update: {
      name: authInfo.name || undefined,
      authentikId: authInfo.authentikId || undefined,
    },
    create: {
      email: authInfo.email,
      name: authInfo.name,
      authentikId: authInfo.authentikId,
    },
    select: { id: true, email: true, name: true, image: true, authentikId: true },
  });

  return {
    id: user.id,
    email: user.email || authInfo.email,
    name: user.name,
    image: user.image,
    authentikId: user.authentikId,
  };
}

/**
 * Compatibility wrapper: get auth session from a Request object.
 * API routes pass their request; the function reads Authentik headers and upserts the user.
 *
 * Usage in API routes:
 *   const session = await auth(req);
 *   const userId = session?.user?.id || "personal-user";
 */
export async function auth(
  request?: Request
): Promise<{ user: AuthUser } | null> {
  try {
    let hdrs: Headers;

    if (request) {
      hdrs = request.headers;
    } else {
      // Server component context — use Next.js headers()
      const h = await headers();
      hdrs = new Headers();
      h.forEach((value, key) => {
        hdrs.set(key, value);
      });
    }

    const user = await getOrCreateUser(hdrs);
    if (!user) return null;

    return { user };
  } catch (error) {
    console.error("[Auth] Error getting user:", error);
    return null;
  }
}
