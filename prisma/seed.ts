import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Starting database seed...");

  // Create demo user
  const hashedPassword = await hash("demo123456", 12);

  const demoUser = await prisma.user.upsert({
    where: { email: "demo@krya.ai" },
    update: {},
    create: {
      email: "demo@krya.ai",
      name: "Demo User",
      image: "https://api.dicebear.com/7.x/avataaars/svg?seed=demo",
      subscriptionTier: "PRO",
      creditsRemaining: 1500,
    },
  });

  console.log(`✅ Created demo user: ${demoUser.email}`);

  // Create AI models catalog
  const aiModels = [
    {
      name: "Flux Schnell",
      slug: "flux-schnell",
      description: "Fast, high-quality image generation in ~1 second",
      provider: "fal",
      type: "image",
      category: "fast",
      isPremium: false,
      parameters: { defaultSteps: 4, maxSteps: 8 },
    },
    {
      name: "Flux Dev",
      slug: "flux-dev",
      description: "High-quality image generation with more control",
      provider: "fal",
      type: "image",
      category: "quality",
      isPremium: true,
      parameters: { defaultSteps: 28, maxSteps: 50 },
    },
    {
      name: "SDXL Lightning",
      slug: "sdxl-lightning",
      description: "Fast SDXL variant with great quality",
      provider: "fal",
      type: "image",
      category: "fast",
      isPremium: false,
      parameters: { defaultSteps: 4, maxSteps: 8 },
    },
    {
      name: "Stable Diffusion XL",
      slug: "sdxl",
      description: "Classic high-quality image generation",
      provider: "replicate",
      type: "image",
      category: "quality",
      isPremium: false,
      parameters: { defaultSteps: 30, maxSteps: 50 },
    },
    {
      name: "LCM Real-time",
      slug: "lcm-realtime",
      description: "Real-time generation for canvas mode",
      provider: "fal",
      type: "image",
      category: "realtime",
      isPremium: true,
      parameters: { defaultSteps: 4, maxSteps: 8 },
    },
    {
      name: "Kling 2.5",
      slug: "kling-2.5",
      description: "High-quality video generation",
      provider: "fal",
      type: "video",
      category: "quality",
      isPremium: true,
      parameters: { maxDuration: 10 },
    },
    {
      name: "Runway Gen-3",
      slug: "runway-gen3",
      description: "Professional video generation",
      provider: "fal",
      type: "video",
      category: "quality",
      isPremium: true,
      parameters: { maxDuration: 10 },
    },
    {
      name: "TripoSR",
      slug: "triposr",
      description: "Fast 3D model generation from images",
      provider: "fal",
      type: "3d",
      category: "fast",
      isPremium: true,
      parameters: {},
    },
    {
      name: "Real-ESRGAN",
      slug: "real-esrgan",
      description: "Image upscaling up to 4x",
      provider: "fal",
      type: "upscale",
      category: "quality",
      isPremium: false,
      parameters: { maxScale: 4 },
    },
  ];

  for (const model of aiModels) {
    await prisma.aIModel.upsert({
      where: { slug: model.slug },
      update: model,
      create: model,
    });
  }

  console.log(`✅ Created ${aiModels.length} AI models`);

  // Create sample generations for demo user
  const sampleGenerations = [
    {
      userId: demoUser.id,
      type: "TEXT_TO_IMAGE" as const,
      prompt: "A futuristic cityscape at sunset with flying cars and neon lights",
      model: "flux-schnell",
      status: "COMPLETED" as const,
      imageUrl: "https://fal.media/files/panda/Aw8BIo3ZpWNAhL4IB9Zd8.png",
      width: 1024,
      height: 1024,
      isPublic: true,
      likes: 42,
    },
    {
      userId: demoUser.id,
      type: "TEXT_TO_IMAGE" as const,
      prompt: "Portrait of a cyberpunk character with glowing eyes",
      model: "flux-dev",
      status: "COMPLETED" as const,
      imageUrl: "https://fal.media/files/elephant/6CjNxqP6h3j3FIlqJVVf5.png",
      width: 1024,
      height: 1024,
      isPublic: true,
      likes: 28,
    },
    {
      userId: demoUser.id,
      type: "TEXT_TO_IMAGE" as const,
      prompt: "An enchanted forest with bioluminescent plants",
      model: "sdxl-lightning",
      status: "COMPLETED" as const,
      imageUrl: "https://fal.media/files/koala/wz8ztxMXREzj6x5xIJxIU.png",
      width: 1024,
      height: 1024,
      isPublic: true,
      likes: 35,
    },
  ];

  for (const gen of sampleGenerations) {
    await prisma.generation.create({ data: gen });
  }

  console.log(`✅ Created ${sampleGenerations.length} sample generations`);

  // Create sample project
  const project = await prisma.project.create({
    data: {
      userId: demoUser.id,
      name: "My First Project",
      type: "COLLECTION",
    },
  });

  console.log(`✅ Created sample project: ${project.name}`);

  // Create sample workflow
  const workflow = await prisma.workflow.create({
    data: {
      userId: demoUser.id,
      name: "Image Upscale Pipeline",
      description: "Generate an image and upscale it 2x",
      isPublic: true,
      nodes: [
        {
          id: "input-1",
          type: "text-input",
          position: { x: 100, y: 100 },
          data: { label: "Prompt", value: "" },
        },
        {
          id: "generate-1",
          type: "generate-image",
          position: { x: 300, y: 100 },
          data: { model: "flux-schnell" },
        },
        {
          id: "upscale-1",
          type: "upscale",
          position: { x: 500, y: 100 },
          data: { scale: 2 },
        },
        {
          id: "output-1",
          type: "output",
          position: { x: 700, y: 100 },
          data: { outputKey: "result" },
        },
      ],
      connections: [
        { id: "c1", source: "input-1", target: "generate-1" },
        { id: "c2", source: "generate-1", target: "upscale-1" },
        { id: "c3", source: "upscale-1", target: "output-1" },
      ],
    },
  });

  console.log(`✅ Created sample workflow: ${workflow.name}`);

  console.log("🎉 Database seed completed!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
