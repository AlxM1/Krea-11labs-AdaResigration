"use client";

import { Sparkles, Zap, Infinity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-3xl mx-auto text-center">
          {/* Header */}
          <div className="mb-12">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary mb-6">
              <Sparkles className="h-4 w-4" />
              <span className="text-sm font-medium">Unlimited & Free</span>
            </div>
            <h1 className="text-5xl font-bold mb-4">
              Everything is Free
            </h1>
            <p className="text-xl text-muted-foreground">
              Powered by local GPU hardware. No credits, no limits, no subscriptions.
            </p>
          </div>

          {/* Free Plan Card */}
          <Card className="border-2 border-primary">
            <CardHeader className="text-center pb-8">
              <div className="mx-auto mb-4">
                <Infinity className="h-16 w-16 text-primary" />
              </div>
              <CardTitle className="text-3xl">Unlimited Access</CardTitle>
              <p className="text-muted-foreground mt-2">
                Everything included, forever free
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                {[
                  "Unlimited image generation",
                  "Unlimited video generation",
                  "All AI models (SDXL, FLUX, etc.)",
                  "Local GPU processing (RTX 5090)",
                  "No API costs or rate limits",
                  "Full access to all features",
                  "Real-time generation",
                  "Background removal & upscaling",
                  "Style transfer & editing",
                  "3D generation",
                  "Model training (LoRA, DreamBooth)",
                  "Workflow automation",
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Zap className="h-3 w-3 text-primary" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </div>
                ))}
              </div>

              <div className="pt-6">
                <Link href="/dashboard">
                  <Button variant="gradient" size="lg" className="w-full">
                    <Sparkles className="h-5 w-5 mr-2" />
                    Start Creating
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* Info */}
          <div className="mt-12 p-6 rounded-lg bg-muted/50">
            <p className="text-sm text-muted-foreground">
              Krya runs on local GPU hardware (RTX 5090), which means all generation is free
              with no API costs or usage limits. Cloud providers (fal.ai, Replicate) are available
              as fallback options but are optional.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
