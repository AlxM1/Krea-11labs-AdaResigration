"use client";

import { useState } from "react";
import useSWR from "swr";
import {
  FolderOpen,
  Plus,
  MoreHorizontal,
  Image as ImageIcon,
  Video,
  Layers,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Project {
  id: string;
  name: string;
  type: string;
  thumbnail: string | null;
  updatedAt: string;
  _count?: { generations: number; videos: number };
}

const typeIcons: Record<string, typeof FolderOpen> = {
  COLLECTION: FolderOpen,
  WORKFLOW: Layers,
  CANVAS: ImageIcon,
  VIDEO: Video,
};

export default function ProjectsPage() {
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  const { data, isLoading, mutate } = useSWR<{ projects: Project[]; total: number }>("/api/projects");

  const projects = data?.projects || [];

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }

    setIsCreating(true);
    try {
      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newProjectName }),
      });

      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to create project");
        return;
      }

      toast.success("Project created!");
      setShowNewProject(false);
      setNewProjectName("");
      mutate();
    } catch {
      toast.error("Failed to create project");
    } finally {
      setIsCreating(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / 86400000);
    if (days < 1) return "Today";
    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;
    if (days < 30) return `${Math.floor(days / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderOpen className="h-6 w-6" />
            Projects
          </h1>
          <p className="text-muted-foreground mt-1">
            Organize your work into projects
          </p>
        </div>

        <Button variant="gradient" onClick={() => setShowNewProject(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : projects.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {projects.map((project) => {
            const Icon = typeIcons[project.type] || FolderOpen;
            const itemCount = (project._count?.generations || 0) + (project._count?.videos || 0);

            return (
              <Card
                key={project.id}
                className="group cursor-pointer hover:border-primary/50 transition-colors"
              >
                <CardContent className="p-0">
                  <div className="aspect-video bg-muted relative rounded-t-xl overflow-hidden">
                    {project.thumbnail ? (
                      <img
                        src={project.thumbnail}
                        alt={project.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Icon className="h-8 w-8 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="gap-1">
                        <Icon className="h-3 w-3" />
                        {project.type.toLowerCase()}
                      </Badge>
                    </div>
                    <button className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="p-4">
                    <h3 className="font-semibold mb-1">{project.name}</h3>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{itemCount} items</span>
                      <span>{formatDate(project.updatedAt)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {/* New Project Card */}
          <Card
            className="cursor-pointer border-dashed hover:border-primary/50 transition-colors"
            onClick={() => setShowNewProject(true)}
          >
            <CardContent className="p-0">
              <div className="aspect-video flex items-center justify-center">
                <div className="text-center">
                  <Plus className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground">New Project</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="text-center py-16">
          <FolderOpen className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
          <h3 className="text-lg font-semibold mb-2">No projects yet</h3>
          <p className="text-muted-foreground mb-4">
            Create a project to organize your work
          </p>
          <Button variant="gradient" onClick={() => setShowNewProject(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Your First Project
          </Button>
        </div>
      )}

      {/* New Project Modal */}
      <Modal
        isOpen={showNewProject}
        onClose={() => setShowNewProject(false)}
        title="Create New Project"
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">Project Name</label>
            <Input
              placeholder="e.g., Brand Campaign"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowNewProject(false)}>
              Cancel
            </Button>
            <Button variant="gradient" onClick={handleCreateProject} isLoading={isCreating}>
              Create Project
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
