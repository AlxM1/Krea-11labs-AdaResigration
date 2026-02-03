"use client";

import { useSession } from "next-auth/react";
import {
  User,
  Image as ImageIcon,
  Video,
  Star,
  Calendar,
  Settings,
  Share2,
  Grid,
  List,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import Link from "next/link";

const mockStats = {
  generations: 156,
  videos: 23,
  favorites: 45,
  joined: "January 2024",
};

const mockCreations = [
  { id: "1", imageUrl: "https://via.placeholder.com/300x300/7c3aed/ffffff?text=1", type: "image" },
  { id: "2", imageUrl: "https://via.placeholder.com/300x400/ec4899/ffffff?text=2", type: "image" },
  { id: "3", imageUrl: "https://via.placeholder.com/300x300/06b6d4/ffffff?text=3", type: "video" },
  { id: "4", imageUrl: "https://via.placeholder.com/300x350/f59e0b/ffffff?text=4", type: "image" },
  { id: "5", imageUrl: "https://via.placeholder.com/300x300/10b981/ffffff?text=5", type: "image" },
  { id: "6", imageUrl: "https://via.placeholder.com/300x450/8b5cf6/ffffff?text=6", type: "video" },
];

export default function ProfilePage() {
  const { data: session } = useSession();

  return (
    <div className="max-w-6xl mx-auto p-6">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6 mb-8">
        <Avatar src={session?.user?.image} size="xl" className="w-24 h-24" />

        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold">{session?.user?.name || "User"}</h1>
            <Badge variant="secondary">Free Plan</Badge>
          </div>
          <p className="text-muted-foreground mb-4">
            {session?.user?.email}
          </p>

          {/* Stats */}
          <div className="flex gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold">{mockStats.generations}</div>
              <div className="text-sm text-muted-foreground">Generations</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{mockStats.videos}</div>
              <div className="text-sm text-muted-foreground">Videos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{mockStats.favorites}</div>
              <div className="text-sm text-muted-foreground">Favorites</div>
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Link href="/settings">
            <Button variant="outline">
              <Settings className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
          </Link>
          <Button variant="outline">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs defaultValue="creations">
        <TabsList className="mb-6">
          <TabsTrigger value="creations" className="gap-2">
            <Grid className="h-4 w-4" />
            Creations
          </TabsTrigger>
          <TabsTrigger value="favorites" className="gap-2">
            <Star className="h-4 w-4" />
            Favorites
          </TabsTrigger>
          <TabsTrigger value="models" className="gap-2">
            <User className="h-4 w-4" />
            Trained Models
          </TabsTrigger>
        </TabsList>

        <TabsContent value="creations">
          <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {mockCreations.map((item) => (
              <div
                key={item.id}
                className="break-inside-avoid rounded-xl overflow-hidden border border-border group relative"
              >
                <img
                  src={item.imageUrl}
                  alt=""
                  className="w-full object-cover"
                />
                {item.type === "video" && (
                  <div className="absolute top-2 right-2">
                    <Badge variant="secondary">
                      <Video className="h-3 w-3" />
                    </Badge>
                  </div>
                )}
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="favorites">
          <div className="text-center py-16">
            <Star className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No favorites yet</h3>
            <p className="text-muted-foreground">
              Like creations to save them here
            </p>
          </div>
        </TabsContent>

        <TabsContent value="models">
          <div className="text-center py-16">
            <User className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
            <h3 className="text-lg font-semibold mb-2">No trained models</h3>
            <p className="text-muted-foreground mb-4">
              Train custom AI models on your data
            </p>
            <Link href="/train">
              <Button variant="gradient">
                Train Your First Model
              </Button>
            </Link>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
