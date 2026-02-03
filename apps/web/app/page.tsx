import Link from "next/link";
import {
  Sparkles,
  Zap,
  Image as ImageIcon,
  Video,
  Box,
  Wand2,
  ArrowRight,
  Play,
  Star,
  Users,
  Clock,
} from "lucide-react";
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";

const features = [
  {
    icon: Zap,
    title: "Real-time Generation",
    description:
      "Watch AI transform your sketches and ideas instantly. Sub-50ms latency for a truly live creative experience.",
    color: "from-yellow-500 to-orange-500",
  },
  {
    icon: ImageIcon,
    title: "Image Generation",
    description:
      "Create stunning images from text with 64+ AI models. From photorealistic to artistic styles.",
    color: "from-blue-500 to-cyan-500",
  },
  {
    icon: Video,
    title: "Video Creation",
    description:
      "Generate videos from text or images. Lipsync, motion transfer, and style transformation.",
    color: "from-purple-500 to-pink-500",
  },
  {
    icon: Box,
    title: "3D Generation",
    description:
      "Create 3D objects from text or images. Export to GLB, OBJ, and more formats.",
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: Wand2,
    title: "AI Enhancement",
    description:
      "Upscale images up to 22K resolution. Restore old photos and enhance details with AI.",
    color: "from-red-500 to-rose-500",
  },
  {
    icon: Sparkles,
    title: "Custom Training",
    description:
      "Train your own AI models on faces, styles, or products. Create consistent characters.",
    color: "from-indigo-500 to-violet-500",
  },
];

const stats = [
  { value: "10M+", label: "Images Generated", icon: ImageIcon },
  { value: "500K+", label: "Active Users", icon: Users },
  { value: "<50ms", label: "Generation Speed", icon: Clock },
  { value: "4.9/5", label: "User Rating", icon: Star },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-gradient-to-b from-purple-900/20 via-background to-background" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-[128px]" />

          <div className="container relative mx-auto px-4 py-24 md:py-32">
            <div className="max-w-4xl mx-auto text-center">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/50 px-4 py-1.5 mb-8 backdrop-blur-sm">
                <Sparkles className="h-4 w-4 text-purple-400" />
                <span className="text-sm">Introducing Krya 1.0</span>
              </div>

              {/* Headline */}
              <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6">
                Create with AI in{" "}
                <span className="bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
                  Real-time
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                Generate stunning images, videos, and 3D content with the most
                powerful AI creative platform. Watch your ideas come to life instantly.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
                <Link href="/realtime">
                  <Button variant="gradient" size="lg" className="gap-2">
                    <Zap className="h-5 w-5" />
                    Try Real-time Canvas
                  </Button>
                </Link>
                <Link href="/image">
                  <Button variant="outline" size="lg" className="gap-2">
                    <Play className="h-5 w-5" />
                    Generate Image
                  </Button>
                </Link>
              </div>

              {/* Hero Image/Video */}
              <div className="relative rounded-2xl border border-border bg-card/50 p-2 backdrop-blur-sm shadow-2xl">
                <div className="aspect-video rounded-xl bg-gradient-to-br from-purple-900/50 to-pink-900/50 flex items-center justify-center overflow-hidden">
                  <div className="text-center p-8">
                    <div className="flex items-center justify-center gap-4 mb-6">
                      <div className="w-32 h-32 rounded-xl bg-muted animate-pulse" />
                      <ArrowRight className="h-8 w-8 text-muted-foreground" />
                      <div className="w-32 h-32 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                        <Sparkles className="h-12 w-12 text-white" />
                      </div>
                    </div>
                    <p className="text-muted-foreground">
                      Draw on the left, see AI magic on the right
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="border-y border-border bg-card/30">
          <div className="container mx-auto px-4 py-12">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {stats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="flex items-center justify-center gap-2 mb-2">
                    <stat.icon className="h-5 w-5 text-primary" />
                    <span className="text-3xl md:text-4xl font-bold">{stat.value}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Everything you need to create
              </h2>
              <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                From real-time generation to video creation, Krya has all the
                tools you need to bring your creative vision to life.
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group relative rounded-2xl border border-border bg-card p-6 hover:border-primary/50 transition-all duration-300"
                >
                  <div
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${feature.color} mb-4`}
                  >
                    <feature.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground">{feature.description}</p>

                  {/* Hover glow effect */}
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Real-time Demo Section */}
        <section className="py-24 bg-card/30 border-y border-border">
          <div className="container mx-auto px-4">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/50 bg-primary/10 px-3 py-1 mb-6">
                  <Zap className="h-4 w-4 text-primary" />
                  <span className="text-sm text-primary">Real-time AI</span>
                </div>
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  Create at the speed of thought
                </h2>
                <p className="text-lg text-muted-foreground mb-6">
                  Our real-time canvas lets you draw, type, or use your webcam
                  and see AI transform your input instantly. No more waiting for
                  generations - create in a flow state.
                </p>

                <ul className="space-y-3 mb-8">
                  {[
                    "Sub-50ms generation latency",
                    "Draw and see AI render live",
                    "Use webcam or screen capture",
                    "Multiple AI models to choose from",
                  ].map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <div className="h-5 w-5 rounded-full bg-primary/20 flex items-center justify-center">
                        <Sparkles className="h-3 w-3 text-primary" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>

                <Link href="/realtime">
                  <Button variant="gradient" size="lg" className="gap-2">
                    Try Real-time Canvas
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <div className="relative">
                <div className="aspect-square rounded-2xl border border-border bg-card p-4">
                  <div className="grid grid-cols-2 gap-4 h-full">
                    <div className="rounded-xl bg-muted flex items-center justify-center">
                      <p className="text-muted-foreground text-sm">Your Canvas</p>
                    </div>
                    <div className="rounded-xl bg-gradient-to-br from-purple-600/20 to-pink-600/20 flex items-center justify-center">
                      <p className="text-muted-foreground text-sm">AI Output</p>
                    </div>
                  </div>
                </div>
                {/* Decorative elements */}
                <div className="absolute -z-10 -inset-4 bg-gradient-to-r from-purple-600/20 to-pink-600/20 rounded-3xl blur-xl" />
              </div>
            </div>
          </div>
        </section>

        {/* Pricing Preview */}
        <section className="py-24">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Start creating for free
              </h2>
              <p className="text-lg text-muted-foreground">
                Get 50 free generations daily. Upgrade anytime for more.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              {/* Free */}
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="text-xl font-semibold mb-2">Free</h3>
                <p className="text-3xl font-bold mb-4">$0</p>
                <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                  <li>50 images/day</li>
                  <li>10 videos/day</li>
                  <li>Basic models</li>
                  <li>Watermark on outputs</li>
                </ul>
                <Link href="/login" className="block">
                  <Button variant="outline" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </div>

              {/* Pro */}
              <div className="relative rounded-2xl border-2 border-primary bg-card p-6">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="bg-primary text-primary-foreground text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </span>
                </div>
                <h3 className="text-xl font-semibold mb-2">Pro</h3>
                <p className="text-3xl font-bold mb-4">
                  $28<span className="text-lg font-normal text-muted-foreground">/mo</span>
                </p>
                <ul className="space-y-2 mb-6 text-sm">
                  <li>Unlimited generations</li>
                  <li>All AI models</li>
                  <li>Real-time canvas</li>
                  <li>No watermark</li>
                  <li>Commercial license</li>
                </ul>
                <Link href="/login" className="block">
                  <Button variant="gradient" className="w-full">
                    Start Free Trial
                  </Button>
                </Link>
              </div>

              {/* Max */}
              <div className="rounded-2xl border border-border bg-card p-6">
                <h3 className="text-xl font-semibold mb-2">Max</h3>
                <p className="text-3xl font-bold mb-4">
                  $48<span className="text-lg font-normal text-muted-foreground">/mo</span>
                </p>
                <ul className="space-y-2 mb-6 text-sm text-muted-foreground">
                  <li>Everything in Pro</li>
                  <li>Priority queue</li>
                  <li>5 model trainings/mo</li>
                  <li>API access</li>
                </ul>
                <Link href="/login" className="block">
                  <Button variant="outline" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-gradient-to-b from-background to-card/50">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Ready to create with AI?
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-xl mx-auto">
              Join thousands of creators using Krya to bring their ideas to life.
              Start for free, no credit card required.
            </p>
            <Link href="/login">
              <Button variant="gradient" size="lg" className="gap-2">
                <Sparkles className="h-5 w-5" />
                Start Creating Now
              </Button>
            </Link>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
