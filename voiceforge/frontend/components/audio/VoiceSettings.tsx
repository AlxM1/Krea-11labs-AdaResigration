'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Info, RotateCcw } from 'lucide-react'

interface VoiceSettingsProps {
  stability: number
  similarity: number
  style: number
  speakerBoost: boolean
  speed: number
  onStabilityChange: (value: number) => void
  onSimilarityChange: (value: number) => void
  onStyleChange: (value: number) => void
  onSpeakerBoostChange: (value: boolean) => void
  onSpeedChange: (value: number) => void
  onReset: () => void
}

interface SliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  step?: number
  leftLabel?: string
  rightLabel?: string
  tooltip?: string
}

function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  leftLabel,
  rightLabel,
  tooltip
}: SliderProps) {
  const [showTooltip, setShowTooltip] = useState(false)

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-white">{label}</span>
          {tooltip && (
            <div className="relative">
              <button
                onMouseEnter={() => setShowTooltip(true)}
                onMouseLeave={() => setShowTooltip(false)}
                className="text-[#a1a1a1] hover:text-white"
              >
                <Info className="w-3.5 h-3.5" />
              </button>
              {showTooltip && (
                <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-[#2f2f2f] rounded-lg shadow-xl z-10">
                  <p className="text-xs text-[#a1a1a1]">{tooltip}</p>
                </div>
              )}
            </div>
          )}
        </div>
        <span className="text-sm text-[#a1a1a1]">{Math.round(value)}%</span>
      </div>

      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 bg-[#2f2f2f] rounded-full appearance-none cursor-pointer
          [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:w-4
          [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:rounded-full
          [&::-webkit-slider-thumb]:bg-white
          [&::-webkit-slider-thumb]:shadow-md
          [&::-webkit-slider-thumb]:cursor-pointer
          [&::-webkit-slider-thumb]:transition
          [&::-webkit-slider-thumb]:hover:scale-110"
        style={{
          background: `linear-gradient(to right, #7c3aed ${value}%, #2f2f2f ${value}%)`
        }}
      />

      {(leftLabel || rightLabel) && (
        <div className="flex justify-between">
          <span className="text-xs text-[#a1a1a1]">{leftLabel}</span>
          <span className="text-xs text-[#a1a1a1]">{rightLabel}</span>
        </div>
      )}
    </div>
  )
}

export default function VoiceSettings({
  stability,
  similarity,
  style,
  speakerBoost,
  speed,
  onStabilityChange,
  onSimilarityChange,
  onStyleChange,
  onSpeakerBoostChange,
  onSpeedChange,
  onReset
}: VoiceSettingsProps) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="bg-[#1f1f1f] rounded-xl border border-[#2f2f2f] overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-[#2a2a2a] transition"
      >
        <span className="font-medium text-white">Voice Settings</span>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onReset()
            }}
            className="p-1.5 text-[#a1a1a1] hover:text-white hover:bg-[#3f3f3f] rounded-lg transition"
            title="Reset to defaults"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-[#a1a1a1]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[#a1a1a1]" />
          )}
        </div>
      </button>

      {/* Settings Panel */}
      {isExpanded && (
        <div className="p-4 pt-0 space-y-6">
          <Slider
            label="Stability"
            value={stability}
            onChange={onStabilityChange}
            leftLabel="More variable"
            rightLabel="More stable"
            tooltip="Increasing stability will make the voice more consistent between generations, but may make the voice sound less expressive."
          />

          <Slider
            label="Clarity + Similarity Enhancement"
            value={similarity}
            onChange={onSimilarityChange}
            leftLabel="Low"
            rightLabel="High"
            tooltip="High values enhance clarity and target speaker similarity but may introduce artifacts if set too high."
          />

          <Slider
            label="Style Exaggeration"
            value={style}
            onChange={onStyleChange}
            leftLabel="None"
            rightLabel="Exaggerated"
            tooltip="High values are recommended if the style of the speech should be exaggerated compared to the original voice."
          />

          <Slider
            label="Speed"
            value={speed}
            onChange={onSpeedChange}
            min={50}
            max={200}
            leftLabel="0.5x"
            rightLabel="2x"
            tooltip="Adjust the speed of the generated speech."
          />

          {/* Speaker Boost Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-white">Speaker Boost</span>
              <div className="relative group">
                <Info className="w-3.5 h-3.5 text-[#a1a1a1]" />
                <div className="absolute left-0 bottom-full mb-2 w-64 p-3 bg-[#2f2f2f] rounded-lg shadow-xl z-10 hidden group-hover:block">
                  <p className="text-xs text-[#a1a1a1]">
                    Boost the similarity of the synthesized voice to the target voice. Recommended for short clips.
                  </p>
                </div>
              </div>
            </div>
            <button
              onClick={() => onSpeakerBoostChange(!speakerBoost)}
              className={`w-11 h-6 rounded-full transition ${
                speakerBoost ? 'bg-[#7c3aed]' : 'bg-[#2f2f2f]'
              }`}
            >
              <div
                className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform ${
                  speakerBoost ? 'translate-x-5' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
