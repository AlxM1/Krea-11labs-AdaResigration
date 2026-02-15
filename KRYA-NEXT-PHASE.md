# Krya AI Platform — Next Phase Implementation

## CRITICAL RULES
- Do NOT break ANY existing working features
- Before editing ANY file, read it fully first
- After EVERY change, rebuild and verify nothing is broken
- If a ComfyUI node doesn't exist, do NOT invent it — check /object_info first
- Always call POST http://10.25.10.60:8189/free {"unload_models":true,"free_memory":true} before heavy generations

## ENVIRONMENT
- Krya source: /opt/00raiser/services/krya/apps/web
- ComfyUI: http://10.25.10.60:8189 (Windows PC, RTX 5090 32GB VRAM)
- Ollama: http://10.25.10.60:11434 (llama3.2)
- Krya web: http://localhost:3100
- Build: cd /opt/00raiser && docker compose up -d --build krya
- Logs: docker logs raiser-krya --tail 50

## STEP 0: AUDIT CURRENT STATE (do this first, do not skip)

Run ALL of these before writing any code:

```bash
# What's working right now
curl -s http://localhost:3100/api/health | python3 -m json.tool
curl -s http://localhost:3100/api/models 2>/dev/null | python3 -m json.tool | head -40
curl -s http://localhost:3100/api/generations?limit=3 | python3 -m json.tool | head -20

# What ComfyUI nodes are available
curl -s http://10.25.10.60:8189/object_info | python3 -c "
import sys,json; d=json.load(sys.stdin)
print('=== WAN NODES ===')
for k in sorted(d.keys()):
    if 'wan' in k.lower() or 'moe' in k.lower(): print(f'  {k}')
print('=== VIDEO NODES ===')
for k in sorted(d.keys()):
    if 'video' in k.lower() or 'svd' in k.lower() or 'animate' in k.lower(): print(f'  {k}')
print('=== BACKGROUND/SEGMENT NODES ===')
for k in sorted(d.keys()):
    if 'segment' in k.lower() or 'rembg' in k.lower() or 'remove' in k.lower() or 'mask' in k.lower() or 'background' in k.lower(): print(f'  {k}')
print('=== LIP/AUDIO NODES ===')
for k in sorted(d.keys()):
    if 'sad' in k.lower() or 'lip' in k.lower() or 'talk' in k.lower() or 'wav2lip' in k.lower() or 'audio' in k.lower(): print(f'  {k}')
print('=== MOTION/FLOW NODES ===')
for k in sorted(d.keys()):
    if 'motion' in k.lower() or 'optical' in k.lower() or 'flow' in k.lower(): print(f'  {k}')
print('=== STYLE/IPADAPTER NODES ===')
for k in sorted(d.keys()):
    if 'style' in k.lower() or 'ipadapter' in k.lower() or 'redux' in k.lower(): print(f'  {k}')
"

# What models are installed
curl -s http://10.25.10.60:8189/object_info/CheckpointLoaderSimple | python3 -c "import sys,json; d=json.load(sys.stdin); print('CHECKPOINTS:'); [print(f'  {f}') for f in d['CheckpointLoaderSimple']['input']['required']['ckpt_name'][0]]"
curl -s http://10.25.10.60:8189/object_info/UNETLoader | python3 -c "import sys,json; d=json.load(sys.stdin); print('UNET:'); [print(f'  {f}') for f in d['UNETLoader']['input']['required']['unet_name'][0]]"
curl -s http://10.25.10.60:8189/object_info/UpscaleModelLoader | python3 -c "import sys,json; d=json.load(sys.stdin); print('UPSCALE:'); [print(f'  {f}') for f in d['UpscaleModelLoader']['input']['required']['model_name'][0]]"
curl -s http://10.25.10.60:8189/object_info/CLIPLoader | python3 -c "import sys,json; d=json.load(sys.stdin); print('CLIP:'); [print(f'  {f}') for f in d['CLIPLoader']['input']['required']['clip_name'][0]]" 2>/dev/null
curl -s http://10.25.10.60:8189/object_info/VAELoader | python3 -c "import sys,json; d=json.load(sys.stdin); print('VAE:'); [print(f'  {f}') for f in d['VAELoader']['input']['required']['vae_name'][0]]"

# Which pages have backends wired
for page in image image-to-image video video-from-image logo upscale enhancer background-removal style-transfer effects lipsync motion-transfer 3d patterns; do
  count=$(grep -c "api/generate\|fetch(\|handleGenerate\|handleSubmit" /opt/00raiser/services/krya/apps/web/app/\(dashboard\)/$page/page.tsx 2>/dev/null)
  echo "$page: $count API calls"
done

# Read key files
cat /opt/00raiser/services/krya/apps/web/lib/ai/model-registry.ts
cat /opt/00raiser/services/krya/apps/web/lib/ai/comfyui-provider.ts
cat /opt/00raiser/services/krya/apps/web/app/api/models/route.ts
```

STOP after running the audit. Read and understand the output before proceeding. The audit results determine what you can and cannot do in the steps below.

---

## TASK 1: Fix /api/models endpoint (returns 500)

`curl -s http://localhost:3100/api/models` currently returns `{"error":"Internal server error"}`

1. Read the route: `cat /opt/00raiser/services/krya/apps/web/app/api/models/route.ts`
2. Read the registry: `cat /opt/00raiser/services/krya/apps/web/lib/ai/model-registry.ts`
3. Check container env: `docker exec raiser-krya env | grep -i COMFY`
4. Check Docker logs for the actual error: `docker logs raiser-krya 2>&1 | grep -i "models\|registry" | tail -20`

Common causes:
- COMFYUI_HOST not set in docker env → add to docker-compose.yml
- Import error in model-registry.ts
- Network issue from container → 10.25.10.60

Fix it. Verify: `curl -s http://localhost:3100/api/models | python3 -m json.tool | head -30` should return JSON with discovered models.

---

## TASK 2: Wire Wan 2.2 as primary video model

The Wan 2.2 T2V MoE models ARE installed:
- wan2.2_t2v_high_noise_14B_fp8_scaled.safetensors
- wan2.2_t2v_low_noise_14B_fp8_scaled.safetensors

Also installed: umt5_xxl_fp8_e4m3fn_scaled.safetensors (text encoder), wan_2.1_vae.safetensors (VAE)

### 2a. Discover the correct Wan nodes
From your STEP 0 audit, check which Wan-related nodes exist. Based on what's available, build the correct workflow. Possible patterns:

**If WanDualModelSampler or WanMoESampler exists:**
Use the dedicated MoE node that handles both experts internally.

**If only standard nodes exist (UNETLoader, KSampler, etc.):**
The Wan 2.2 MoE workflow in ComfyUI native nodes is:
- UNETLoader → wan2.2_t2v_high_noise_14B_fp8_scaled.safetensors (weight_dtype: default)
- UNETLoader → wan2.2_t2v_low_noise_14B_fp8_scaled.safetensors (weight_dtype: default)  
- CLIPLoader → umt5_xxl_fp8_e4m3fn_scaled.safetensors (type: wan)
- VAELoader → wan_2.1_vae.safetensors
- EmptyWanVideoLatentVideo → set width, height, length (frames), batch_size 1
- CLIPTextEncode → prompt
- ModelSamplingWan → set width, height on the high_noise model
- WanDualModelSampler or custom sampling that switches experts at a noise threshold

**IMPORTANT:** If you cannot determine the correct Wan 2.2 workflow from available nodes, keep SVD as primary and add a TODO comment. Do NOT ship broken Wan support.

### 2b. Add to comfyui-provider.ts
Add a `wanTextToVideo()` method alongside the existing `textToVideoViaSVD()` method.

### 2c. Update video route
In app/api/generate/video/route.ts:
- Try Wan 2.2 first (if models detected by registry)
- Fall back to SVD if Wan fails or models not available
- Before Wan generation, call /free endpoint (Wan needs ~16GB VRAM)
- Wan timeout: 600000ms (10 minutes)

### 2d. Update model registry
Ensure model-registry.ts lists Wan 2.2 as priority 1 for text-to-video, SVD as priority 2.

### 2e. Test
```bash
cd /opt/00raiser && docker compose up -d --build krya
sleep 10

# Test Wan video generation
curl -s -X POST http://localhost:3100/api/generate/video \
  -H "Content-Type: application/json" \
  -d '{"prompt":"a golden retriever running through autumn leaves in slow motion, cinematic","width":832,"height":480}' | python3 -m json.tool

# ALSO verify FLUX image gen still works
curl -s -X POST http://localhost:3100/api/generate/image \
  -H "Content-Type: application/json" \
  -d '{"prompt":"a red fox in snow","width":1024,"height":1024}' | python3 -m json.tool
```

---

## TASK 3: Wire up Video-from-Image (Image-to-Video) page

The page at app/(dashboard)/video-from-image/page.tsx has 0 API calls — it's a UI stub.
The API route exists at app/api/generate/video/route.ts.

### 3a. Check existing i2v support
```bash
grep -n "imageToVideo\|image_to_video\|i2v\|img2vid\|video-from-image\|videoFromImage" /opt/00raiser/services/krya/apps/web/lib/ai/comfyui-provider.ts
grep -n "imageToVideo\|image_to_video\|i2v" /opt/00raiser/services/krya/apps/web/app/api/generate/video/route.ts
```

### 3b. Backend — SVD Image-to-Video workflow
SVD natively supports i2v without needing SDXL for frame generation:
- LoadImage → user's uploaded image
- ImageOnlyCheckpointLoader → svd_xt_1_1.safetensors
- SVD_img2vid_Conditioning → (clip_vision from checkpoint, init_image from LoadImage)
- KSampler → steps 20, cfg 2.5, sampler euler, scheduler karras
- VAEDecode → VHS_VideoCombine

If Wan I2V models are also installed (check from audit: wan2.2_i2v_high_noise_14B_fp8_scaled + wan2.2_i2v_low_noise_14B_fp8_scaled), implement Wan I2V as primary, SVD as fallback.

### 3c. Frontend — Wire the page
The page should:
- Accept image upload (drag & drop or file picker)
- Optional text prompt for motion guidance
- Duration selector (if applicable)
- Submit to API → show progress → display result video
- Follow the same pattern as the working video/page.tsx

### 3d. Test
Upload any image and generate a video from it. Verify the page shows results.

---

## TASK 4: Wire up remaining stub pages

For each page below, check if the required ComfyUI nodes exist (from STEP 0 audit). If they DO exist, wire them up. If they DON'T exist, replace the page content with a clean "Coming Soon" state.

### 4a. Effects page (0 API calls)
The API route exists at /api/effects/route.ts.

Read it: `cat /opt/00raiser/services/krya/apps/web/app/api/effects/route.ts | head -60`

If the API is functional, wire the page to call it. If it's also a stub, implement effects as img2img with style presets:
- Upload image + select effect (Oil Painting, Cyberpunk, Watercolor, Pencil Sketch, Pop Art, Anime, Vintage Film, etc.)
- Each effect = specific prompt template + img2img at denoise 0.5-0.7
- Use FLUX or SDXL img2img workflow

### 4b. Lip Sync page (0 API calls)
The API route exists at /api/generate/lipsync/route.ts.

Check if SadTalker/Wav2Lip nodes exist in ComfyUI (from audit). 
- If YES: Wire the page to accept face image + audio file → generate talking head video
- If NO: Replace with Coming Soon page:
```tsx
// Clean Coming Soon state
<div className="flex flex-col items-center justify-center h-full text-center p-8">
  <h2 className="text-2xl font-bold mb-4">Lip Sync — Coming Soon</h2>
  <p className="text-muted-foreground max-w-md">
    Requires SadTalker or Wav2Lip custom node in ComfyUI. 
    Install via ComfyUI Manager to enable this feature.
  </p>
</div>
```

### 4c. Motion Transfer page (0 API calls)
Same pattern — check for motion/optical flow nodes. If available, wire up. If not, Coming Soon.

### 4d. Video-from-Image page
Already covered in TASK 3 above.

---

## TASK 5: Batch/Variation support for image generation

Update the image generation page to support generating multiple variations simultaneously.

### 5a. Check existing batch support
```bash
cat /opt/00raiser/services/krya/apps/web/app/api/generate/image/batch/route.ts | head -40
cat /opt/00raiser/services/krya/apps/web/app/api/generate/image/variations/route.ts | head -40
```

### 5b. Frontend
Add a "Variations" toggle/selector on the image page:
- 1 (default), 2, 4 options
- When > 1, submit multiple generation requests with the same prompt but different seeds
- Display results in a grid (2x1 or 2x2)
- Each result gets its own download/favorite button

### 5c. Backend
If batch/variations routes already exist, use them. If not:
- Accept a `count` parameter (1-4)
- Generate sequentially (not parallel — don't overload ComfyUI)
- Call /free between generations if switching models
- Return array of results
- Each generation uses a random seed

---

## TASK 6: Prompt enhancement on all tool pages

### 6a. Check what exists
```bash
grep -rn "enhance-prompt\|enhancePrompt\|prompt.*enhance" /opt/00raiser/services/krya/apps/web/app/\(dashboard\) --include="*.tsx" | head -20
cat /opt/00raiser/services/krya/apps/web/app/api/llm/enhance-prompt/route.ts | head -30
```

### 6b. If enhance-prompt API exists and works on image page
Replicate the same "Enhance Prompt" toggle to these pages (if not already present):
- video/page.tsx
- logo/page.tsx
- image-to-image/page.tsx
- video-from-image/page.tsx
- effects/page.tsx (if wired)
- style-transfer/page.tsx
- 3d/page.tsx
- patterns/page.tsx

Use the exact same component/hook pattern from the image page. Don't reinvent it.

### 6c. Test
Enable enhance on the video page, submit a simple prompt like "cat walking", verify Ollama expands it before sending to ComfyUI.

---

## TASK 7: Generation queue with live progress

### 7a. Check existing WebSocket/notification infrastructure
```bash
grep -rn "socket\|Socket\|websocket\|WebSocket\|job:update\|notification" /opt/00raiser/services/krya/apps/web/lib --include="*.ts" | head -20
grep -rn "useNotif\|useSocket\|useJob" /opt/00raiser/services/krya/apps/web/hooks --include="*.ts" | head -10
```

### 7b. Add a persistent generation queue indicator
In the dashboard layout (app/(dashboard)/layout.tsx), add a small floating panel or bottom bar that shows:
- Number of active jobs (across all tools)
- For each active job: type (image/video/logo), prompt snippet, progress %, elapsed time
- Completed jobs flash briefly then disappear (or go to history)

Use the existing WebSocket/notification hooks. Don't create new infrastructure — tap into what's already built.

### 7c. Make it dismissible
Users should be able to collapse/minimize the queue panel. Persist this preference in localStorage.

---

## FINAL VERIFICATION

After ALL tasks are complete, run this full test suite:

```bash
cd /opt/00raiser && docker compose up -d --build krya
sleep 15

echo "=== Health ==="
curl -s http://localhost:3100/api/health | python3 -m json.tool

echo "=== Models API ==="
curl -s http://localhost:3100/api/models | python3 -m json.tool | head -30

echo "=== FLUX Image Gen ==="
curl -s -X POST http://localhost:3100/api/generate/image \
  -H "Content-Type: application/json" \
  -d '{"prompt":"a red fox in snow, photorealistic","width":1024,"height":1024}' | python3 -m json.tool

echo "=== Video Gen ==="
curl -s -X POST http://localhost:3100/api/generate/video \
  -H "Content-Type: application/json" \
  -d '{"prompt":"ocean waves at golden hour, cinematic","width":832,"height":480}' | python3 -m json.tool

echo "=== Gallery ==="
curl -s http://localhost:3100/api/generations?limit=5 | python3 -m json.tool | head -30

echo "=== All Pages Return 200 ==="
for path in dashboard image image-to-image video video-from-image logo upscale enhancer background-removal style-transfer effects lipsync motion-transfer 3d patterns gallery history settings; do
  status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3100/$path)
  echo "$path: $status"
done
```

Every test must pass. Every page must return 200. FLUX image generation and SVD video must still work regardless of any Wan changes.
