"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Grid2X2,
  Image as ImageIcon,
  Video,
  Download,
  Heart,
  Trash2,
  Search,
  Filter,
  SlidersHorizontal,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Generation {
  id: string;
  type: string;
  prompt: string;
  model: string;
  status: string;
  imageUrl?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  createdAt: string;
}

type FilterType = "all" | "images" | "videos" | "upscales" | "logos";

export default function GalleryPage() {
  const [generations, setGenerations] = useState<Generation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterType>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<Generation | null>(null);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const limit = 40;

  useEffect(() => {
    fetchGenerations();
  }, [page]);

  const fetchGenerations = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/generations?limit=${limit}&offset=${page * limit}`);
      const data = await res.json();
      if (data.generations) {
        setGenerations(data.generations);
        setTotal(data.total || 0);
      }
    } catch {
      toast.error("Failed to load gallery");
    } finally {
      setLoading(false);
    }
  };

  const filteredGenerations = generations.filter((gen) => {
    if (filter === "images" && gen.type !== "TEXT_TO_IMAGE" && gen.type !== "IMAGE_TO_IMAGE") return false;
    if (filter === "videos" && gen.type !== "TEXT_TO_VIDEO" && gen.type !== "IMAGE_TO_VIDEO") return false;
    if (filter === "upscales" && gen.type !== "UPSCALE") return false;
    if (filter === "logos" && !gen.prompt?.toLowerCase().includes("logo")) return false;
    if (searchQuery && !gen.prompt?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  const filters: { id: FilterType; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: "all", label: "All", icon: Grid2X2 },
    { id: "images", label: "Images", icon: ImageIcon },
    { id: "videos", label: "Videos", icon: Video },
    { id: "upscales", label: "Upscales", icon: SlidersHorizontal },
    { id: "logos", label: "Logos", icon: Filter },
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)]">
      {/* Header */}
      <div className="border-b border-border px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Grid2X2 className="h-5 w-5" />
              Gallery
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {total} generation{total !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Search */}
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by prompt..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg border border-input bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mt-4">
          {filters.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors",
                filter === f.id
                  ? "bg-white/10 text-white"
                  : "text-gray-400 hover:text-white hover:bg-white/5"
              )}
            >
              <f.icon className="h-3.5 w-3.5" />
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="aspect-square rounded-xl bg-muted animate-pulse" />
            ))}
          </div>
        ) : filteredGenerations.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <ImageIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No generations yet</h3>
              <p className="text-muted-foreground">
                {searchQuery ? "No results match your search" : "Start creating to fill your gallery"}
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {filteredGenerations.map((gen, index) => (
                <motion.div
                  key={gen.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                >
                  <Card
                    className="group relative overflow-hidden cursor-pointer rounded-xl border-border/50 hover:border-border transition-colors"
                    onClick={() => setSelectedItem(gen)}
                  >
                    <div className="aspect-square bg-muted/50">
                      {gen.imageUrl || gen.thumbnailUrl ? (
                        <img
                          src={gen.thumbnailUrl || gen.imageUrl}
                          alt={gen.prompt}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          {gen.status === "PROCESSING" || gen.status === "PENDING" ? (
                            <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                          ) : (
                            <ImageIcon className="h-8 w-8 text-muted-foreground" />
                          )}
                        </div>
                      )}
                    </div>

                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex flex-col justify-end p-3">
                      <p className="text-white text-xs line-clamp-2 mb-2">{gen.prompt}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="secondary" className="text-[10px]">
                          {gen.model}
                        </Badge>
                        <div className="flex gap-1">
                          {gen.imageUrl && (
                            <a
                              href={gen.imageUrl}
                              download
                              onClick={(e) => e.stopPropagation()}
                              className="p-1 rounded bg-white/20 hover:bg-white/30 transition-colors"
                            >
                              <Download className="h-3 w-3 text-white" />
                            </a>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status badge */}
                    {gen.status !== "COMPLETED" && (
                      <Badge
                        variant={gen.status === "FAILED" ? "destructive" : "default"}
                        className="absolute top-2 right-2 text-[10px]"
                      >
                        {gen.status}
                      </Badge>
                    )}
                  </Card>
                </motion.div>
              ))}
            </div>

            {/* Pagination */}
            {total > limit && (
              <div className="flex items-center justify-center gap-2 mt-6">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(0, page - 1))}
                  disabled={page === 0}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page + 1} of {Math.ceil(total / limit)}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={(page + 1) * limit >= total}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {selectedItem && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8"
            onClick={() => setSelectedItem(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-4xl max-h-[90vh] bg-card rounded-2xl overflow-hidden border border-border"
              onClick={(e) => e.stopPropagation()}
            >
              {selectedItem.imageUrl && (
                <img
                  src={selectedItem.imageUrl}
                  alt={selectedItem.prompt}
                  className="max-h-[70vh] w-auto mx-auto"
                />
              )}
              <div className="p-4 border-t border-border">
                <p className="text-sm mb-2">{selectedItem.prompt}</p>
                <div className="flex items-center justify-between">
                  <div className="flex gap-2">
                    <Badge variant="outline">{selectedItem.model}</Badge>
                    <Badge variant="outline">{selectedItem.type}</Badge>
                    {selectedItem.width && selectedItem.height && (
                      <Badge variant="outline">{selectedItem.width}x{selectedItem.height}</Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {selectedItem.imageUrl && (
                      <a href={selectedItem.imageUrl} download>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-1" />
                          Download
                        </Button>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
