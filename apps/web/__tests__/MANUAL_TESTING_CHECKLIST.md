# Krya Manual Testing Checklist

This checklist ensures all features work correctly across different provider configurations.

## Environment Setup Tests

### Zero API Keys Configuration
- [ ] Start Krya with no AI provider API keys configured
- [ ] Verify app loads without crashing
- [ ] Verify setup banner appears on dashboard
- [ ] Click "Configure API Keys" link → Settings page opens
- [ ] Verify all providers show "Not Configured" status
- [ ] Attempt image generation → User-friendly error message appears
- [ ] Error message includes link to Settings

### Single Provider Configuration
- [ ] Configure only FAL_KEY
- [ ] Restart application
- [ ] Settings page shows fal.ai as "Available"
- [ ] Other providers show "Not Configured"
- [ ] Generate image → Uses fal.ai successfully
- [ ] Repeat for Replicate, Together AI, Google AI, NVIDIA NIM

### Multi-Provider Fallback
- [ ] Configure FAL_KEY and REPLICATE_API_TOKEN
- [ ] Temporarily invalidate FAL_KEY (set to wrong value)
- [ ] Generate image → Falls back to Replicate
- [ ] Check generation metadata → Shows "replicate" as provider
- [ ] Restore FAL_KEY → Next generation uses fal.ai again

## Image Generation Features

### Text-to-Image
- [ ] Generate with FLUX Schnell (fal.ai)
- [ ] Generate with SDXL (Replicate fallback)
- [ ] Generate with custom width/height (512x512, 1024x1024, 1536x1024)
- [ ] Generate with different step counts (4, 8, 20)
- [ ] Generate with negative prompt
- [ ] Generate with custom seed
- [ ] Generate batch (4 images)
- [ ] Test all style presets (Oil Painting, Watercolor, Anime, etc.)

### Image Enhancement
- [ ] Upload image → Upscale 2x → Verify higher resolution
- [ ] Upload image → Upscale 4x → Verify quality improvement
- [ ] Enable face enhancement → Verify face details improved
- [ ] Enable denoise → Verify noise reduction
- [ ] Test with different upscale models (Real-ESRGAN, GFPGAN)

### Background Removal
- [ ] Upload portrait photo → Remove background → Transparent PNG
- [ ] Upload product photo → Remove background → Clean cutout
- [ ] Verify PNG transparency in downloads folder

### Style Transfer
- [ ] Upload reference image → Apply "Oil Painting" → Verify style applied
- [ ] Test all 6 style presets
- [ ] Adjust strength slider (0.3, 0.5, 0.8) → Verify intensity changes
- [ ] Use custom reference image → Verify style transfer works

## Video Generation Features

### Text-to-Video
- [ ] Generate 2-second video with simple prompt
- [ ] Generate 5-second video with complex prompt
- [ ] Generate 10-second video → Verify duration
- [ ] Test all aspect ratios (16:9, 9:16, 1:1, 4:5)
- [ ] Verify video downloads and plays correctly

### Image-to-Video
- [ ] Upload image → Generate 5-second video → Verify animation
- [ ] Test with portrait orientation
- [ ] Test with landscape orientation
- [ ] Add custom prompt for motion description

### Motion Transfer
- [ ] Upload static image + motion reference video
- [ ] Verify motion applied to static image
- [ ] Test with different video durations
- [ ] Download result → Plays correctly

### Video Restyle
- [ ] Upload video + apply "Anime" style
- [ ] Upload video + apply "Oil Painting" style
- [ ] Verify style consistency across frames
- [ ] Download result → Style visible throughout

### Lipsync
- [ ] Upload video + upload audio → Generate lipsync
- [ ] Verify lip movements match audio
- [ ] Test with different video/audio combinations
- [ ] Download result → Audio synced correctly

## 3D Generation

### Image-to-3D
- [ ] Upload object photo → Generate 3D model (GLB)
- [ ] 3D viewer loads model successfully
- [ ] Rotate model with mouse → Orbit controls work
- [ ] Zoom in/out → Camera controls work
- [ ] Pan camera → Navigation works smoothly
- [ ] Download GLB → Opens in Blender/Three.js viewer
- [ ] Download OBJ → Opens in 3D software
- [ ] Test lighting presets (Default, Studio, Outdoor)
- [ ] Toggle auto-rotate → Model spins automatically

## Real-time Canvas

### Live Drawing
- [ ] Open Real-time Canvas
- [ ] Draw simple shape → Image generates in <1 second
- [ ] Draw complex scene → Image updates continuously
- [ ] Select different models (LCM SDXL, FLUX Schnell)
- [ ] Adjust prompt → Generation updates
- [ ] Clear canvas → Starts fresh
- [ ] Verify 20 FPS update rate
- [ ] Test WebSocket connection → Real-time updates work

## Image Editor

### Inpainting
- [ ] Upload image → Draw mask → Generate inpaint → Verify blend
- [ ] Adjust brush size → Mask area changes
- [ ] Use eraser → Remove mask areas
- [ ] Rectangle select → Quick masking
- [ ] Split-view → Compare before/after

### Outpainting
- [ ] Upload image → Extend canvas → Generate outpaint
- [ ] Verify seamless blend at edges
- [ ] Test extending all 4 sides

### Remove/Replace Background
- [ ] Upload portrait → Remove background → Add new background
- [ ] Verify edge quality
- [ ] Test with complex backgrounds (hair, transparency)

## Logo Generation

- [ ] Generate logo with "Tech Startup" prompt
- [ ] Test all 5 style presets (Minimal, Modern, Vintage, etc.)
- [ ] Select color palette → Verify colors applied
- [ ] Generate batch of 4 logos
- [ ] Download all variations

## Model Training

- [ ] Upload 10-20 training images (faces)
- [ ] Configure LoRA training (FLUX Dev, 1000 steps)
- [ ] Start training → Job queued
- [ ] Monitor progress → Updates every 30 seconds
- [ ] Wait for completion (may take 20+ minutes on Replicate)
- [ ] Use trained model → Generate image with trigger word
- [ ] Verify model learned features correctly

## Workflow Editor

### Node Creation
- [ ] Drag "Text-to-Image" node to canvas
- [ ] Drag "Upscale" node to canvas
- [ ] Connect output → input → Line drawn
- [ ] Add "Output" node → Complete workflow
- [ ] Save workflow → Persists to database

### Workflow Execution
- [ ] Create simple workflow: Input → Text-to-Image → Output
- [ ] Execute workflow → Runs successfully
- [ ] Create complex workflow: Input → Text-to-Image → Upscale → Style Transfer → Output
- [ ] Execute complex workflow → All nodes run in order
- [ ] Verify intermediate results stored
- [ ] Check final output → All transformations applied
- [ ] Add Loop node → Verify batch generation
- [ ] Add Conditional node → Verify branching logic

## Gallery & Social Features

### Public Sharing
- [ ] Generate image → Click share button
- [ ] Verify generation appears in Community Feed
- [ ] Like shared generation → Like count increases
- [ ] Unlike → Like count decreases
- [ ] Comment on generation → Comment appears
- [ ] Filter by category (Portraits, Landscapes, etc.)
- [ ] Search for keyword → Results appear
- [ ] Unshare generation → Removed from feed

### History & Favorites
- [ ] View generation history → All past generations listed
- [ ] Search history by prompt
- [ ] Filter by date range
- [ ] Add to favorites → Appears in Favorites tab
- [ ] Remove from favorites → Removed from list

## LLM Features (Prompt Enhancement)

### Prompt Enhancement
- [ ] Enter short prompt: "sunset"
- [ ] Click sparkle ✨ icon → Prompt enhanced
- [ ] Verify enhanced prompt more detailed
- [ ] Edit enhanced prompt → User can customize
- [ ] Generate with enhanced prompt → Better results

### Negative Prompt Generation
- [ ] Enter prompt → Auto-generate negative prompt
- [ ] Verify negative prompt relevant to style
- [ ] Test with portrait → Face-specific negatives
- [ ] Test with landscape → Landscape-specific negatives

### Style Suggestions
- [ ] Enter "portrait of a woman" → Get style suggestions
- [ ] Verify 3 styles suggested
- [ ] Each suggestion has reason + recommended model
- [ ] Click suggestion → Apply to generation

### Smart Search
- [ ] Natural language: "show me my anime portraits from last week"
- [ ] Verify correct filters applied (timeRange, style, subject)
- [ ] Complex query: "photorealistic landscapes with FLUX from last month"
- [ ] Verify all filters parsed correctly

## Service Integrations

### VoiceForge (Video Narration)
- [ ] Generate video → Enable "Add Narration" checkbox
- [ ] Select voice from dropdown
- [ ] Generate → Video includes AI narration
- [ ] Download → Audio track present
- [ ] Verify audio matches video content

### WhisperFlow (Voice Input)
- [ ] Click microphone icon in prompt field
- [ ] Record audio: "Generate a sunset over the ocean"
- [ ] Stop recording → Audio transcribed
- [ ] Verify prompt field populated with transcription
- [ ] Generate image with voice prompt

### Newsletter Pipeline
- [ ] Trigger generation from Newsletter service
- [ ] Verify webhook receives request
- [ ] Verify authentication with INTERNAL_API_KEY
- [ ] Generation completes → Callback sent to Newsletter
- [ ] Batch generation → All items processed

### AgentSmith Workflows
- [ ] Trigger generation from AgentSmith workflow
- [ ] Verify webhook receives request
- [ ] Verify authentication with WEBHOOK_SECRET
- [ ] Generation completes → Callback sent to AgentSmith
- [ ] Test image generation action
- [ ] Test video generation action
- [ ] Test batch generation action

## GPU Server Integration

### ComfyUI Connection
- [ ] Configure COMFYUI_URL in environment
- [ ] Restart application
- [ ] Settings page → "ComfyUI" shows "Connected"
- [ ] Generate image using ComfyUI provider
- [ ] Verify result from local GPU server
- [ ] Check GPU status endpoint → Shows system stats

### Graceful Degradation
- [ ] Stop ComfyUI server
- [ ] Attempt generation → Falls back to cloud provider
- [ ] Settings page → "ComfyUI" shows "Not Connected"
- [ ] App continues working normally
- [ ] Restart ComfyUI → Reconnects automatically

## Settings & Configuration

### API Provider Status
- [ ] Open Settings → AI Providers tab
- [ ] Click "Check Status" → All providers refresh
- [ ] Verify visual indicators (green = available, gray = not configured)
- [ ] Click provider link → Opens API key signup page
- [ ] Configure new provider → Status updates to "Available"
- [ ] Remove API key → Status updates to "Not Configured"

### GPU Status Dashboard
- [ ] Click "View detailed GPU server status" link
- [ ] Verify JSON response shows:
  - System stats (CPU, RAM, GPU)
  - Available models (checkpoints, LoRAs, VAEs)
  - Queue info (running, pending jobs)
  - Feature support flags

## Error Handling

### Network Failures
- [ ] Disconnect internet → Attempt generation
- [ ] Verify error message explains network issue
- [ ] Reconnect → Next generation succeeds

### Invalid Inputs
- [ ] Submit empty prompt → Validation error
- [ ] Submit prompt too long (>1000 chars) → Error
- [ ] Upload file too large (>10MB) → Error
- [ ] Upload invalid file type → Error

### Provider Failures
- [ ] All providers unavailable → User-friendly message
- [ ] Message includes setup instructions
- [ ] Link to Settings page works
- [ ] No crashes or stack traces visible

## Performance & Reliability

### Load Testing
- [ ] Generate 10 images simultaneously → All complete
- [ ] Queue system handles backlog
- [ ] No jobs lost or duplicated
- [ ] Progress updates work for all jobs

### Database Operations
- [ ] Create project → Appears in Projects tab
- [ ] Add items to project → Persist correctly
- [ ] Delete project → Removed from database
- [ ] Search generations → Results accurate

### WebSocket Stability
- [ ] Real-time canvas → Leave tab idle 5 minutes
- [ ] Return to tab → Connection still active
- [ ] Disconnect WebSocket → Reconnects automatically
- [ ] Multiple tabs → Each maintains own connection

## Cross-Browser Testing
- [ ] Test in Chrome → All features work
- [ ] Test in Firefox → All features work
- [ ] Test in Safari → All features work
- [ ] Test in Edge → All features work

## Mobile Responsiveness
- [ ] Open on mobile device → UI adapts
- [ ] Navigation works on small screen
- [ ] Image generation works
- [ ] Canvas tools usable on touchscreen
- [ ] File upload works from mobile

## Docker Deployment

### Build & Start
- [ ] Run `docker compose build krya`
- [ ] No build errors
- [ ] Run `docker compose up -d krya`
- [ ] Container starts successfully
- [ ] Check logs: `docker compose logs -f krya`
- [ ] No error logs on startup

### End-to-End in Docker
- [ ] Access http://localhost:3100
- [ ] Login via Authentik
- [ ] Generate test image → Succeeds
- [ ] Download image → File saves correctly
- [ ] Check storage: `/mnt/data/00raiser/media/krya/`
- [ ] Verify image file exists

### Service Communication
- [ ] Krya → PostgreSQL → Database queries work
- [ ] Krya → Redis → Job queues work
- [ ] Krya → VoiceForge → Service call succeeds
- [ ] Krya → WhisperFlow → Service call succeeds
- [ ] Krya → Newsletter → Webhook works
- [ ] Krya → AgentSmith → Webhook works

## Final Verification

- [ ] All 15 major features implemented and working
- [ ] Provider fallback chains functional
- [ ] LLM integration (Kimi K2.5) working
- [ ] All service integrations complete
- [ ] GPU server graceful degradation working
- [ ] Settings page API management functional
- [ ] Zero crashes with no API keys configured
- [ ] Docker build and deployment successful
- [ ] Manual testing 100% complete
- [ ] Production-ready error handling
- [ ] Documentation complete

## Bug Report Template

If you encounter issues, report with:
- Feature tested
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment (browser, OS, Docker logs)
- Screenshots/videos if applicable
