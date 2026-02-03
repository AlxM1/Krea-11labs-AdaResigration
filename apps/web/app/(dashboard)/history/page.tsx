"use client";

import { useState } from "react";
import {
  Clock,
  Image as ImageIcon,
  Video,
  Box,
  Wand2,
  Download,
  Trash2,
  Filter,
  Search,
  MoreHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

const mockHistory = [
  {
    id: "1",
    type: "image",
    prompt: "A futuristic city at sunset with flying cars",
    imageUrl: "https://via.placeholder.com/200x200/7c3aed/ffffff?text=Image",
    model: "Flux Dev",
    createdAt: "2 hours ago",
    status: "completed",
  },
  {
    id: "2",
    type: "video",
    prompt: "Ocean waves crashing on a beach",
    imageUrl: "https://via.placeholder.com/200x200/ec4899/ffffff?text=Video",
    model: "Kling 2.5",
    createdAt: "5 hours ago",
    status: "completed",
  },
  {
    id: "3",
    type: "image",
    prompt: "Portrait of a cyberpunk character",
    imageUrl: "https://via.placeholder.com/200x200/06b6d4/ffffff?text=Image",
    model: "SDXL",
    createdAt: "1 day ago",
    status: "completed",
  },
  {
    id: "4",
    type: "upscale",
    prompt: "Upscaled 4x",
    imageUrl: "https://via.placeholder.com/200x200/10b981/ffffff?text=Upscale",
    model: "Real-ESRGAN",
    createdAt: "1 day ago",
    status: "completed",
  },
  {
    id: "5",
    type: "3d",
    prompt: "A detailed robot figure",
    imageUrl: "https://via.placeholder.com/200x200/f59e0b/ffffff?text=3D",
    model: "TripoSR",
    createdAt: "2 days ago",
    status: "completed",
  },
];

const typeIcons = {
  image: ImageIcon,
  video: Video,
  "3d": Box,
  upscale: Wand2,
};

export default function HistoryPage() {
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const filteredHistory = mockHistory.filter((item) => {
    if (filter !== "all" && item.type !== filter) return false;
    if (searchQuery && !item.prompt.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

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
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-1" />
              Download
            </Button>
            <Button variant="destructive" size="sm">
              <Trash2 className="h-4 w-4 mr-1" />
              Delete
            </Button>
          </div>
        )}
      </div>

      {/* History Grid */}
      {filteredHistory.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredHistory.map((item) => {
            const Icon = typeIcons[item.type as keyof typeof typeIcons] || ImageIcon;
            const isSelected = selectedItems.has(item.id);

            return (
              <div
                key={item.id}
                className={cn(
                  "group relative rounded-xl border bg-card overflow-hidden cursor-pointer transition-all",
                  isSelected ? "border-primary ring-2 ring-primary" : "border-border hover:border-primary/50"
                )}
                onClick={() => toggleSelect(item.id)}
              >
                {/* Image */}
                <div className="aspect-square relative">
                  <img
                    src={item.imageUrl}
                    alt={item.prompt}
                    className="w-full h-full object-cover"
                  />

                  {/* Type badge */}
                  <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="gap-1">
                      <Icon className="h-3 w-3" />
                      {item.type}
                    </Badge>
                  </div>

                  {/* Selection indicator */}
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

                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button variant="secondary" size="icon" onClick={(e) => e.stopPropagation()}>
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="icon" onClick={(e) => e.stopPropagation()}>
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Info */}
                <div className="p-3">
                  <p className="text-sm truncate mb-1">{item.prompt}</p>
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{item.model}</span>
                    <span>{item.createdAt}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16">
          <Clock className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No history found</h3>
          <p className="text-muted-foreground">
            {searchQuery ? "Try a different search term" : "Start generating to see your history"}
          </p>
        </div>
      )}
    </div>
  );
}
