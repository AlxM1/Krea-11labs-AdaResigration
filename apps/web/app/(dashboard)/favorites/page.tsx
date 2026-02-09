"use client";

import useSWR from "swr";
import { Star, Heart, Download, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import toast from "react-hot-toast";

interface FavoriteItem {
  id: string;
  imageUrl: string | null;
  prompt: string;
  model?: string;
}

export default function FavoritesPage() {
  const { data, isLoading, mutate } = useSWR<{ favorites: FavoriteItem[] }>("/api/favorites?type=images");

  const favorites = data?.favorites || [];

  const handleRemove = async (id: string) => {
    try {
      await fetch("/api/favorites", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, type: "images" }),
      });
      mutate();
      toast.success("Removed from favorites");
    } catch {
      toast.error("Failed to remove from favorites");
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Star className="h-6 w-6" />
          Favorites
        </h1>
        <p className="text-muted-foreground mt-1">
          Your saved creations
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : favorites.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {favorites.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-xl border border-border overflow-hidden"
            >
              <div className="aspect-square">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.prompt}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <Star className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
              </div>

              {/* Favorite indicator */}
              <div className="absolute top-2 right-2">
                <Heart className="h-5 w-5 text-red-500 fill-red-500" />
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                {item.imageUrl && (
                  <a href={item.imageUrl} download>
                    <Button variant="secondary" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </a>
                )}
                <Button variant="secondary" size="icon" onClick={() => handleRemove(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              {/* Info */}
              <div className="p-3">
                <p className="text-sm truncate">{item.prompt}</p>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <Star className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
          <p className="text-muted-foreground">
            Click the heart icon on any creation to save it here
          </p>
        </div>
      )}
    </div>
  );
}
