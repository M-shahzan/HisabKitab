"use client";

import React, { useState } from "react";
import { MessageSquareText, RotateCcw, Edit2, Check, Volume2, VolumeX, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface TranscriptPanelProps {
  transcript: string;
  spokenMessage?: string;
  isSpeaking?: boolean;
  onReplayAudio?: () => void;
  onStopAudio?: () => void;
  onRetry: () => void;
  onEditSubmit?: (newText: string) => void;
}

export function TranscriptPanel({
  transcript,
  spokenMessage,
  isSpeaking,
  onReplayAudio,
  onStopAudio,
  onRetry,
  onEditSubmit,
}: TranscriptPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(transcript);

  if (!transcript && !spokenMessage) return null;

  const handleSave = () => {
    setIsEditing(false);
    if (onEditSubmit && editText.trim() !== transcript.trim()) {
      onEditSubmit(editText);
    }
  };

  return (
    <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 sm:p-5 my-4 space-y-3">
      {/* Voice Transcript Section */}
      {transcript && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
              <MessageSquareText className="h-4 w-4 text-emerald-600" />
              <span>Recognized Customer Order</span>
            </div>
            <div className="flex items-center gap-1">
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => {
                    setEditText(transcript);
                    setIsEditing(true);
                  }}
                  className="text-xs font-medium text-emerald-700 hover:text-emerald-900 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-emerald-100/60 transition-colors min-h-[36px]"
                  title="Correct recognized words"
                >
                  <Edit2 className="h-3 w-3" />
                  <span>Edit Text</span>
                </button>
              ) : null}
              <button
                type="button"
                onClick={onRetry}
                className="text-xs font-medium text-slate-500 hover:text-slate-800 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white transition-colors min-h-[36px]"
                title="Record again"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Speak Again</span>
              </button>
            </div>
          </div>

          {isEditing ? (
            <div className="mt-2 space-y-2">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full p-2.5 text-sm bg-white border border-emerald-300 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:outline-none"
                rows={2}
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSave}>
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Reparse Items
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm sm:text-base font-medium text-slate-800 italic leading-relaxed">
              &ldquo;{transcript}&rdquo;
            </p>
          )}
        </div>
      )}

      {/* Backend Assistant Spoken Message with Audio Playback Controls */}
      {spokenMessage && (
        <div className="pt-2 border-t border-emerald-200/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-white/70 p-3 rounded-xl border border-emerald-100">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
            <div className="text-xs sm:text-sm text-slate-700 font-semibold">
              <span className="text-emerald-800 font-bold mr-1.5">Assistant:</span>
              <span>{spokenMessage}</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-end sm:self-auto">
            {isSpeaking ? (
              <button
                type="button"
                onClick={onStopAudio}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-800 hover:bg-amber-200 text-xs font-bold transition-colors min-h-[36px]"
                title="Stop spoken audio"
              >
                <VolumeX className="h-3.5 w-3.5 text-amber-700 animate-pulse" />
                <span>Stop Voice</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onReplayAudio}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 text-xs font-bold shadow-xs transition-colors min-h-[36px]"
                title="Replay assistant voice readout"
              >
                <Volume2 className="h-3.5 w-3.5" />
                <span>Replay Voice</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
