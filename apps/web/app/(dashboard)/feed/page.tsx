"use client";

import { useState } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  Heart,
  MessageCircle,
  Share2,
  Download,
  Copy,
  TrendingUp,
  Clock,
  Star,
  Loader2,
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

interface GalleryItem {
  id: string;
  imageUrl: string;
  prompt: string;
  user: { name: string; image: string | null };
  likes: number;
  model: string;
  createdAt: string;
}

export default function FeedPage() {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(0);

  const sortMap: Record<string, string> = {
    trending: "popular",
    new: "recent",
    featured: "popular",
  };
  const sort = sortMap[selectedCategory] || "recent";

  const { data, isLoading } = useSWR<{ items: GalleryItem[]; total: number }>(
    `/api/gallery?sort=${sort}&limit=30&offset=${page * 30}${searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : ""}`
  );

  const items = data?.items || [];

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
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
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
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : items.length > 0 ? (
          <div className="columns-2 md:columns-3 lg:columns-4 xl:columns-5 gap-4 space-y-4">
            {items.map((item, index) => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="break-inside-avoid"
              >
                <div className="group relative rounded-xl overflow-hidden bg-card border border-border">
                  <div className="relative">
                    <img
                      src={item.imageUrl}
                      alt={item.prompt}
                      className="w-full object-cover"
                    />

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute top-3 right-3 flex gap-2">
                        <button className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
                          <Download className="h-4 w-4" />
                        </button>
                        <button className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors">
                          <Copy className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="absolute bottom-0 left-0 right-0 p-4">
                        <p className="text-white text-sm line-clamp-2 mb-3">
                          {item.prompt}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Avatar src={item.user?.image} size="sm" />
                            <span className="text-white/80 text-sm">
                              {item.user?.name || "User"}
                            </span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {item.model}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>

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
                    </div>
                    <button className="text-muted-foreground hover:text-foreground transition-colors">
                      <Share2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-16">
            <Star className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No creations yet</h3>
            <p className="text-muted-foreground">
              Generate images and make them public to see them here
            </p>
          </div>
        )}

        {/* Load More */}
        {items.length > 0 && (
          <div className="text-center mt-8">
            <Button variant="outline" size="lg" onClick={() => setPage((p) => p + 1)}>
              Load More
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
