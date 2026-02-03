import useSWR, { SWRConfiguration } from "swr";
import useSWRMutation from "swr/mutation";

// Generic fetcher
async function fetcher<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }
  return res.json();
}

// POST/PATCH/DELETE fetcher
async function mutationFetcher<T>(
  url: string,
  { arg }: { arg: { method?: string; body?: unknown } }
): Promise<T> {
  const res = await fetch(url, {
    method: arg.method || "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: arg.body ? JSON.stringify(arg.body) : undefined,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(error.error || "Request failed");
  }
  return res.json();
}

// ============ User Hooks ============

export interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  subscriptionTier: string;
  creditsRemaining: number;
  createdAt: string;
  stats: {
    generations: number;
    videos: number;
    trainedModels: number;
    workflows: number;
  };
}

export function useUser(config?: SWRConfiguration) {
  return useSWR<User>("/api/user", fetcher, {
    revalidateOnFocus: false,
    ...config,
  });
}

export function useUpdateUser() {
  return useSWRMutation<User, Error, string, { body: Partial<User> }>(
    "/api/user",
    (url, { arg }) => mutationFetcher(url, { method: "PATCH", body: arg.body })
  );
}

// ============ Usage Hooks ============

export interface UsageData {
  credits: {
    remaining: number;
    resetsAt: string | null;
  };
  tier: string;
  limits: {
    daily: number;
    monthly: number;
    images: number;
    videos: number;
  };
  usage: {
    today: Record<string, number>;
    month: Record<string, number>;
    generations: Record<string, number>;
    videos: number;
  };
}

export function useUsage(config?: SWRConfiguration) {
  return useSWR<UsageData>("/api/user/usage", fetcher, {
    revalidateOnFocus: true,
    refreshInterval: 60000, // Refresh every minute
    ...config,
  });
}

// ============ Generation Hooks ============

export interface Generation {
  id: string;
  type: string;
  prompt: string;
  imageUrl: string | null;
  width: number | null;
  height: number | null;
  model: string;
  status: string;
  parameters: Record<string, unknown>;
  createdAt: string;
}

export interface GenerationsResponse {
  generations: Generation[];
  total: number;
  limit: number;
  offset: number;
}

export function useGenerations(
  params?: { limit?: number; offset?: number; type?: string },
  config?: SWRConfiguration
) {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.offset) searchParams.set("offset", params.offset.toString());
  if (params?.type) searchParams.set("type", params.type);

  const url = `/api/generate/image?${searchParams.toString()}`;
  return useSWR<GenerationsResponse>(url, fetcher, config);
}

export function useGenerateImage() {
  return useSWRMutation<
    Generation,
    Error,
    string,
    {
      body: {
        prompt: string;
        negativePrompt?: string;
        model?: string;
        width?: number;
        height?: number;
        steps?: number;
        guidance?: number;
      };
    }
  >("/api/generate/image", (url, { arg }) => mutationFetcher(url, { body: arg.body }));
}

// ============ Video Hooks ============

export interface Video {
  id: string;
  type: string;
  prompt: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  model: string;
  status: string;
  durationSeconds: number | null;
  createdAt: string;
}

export interface VideosResponse {
  videos: Video[];
  total: number;
  limit: number;
  offset: number;
}

export function useVideos(
  params?: { limit?: number; offset?: number },
  config?: SWRConfiguration
) {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.offset) searchParams.set("offset", params.offset.toString());

  const url = `/api/generate/video?${searchParams.toString()}`;
  return useSWR<VideosResponse>(url, fetcher, config);
}

export function useGenerateVideo() {
  return useSWRMutation<
    { id: string; status: string; videoUrl?: string },
    Error,
    string,
    {
      body: {
        prompt: string;
        imageUrl?: string;
        model?: string;
        duration?: number;
        aspectRatio?: string;
      };
    }
  >("/api/generate/video", (url, { arg }) => mutationFetcher(url, { body: arg.body }));
}

// ============ 3D Generation Hooks ============

export function use3DGenerations(
  params?: { limit?: number; offset?: number },
  config?: SWRConfiguration
) {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.offset) searchParams.set("offset", params.offset.toString());

  const url = `/api/generate/3d?${searchParams.toString()}`;
  return useSWR<GenerationsResponse>(url, fetcher, config);
}

export function useGenerate3D() {
  return useSWRMutation<
    { id: string; status: string; previewUrl?: string; modelUrl?: string },
    Error,
    string,
    {
      body: {
        imageUrl: string;
        model?: string;
        format?: string;
        quality?: string;
      };
    }
  >("/api/generate/3d", (url, { arg }) => mutationFetcher(url, { body: arg.body }));
}

// ============ Enhancement Hooks ============

export function useEnhanceImage() {
  return useSWRMutation<
    { id: string; status: string; imageUrl?: string; enhancedSize?: { width: number; height: number } },
    Error,
    string,
    {
      body: {
        imageUrl: string;
        scale?: string;
        model?: string;
        denoise?: number;
        faceEnhance?: boolean;
      };
    }
  >("/api/enhance", (url, { arg }) => mutationFetcher(url, { body: arg.body }));
}

// ============ Training Hooks ============

export interface TrainedModel {
  id: string;
  name: string;
  type: string;
  baseModel: string;
  triggerWord: string;
  status: string;
  trainingConfig: Record<string, unknown>;
  modelUrl: string | null;
  previewImages: string[];
  createdAt: string;
}

export interface TrainedModelsResponse {
  models: TrainedModel[];
  total: number;
  limit: number;
  offset: number;
}

export function useTrainedModels(
  params?: { limit?: number; offset?: number; status?: string },
  config?: SWRConfiguration
) {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.offset) searchParams.set("offset", params.offset.toString());
  if (params?.status) searchParams.set("status", params.status);

  const url = `/api/train?${searchParams.toString()}`;
  return useSWR<TrainedModelsResponse>(url, fetcher, config);
}

export function useCreateTraining() {
  return useSWRMutation<
    { id: string; name: string; status: string; estimatedTime: string },
    Error,
    string,
    {
      body: {
        name: string;
        type?: string;
        baseModel?: string;
        triggerWord: string;
        images: string[];
        trainingSteps?: number;
        learningRate?: number;
        loraRank?: number;
      };
    }
  >("/api/train", (url, { arg }) => mutationFetcher(url, { body: arg.body }));
}

// ============ Workflow Hooks ============

export interface Workflow {
  id: string;
  name: string;
  description: string | null;
  nodes: unknown[];
  connections: unknown[];
  isPublic: boolean;
  runCount: number;
  createdAt: string;
  updatedAt: string;
  user?: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export interface WorkflowsResponse {
  workflows: Workflow[];
  total: number;
  limit: number;
  offset: number;
}

export function useWorkflows(
  params?: { limit?: number; offset?: number; includePublic?: boolean },
  config?: SWRConfiguration
) {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.offset) searchParams.set("offset", params.offset.toString());
  if (params?.includePublic) searchParams.set("includePublic", "true");

  const url = `/api/workflows?${searchParams.toString()}`;
  return useSWR<WorkflowsResponse>(url, fetcher, config);
}

export function useWorkflow(id: string | null, config?: SWRConfiguration) {
  return useSWR<Workflow & { isOwner: boolean }>(
    id ? `/api/workflows/${id}` : null,
    fetcher,
    config
  );
}

export function useCreateWorkflow() {
  return useSWRMutation<
    Workflow,
    Error,
    string,
    {
      body: {
        name: string;
        description?: string;
        nodes?: unknown[];
        connections?: unknown[];
        isPublic?: boolean;
      };
    }
  >("/api/workflows", (url, { arg }) => mutationFetcher(url, { body: arg.body }));
}

export function useUpdateWorkflow(id: string) {
  return useSWRMutation<
    Workflow,
    Error,
    string,
    {
      body: Partial<{
        name: string;
        description: string;
        nodes: unknown[];
        connections: unknown[];
        isPublic: boolean;
      }>;
    }
  >(`/api/workflows/${id}`, (url, { arg }) =>
    mutationFetcher(url, { method: "PATCH", body: arg.body })
  );
}

export function useDeleteWorkflow(id: string) {
  return useSWRMutation<{ success: boolean }, Error, string, void>(
    `/api/workflows/${id}`,
    (url) => mutationFetcher(url, { method: "DELETE" })
  );
}

export function useExecuteWorkflow(id: string) {
  return useSWRMutation<
    { executionId: string; status: string; outputs: Record<string, unknown>; creditsUsed: number },
    Error,
    string,
    { body: { inputs?: Record<string, unknown> } }
  >(`/api/workflows/${id}/execute`, (url, { arg }) =>
    mutationFetcher(url, { body: arg.body })
  );
}

// ============ Gallery Hooks ============

export interface GalleryItem {
  id: string;
  type: string;
  prompt: string;
  imageUrl: string | null;
  width: number | null;
  height: number | null;
  model: string;
  likes: number;
  createdAt: string;
  isLiked: boolean;
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

export interface GalleryResponse {
  items: GalleryItem[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export function useGallery(
  params?: {
    limit?: number;
    offset?: number;
    type?: string;
    sort?: string;
    model?: string;
    userId?: string;
  },
  config?: SWRConfiguration
) {
  const searchParams = new URLSearchParams();
  if (params?.limit) searchParams.set("limit", params.limit.toString());
  if (params?.offset) searchParams.set("offset", params.offset.toString());
  if (params?.type) searchParams.set("type", params.type);
  if (params?.sort) searchParams.set("sort", params.sort);
  if (params?.model) searchParams.set("model", params.model);
  if (params?.userId) searchParams.set("userId", params.userId);

  const url = `/api/gallery?${searchParams.toString()}`;
  return useSWR<GalleryResponse>(url, fetcher, config);
}

export function useLikeItem() {
  return useSWRMutation<
    { id: string; likes: number; isLiked: boolean },
    Error,
    string,
    { body: { generationId: string; action: "like" | "unlike" } }
  >("/api/gallery", (url, { arg }) => mutationFetcher(url, { body: arg.body }));
}
