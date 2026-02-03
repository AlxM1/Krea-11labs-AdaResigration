'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Play,
  Pause,
  Download,
  RotateCcw,
  Volume2,
  VolumeX,
  SkipBack,
  SkipForward
} from 'lucide-react'

interface AudioPlayerProps {
  audioUrl: string
  title?: string
  onDownload?: () => void
  onRegenerate?: () => void
  showWaveform?: boolean
}

export default function AudioPlayer({
  audioUrl,
  title,
  onDownload,
  onRegenerate,
  showWaveform = true
}: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolume] = useState(1)
  const [isMuted, setIsMuted] = useState(false)
  const [waveformData, setWaveformData] = useState<number[]>([])

  const audioRef = useRef<HTMLAudioElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()

  // Generate fake waveform data (in production, analyze actual audio)
  useEffect(() => {
    const bars = 100
    const data = Array.from({ length: bars }, () => Math.random() * 0.8 + 0.2)
    setWaveformData(data)
  }, [audioUrl])

  // Draw waveform
  useEffect(() => {
    if (!canvasRef.current || !showWaveform) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      const width = canvas.width
      const height = canvas.height
      const barWidth = width / waveformData.length
      const progress = duration > 0 ? currentTime / duration : 0

      ctx.clearRect(0, 0, width, height)

      waveformData.forEach((value, index) => {
        const x = index * barWidth
        const barHeight = value * height * 0.8
        const y = (height - barHeight) / 2

        // Played portion
        if (index / waveformData.length <= progress) {
          ctx.fillStyle = '#7c3aed'
        } else {
          ctx.fillStyle = '#3f3f3f'
        }

        ctx.fillRect(x, y, barWidth - 1, barHeight)
      })
    }

    draw()
  }, [waveformData, currentTime, duration, showWaveform])

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60)
    const seconds = Math.floor(time % 60)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  const handlePlayPause = () => {
    if (!audioRef.current) return

    if (isPlaying) {
      audioRef.current.pause()
    } else {
      audioRef.current.play()
    }
    setIsPlaying(!isPlaying)
  }

  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime)
    }
  }

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration)
    }
  }

  const handleSeek = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioRef.current || !canvasRef.current) return

    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const percentage = x / rect.width
    audioRef.current.currentTime = percentage * duration
  }

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value)
    setVolume(newVolume)
    if (audioRef.current) {
      audioRef.current.volume = newVolume
    }
    setIsMuted(newVolume === 0)
  }

  const toggleMute = () => {
    if (audioRef.current) {
      if (isMuted) {
        audioRef.current.volume = volume || 1
        setIsMuted(false)
      } else {
        audioRef.current.volume = 0
        setIsMuted(true)
      }
    }
  }

  const skip = (seconds: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = Math.max(0, Math.min(duration, currentTime + seconds))
    }
  }

  return (
    <div className="bg-[#1f1f1f] rounded-xl border border-[#2f2f2f] p-4">
      {title && (
        <p className="text-sm text-[#a1a1a1] mb-3 truncate">{title}</p>
      )}

      {/* Waveform */}
      {showWaveform && (
        <canvas
          ref={canvasRef}
          width={600}
          height={60}
          onClick={handleSeek}
          className="w-full h-[60px] cursor-pointer mb-4 rounded"
        />
      )}

      {/* Controls */}
      <div className="flex items-center gap-4">
        {/* Play Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => skip(-10)}
            className="p-2 text-[#a1a1a1] hover:text-white hover:bg-[#2f2f2f] rounded-lg transition"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={handlePlayPause}
            className="w-12 h-12 bg-[#7c3aed] hover:bg-[#6d28d9] rounded-full flex items-center justify-center transition"
          >
            {isPlaying ? (
              <Pause className="w-5 h-5 text-white" />
            ) : (
              <Play className="w-5 h-5 text-white ml-0.5" />
            )}
          </button>

          <button
            onClick={() => skip(10)}
            className="p-2 text-[#a1a1a1] hover:text-white hover:bg-[#2f2f2f] rounded-lg transition"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Time */}
        <div className="flex-1 flex items-center gap-2">
          <span className="text-sm text-[#a1a1a1] w-12">
            {formatTime(currentTime)}
          </span>

          {/* Progress Bar (if no waveform) */}
          {!showWaveform && (
            <div className="flex-1 h-1.5 bg-[#2f2f2f] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#7c3aed] transition-all"
                style={{ width: `${(currentTime / duration) * 100}%` }}
              />
            </div>
          )}

          <span className="text-sm text-[#a1a1a1] w-12 text-right">
            {formatTime(duration)}
          </span>
        </div>

        {/* Volume */}
        <div className="flex items-center gap-2">
          <button
            onClick={toggleMute}
            className="p-2 text-[#a1a1a1] hover:text-white hover:bg-[#2f2f2f] rounded-lg transition"
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={isMuted ? 0 : volume}
            onChange={handleVolumeChange}
            className="w-20 h-1.5 bg-[#2f2f2f] rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-3
              [&::-webkit-slider-thumb]:h-3
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white"
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="p-2 text-[#a1a1a1] hover:text-white hover:bg-[#2f2f2f] rounded-lg transition"
              title="Regenerate"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          )}
          {onDownload && (
            <button
              onClick={onDownload}
              className="p-2 text-[#a1a1a1] hover:text-white hover:bg-[#2f2f2f] rounded-lg transition"
              title="Download"
            >
              <Download className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Hidden Audio Element */}
      <audio
        ref={audioRef}
        src={audioUrl}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => setIsPlaying(false)}
        className="hidden"
      />
    </div>
  )
}
