"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  Zap,
  Image as ImageIcon,
  Video,
  Box,
  Wand2,
  ArrowRight,
  Clock,
  Star,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const quickActions = [
  {
    href: "/realtime",
    label: "Real-time Canvas",
    description: "Create with instant AI feedback",
    icon: Zap,
    color: "from-yellow-500 to-orange-500",
  },
  {
    href: "/image",
    label: "Generate Image",
    description: "Create images from text",
    icon: ImageIcon,
    color: "from-blue-500 to-cyan-500",
  },
  {
    href: "/video",
    label: "Create Video",
    description: "Generate AI videos",
    icon: Video,
    color: "from-purple-500 to-pink-500",
  },
  {
    href: "/enhancer",
    label: "Enhance Image",
    description: "Upscale and improve",
    icon: Wand2,
    color: "from-green-500 to-emerald-500",
  },
];

const recentGenerations = [
  { id: 1, type: "image", prompt: "A futuristic city at sunset", time: "2 hours ago" },
  { id: 2, type: "video", prompt: "Ocean waves on a beach", time: "5 hours ago" },
  { id: 3, type: "image", prompt: "Portrait of a cyberpunk character", time: "1 day ago" },
];

export default function DashboardPage() {
  return (
    <div className="p-6 space-y-8">
      {/* Welcome Section */}
      <div>
        <h1 className="text-3xl font-bold mb-2">Welcome back!</h1>
        <p className="text-muted-foreground">
          What would you like to create today?
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {quickActions.map((action, index) => (
          <motion.div
            key={action.href}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Link href={action.href}>
              <Card className="group hover:border-primary/50 transition-all duration-300 cursor-pointer h-full">
                <CardContent className="p-6">
                  <div
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${action.color} mb-4 group-hover:scale-110 transition-transform`}
                  >
                    <action.icon className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="font-semibold mb-1">{action.label}</h3>
                  <p className="text-sm text-muted-foreground">{action.description}</p>
                </CardContent>
              </Card>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <ImageIcon className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Images Generated</p>
              <p className="text-2xl font-bold">0</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Credits Remaining</p>
              <p className="text-2xl font-bold">50</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <Star className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Favorites</p>
              <p className="text-2xl font-bold">0</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Generations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Generations
            </CardTitle>
            <Link href="/history">
              <Button variant="ghost" size="sm" className="gap-1">
                View all
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {recentGenerations.length > 0 ? (
              <div className="space-y-4">
                {recentGenerations.map((gen) => (
                  <div
                    key={gen.id}
                    className="flex items-center gap-4 p-3 rounded-lg hover:bg-muted transition-colors"
                  >
                    <div className="h-12 w-12 rounded-lg bg-muted flex items-center justify-center">
                      {gen.type === "image" ? (
                        <ImageIcon className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Video className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{gen.prompt}</p>
                      <p className="text-sm text-muted-foreground">{gen.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <ImageIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No generations yet</p>
                <p className="text-sm">Start creating to see your history here</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Getting Started */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5" />
              Getting Started
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  1
                </div>
                <div>
                  <p className="font-medium">Try Real-time Canvas</p>
                  <p className="text-sm text-muted-foreground">
                    Draw and see AI transform your art instantly
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  2
                </div>
                <div>
                  <p className="font-medium">Generate Your First Image</p>
                  <p className="text-sm text-muted-foreground">
                    Describe what you want and let AI create it
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-3 rounded-lg bg-muted/50">
                <div className="h-8 w-8 rounded-full bg-primary/20 flex items-center justify-center text-sm font-bold text-primary">
                  3
                </div>
                <div>
                  <p className="font-medium">Explore AI Models</p>
                  <p className="text-sm text-muted-foreground">
                    Choose from 64+ models for different styles
                  </p>
                </div>
              </div>

              <Link href="/realtime">
                <Button variant="gradient" className="w-full gap-2 mt-4">
                  <Zap className="h-4 w-4" />
                  Start with Real-time Canvas
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
