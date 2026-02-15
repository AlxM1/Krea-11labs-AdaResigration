"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  Clock,
  Image as ImageIcon,
  Video,
  Box,
  Wand2,
  Download,
  Trash2,
  Search,
  MoreHorizontal,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface HistoryItem {
  id: string;
  type: string;
  prompt: string;
  imageUrl: string | null;
  videoUrl?: string | null;
  model: string;
  createdAt: string;
  status: string;
}

const typeIcons: Record<string, typeof ImageIcon> = {
  TEXT_TO_IMAGE: ImageIcon,
  IMAGE_TO_IMAGE: ImageIcon,
  EDIT: Wand2,
  UPSCALE: Wand2,
  THREE_D: Box,
};

export default function HistoryPage() {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const typeParam = filter !== "all" ? `&type=${filter}` : "";
  const searchParam = searchQuery ? `&search=${encodeURIComponent(searchQuery)}` : "";

  const { data, isLoading, mutate } = useSWR<{
    generations: HistoryItem[];
    videos: HistoryItem[];
    stats: { generationCount: number; videoCount: number };
  }>(`/api/history?limit=50${typeParam}${searchParam}`);

  const items = [
    ...(data?.generations || []).map((g) => ({ ...g, itemType: "generation" as const })),
    ...(data?.videos || []).map((v) => ({ ...v, type: "video", itemType: "video" as const })),
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const toggleSelect = (id: string) => {
    setSelectedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const handleDelete = async () => {
    try {
      await fetch("/api/history", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: Array.from(selectedItems) }),
      });
      setSelectedItems(new Set());
      mutate();
      toast.success("Items deleted");
    } catch {
      toast.error("Failed to delete items");
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Clock className="h-6 w-6" />
          Generation History
        </h1>
        <p className="text-muted-foreground mt-1">
          View and manage your past generations
        </p>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search prompts..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          <Tabs value={filter} onValueChange={setFilter}>
            <TabsList>
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="image">Images</TabsTrigger>
              <TabsTrigger value="video">Videos</TabsTrigger>
              <TabsTrigger value="3d">3D</TabsTrigger>
              <TabsTrigger value="upscale">Upscale</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {selectedItems.size > 0 && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {selectedItems.size} selected
            </span>
            <Button variant="destructive" size="sm" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* History Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : items.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {items.map((item) => {
            const Icon = typeIcons[item.type] || ImageIcon;
            const isSelected = selectedItems.has(item.id);

            return (
              <div
                key={item.id}
                className={cn(
                  "group relative rounded-xl border bg-card overflow-hidden cursor-pointer transition-all",
                  isSelected ? "border-primary ring-2 ring-primary" : "border-[#2a2a2a] hover:border-[#333]"
                )}
                onClick={() => toggleSelect(item.id)}
              >
                <div className="aspect-square relative">
                  {item.imageUrl ? (
                    <img
                      src={item.imageUrl}
                      alt={item.prompt}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Icon className="h-8 w-8 text-muted-foreground" />
                    </div>
                  )}

                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="gap-1">
                      <Icon className="h-3 w-3" />
                      {item.type === "TEXT_TO_IMAGE" ? "image" : item.type.toLowerCase().replace("_", " ")}
                    </Badge>
                  </div>

                  <div
                    className={cn(
                      "absolute top-2 right-2 w-5 h-5 rounded-full border-2 transition-colors",
                      isSelected
                        ? "bg-primary border-primary"
                        : "bg-black/50 border-white/50 opacity-0 group-hover:opacity-100"
                    )}
                  >
                    {isSelected && (
                      <svg className="w-full h-full text-white" viewBox="0 0 24 24">
                        <path
                          fill="currentColor"
                          d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"
                        />
                      </svg>
                    )}
                  </div>

                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button variant="secondary" size="icon" onClick={(e) => e.stopPropagation()}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="icon" onClick={(e) => e.stopPropagation()}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="p-3">
                  <p className="text-sm truncate mb-1">{item.prompt}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{item.model}</span>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <Clock className="h-12 w-12 text-[#333] mx-auto mb-4" strokeWidth={1.5} />
          <h3 className="text-lg font-semibold mb-2">No history found</h3>
          <p className="text-[#555]">
            {searchQuery ? "Try a different search term" : "Start generating to see your history"}
          </p>
        </div>
      )}
    </div>
  );
}
