"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  Heart,
  MessageCircle,
  Share2,
  Download,
  Copy,
  MoreHorizontal,
  Sparkles,
  TrendingUp,
  Clock,
  Star,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

const categories = [
  { id: "all", label: "All" },
  { id: "trending", label: "Trending", icon: TrendingUp },
  { id: "new", label: "New", icon: Clock },
  { id: "featured", label: "Featured", icon: Star },
  { id: "realistic", label: "Realistic" },
  { id: "anime", label: "Anime" },
  { id: "fantasy", label: "Fantasy" },
  { id: "scifi", label: "Sci-Fi" },
  { id: "portrait", label: "Portrait" },
  { id: "landscape", label: "Landscape" },
];

// Mock data for gallery
const mockGalleryItems = [
  {
    id: "1",
    imageUrl: "https://via.placeholder.com/400x400/7c3aed/ffffff?text=AI+Art",
    prompt: "A futuristic cityscape at sunset with flying cars and neon lights",
    author: { name: "artist1", avatar: null },
    likes: 1234,
    comments: 56,
    model: "Flux Dev",
  },
  {
    id: "2",
    imageUrl: "https://via.placeholder.com/400x500/ec4899/ffffff?text=AI+Art",
    prompt: "Portrait of a cyberpunk character with glowing eyes",
    author: { name: "creator2", avatar: null },
    likes: 892,
    comments: 34,
    model: "SDXL",
  },
  {
    id: "3",
    imageUrl: "https://via.placeholder.com/400x300/06b6d4/ffffff?text=AI+Art",
    prompt: "Magical forest with bioluminescent plants",
    author: { name: "aiartist", avatar: null },
    likes: 2341,
    comments: 89,
    model: "Flux Schnell",
  },
  {
    id: "4",
    imageUrl: "https://via.placeholder.com/400x450/f59e0b/ffffff?text=AI+Art",
    prompt: "Ancient temple ruins covered in moss",
    author: { name: "designer", avatar: null },
    likes: 567,
    comments: 23,
    model: "SD 3",
  },
  {
    id: "5",
    imageUrl: "https://via.placeholder.com/400x400/10b981/ffffff?text=AI+Art",
    prompt: "Underwater city with mermaids",
    author: { name: "creator3", avatar: null },
    likes: 1456,
    comments: 67,
    model: "Flux Dev",
  },
  {
    id: "6",
    imageUrl: "https://via.placeholder.com/400x350/8b5cf6/ffffff?text=AI+Art",
    prompt: "Space station orbiting a gas giant",
    author: { name: "scifiart", avatar: null },
    likes: 789,
    comments: 45,
    model: "SDXL Lightning",
  },
];

export default function FeedPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());

  const toggleLike = (id: string) => {
    setLikedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-bold">Explore Gallery</h1>
          <div className="flex items-center gap-3">
            <div className="relative w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search creations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Categories */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={cn(
                "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors",
                selectedCategory === category.id
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted hover:bg-muted/80"
              )}
            >
              {category.icon && <category.icon className="h-4 w-4" />}
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Gallery Grid */}
      <div className="flex-1 overflow-auto p-6">
        <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
          {mockGalleryItems.map((item, index) => (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className="break-inside-avoid"
            >
              <div className="group relative rounded-xl overflow-hidden bg-card border border-border">
                {/* Image */}
                <div className="relative">
                  <img
                    src={item.imageUrl}
                    alt={item.prompt}
                    className="w-full object-cover"
                  />

                  {/* Overlay on hover */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Top actions */}
                    <div className="absolute top-3 right-3 flex gap-2">
                      <button className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
                        <Download className="h-4 w-4" />
                      </button>
                      <button className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Bottom info */}
                    <div className="absolute bottom-0 left-0 right-0 p-4">
                      <p className="text-white text-sm line-clamp-2 mb-3">
                        {item.prompt}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar size="sm" />
                          <span className="text-white/80 text-sm">
                            {item.author.name}
                          </span>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {item.model}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="p-3 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleLike(item.id)}
                      className={cn(
                        "flex items-center gap-1.5 text-sm transition-colors",
                        likedItems.has(item.id) ? "text-red-500" : "text-muted-foreground hover:text-red-500"
                      )}
                    >
                      <Heart className={cn("h-4 w-4", likedItems.has(item.id) && "fill-current")} />
                      {item.likes + (likedItems.has(item.id) ? 1 : 0)}
                    </button>
                    <button className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
                      <MessageCircle className="h-4 w-4" />
                      {item.comments}
                    </button>
                  </div>
                  <button className="text-muted-foreground hover:text-foreground transition-colors">
                    <Share2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-8">
          <Button variant="outline" size="lg">
            Load More
          </Button>
        </div>
      </div>
    </div>
  );
}
