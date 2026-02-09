"use client";

import { useState, useEffect } from "react";
import { useUser } from "@/hooks/use-user";
import {
  Settings,
  User,
  CreditCard,
  Bell,
  Shield,
  Palette,
  Key,
  Trash2,
  Save,
  ExternalLink,
  Zap,
  CheckCircle2,
  XCircle,
  Loader2,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import toast from "react-hot-toast";

interface ProviderStatus {
  name: string;
  available: boolean;
  configured: boolean;
  loading?: boolean;
}

export default function SettingsPage() {
  const { user } = useUser();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [isSaving, setIsSaving] = useState(false);

  // AI Provider states
  const [providers, setProviders] = useState<Record<string, ProviderStatus>>({});
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [isCheckingProviders, setIsCheckingProviders] = useState(false);

  const handleSaveProfile = async () => {
    setIsSaving(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setIsSaving(false);
    toast.success("Profile updated successfully");
  };

  // Check provider status
  const checkProviderStatus = async () => {
    setIsCheckingProviders(true);
    try {
      const response = await fetch('/api/admin/providers/status');
      const data = await response.json();
      setProviders(data.providers || {});
    } catch (error) {
      console.error('Failed to check provider status:', error);
    } finally {
      setIsCheckingProviders(false);
    }
  };

  useEffect(() => {
    checkProviderStatus();
  }, []);

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Settings className="h-8 w-8" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your account and preferences
        </p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList>
          <TabsTrigger value="profile" className="gap-2">
            <User className="h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="billing" className="gap-2">
            <CreditCard className="h-4 w-4" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="providers" className="gap-2">
            <Zap className="h-4 w-4" />
            AI Providers
          </TabsTrigger>
          <TabsTrigger value="api" className="gap-2">
            <Key className="h-4 w-4" />
            API
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your personal details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Avatar */}
              <div className="flex items-center gap-4">
                <Avatar src={user?.image} size="xl" />
                <div>
                  <Button variant="outline" size="sm">
                    Change Avatar
                  </Button>
                  <p className="text-xs text-muted-foreground mt-1">
                    JPG, PNG. Max 2MB.
                  </p>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="text-sm font-medium mb-2 block">Display Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your name"
                />
              </div>

              {/* Email */}
              <div>
                <label className="text-sm font-medium mb-2 block">Email</label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="your@email.com"
                  disabled
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Email cannot be changed
                </p>
              </div>

              <Button onClick={handleSaveProfile} isLoading={isSaving}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </CardContent>
          </Card>

          {/* Danger Zone */}
          <Card className="border-destructive/50">
            <CardHeader>
              <CardTitle className="text-destructive">Danger Zone</CardTitle>
              <CardDescription>Irreversible actions</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Billing Tab */}
        <TabsContent value="billing" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Current Plan</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between p-4 rounded-lg bg-muted">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">Free Plan</h3>
                    <Badge>Current</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">50 generations/day</p>
                </div>
                <Button variant="gradient">
                  Upgrade to Pro
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Usage This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Image Generations</span>
                    <span>25 / 50</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full w-1/2 bg-primary" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-1">
                    <span>Video Generations</span>
                    <span>3 / 10</span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div className="h-full w-[30%] bg-primary" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Methods</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm mb-4">
                No payment methods added
              </p>
              <Button variant="outline">
                <CreditCard className="h-4 w-4 mr-2" />
                Add Payment Method
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Email Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {[
                { id: "generation", label: "Generation Complete", desc: "Get notified when generations finish" },
                { id: "training", label: "Training Complete", desc: "Get notified when model training finishes" },
                { id: "updates", label: "Product Updates", desc: "New features and announcements" },
                { id: "tips", label: "Tips & Tutorials", desc: "Learn how to get the most out of Krya" },
              ].map((item) => (
                <div key={item.id} className="flex items-center justify-between py-2">
                  <div>
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-muted-foreground">{item.desc}</p>
                  </div>
                  <input type="checkbox" className="h-5 w-5 rounded" defaultChecked />
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Providers Tab */}
        <TabsContent value="providers" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>AI Provider Configuration</CardTitle>
                  <CardDescription>
                    Configure AI providers for generation features. At least one provider is recommended.
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={checkProviderStatus}
                  disabled={isCheckingProviders}
                >
                  {isCheckingProviders && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Check Status
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Provider Status Banner */}
              <div className="p-4 rounded-lg bg-muted">
                <div className="flex items-start gap-3">
                  <div className="text-sm">
                    <p className="font-medium mb-1">Provider Status</p>
                    <p className="text-muted-foreground">
                      Configure API keys in your environment variables (.env file) or through your hosting platform.
                      These settings are read-only here for security.
                    </p>
                  </div>
                </div>
              </div>

              {/* Cloud Providers */}
              <div>
                <h3 className="font-semibold mb-3">Cloud Providers</h3>
                <div className="space-y-3">
                  {[
                    { key: 'fal', name: 'fal.ai', env: 'FAL_KEY', url: 'https://fal.ai/dashboard/keys' },
                    { key: 'replicate', name: 'Replicate', env: 'REPLICATE_API_TOKEN', url: 'https://replicate.com/account/api-tokens' },
                    { key: 'together', name: 'Together AI', env: 'TOGETHER_API_KEY', url: 'https://api.together.xyz/settings/api-keys' },
                    { key: 'google', name: 'Google AI', env: 'GOOGLE_AI_API_KEY', url: 'https://aistudio.google.com/apikey' },
                    { key: 'nvidia', name: 'NVIDIA NIM', env: 'NVIDIA_API_KEY', url: 'https://build.nvidia.com/' },
                    { key: 'huggingface', name: 'HuggingFace', env: 'HF_TOKEN', url: 'https://huggingface.co/settings/tokens' },
                    { key: 'stability', name: 'Stability AI', env: 'STABILITY_API_KEY', url: 'https://platform.stability.ai/account/keys' },
                  ].map((provider) => (
                    <div key={provider.key} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        {providers[provider.key]?.available ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : providers[provider.key]?.configured ? (
                          <XCircle className="h-5 w-5 text-yellow-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium">{provider.name}</p>
                          <p className="text-xs text-muted-foreground">{provider.env}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {providers[provider.key]?.available ? (
                          <Badge variant="success">Available</Badge>
                        ) : providers[provider.key]?.configured ? (
                          <Badge variant="outline">Configured but unavailable</Badge>
                        ) : (
                          <Badge variant="outline">Not Configured</Badge>
                        )}
                        <Button variant="ghost" size="sm" asChild>
                          <a href={provider.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Local Providers */}
              <div>
                <h3 className="font-semibold mb-3">Local GPU Server</h3>
                <div className="space-y-3">
                  {[
                    { key: 'comfyui', name: 'ComfyUI', env: 'COMFYUI_URL', url: 'https://github.com/comfyanonymous/ComfyUI' },
                    { key: 'ollama', name: 'Ollama (LLM)', env: 'OLLAMA_URL', url: 'https://ollama.ai' },
                  ].map((provider) => (
                    <div key={provider.key} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        {providers[provider.key]?.available ? (
                          <CheckCircle2 className="h-5 w-5 text-green-500" />
                        ) : (
                          <XCircle className="h-5 w-5 text-muted-foreground" />
                        )}
                        <div>
                          <p className="font-medium">{provider.name}</p>
                          <p className="text-xs text-muted-foreground">{provider.env}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {providers[provider.key]?.available ? (
                          <Badge variant="success">Connected</Badge>
                        ) : (
                          <Badge variant="outline">Not Connected</Badge>
                        )}
                        <Button variant="ghost" size="sm" asChild>
                          <a href={provider.url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GPU Status Link */}
              <div className="pt-4 border-t border-border">
                <Button variant="link" className="p-0 h-auto" asChild>
                  <a href="/api/admin/gpu-status" target="_blank">
                    View detailed GPU server status →
                  </a>
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* API Tab */}
        <TabsContent value="api" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>API Keys</CardTitle>
              <CardDescription>Manage your API access</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-4 rounded-lg bg-muted">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium">Default API Key</span>
                  <Badge variant="outline">Active</Badge>
                </div>
                <div className="flex gap-2">
                  <Input
                    value="sk-krya-xxxxxxxxxxxxxxxxxxxx"
                    readOnly
                    className="font-mono text-sm"
                  />
                  <Button variant="outline" size="icon">
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <Button variant="outline">
                <Key className="h-4 w-4 mr-2" />
                Generate New Key
              </Button>

              <div className="pt-4 border-t border-border">
                <h4 className="font-medium mb-2">API Documentation</h4>
                <p className="text-sm text-muted-foreground mb-2">
                  Learn how to integrate Krya into your applications
                </p>
                <Button variant="link" className="p-0 h-auto">
                  View Documentation →
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
