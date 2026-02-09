import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { z } from "zod";

// Admin role check
async function isAdmin(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });
  const adminEmails = (process.env.ADMIN_EMAILS || "").split(",").filter(Boolean);
  return user?.email ? adminEmails.includes(user.email) : false;
}

const querySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(50),
  offset: z.coerce.number().min(0).default(0),
  search: z.string().optional(),
  tier: z.string().optional(),
  sortBy: z.enum(["createdAt", "creditsRemaining", "email", "name"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

export async function GET(req: NextRequest) {
  try {
    const session = await auth(req);

    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!(await isAdmin(session.user.id))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const query = querySchema.parse({
      limit: searchParams.get("limit"),
      offset: searchParams.get("offset"),
      search: searchParams.get("search"),
      tier: searchParams.get("tier"),
      sortBy: searchParams.get("sortBy"),
      sortOrder: searchParams.get("sortOrder"),
    });

    // Build where clause
    const where: Record<string, unknown> = {};

    if (query.search) {
      where.OR = [
        { email: { contains: query.search, mode: "insensitive" } },
        { name: { contains: query.search, mode: "insensitive" } },
      ];
    }

    if (query.tier) {
      where.subscriptionTier = query.tier.toUpperCase();
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        orderBy: { [query.sortBy]: query.sortOrder },
        take: query.limit,
        skip: query.offset,
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          subscriptionTier: true,
          creditsRemaining: true,
          creditsResetAt: true,
          createdAt: true,
          updatedAt: true,
          _count: {
            select: {
              generations: true,
              videos: true,
              trainedModels: true,
            },
          },
        },
      }),
      prisma.user.count({ where }),
    ]);

    return NextResponse.json({
      users: users.map((u: typeof users[number]) => ({
        ...u,
        stats: {
          generations: u._count.generations,
          videos: u._count.videos,
          trainedModels: u._count.trainedModels,
        },
        _count: undefined,
      })),
      total,
      limit: query.limit,
      offset: query.offset,
    });
  } catch (error) {
    console.error("Admin users error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
