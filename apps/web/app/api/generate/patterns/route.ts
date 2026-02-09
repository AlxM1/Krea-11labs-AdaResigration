import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { executeImageChain } from '@/lib/ai/provider-chain'
import { generateImage } from '@/lib/ai/providers'
import { prisma } from '@/lib/db'

const STYLE_PROMPTS = {
  geometric: 'geometric pattern, clean lines, precise shapes, mathematical symmetry',
  floral: 'botanical pattern, flowers, leaves, organic flowing forms',
  abstract: 'abstract art pattern, artistic freeform shapes, creative design',
  nature: 'natural elements pattern, organic textures, natural forms',
  tech: 'futuristic technological pattern, digital elements, sci-fi design',
  vintage: 'vintage retro pattern, classic design, nostalgic aesthetic',
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth(req)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const user = session.user

    const body = await req.json()
    const { prompt, style = 'geometric', tileSize = 1024 } = body

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 })
    }

    // Create enhanced prompt for seamless pattern
    const stylePrefix = STYLE_PROMPTS[style as keyof typeof STYLE_PROMPTS] || STYLE_PROMPTS.geometric
    const enhancedPrompt = `Seamless tileable pattern: ${prompt}, ${stylePrefix}, perfect symmetry for tiling, high detail, professional pattern design, repeating motif, continuous edges, wallpaper quality, 8k resolution`

    // Negative prompt to avoid non-tileable elements
    const negativePrompt = 'borders, frames, edges, corners, non-repeating, text, watermark, signatures, asymmetric, broken pattern, discontinuous, misaligned'

    // Create generation record
    const generation = await prisma.generation.create({
      data: {
        userId: user.id,
        type: 'TEXT_TO_IMAGE',
        status: 'PENDING',
        parameters: {
          prompt: enhancedPrompt,
          negativePrompt,
          width: tileSize,
          height: tileSize,
          model: 'flux-schnell',
          steps: 4,
          guidanceScale: 3.5,
          style,
          isPattern: true,
        },
      },
    })

    // Execute generation with provider chain
    const result = await executeImageChain(
      'text-to-image',
      {
        prompt: enhancedPrompt,
        negativePrompt,
        width: tileSize,
        height: tileSize,
        model: 'flux-schnell',
        steps: 4,
        cfgScale: 3.5,
      },
      (provider, request) => generateImage(request, provider)
    )

    if (!result.success || !result.result) {
      await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: 'FAILED',
          error: result.finalError || 'Generation failed',
        },
      })

      return NextResponse.json(
        { error: result.finalError || 'Pattern generation failed' },
        { status: 500 }
      )
    }

    // Cast result to GenerationResponse since this is image generation
    const genResult = result.result as import('@/lib/ai/providers').GenerationResponse

    // Get the successful provider from attempts
    const successfulAttempt = result.attempts.find(a => a.success)

    // Update generation record with result
    await prisma.generation.update({
      where: { id: generation.id },
      data: {
        status: 'COMPLETED',
        imageUrl: genResult.imageUrl,
        images: genResult.images || (genResult.imageUrl ? [genResult.imageUrl] : []),
        seed: genResult.seed,
        provider: successfulAttempt?.provider || 'fal',
        completedAt: new Date(),
      },
    })

    return NextResponse.json({
      generationId: generation.id,
      imageUrl: genResult.imageUrl,
      images: genResult.images,
      seed: result.result.seed,
      provider: result.result.provider,
    })
  } catch (error) {
    console.error('Pattern generation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
