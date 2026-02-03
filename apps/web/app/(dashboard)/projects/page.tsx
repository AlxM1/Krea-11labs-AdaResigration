"use client";

import { useState } from "react";
import {
  FolderOpen,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Image as ImageIcon,
  Video,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

const mockProjects = [
  {
    id: "1",
    name: "Brand Campaign",
    type: "collection",
    itemCount: 12,
    thumbnail: "https://via.placeholder.com/200x200/7c3aed/ffffff?text=Project",
    updatedAt: "2 days ago",
  },
  {
    id: "2",
    name: "Product Shots",
    type: "collection",
    itemCount: 8,
    thumbnail: "https://via.placeholder.com/200x200/ec4899/ffffff?text=Project",
    updatedAt: "1 week ago",
  },
  {
    id: "3",
    name: "Social Media",
    type: "workflow",
    itemCount: 5,
    thumbnail: "https://via.placeholder.com/200x200/06b6d4/ffffff?text=Workflow",
    updatedAt: "2 weeks ago",
  },
];

const typeIcons = {
  collection: FolderOpen,
  workflow: Layers,
  canvas: ImageIcon,
  video: Video,
};

export default function ProjectsPage() {
  const [showNewProject, setShowNewProject] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");

  const handleCreateProject = () => {
    if (!newProjectName.trim()) {
      toast.error("Please enter a project name");
      return;
    }
    toast.success("Project created!");
    setShowNewProject(false);
    setNewProjectName("");
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

      {mockProjects.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {mockProjects.map((project) => {
            const Icon = typeIcons[project.type as keyof typeof typeIcons] || FolderOpen;

            return (
              <Card
                key={project.id}
                className="group cursor-pointer hover:border-primary/50 transition-colors"
              >
                <CardContent className="p-0">
                  {/* Thumbnail */}
                  <div className="aspect-video bg-muted relative rounded-t-xl overflow-hidden">
                    <img
                      src={project.thumbnail}
                      alt={project.name}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2">
                      <Badge variant="secondary" className="gap-1">
                        <Icon className="h-3 w-3" />
                        {project.type}
                      </Badge>
                    </div>
                    <button className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity">
                      <MoreHorizontal className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Info */}
                  <div className="p-4">
                    <h3 className="font-semibold mb-1">{project.name}</h3>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{project.itemCount} items</span>
                      <span>{project.updatedAt}</span>
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
            <Button variant="gradient" onClick={handleCreateProject}>
              Create Project
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
