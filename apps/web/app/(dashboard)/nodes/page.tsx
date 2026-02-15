"use client";

import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import {
  Layers,
  Plus,
  Play,
  Save,
  Share2,
  Trash2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Image as ImageIcon,
  Video,
  Wand2,
  Type,
  Box,
  ArrowRight,
  Settings,
  Download,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface Node {
  id: string;
  type: string;
  position: { x: number; y: number };
  data: Record<string, unknown>;
}

const nodeTypes = [
  { id: "text-input", label: "Text Input", icon: Type, category: "input", color: "bg-[#6c5ce7]" },
  { id: "image-input", label: "Image Upload", icon: ImageIcon, category: "input", color: "bg-green-500" },
  { id: "image-gen", label: "Image Generation", icon: ImageIcon, category: "ai", color: "bg-purple-500" },
  { id: "video-gen", label: "Video Generation", icon: Video, category: "ai", color: "bg-pink-500" },
  { id: "upscale", label: "Upscale", icon: Wand2, category: "ai", color: "bg-yellow-500" },
  { id: "3d-gen", label: "3D Generation", icon: Box, category: "ai", color: "bg-orange-500" },
  { id: "image-output", label: "Image Output", icon: Download, category: "output", color: "bg-emerald-500" },
  { id: "video-output", label: "Video Output", icon: Download, category: "output", color: "bg-cyan-500" },
];

const sampleWorkflow: Node[] = [
  { id: "1", type: "text-input", position: { x: 100, y: 200 }, data: { value: "A beautiful sunset" } },
  { id: "2", type: "image-gen", position: { x: 350, y: 200 }, data: {} },
  { id: "3", type: "upscale", position: { x: 600, y: 200 }, data: {} },
  { id: "4", type: "image-output", position: { x: 850, y: 200 }, data: {} },
];

export default function NodesPage() {
  const [nodes, setNodes] = useState<Node[]>(sampleWorkflow);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [workflowName, setWorkflowName] = useState("My Workflow");
  const [isRunning, setIsRunning] = useState(false);
  const [zoom, setZoom] = useState(100);

  const handleAddNode = (type: string) => {
    const nodeType = nodeTypes.find((n) => n.id === type);
    if (!nodeType) return;

    const newNode: Node = {
      id: Date.now().toString(),
      type,
      position: { x: 200 + Math.random() * 200, y: 200 + Math.random() * 100 },
      data: {},
    };
    setNodes([...nodes, newNode]);
  };

  const handleDeleteNode = (id: string) => {
    setNodes(nodes.filter((n) => n.id !== id));
    if (selectedNode === id) setSelectedNode(null);
  };

  const handleRunWorkflow = async () => {
    setIsRunning(true);
    toast.success("Running workflow...");
    await new Promise((resolve) => setTimeout(resolve, 3000));
    setIsRunning(false);
    toast.success("Workflow complete!");
  };

  const getNodeType = (typeId: string) => nodeTypes.find((n) => n.id === typeId);

  return (
    <div className="flex h-full">
      {/* Left Panel - Node Library */}
      <div className="w-64 border-r border-border flex flex-col">
        <div className="p-4 border-b border-border">
          <h2 className="font-semibold flex items-center gap-2">
            <Layers className="h-4 w-4" />
            Node Library
          </h2>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          {/* Input Nodes */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Inputs
            </p>
            <div className="space-y-1">
              {nodeTypes.filter((n) => n.category === "input").map((node) => (
                <button
                  key={node.id}
                  onClick={() => handleAddNode(node.id)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <div className={cn("w-6 h-6 rounded flex items-center justify-center", node.color)}>
                    <node.icon className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm">{node.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* AI Nodes */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              AI Processing
            </p>
            <div className="space-y-1">
              {nodeTypes.filter((n) => n.category === "ai").map((node) => (
                <button
                  key={node.id}
                  onClick={() => handleAddNode(node.id)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <div className={cn("w-6 h-6 rounded flex items-center justify-center", node.color)}>
                    <node.icon className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm">{node.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Output Nodes */}
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Outputs
            </p>
            <div className="space-y-1">
              {nodeTypes.filter((n) => n.category === "output").map((node) => (
                <button
                  key={node.id}
                  onClick={() => handleAddNode(node.id)}
                  className="w-full flex items-center gap-2 p-2 rounded-lg hover:bg-muted transition-colors text-left"
                >
                  <div className={cn("w-6 h-6 rounded flex items-center justify-center", node.color)}>
                    <node.icon className="h-3 w-3 text-white" />
                  </div>
                  <span className="text-sm">{node.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Main Canvas */}
      <div className="flex-1 flex flex-col">
        {/* Toolbar */}
        <div className="h-14 border-b border-border px-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Input
              value={workflowName}
              onChange={(e) => setWorkflowName(e.target.value)}
              className="w-48 h-8"
            />
            <Badge variant="outline">
              {nodes.length} nodes
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 mr-4">
              <Button variant="ghost" size="icon" onClick={() => setZoom(Math.max(50, zoom - 10))}>
                <ZoomOut className="h-4 w-4" />
              </Button>
              <span className="text-sm w-12 text-center">{zoom}%</span>
              <Button variant="ghost" size="icon" onClick={() => setZoom(Math.min(200, zoom + 10))}>
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon">
                <Maximize2 className="h-4 w-4" />
              </Button>
            </div>

            <Button variant="outline" size="sm">
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-1" />
              Share
            </Button>
            <Button
              variant="gradient"
              size="sm"
              onClick={handleRunWorkflow}
              isLoading={isRunning}
            >
              <Play className="h-4 w-4 mr-1" />
              Run
            </Button>
          </div>
        </div>

        {/* Canvas */}
        <div
          className="flex-1 bg-[#0a0a0a] overflow-hidden relative"
          style={{
            backgroundImage: "radial-gradient(circle, #333 1px, transparent 1px)",
            backgroundSize: `${20 * (zoom / 100)}px ${20 * (zoom / 100)}px`,
          }}
        >
          {/* Nodes */}
          <div
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: "top left" }}
            className="absolute inset-0"
          >
            {nodes.map((node, index) => {
              const nodeType = getNodeType(node.type);
              if (!nodeType) return null;

              return (
                <motion.div
                  key={node.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={cn(
                    "absolute cursor-move",
                    selectedNode === node.id && "ring-2 ring-primary"
                  )}
                  style={{ left: node.position.x, top: node.position.y }}
                  onClick={() => setSelectedNode(node.id)}
                >
                  <Card className="w-48 bg-card/90 backdrop-blur-sm">
                    <div className={cn("h-1 rounded-t-xl", nodeType.color)} />
                    <div className="p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <nodeType.icon className="h-4 w-4" />
                          <span className="text-sm font-medium">{nodeType.label}</span>
                        </div>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteNode(node.id);
                          }}
                          className="text-muted-foreground hover:text-destructive"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Connection points */}
                      <div className="flex justify-between">
                        {nodeType.category !== "input" && (
                          <div className="w-3 h-3 rounded-full bg-muted border-2 border-border -ml-4" />
                        )}
                        <div className="flex-1" />
                        {nodeType.category !== "output" && (
                          <div className="w-3 h-3 rounded-full bg-primary -mr-4" />
                        )}
                      </div>
                    </div>
                  </Card>
                </motion.div>
              );
            })}

            {/* Connection lines (simplified) */}
            <svg className="absolute inset-0 pointer-events-none" style={{ overflow: "visible" }}>
              {nodes.map((node, index) => {
                if (index === nodes.length - 1) return null;
                const nextNode = nodes[index + 1];
                return (
                  <line
                    key={`line-${node.id}`}
                    x1={node.position.x + 192}
                    y1={node.position.y + 30}
                    x2={nextNode.position.x}
                    y2={nextNode.position.y + 30}
                    stroke="hsl(var(--primary))"
                    strokeWidth="2"
                    strokeDasharray="5,5"
                  />
                );
              })}
            </svg>
          </div>

          {/* Empty state */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <Layers className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No nodes yet</h3>
                <p className="text-muted-foreground text-sm mb-4">
                  Drag nodes from the library to build your workflow
                </p>
                <Button variant="outline" onClick={() => handleAddNode("text-input")}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add First Node
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Node Settings */}
      {selectedNode && (
        <div className="w-72 border-l border-border p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Node Settings
            </h3>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1 block">Node Type</label>
              <p className="text-sm text-muted-foreground">
                {getNodeType(nodes.find((n) => n.id === selectedNode)?.type || "")?.label}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-1 block">Node ID</label>
              <p className="text-sm text-muted-foreground font-mono">{selectedNode}</p>
            </div>

            <Button
              variant="destructive"
              size="sm"
              className="w-full"
              onClick={() => handleDeleteNode(selectedNode)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete Node
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
