/**
 * ComfyUI Local Provider
 * Connects to a local ComfyUI instance for image and video generation
 */

import {
  GenerationRequest,
  GenerationResponse,
  VideoGenerationRequest,
  VideoGenerationResponse,
} from "./providers";
import { uploadFromUrl } from "../storage/upload";

// ComfyUI WebSocket client ID
let clientId: string | null = null;

/**
 * ComfyUI workflow templates
 */
const WORKFLOWS = {
  // Basic text-to-image with SDXL/Flux
  textToImage: (params: {
    prompt: string;
    negativePrompt?: string;
    width: number;
    height: number;
    steps: number;
    cfgScale: number;
    seed: number;
    model: string;
    sampler?: string;
    scheduler?: string;
    batchSize?: number;
  }) => ({
    "3": {
      inputs: {
        seed: params.seed,
        steps: params.steps,
        cfg: params.cfgScale,
        sampler_name: params.sampler || "euler",
        scheduler: params.scheduler || "normal",
        denoise: 1,
        model: ["4", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["5", 0],
      },
      class_type: "KSampler",
    },
    "4": {
      inputs: {
        ckpt_name: params.model,
      },
      class_type: "CheckpointLoaderSimple",
    },
    "5": {
      inputs: {
        width: params.width,
        height: params.height,
        batch_size: params.batchSize || 1,
      },
      class_type: "EmptyLatentImage",
    },
    "6": {
      inputs: {
        text: params.prompt,
        clip: ["4", 1],
      },
      class_type: "CLIPTextEncode",
    },
    "7": {
      inputs: {
        text: params.negativePrompt || "",
        clip: ["4", 1],
      },
      class_type: "CLIPTextEncode",
    },
    "8": {
      inputs: {
        samples: ["3", 0],
        vae: ["4", 2],
      },
      class_type: "VAEDecode",
    },
    "9": {
      inputs: {
        filename_prefix: "krya",
        images: ["8", 0],
      },
      class_type: "SaveImage",
    },
  }),

  // Flux-specific workflow (uses different nodes)
  fluxTextToImage: (params: {
    prompt: string;
    width: number;
    height: number;
    steps: number;
    seed: number;
    model: string;
    batchSize?: number;
  }) => ({
    "6": {
      inputs: {
        text: params.prompt,
        clip: ["11", 0],
      },
      class_type: "CLIPTextEncode",
    },
    "8": {
      inputs: {
        samples: ["13", 0],
        vae: ["10", 0],
      },
      class_type: "VAEDecode",
    },
    "9": {
      inputs: {
        filename_prefix: "krya_flux",
        images: ["8", 0],
      },
      class_type: "SaveImage",
    },
    "10": {
      inputs: {
        vae_name: "ae.safetensors",
      },
      class_type: "VAELoader",
    },
    "11": {
      inputs: {
        clip_name1: "t5xxl_fp16.safetensors",
        clip_name2: "clip_l.safetensors",
        type: "flux",
      },
      class_type: "DualCLIPLoader",
    },
    "12": {
      inputs: {
        unet_name: params.model,
        weight_dtype: "default",
      },
      class_type: "UNETLoader",
    },
    "13": {
      inputs: {
        noise: ["25", 0],
        guider: ["22", 0],
        sampler: ["16", 0],
        sigmas: ["17", 0],
        latent_image: ["27", 0],
      },
      class_type: "SamplerCustomAdvanced",
    },
    "16": {
      inputs: {
        sampler_name: "euler",
      },
      class_type: "KSamplerSelect",
    },
    "17": {
      inputs: {
        scheduler: "simple",
        steps: params.steps,
        denoise: 1,
        model: ["12", 0],
      },
      class_type: "BasicScheduler",
    },
    "22": {
      inputs: {
        model: ["12", 0],
        conditioning: ["6", 0],
      },
      class_type: "BasicGuider",
    },
    "25": {
      inputs: {
        noise_seed: params.seed,
      },
      class_type: "RandomNoise",
    },
    "27": {
      inputs: {
        width: params.width,
        height: params.height,
        batch_size: params.batchSize || 1,
      },
      class_type: "EmptySD3LatentImage",
    },
  }),

  // Image-to-image workflow
  imageToImage: (params: {
    prompt: string;
    negativePrompt?: string;
    imageData: string;
    strength: number;
    steps: number;
    cfgScale: number;
    seed: number;
    model: string;
  }) => ({
    "3": {
      inputs: {
        seed: params.seed,
        steps: params.steps,
        cfg: params.cfgScale,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: params.strength,
        model: ["4", 0],
        positive: ["6", 0],
        negative: ["7", 0],
        latent_image: ["12", 0],
      },
      class_type: "KSampler",
    },
    "4": {
      inputs: {
        ckpt_name: params.model,
      },
      class_type: "CheckpointLoaderSimple",
    },
    "6": {
      inputs: {
        text: params.prompt,
        clip: ["4", 1],
      },
      class_type: "CLIPTextEncode",
    },
    "7": {
      inputs: {
        text: params.negativePrompt || "",
        clip: ["4", 1],
      },
      class_type: "CLIPTextEncode",
    },
    "8": {
      inputs: {
        samples: ["3", 0],
        vae: ["4", 2],
      },
      class_type: "VAEDecode",
    },
    "9": {
      inputs: {
        filename_prefix: "krya_i2i",
        images: ["8", 0],
      },
      class_type: "SaveImage",
    },
    "10": {
      inputs: {
        image: params.imageData,
        upload: "image",
      },
      class_type: "LoadImage",
    },
    "12": {
      inputs: {
        pixels: ["10", 0],
        vae: ["4", 2],
      },
      class_type: "VAEEncode",
    },
  }),

  // Video generation with SVD (Stable Video Diffusion) - Image to Video
  imageToVideoSVD: (params: {
    imageData: string;
    frames: number;
    fps: number;
    motionBucket: number;
    seed: number;
  }) => ({
    "1": {
      inputs: {
        image: params.imageData,
        upload: "image",
      },
      class_type: "LoadImage",
    },
    "2": {
      inputs: {
        ckpt_name: "svd_xt_1_1.safetensors",
      },
      class_type: "ImageOnlyCheckpointLoader",
    },
    "3": {
      inputs: {
        width: 1024,
        height: 576,
        video_frames: params.frames,
        motion_bucket_id: params.motionBucket,
        fps: params.fps,
        augmentation_level: 0,
        clip_vision: ["2", 1],
        init_image: ["1", 0],
        vae: ["2", 2],
      },
      class_type: "SVD_img2vid_Conditioning",
    },
    "4": {
      inputs: {
        seed: params.seed,
        steps: 20,
        cfg: 2.5,
        sampler_name: "euler",
        scheduler: "karras",
        denoise: 1,
        model: ["2", 0],
        positive: ["3", 0],
        negative: ["3", 1],
        latent_image: ["3", 2],
      },
      class_type: "KSampler",
    },
    "5": {
      inputs: {
        samples: ["4", 0],
        vae: ["2", 2],
      },
      class_type: "VAEDecode",
    },
    "6": {
      inputs: {
        frame_rate: params.fps,
        loop_count: 0,
        filename_prefix: "krya_svd",
        format: "video/h264-mp4",
        pix_fmt: "yuv420p",
        crf: 19,
        save_metadata: true,
        pingpong: false,
        save_output: true,
        images: ["5", 0],
      },
      class_type: "VHS_VideoCombine",
    },
  }),

  // Text to Video via Image Generation + SVD (fallback for missing Wan nodes)
  textToVideoViaSVD: (params: {
    prompt: string;
    negativePrompt?: string;
    frames: number;
    fps: number;
    seed: number;
    checkpoint: string;
  }) => ({
    // First generate an image from text
    "1": {
      inputs: {
        ckpt_name: params.checkpoint,
      },
      class_type: "CheckpointLoaderSimple",
    },
    "2": {
      inputs: {
        width: 1024,
        height: 576,
        batch_size: 1,
      },
      class_type: "EmptyLatentImage",
    },
    "3": {
      inputs: {
        text: params.prompt,
        clip: ["1", 1],
      },
      class_type: "CLIPTextEncode",
    },
    "4": {
      inputs: {
        text: params.negativePrompt || "low quality, blurry, distorted",
        clip: ["1", 1],
      },
      class_type: "CLIPTextEncode",
    },
    "5": {
      inputs: {
        seed: params.seed,
        steps: 20,
        cfg: 7,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: 1,
        model: ["1", 0],
        positive: ["3", 0],
        negative: ["4", 0],
        latent_image: ["2", 0],
      },
      class_type: "KSampler",
    },
    "6": {
      inputs: {
        samples: ["5", 0],
        vae: ["1", 2],
      },
      class_type: "VAEDecode",
    },
    // Now convert image to video with SVD
    "7": {
      inputs: {
        ckpt_name: "svd_xt_1_1.safetensors",
      },
      class_type: "ImageOnlyCheckpointLoader",
    },
    "8": {
      inputs: {
        width: 1024,
        height: 576,
        video_frames: params.frames,
        motion_bucket_id: 127,
        fps: params.fps,
        augmentation_level: 0,
        clip_vision: ["7", 1],
        init_image: ["6", 0],
        vae: ["7", 2],
      },
      class_type: "SVD_img2vid_Conditioning",
    },
    "9": {
      inputs: {
        seed: params.seed + 1,
        steps: 20,
        cfg: 2.5,
        sampler_name: "euler",
        scheduler: "karras",
        denoise: 1,
        model: ["7", 0],
        positive: ["8", 0],
        negative: ["8", 1],
        latent_image: ["8", 2],
      },
      class_type: "KSampler",
    },
    "10": {
      inputs: {
        samples: ["9", 0],
        vae: ["7", 2],
      },
      class_type: "VAEDecode",
    },
    "11": {
      inputs: {
        frame_rate: params.fps,
        loop_count: 0,
        filename_prefix: "krya_svd_t2v",
        format: "video/h264-mp4",
        pix_fmt: "yuv420p",
        crf: 19,
        save_metadata: true,
        pingpong: false,
        save_output: true,
        images: ["10", 0],
      },
      class_type: "VHS_VideoCombine",
    },
  }),

  // CogVideoX - Text to Video (Best open-source video model)
  textToVideoCogVideoX: (params: {
    prompt: string;
    negativePrompt?: string;
    width: number;
    height: number;
    frames: number;
    fps: number;
    steps: number;
    seed: number;
  }) => ({
    "1": {
      inputs: {
        ckpt_name: "cogvideo/CogVideoX-5b.safetensors",
      },
      class_type: "CogVideoXModelLoader",
    },
    "2": {
      inputs: {
        prompt: params.prompt,
        negative_prompt: params.negativePrompt || "low quality, blurry, distorted",
        model: ["1", 0],
      },
      class_type: "CogVideoXTextEncode",
    },
    "3": {
      inputs: {
        width: params.width,
        height: params.height,
        num_frames: params.frames,
        batch_size: 1,
      },
      class_type: "CogVideoXEmptyLatent",
    },
    "4": {
      inputs: {
        seed: params.seed,
        steps: params.steps,
        cfg: 6.0,
        sampler_name: "euler_ancestral",
        scheduler: "normal",
        denoise: 1.0,
        model: ["1", 0],
        positive: ["2", 0],
        negative: ["2", 1],
        latent: ["3", 0],
      },
      class_type: "CogVideoXSampler",
    },
    "5": {
      inputs: {
        samples: ["4", 0],
        vae: ["1", 1],
      },
      class_type: "CogVideoXDecode",
    },
    "6": {
      inputs: {
        frame_rate: params.fps,
        loop_count: 0,
        filename_prefix: "krya_cogvideo",
        format: "video/h264-mp4",
        pix_fmt: "yuv420p",
        crf: 19,
        save_metadata: true,
        pingpong: false,
        save_output: true,
        images: ["5", 0],
      },
      class_type: "VHS_VideoCombine",
    },
  }),

  // CogVideoX - Image to Video
  imageToVideoCogVideoX: (params: {
    imageData: string;
    prompt: string;
    negativePrompt?: string;
    frames: number;
    fps: number;
    steps: number;
    seed: number;
  }) => ({
    "1": {
      inputs: {
        image: params.imageData,
        upload: "image",
      },
      class_type: "LoadImage",
    },
    "2": {
      inputs: {
        ckpt_name: "cogvideo/CogVideoX-5b-I2V.safetensors",
      },
      class_type: "CogVideoXModelLoader",
    },
    "3": {
      inputs: {
        prompt: params.prompt,
        negative_prompt: params.negativePrompt || "low quality, blurry, distorted",
        model: ["2", 0],
      },
      class_type: "CogVideoXTextEncode",
    },
    "4": {
      inputs: {
        image: ["1", 0],
        vae: ["2", 1],
        num_frames: params.frames,
      },
      class_type: "CogVideoXImageEncode",
    },
    "5": {
      inputs: {
        seed: params.seed,
        steps: params.steps,
        cfg: 6.0,
        sampler_name: "euler_ancestral",
        scheduler: "normal",
        denoise: 1.0,
        model: ["2", 0],
        positive: ["3", 0],
        negative: ["3", 1],
        latent: ["4", 0],
      },
      class_type: "CogVideoXSampler",
    },
    "6": {
      inputs: {
        samples: ["5", 0],
        vae: ["2", 1],
      },
      class_type: "CogVideoXDecode",
    },
    "7": {
      inputs: {
        frame_rate: params.fps,
        loop_count: 0,
        filename_prefix: "krya_cogvideo_i2v",
        format: "video/h264-mp4",
        pix_fmt: "yuv420p",
        crf: 19,
        save_metadata: true,
        pingpong: false,
        save_output: true,
        images: ["6", 0],
      },
      class_type: "VHS_VideoCombine",
    },
  }),

  // Hunyuan Video - Text to Video (High quality, uses full VRAM on RTX 5090)
  textToVideoHunyuan: (params: {
    prompt: string;
    negativePrompt?: string;
    width: number;
    height: number;
    frames: number;
    fps: number;
    steps: number;
    seed: number;
  }) => ({
    "1": {
      inputs: {
        model_path: "hunyuan/hunyuan_video_720_cfgdistill_fp8_e4m3fn.safetensors",
        precision: "fp8_e4m3fn",
        attention_mode: "sdpa",
      },
      class_type: "HunyuanVideoModelLoader",
    },
    "2": {
      inputs: {
        vae_path: "hunyuan_video_vae_fp32.safetensors",
      },
      class_type: "HunyuanVideoVAELoader",
    },
    "3": {
      inputs: {
        prompt: params.prompt,
        negative_prompt: params.negativePrompt || "blurry, low quality, distorted",
        model: ["1", 0],
      },
      class_type: "HunyuanVideoTextEncode",
    },
    "4": {
      inputs: {
        width: params.width,
        height: params.height,
        num_frames: params.frames,
        batch_size: 1,
      },
      class_type: "HunyuanVideoEmptyLatent",
    },
    "5": {
      inputs: {
        seed: params.seed,
        steps: params.steps,
        cfg: 1.0,
        embedded_guidance_scale: 6.0,
        sampler_name: "euler",
        scheduler: "flow_shift",
        flow_shift: 7.0,
        denoise: 1.0,
        model: ["1", 0],
        positive: ["3", 0],
        negative: ["3", 1],
        latent: ["4", 0],
      },
      class_type: "HunyuanVideoSampler",
    },
    "6": {
      inputs: {
        samples: ["5", 0],
        vae: ["2", 0],
      },
      class_type: "HunyuanVideoDecode",
    },
    "7": {
      inputs: {
        frame_rate: params.fps,
        loop_count: 0,
        filename_prefix: "krya_hunyuan",
        format: "video/h264-mp4",
        pix_fmt: "yuv420p",
        crf: 19,
        save_metadata: true,
        pingpong: false,
        save_output: true,
        images: ["6", 0],
      },
      class_type: "VHS_VideoCombine",
    },
  }),

  // LTX Video - Fast text to video
  textToVideoLTX: (params: {
    prompt: string;
    negativePrompt?: string;
    width: number;
    height: number;
    frames: number;
    fps: number;
    steps: number;
    seed: number;
  }) => ({
    "1": {
      inputs: {
        ckpt_name: "ltx/ltx-video-2b-v0.9.safetensors",
      },
      class_type: "LTXVModelLoader",
    },
    "2": {
      inputs: {
        prompt: params.prompt,
        negative_prompt: params.negativePrompt || "worst quality, inconsistent motion",
        model: ["1", 0],
      },
      class_type: "LTXVTextEncode",
    },
    "3": {
      inputs: {
        width: params.width,
        height: params.height,
        num_frames: params.frames,
        batch_size: 1,
      },
      class_type: "LTXVEmptyLatent",
    },
    "4": {
      inputs: {
        seed: params.seed,
        steps: params.steps,
        cfg: 3.0,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: 1.0,
        model: ["1", 0],
        positive: ["2", 0],
        negative: ["2", 1],
        latent: ["3", 0],
      },
      class_type: "LTXVSampler",
    },
    "5": {
      inputs: {
        samples: ["4", 0],
        vae: ["1", 1],
      },
      class_type: "LTXVDecode",
    },
    "6": {
      inputs: {
        frame_rate: params.fps,
        loop_count: 0,
        filename_prefix: "krya_ltx",
        format: "video/h264-mp4",
        pix_fmt: "yuv420p",
        crf: 19,
        save_metadata: true,
        pingpong: false,
        save_output: true,
        images: ["5", 0],
      },
      class_type: "VHS_VideoCombine",
    },
  }),

  // Wan 2.2 - Text to Video (GGUF with dual experts)
  textToVideoWan: (params: {
    prompt: string;
    negativePrompt?: string;
    width: number;
    height: number;
    frames: number;
    fps: number;
    steps: number;
    seed: number;
    modelPath?: string;
  }) => ({
    "1": {
      inputs: {
        unet_name: "wan2.2_t2v_high_noise_14B_Q8_0.gguf",
      },
      class_type: "UnetLoaderGGUF",
    },
    "2": {
      inputs: {
        unet_name: "wan2.2_t2v_low_noise_14B_Q8_0.gguf",
      },
      class_type: "UnetLoaderGGUF",
    },
    "3": {
      inputs: {
        clip_name1: "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
        clip_name2: "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
        type: "sd3",
      },
      class_type: "DualCLIPLoader",
    },
    "4": {
      inputs: {
        vae_name: "wan_2.1_vae.safetensors",
      },
      class_type: "VAELoader",
    },
    "5": {
      inputs: {
        text: params.prompt,
        clip: ["3", 0],
      },
      class_type: "CLIPTextEncode",
    },
    "6": {
      inputs: {
        text: params.negativePrompt || "low quality, blurry, distorted, static, worst quality",
        clip: ["3", 0],
      },
      class_type: "CLIPTextEncode",
    },
    "7": {
      inputs: {
        width: params.width,
        height: params.height,
        length: params.frames,
        batch_size: 1,
      },
      class_type: "EmptyWanLatentVideo",
    },
    "8": {
      inputs: {
        seed: params.seed,
        steps: params.steps,
        cfg: 7.0,
        sampler_name: "dpmpp_2m",
        scheduler: "karras",
        denoise: 1.0,
        high_noise_model: ["1", 0],
        low_noise_model: ["2", 0],
        positive: ["5", 0],
        negative: ["6", 0],
        latent_image: ["7", 0],
      },
      class_type: "WanSampler",
    },
    "9": {
      inputs: {
        samples: ["8", 0],
        vae: ["4", 0],
      },
      class_type: "VAEDecode",
    },
    "10": {
      inputs: {
        frame_rate: params.fps,
        loop_count: 0,
        filename_prefix: "krya_wan_t2v",
        format: "video/h264-mp4",
        pix_fmt: "yuv420p",
        crf: 19,
        save_metadata: true,
        pingpong: false,
        save_output: true,
        images: ["9", 0],
      },
      class_type: "VHS_VideoCombine",
    },
  }),

  // Wan 2.2 - Image to Video (GGUF with dual experts + CLIPVision)
  imageToVideoWan: (params: {
    imageData: string;
    prompt?: string;
    negativePrompt?: string;
    frames: number;
    fps: number;
    steps: number;
    seed: number;
    modelPath?: string;
  }) => ({
    "1": {
      inputs: {
        unet_name: "wan2.2_i2v_high_noise_14B_Q8_0.gguf",
      },
      class_type: "UnetLoaderGGUF",
    },
    "2": {
      inputs: {
        unet_name: "wan2.2_i2v_low_noise_14B_Q8_0.gguf",
      },
      class_type: "UnetLoaderGGUF",
    },
    "3": {
      inputs: {
        clip_name1: "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
        clip_name2: "umt5_xxl_fp8_e4m3fn_scaled.safetensors",
        type: "sd3",
      },
      class_type: "DualCLIPLoader",
    },
    "4": {
      inputs: {
        vae_name: "wan_2.1_vae.safetensors",
      },
      class_type: "VAELoader",
    },
    "5": {
      inputs: {
        clip_name: "clip_vision_h.safetensors",
      },
      class_type: "CLIPVisionLoader",
    },
    "6": {
      inputs: {
        image: params.imageData,
        upload: "image",
      },
      class_type: "LoadImage",
    },
    "7": {
      inputs: {
        clip_vision: ["5", 0],
        image: ["6", 0],
      },
      class_type: "CLIPVisionEncode",
    },
    "8": {
      inputs: {
        text: params.prompt || "high quality, smooth motion",
        clip: ["3", 0],
      },
      class_type: "CLIPTextEncode",
    },
    "9": {
      inputs: {
        text: params.negativePrompt || "low quality, blurry, distorted, static, worst quality",
        clip: ["3", 0],
      },
      class_type: "CLIPTextEncode",
    },
    "10": {
      inputs: {
        width: 1280,
        height: 720,
        length: params.frames,
        batch_size: 1,
      },
      class_type: "EmptyWanLatentVideo",
    },
    "11": {
      inputs: {
        seed: params.seed,
        steps: params.steps,
        cfg: 7.0,
        sampler_name: "dpmpp_2m",
        scheduler: "karras",
        denoise: 1.0,
        high_noise_model: ["1", 0],
        low_noise_model: ["2", 0],
        positive: ["8", 0],
        negative: ["9", 0],
        latent_image: ["10", 0],
        clip_vision_embed: ["7", 0],
      },
      class_type: "WanSampler",
    },
    "12": {
      inputs: {
        samples: ["11", 0],
        vae: ["4", 0],
      },
      class_type: "VAEDecode",
    },
    "13": {
      inputs: {
        frame_rate: params.fps,
        loop_count: 0,
        filename_prefix: "krya_wan_i2v",
        format: "video/h264-mp4",
        pix_fmt: "yuv420p",
        crf: 19,
        save_metadata: true,
        pingpong: false,
        save_output: true,
        images: ["12", 0],
      },
      class_type: "VHS_VideoCombine",
    },
  }),

  // Image Upscaling with Latent Upscaler
  upscaleImage: (params: {
    imageData: string;
    scale: number;
    checkpoint: string;
  }) => ({
    "1": {
      inputs: {
        image: params.imageData,
        upload: "image",
      },
      class_type: "LoadImage",
    },
    "2": {
      inputs: {
        ckpt_name: params.checkpoint,
      },
      class_type: "CheckpointLoaderSimple",
    },
    "3": {
      inputs: {
        pixels: ["1", 0],
        vae: ["2", 2],
      },
      class_type: "VAEEncode",
    },
    "4": {
      inputs: {
        upscale_method: "nearest-exact",
        width: ["5", 0],
        height: ["5", 1],
        crop: "disabled",
        samples: ["3", 0],
      },
      class_type: "LatentUpscale",
    },
    "5": {
      inputs: {
        upscale_method: "nearest-exact",
        megapixels: params.scale,
        image: ["1", 0],
      },
      class_type: "ImageScale",
    },
    "6": {
      inputs: {
        seed: Math.floor(Math.random() * 2147483647),
        steps: 20,
        cfg: 7,
        sampler_name: "euler",
        scheduler: "normal",
        denoise: 0.5,
        model: ["2", 0],
        positive: ["8", 0],
        negative: ["9", 0],
        latent_image: ["4", 0],
      },
      class_type: "KSampler",
    },
    "7": {
      inputs: {
        samples: ["6", 0],
        vae: ["2", 2],
      },
      class_type: "VAEDecode",
    },
    "8": {
      inputs: {
        text: "high quality, detailed, sharp, crisp",
        clip: ["2", 1],
      },
      class_type: "CLIPTextEncode",
    },
    "9": {
      inputs: {
        text: "blurry, low quality, distorted, artifacts",
        clip: ["2", 1],
      },
      class_type: "CLIPTextEncode",
    },
    "10": {
      inputs: {
        filename_prefix: "krya_upscale",
        images: ["7", 0],
      },
      class_type: "SaveImage",
    },
  }),
};

// Video model types supported
export type VideoModel = "svd" | "cogvideo" | "cogvideo-i2v" | "hunyuan" | "ltx" | "wan-t2v" | "wan-i2v";

// Map model names to internal types
function mapVideoModel(model?: string): VideoModel {
  const modelLower = (model || "").toLowerCase();
  if (modelLower.includes("wan") && modelLower.includes("i2v")) return "wan-i2v";
  if (modelLower.includes("wan") && modelLower.includes("t2v")) return "wan-t2v";
  if (modelLower.includes("wan")) return "wan-t2v"; // Default Wan to text-to-video
  if (modelLower.includes("cogvideo") && modelLower.includes("i2v")) return "cogvideo-i2v";
  if (modelLower.includes("cogvideo") || modelLower.includes("cog")) return "cogvideo";
  if (modelLower.includes("hunyuan") || modelLower.includes("hyvideo")) return "hunyuan";
  if (modelLower.includes("ltx")) return "ltx";
  return "svd"; // Default to SVD
}

/**
 * ComfyUI Provider Configuration
 */
export interface ComfyUIConfig {
  baseUrl: string;
  outputUrl?: string; // URL to access generated files
  // Image models
  defaultModel?: string;
  fluxModel?: string;
  sdxlModel?: string;
  // Video models
  svdModel?: string;
  cogVideoModel?: string;
  cogVideoI2VModel?: string;
  hunyuanModel?: string;
  ltxModel?: string;
  wanT2VModel?: string;
  wanI2VModel?: string;
  defaultVideoModel?: VideoModel;
}

/**
 * Get default ComfyUI configuration
 */
export function getComfyUIConfig(): ComfyUIConfig {
  return {
    baseUrl: process.env.COMFYUI_URL || "http://127.0.0.1:8188",
    outputUrl: process.env.COMFYUI_OUTPUT_URL || "http://127.0.0.1:8188/view",
    // Image models
    defaultModel: process.env.COMFYUI_DEFAULT_MODEL || "sd_xl_base_1.0.safetensors",
    fluxModel: process.env.COMFYUI_FLUX_MODEL || "flux1-dev.safetensors",
    sdxlModel: process.env.COMFYUI_SDXL_MODEL || "sd_xl_base_1.0.safetensors",
    // Video models
    svdModel: process.env.COMFYUI_SVD_MODEL || "svd_xt_1_1.safetensors",
    cogVideoModel: process.env.COMFYUI_COGVIDEO_MODEL || "cogvideo/CogVideoX-5b.safetensors",
    cogVideoI2VModel: process.env.COMFYUI_COGVIDEO_I2V_MODEL || "cogvideo/CogVideoX-5b-I2V.safetensors",
    hunyuanModel: process.env.COMFYUI_HUNYUAN_MODEL || "hunyuan/hunyuan_video_720_cfgdistill_fp8_e4m3fn.safetensors",
    ltxModel: process.env.COMFYUI_LTX_MODEL || "ltx/ltx-video-2b-v0.9.safetensors",
    wanT2VModel: process.env.COMFYUI_WAN_T2V_MODEL || "wan2.2-t2v/Wan2.2-T2V-A14B",
    wanI2VModel: process.env.COMFYUI_WAN_I2V_MODEL || "wan2.2-i2v/Wan2.2-I2V-A14B",
    defaultVideoModel: (process.env.COMFYUI_DEFAULT_VIDEO_MODEL as VideoModel) || "wan-t2v",
  };
}

/**
 * Check if ComfyUI is available
 */
export async function checkComfyUIHealth(): Promise<boolean> {
  try {
    const config = getComfyUIConfig();
    const response = await fetch(`${config.baseUrl}/system_stats`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get available models from ComfyUI
 */
export async function getComfyUIModels(): Promise<{
  checkpoints: string[];
  loras: string[];
  vaes: string[];
}> {
  const config = getComfyUIConfig();

  try {
    const response = await fetch(`${config.baseUrl}/object_info/CheckpointLoaderSimple`);
    const data = await response.json();
    const checkpoints = data?.CheckpointLoaderSimple?.input?.required?.ckpt_name?.[0] || [];

    const loraResponse = await fetch(`${config.baseUrl}/object_info/LoraLoader`);
    const loraData = await loraResponse.json();
    const loras = loraData?.LoraLoader?.input?.required?.lora_name?.[0] || [];

    const vaeResponse = await fetch(`${config.baseUrl}/object_info/VAELoader`);
    const vaeData = await vaeResponse.json();
    const vaes = vaeData?.VAELoader?.input?.required?.vae_name?.[0] || [];

    return { checkpoints, loras, vaes };
  } catch (error) {
    console.error("Failed to get ComfyUI models:", error);
    return { checkpoints: [], loras: [], vaes: [] };
  }
}

/**
 * Retry configuration for ComfyUI connections
 */
const RETRY_CONFIG = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 5000,
  backoffMultiplier: 2,
};

/**
 * Execute function with retry logic
 */
async function withRetry<T>(
  fn: () => Promise<T>,
  attemptNumber: number = 1
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (attemptNumber >= RETRY_CONFIG.maxAttempts) {
      throw error;
    }

    const delay = Math.min(
      RETRY_CONFIG.initialDelayMs * Math.pow(RETRY_CONFIG.backoffMultiplier, attemptNumber - 1),
      RETRY_CONFIG.maxDelayMs
    );

    console.log(`ComfyUI request failed, retrying in ${delay}ms (attempt ${attemptNumber}/${RETRY_CONFIG.maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, delay));

    return withRetry(fn, attemptNumber + 1);
  }
}

/**
 * Queue a prompt in ComfyUI and wait for completion (with retry logic)
 */
async function queuePrompt(
  workflow: Record<string, unknown>,
  config: ComfyUIConfig
): Promise<{ promptId: string; images: ComfyUIImage[]; error?: string }> {
  // Get or create client ID
  if (!clientId) {
    clientId = crypto.randomUUID();
  }

  try {
    // Queue the prompt with retry
    const { prompt_id } = await withRetry(async () => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 30000); // 30s timeout for queue

      try {
        const response = await fetch(`${config.baseUrl}/prompt`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: workflow,
            client_id: clientId,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) {
          const error = await response.text();
          throw new Error(`ComfyUI error: ${error}`);
        }

        return await response.json();
      } catch (error) {
        clearTimeout(timeout);
        throw error;
      }
    });

    // Poll for completion
    const images = await waitForCompletion(prompt_id, config);

    return { promptId: prompt_id, images };
  } catch (error) {
    console.error("ComfyUI queuePrompt error:", error);
    return {
      promptId: "",
      images: [],
      error: error instanceof Error ? error.message : "Unknown ComfyUI error",
    };
  }
}

interface ComfyUIImage {
  filename: string;
  subfolder: string;
  type: string;
}

/**
 * Wait for a ComfyUI prompt to complete and return image metadata
 */
async function waitForCompletion(
  promptId: string,
  config: ComfyUIConfig,
  timeout = 300000 // 5 minutes
): Promise<ComfyUIImage[]> {
  const startTime = Date.now();
  const images: ComfyUIImage[] = [];

  while (Date.now() - startTime < timeout) {
    try {
      const response = await fetch(`${config.baseUrl}/history/${promptId}`);
      const history = await response.json();

      if (history[promptId]) {
        const outputs = history[promptId].outputs;

        // Extract image metadata from all output nodes
        for (const nodeId in outputs) {
          const nodeOutput = outputs[nodeId];
          if (nodeOutput.images) {
            for (const image of nodeOutput.images) {
              images.push({
                filename: image.filename,
                subfolder: image.subfolder || "",
                type: image.type || "output",
              });
            }
          }
          // Handle video outputs
          if (nodeOutput.gifs) {
            for (const gif of nodeOutput.gifs) {
              images.push({
                filename: gif.filename,
                subfolder: gif.subfolder || "",
                type: gif.type || "output",
              });
            }
          }
        }

        if (images.length > 0) {
          return images;
        }

        // Check for errors
        if (history[promptId].status?.status_str === "error") {
          const errorDetails = JSON.stringify(history[promptId].status, null, 2);
          console.error("ComfyUI workflow error details:", errorDetails);
          throw new Error(`ComfyUI workflow execution failed: ${errorDetails}`);
        }
      }

      // Wait before polling again
      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      if (error instanceof Error && error.message.includes("failed")) {
        throw error;
      }
      // Continue polling on network errors
    }
  }

  throw new Error("ComfyUI generation timed out");
}

/**
 * Download image from ComfyUI and save to local storage
 * Uses internal ComfyUI URL (not behind Authentik)
 */
async function downloadAndSaveImage(
  image: ComfyUIImage,
  config: ComfyUIConfig,
  userId: string
): Promise<string> {
  // Construct internal ComfyUI URL (e.g., http://10.25.10.60:8189/view)
  // Use COMFYUI_HOST and COMFYUI_PORT for internal access
  const internalHost = process.env.COMFYUI_HOST || "127.0.0.1";
  const internalPort = process.env.COMFYUI_PORT || "8189";
  const internalBaseUrl = `http://${internalHost}:${internalPort}`;

  const imageUrl = `${internalBaseUrl}/view?filename=${image.filename}&subfolder=${image.subfolder}&type=${image.type}`;

  console.log(`[ComfyUI] Downloading image from internal URL: ${imageUrl}`);

  try {
    const uploadResult = await uploadFromUrl(imageUrl, userId);
    console.log(`[ComfyUI] Image saved to local storage: ${uploadResult.url}`);
    return uploadResult.url;
  } catch (error) {
    console.error(`[ComfyUI] Failed to download/save image:`, error);
    throw error;
  }
}

/**
 * Map Krya model names to ComfyUI checkpoint names
 */
function mapModelToCheckpoint(model: string, config: ComfyUIConfig): { checkpoint: string; isFlux: boolean } {
  const modelLower = model?.toLowerCase() || "";

  if (modelLower.includes("flux")) {
    return { checkpoint: config.fluxModel || "flux1-schnell.safetensors", isFlux: true };
  }
  if (modelLower.includes("sdxl") || modelLower.includes("xl")) {
    return { checkpoint: config.sdxlModel || "sd_xl_base_1.0.safetensors", isFlux: false };
  }

  return { checkpoint: config.defaultModel || "sd_xl_base_1.0.safetensors", isFlux: false };
}

/**
 * ComfyUI Provider Class
 */
export class ComfyUIProvider {
  private config: ComfyUIConfig;

  constructor(config?: Partial<ComfyUIConfig>) {
    this.config = { ...getComfyUIConfig(), ...config };
  }

  async generateImage(request: GenerationRequest): Promise<GenerationResponse> {
    const { checkpoint, isFlux } = mapModelToCheckpoint(request.model || "", this.config);
    const seed = request.seed && request.seed > 0 ? request.seed : Math.floor(Math.random() * 2147483647);

    try {
      // Check if this is image-to-image mode
      if (request.imageUrl) {
        console.log('[img2img] Request received:', {
          hasImage: !!request.imageUrl,
          prompt: request.prompt,
          strength: request.strength || 0.75,
          model: checkpoint,
        });

        // Use img2img workflow - delegate to generateImageToImage
        return this.generateImageToImage({
          ...request,
          imageData: await this.uploadImageToComfyUI(request.imageUrl),
        });
      }

      // Select appropriate workflow for text-to-image
      const workflow = isFlux
        ? WORKFLOWS.fluxTextToImage({
            prompt: request.prompt,
            width: request.width || 1024,
            height: request.height || 1024,
            steps: request.steps || 4,
            seed,
            model: checkpoint,
            batchSize: request.batchSize,
          })
        : WORKFLOWS.textToImage({
            prompt: request.prompt,
            negativePrompt: request.negativePrompt,
            width: request.width || 1024,
            height: request.height || 1024,
            steps: request.steps || 20,
            cfgScale: request.cfgScale || 7,
            seed,
            model: checkpoint,
            batchSize: request.batchSize,
          });

      const result = await queuePrompt(workflow, this.config);

      if (result.error) {
        return {
          id: crypto.randomUUID(),
          status: "failed",
          error: result.error,
        };
      }

      // Construct internal ComfyUI URLs for downloading (not behind Authentik)
      const internalHost = process.env.COMFYUI_HOST || "127.0.0.1";
      const internalPort = process.env.COMFYUI_PORT || "8189";
      const internalBaseUrl = `http://${internalHost}:${internalPort}`;

      const imageUrls = result.images.map(img =>
        `${internalBaseUrl}/view?filename=${img.filename}&subfolder=${img.subfolder}&type=${img.type}`
      );

      return {
        id: result.promptId,
        status: "completed",
        imageUrl: imageUrls[0],
        images: imageUrls,
        seed,
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: error instanceof Error ? error.message : "ComfyUI generation failed",
      };
    }
  }

  async generateImageToImage(
    request: GenerationRequest & { imageData: string }
  ): Promise<GenerationResponse> {
    const { checkpoint } = mapModelToCheckpoint(request.model || "", this.config);
    const seed = request.seed && request.seed > 0 ? request.seed : Math.floor(Math.random() * 2147483647);

    try {
      const workflow = WORKFLOWS.imageToImage({
        prompt: request.prompt,
        negativePrompt: request.negativePrompt,
        imageData: request.imageData,
        strength: request.strength || 0.75,
        steps: request.steps || 20,
        cfgScale: request.cfgScale || 7,
        seed,
        model: checkpoint,
      });

      const result = await queuePrompt(workflow, this.config);

      if (result.error) {
        return {
          id: crypto.randomUUID(),
          status: "failed",
          error: result.error,
        };
      }

      // Construct internal ComfyUI URLs for downloading (not behind Authentik)
      const internalHost = process.env.COMFYUI_HOST || "127.0.0.1";
      const internalPort = process.env.COMFYUI_PORT || "8189";
      const internalBaseUrl = `http://${internalHost}:${internalPort}`;

      const imageUrls = result.images.map(img =>
        `${internalBaseUrl}/view?filename=${img.filename}&subfolder=${img.subfolder}&type=${img.type}`
      );

      return {
        id: result.promptId,
        status: "completed",
        imageUrl: imageUrls[0],
        images: imageUrls,
        seed,
      };
    } catch (error) {
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: error instanceof Error ? error.message : "ComfyUI img2img failed",
      };
    }
  }

  async generateVideo(request: VideoGenerationRequest): Promise<VideoGenerationResponse> {
    // Check if video generation is supported
    // SVD requires svd_xt_1_1.safetensors model and VHS_VideoCombine custom node
    console.log('[ComfyUI Video] Checking video generation support...');

    const seed = Math.floor(Math.random() * 2147483647);
    const duration = request.duration || 4;

    // Determine video model to use
    const videoModel = mapVideoModel(request.model) || this.config.defaultVideoModel || "cogvideo";

    // Set appropriate parameters based on model
    const modelConfigs: Record<VideoModel, { fps: number; width: number; height: number; steps: number; maxFrames: number }> = {
      svd: { fps: 8, width: 1024, height: 576, steps: 20, maxFrames: 25 },
      cogvideo: { fps: 8, width: 720, height: 480, steps: 50, maxFrames: 49 },
      "cogvideo-i2v": { fps: 8, width: 720, height: 480, steps: 50, maxFrames: 49 },
      hunyuan: { fps: 24, width: 1280, height: 720, steps: 30, maxFrames: 129 },
      ltx: { fps: 24, width: 768, height: 512, steps: 30, maxFrames: 97 },
      "wan-t2v": { fps: 16, width: 1280, height: 720, steps: 50, maxFrames: 161 }, // Wan 2.2 T2V: 720p/1080p, 10s @ 16fps
      "wan-i2v": { fps: 16, width: 1280, height: 720, steps: 50, maxFrames: 161 }, // Wan 2.2 I2V: 720p/1080p, 10s @ 16fps
    };

    const modelConfig = modelConfigs[videoModel];
    const fps = modelConfig.fps;
    const frames = Math.min(duration * fps, modelConfig.maxFrames);
    const width = modelConfig.width;
    const height = modelConfig.height;
    const steps = modelConfig.steps;

    try {
      let workflow: Record<string, unknown>;

      // Handle image-to-video vs text-to-video
      if (request.imageUrl) {
        // Image to video
        const imageData = await this.uploadImageToComfyUI(request.imageUrl);

        switch (videoModel) {
          case "wan-i2v":
          case "wan-t2v":
            // Use SVD for image-to-video (Wan nodes not available)
            console.log('[ComfyUI Video] Using SVD for image-to-video (Wan nodes not installed)');
            workflow = WORKFLOWS.imageToVideoSVD({
              imageData,
              frames,
              fps,
              motionBucket: 127,
              seed,
            });
            break;
          case "cogvideo-i2v":
          case "cogvideo":
            workflow = WORKFLOWS.imageToVideoCogVideoX({
              imageData,
              prompt: request.prompt || "smooth motion, high quality video",
              negativePrompt: "blurry, low quality, distorted",
              frames,
              fps,
              steps,
              seed,
            });
            break;
          case "svd":
          default:
            workflow = WORKFLOWS.imageToVideoSVD({
              imageData,
              frames,
              fps,
              motionBucket: 127,
              seed,
            });
            break;
        }
      } else {
        // Text to video
        switch (videoModel) {
          case "wan-t2v":
          case "wan-i2v":
            // Use SVD-based text-to-video (Wan nodes not available)
            console.log('[ComfyUI Video] Using SVD-based text-to-video workflow (Wan nodes not installed)');
            workflow = WORKFLOWS.textToVideoViaSVD({
              prompt: request.prompt,
              negativePrompt: "blurry, low quality, distorted, static",
              frames,
              fps,
              seed,
              checkpoint: this.config.sdxlModel || "sd_xl_base_1.0.safetensors",
            });
            break;
          case "cogvideo":
          case "cogvideo-i2v":
            workflow = WORKFLOWS.textToVideoCogVideoX({
              prompt: request.prompt,
              negativePrompt: "blurry, low quality, distorted",
              width,
              height,
              frames,
              fps,
              steps,
              seed,
            });
            break;
          case "hunyuan":
            workflow = WORKFLOWS.textToVideoHunyuan({
              prompt: request.prompt,
              negativePrompt: "blurry, low quality, distorted",
              width,
              height,
              frames,
              fps,
              steps,
              seed,
            });
            break;
          case "ltx":
            workflow = WORKFLOWS.textToVideoLTX({
              prompt: request.prompt,
              negativePrompt: "blurry, low quality, distorted",
              width,
              height,
              frames,
              fps,
              steps,
              seed,
            });
            break;
          case "svd":
          default:
            // Use SVD-based text-to-video for any unrecognized models
            console.log('[ComfyUI Video] Using SVD-based text-to-video workflow');
            workflow = WORKFLOWS.textToVideoViaSVD({
              prompt: request.prompt,
              negativePrompt: "blurry, low quality, distorted",
              frames,
              fps,
              seed,
              checkpoint: this.config.sdxlModel || "sd_xl_base_1.0.safetensors",
            });
            break;
        }
      }

      const result = await queuePrompt(workflow, this.config);

      if (result.error) {
        return {
          id: crypto.randomUUID(),
          status: "failed",
          error: result.error,
        };
      }

      // Construct internal ComfyUI URLs for downloading (not behind Authentik)
      const internalHost = process.env.COMFYUI_HOST || "127.0.0.1";
      const internalPort = process.env.COMFYUI_PORT || "8189";
      const internalBaseUrl = `http://${internalHost}:${internalPort}`;

      const videoUrls = result.images.map(img =>
        `${internalBaseUrl}/view?filename=${img.filename}&subfolder=${img.subfolder}&type=${img.type}`
      );

      return {
        id: result.promptId,
        status: "completed",
        videoUrl: videoUrls[0], // Video URL from VHS_VideoCombine
        duration,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "ComfyUI video generation failed";

      // Check for missing nodes
      if (errorMsg.includes("not found")) {
        const nodeMatch = errorMsg.match(/(?:Node|class_type) ['"]?(\w+)['"]? (?:not found|is not available)/i);
        if (nodeMatch) {
          const nodeName = nodeMatch[1];
          return {
            id: crypto.randomUUID(),
            status: "failed",
            error: `Missing ComfyUI node: ${nodeName}. Install it via ComfyUI Manager.\n\nFor Wan 2.2: Install 'ComfyUI-WanVideoWrapper' (kijai)\nFor other models: Check the ComfyUI Manager for required custom nodes.`,
          };
        }
      }

      // Check for missing models
      if (errorMsg.includes("not in available checkpoints") || errorMsg.includes("model not found") || errorMsg.includes("checkpoint")) {
        return {
          id: crypto.randomUUID(),
          status: "failed",
          error: `Model not installed. Check ComfyUI models directory.\n\nExpected paths:\n- Wan 2.2 T2V: wan2.2-t2v/Wan2.2-T2V-A14B\n- Wan 2.2 I2V: wan2.2-i2v/Wan2.2-I2V-A14B\n- SVD: svd_xt_1_1.safetensors\n\nInstall missing models in your ComfyUI models directory.`,
          };
        }

      // Check for VHS_VideoCombine specifically
      if (errorMsg.includes("VHS_VideoCombine")) {
        return {
          id: crypto.randomUUID(),
          status: "failed",
          error: "Missing ComfyUI node: VHS_VideoCombine. Install VideoHelperSuite via ComfyUI Manager.",
        };
      }

      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: errorMsg,
      };
    }
  }

  async getStatus(id: string): Promise<GenerationResponse> {
    try {
      const response = await fetch(`${this.config.baseUrl}/history/${id}`);
      const history = await response.json();

      if (!history[id]) {
        return { id, status: "processing" };
      }

      const status = history[id].status?.status_str;
      if (status === "error") {
        return { id, status: "failed", error: "Workflow execution failed" };
      }

      const images: string[] = [];
      const outputs = history[id].outputs;
      for (const nodeId in outputs) {
        if (outputs[nodeId].images) {
          for (const image of outputs[nodeId].images) {
            images.push(
              `${this.config.outputUrl}?filename=${image.filename}&type=output`
            );
          }
        }
      }

      return {
        id,
        status: images.length > 0 ? "completed" : "processing",
        images,
        imageUrl: images[0],
      };
    } catch {
      return { id, status: "processing" };
    }
  }

  /**
   * Upload an image to ComfyUI from URL or local path
   */
  private async uploadImageToComfyUI(imageUrl: string): Promise<string> {
    let imageBlob: Blob;

    // Check if this is a local file path (starts with /api/uploads/)
    if (imageUrl.startsWith("/api/uploads/")) {
      // Read from local filesystem instead of HTTP fetch
      const { readFile } = await import("fs/promises");
      const { join } = await import("path");

      // Convert /api/uploads/temp/file.png -> /app/uploads/temp/file.png
      const filePath = imageUrl.replace("/api/uploads/", "");
      const fullPath = join(process.env.UPLOAD_DIR || "/app/uploads", filePath);

      console.log('[uploadImageToComfyUI] Reading local file:', fullPath);

      const fileBuffer = await readFile(fullPath);
      imageBlob = new Blob([fileBuffer]);
    } else {
      // Fetch from external URL
      console.log('[uploadImageToComfyUI] Fetching from URL:', imageUrl);
      const imageResponse = await fetch(imageUrl);
      imageBlob = await imageResponse.blob();
    }

    // Create form data
    const formData = new FormData();
    formData.append("image", imageBlob, "input.png");
    formData.append("overwrite", "true");

    // Upload to ComfyUI
    const uploadResponse = await fetch(`${this.config.baseUrl}/upload/image`, {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error("Failed to upload image to ComfyUI");
    }

    const result = await uploadResponse.json();
    console.log('[uploadImageToComfyUI] Uploaded to ComfyUI as:', result.name);
    return result.name;
  }

  /**
   * Upscale image using ComfyUI latent upscaler
   */
  async upscaleImage(request: { imageUrl: string; scale: number }): Promise<GenerationResponse> {
    try {
      console.log('[ComfyUI Upscale] Starting upscale:', request);

      // Upload image to ComfyUI
      const imageData = await this.uploadImageToComfyUI(request.imageUrl);

      // Build upscale workflow
      const workflow = WORKFLOWS.upscaleImage({
        imageData,
        scale: request.scale,
        checkpoint: this.config.sdxlModel || "sd_xl_base_1.0.safetensors",
      });

      // Queue and wait for completion
      const result = await queuePrompt(workflow, this.config);

      if (result.error) {
        return {
          id: crypto.randomUUID(),
          status: "failed",
          error: result.error,
        };
      }

      // Download and save the upscaled image
      if (result.images.length > 0) {
        const imageUrl = await downloadAndSaveImage(result.images[0], this.config, "system");

        return {
          id: result.promptId,
          status: "completed",
          imageUrl,
        };
      }

      return {
        id: result.promptId,
        status: "failed",
        error: "No image generated",
      };
    } catch (error) {
      console.error('[ComfyUI Upscale] Error:', error);
      return {
        id: crypto.randomUUID(),
        status: "failed",
        error: error instanceof Error ? error.message : "Upscale failed",
      };
    }
  }
}

export default ComfyUIProvider;
