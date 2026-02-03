"use client";

import { Star, Heart, Download, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const mockFavorites = [
  { id: "1", imageUrl: "https://via.placeholder.com/300x300/7c3aed/ffffff?text=Fav1", prompt: "A beautiful sunset over mountains" },
  { id: "2", imageUrl: "https://via.placeholder.com/300x400/ec4899/ffffff?text=Fav2", prompt: "Cyberpunk city at night" },
  { id: "3", imageUrl: "https://via.placeholder.com/300x300/06b6d4/ffffff?text=Fav3", prompt: "Portrait of a fantasy character" },
];

export default function FavoritesPage() {
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

      {mockFavorites.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {mockFavorites.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-xl border border-border overflow-hidden"
            >
              <div className="aspect-square">
                <img
                  src={item.imageUrl}
                  alt={item.prompt}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Favorite indicator */}
              <div className="absolute top-2 right-2">
                <Heart className="h-5 w-5 text-red-500 fill-red-500" />
              </div>

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button variant="secondary" size="icon">
                  <Download className="h-4 w-4" />
                </Button>
                <Button variant="secondary" size="icon">
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
