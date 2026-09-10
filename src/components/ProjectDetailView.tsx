import React, { useEffect, useMemo, useState } from "react";
import YouTubePublishModal from "./YouTubePublishModal.js";
import { getSupabase } from "../lib/supabase";
import {
  AlertCircle,
  Crown,
  ArrowLeft,
  BarChart3,
  Captions,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock3,
  Copy,
  Download,
  ExternalLink,
  FileVideo,
  Film,
  Flame,
  Languages,
  Layers3,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Scissors,
  Sparkles,
  Target,
  Trash2,
  TrendingUp,
  Video,
  Wand2,
  Youtube,
  Zap,
  Volume2,
  VolumeX,
  AudioWaveform,
  Bug,
  ShieldCheck,
  Wrench,
  AlertTriangle,
} from "lucide-react";

import { Project, Clip } from "../types.js";
/* =========================================================
   TYPES
========================================================= */

interface ProjectDetailViewProps {
  project: Project;
  clips: Clip[];
  onBack: () => void;
  onDeleteProject: (id: string) => void;

  /** Whether the current user has an active premium plan. */
  isPremium?: boolean;

  /** Called when a non-premium user taps a premium-gated action. */
  onUpgrade?: () => void;
}

type SpeechEnhanceStatus =
  | "idle"
  | "processing"
  | "completed"
  | "error";

/* =========================================================
   HELPERS
========================================================= */

function formatDuration(seconds?: number | null) {
  const value = Number(seconds ?? 0);

  if (!Number.isFinite(value) || value <= 0) {
    return "0:00";
  }

  const total = Math.round(value);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const secs = total % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(secs).padStart(2, "0");

  if (hours > 0) {
    return `${String(hours).padStart(2, "0")}:${mm}:${ss}`;
  }

  return `${minutes}:${ss}`;
}

function normalizeProgress(value?: number | null) {
  const progress = Number(value ?? 0);

  if (!Number.isFinite(progress)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Math.round(progress)));
}

function getProjectStatus(project: Project) {
  return String(project.status ?? "").toLowerCase();
}

function getClipScore(clip: Clip) {
  return (
    Number(
      (clip as any).viral_score ??
        (clip as any).score ??
        (clip as any).viralScore ??
        0,
    ) || 0
  );
}

function getClipTitle(clip: Clip) {
  return clip.title || (clip as any).name || "Viral Clip";
}

function getClipReason(clip: Clip) {
  return (
    (clip as any).reason ||
    (clip as any).description ||
    "Strong short-form moment detected by LumoClip AI."
  );
}

function getClipVideoUrl(clip: Clip) {
  return (
    (clip as any).video_url ||
    (clip as any).clip_url ||
    (clip as any).url ||
    ""
  );
}

function getClipThumbnailUrl(clip: Clip) {
  return (
    (clip as any).thumbnail_url ||
    (clip as any).thumbnail ||
    (clip as any).preview_url ||
    (clip as any).poster_url ||
    ""
  );
}

function getFullVideoUrl(project: Project): string {
  const data = project as any;

  const value =
    data.full_video_url ||
    data.fullVideoUrl ||
    "";

  return typeof value === "string"
    ? value.trim()
    : "";
}

function getProcessingMode(project: Project): string {
  const data = project as any;

  return String(
    data.processing_mode ||
      data.processingMode ||
      "",
  ).toLowerCase();
}

function isReframeProject(project: Project): boolean {
  return getProcessingMode(project) === "reframe";
}

function isSpeechOnlyProject(project: Project): boolean {
  const mode = getProcessingMode(project);
  const currentStep = String(
    (project as any).current_step ||
      (project as any).currentStep ||
      "",
  ).toLowerCase();

  return (
    mode === "speech_only" ||
    currentStep.includes("speech enhancement source") ||
    currentStep.includes("ready for enhanced speech")
  );
}

/* =========================================================
   AUTO SFX HELPERS

   Reads the dedicated Auto SFX fields off the project object:
     - project.auto_sfx_status    ("idle" | "queued" | "processing" | "completed" | "failed")
     - project.auto_sfx_progress  (0-100)
========================================================= */

function getAutoSfxStatus(project: Project): string {
  const data = project as any;

  return String(
    data.auto_sfx_status ?? data.autoSfxStatus ?? "idle",
  ).toLowerCase();
}

function getAutoSfxProgress(project: Project): number {
  return normalizeProgress(
    (project as any).auto_sfx_progress ??
      (project as any).autoSfxProgress,
  );
}

function isAutoSfxActive(project: Project): boolean {
  const status = getAutoSfxStatus(project);

  return status === "queued" || status === "processing";
}

function isAutoSfxFailed(project: Project): boolean {
  return getAutoSfxStatus(project) === "failed";
}

/* =========================================================
   SHARED UI
========================================================= */

const Surface: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <div
    className={[
      "relative rounded-2xl border border-white/[0.08] bg-gradient-to-b from-[#0c0c11] to-[#08080b]",
      "shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_18px_50px_rgba(0,0,0,0.35)]",
      "before:pointer-events-none before:absolute before:inset-x-0 before:top-0 before:h-px before:rounded-t-2xl before:bg-gradient-to-r before:from-transparent before:via-white/[0.14] before:to-transparent",
      className,
    ].join(" ")}
  >
    {children}
  </div>
);

const StatusBadge: React.FC<{
  status: "processing" | "completed" | "failed";
  progress?: number;
}> = ({ status, progress = 0 }) => {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/[0.09] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-300 shadow-[0_0_16px_rgba(16,185,129,0.14)]">
        <CheckCircle2 className="h-3 w-3" />
        Ready
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/15 bg-red-400/[0.08] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-red-300">
        <AlertCircle className="h-3 w-3" />
        Failed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/15 bg-violet-400/[0.08] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-violet-300">
      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
      {progress}% Processing
    </span>
  );
};

const PublishToYouTubeButton: React.FC<{
  onPublish: () => void;
  variant?: "solid" | "outline";
  className?: string;
}> = ({
  onPublish,
  variant = "solid",
  className = "",
}) => {
  const solidClasses =
    "bg-gradient-to-b from-red-500 to-red-600 text-white shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_10px_28px_rgba(239,68,68,0.22)] hover:from-red-400 hover:to-red-500";

  const outlineClasses =
    "border border-red-500/15 bg-red-500/[0.06] text-red-300 hover:border-red-500/30 hover:bg-red-500/[0.1] hover:text-red-200";

  return (
    <button
      type="button"
      onClick={onPublish}
      aria-label="Publish to YouTube"
      className={[
        "inline-flex min-h-11 w-full touch-manipulation items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-[9px] font-bold uppercase tracking-[0.08em] transition active:scale-[0.98] sm:text-[10px]",
        variant === "solid" ? solidClasses : outlineClasses,
        className,
      ].join(" ")}
    >
      <Youtube className="h-3.5 w-3.5 shrink-0" />
      <span className="truncate">Publish to YouTube</span>
    </button>
  );
};

/* =========================================================
   HERO VIDEO
========================================================= */

const HeroVideo: React.FC<{
  project: Project;
  progress: number;
  completed: boolean;
  failed: boolean;
  /** When speech enhancement is actively running, override the caption text. */
  speechEnhancing?: boolean;
  /** When Auto SFX is actively running, override the caption text. */
  autoSfxRunning?: boolean;
}> = ({
  project,
  progress,
  completed,
  failed,
  speechEnhancing = false,
  autoSfxRunning = false,
}) => {
  const sourceUrl =
    (project as any).source_media_url ||
    (project as any).video_url ||
    "";

  const thumbnail =
    project.thumbnail_url || "";

  const fullVideoMode =
    getProcessingMode(project) ===
    "full_video_caption";

  const reframeMode =
    getProcessingMode(project) === "reframe";

  return (
    <Surface className="overflow-hidden">
      <div className="relative aspect-video overflow-hidden bg-black">
        {sourceUrl ? (
          <video
            src={sourceUrl}
            controls
            playsInline
            preload="metadata"
            poster={thumbnail || undefined}
            className="h-full w-full object-cover"
          />
        ) : thumbnail ? (
          <img
            src={thumbnail}
            alt={project.name || "Project preview"}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[#060608]">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl border border-white/[0.08] bg-white/[0.03]">
              <Video className="h-7 w-7 text-zinc-600" />
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-black/30" />
        <div className="pointer-events-none absolute inset-0 shadow-[inset_0_0_90px_rgba(0,0,0,0.55)]" />

        <div className="absolute left-4 top-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 bg-black/50 px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.14em] text-white backdrop-blur-xl">
            {project.source_type || "VIDEO"}
          </span>

          {fullVideoMode && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/15 bg-indigo-500/15 px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.12em] text-indigo-200 backdrop-blur-xl">
              <Captions className="h-3 w-3" />
              Captions
            </span>
          )}

          {reframeMode && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/15 bg-violet-500/15 px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.12em] text-violet-200 backdrop-blur-xl">
              <Target className="h-3 w-3" />
              AI Reframe
            </span>
          )}

          {speechEnhancing && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/20 bg-cyan-500/20 px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.12em] text-cyan-200 backdrop-blur-xl">
              <AudioWaveform className="h-3 w-3 animate-pulse" />
              Enhancing speech
            </span>
          )}

          {autoSfxRunning && (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-500/20 px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-[0.12em] text-amber-200 backdrop-blur-xl">
              <Sparkles className="h-3 w-3 animate-pulse" />
              Adding SFX
            </span>
          )}
        </div>

        <div className="absolute bottom-5 left-5 right-5">
          {speechEnhancing ? (
            <>
              <p className="text-sm font-semibold text-white sm:text-base">
                Enhancing your speech
              </p>

              <p className="mt-1 text-[10px] text-zinc-300">
                Removing noise and balancing voice levels...
              </p>
            </>
          ) : autoSfxRunning ? (
            <>
              <p className="text-sm font-semibold text-white sm:text-base">
                Adding sound effects
              </p>

              <p className="mt-1 text-[10px] text-zinc-300">
                Detecting moments and mixing in SFX...
              </p>
            </>
          ) : !completed && !failed ? (
            <>
              <p className="text-sm font-semibold text-white sm:text-base">
                {fullVideoMode
                  ? "Creating your captioned video"
                  : "Turning your video into short-form content"}
              </p>

              <p className="mt-1 text-[10px] text-zinc-300">
                {project.current_step ||
                  "Analyzing your content..."}
              </p>
            </>
          ) : completed ? (
            <>
              <p className="text-sm font-semibold text-white sm:text-base">
                Your content is ready
              </p>

              <p className="mt-1 text-[10px] text-zinc-300">
                {project.duration
                  ? `${formatDuration(project.duration)} source video`
                  : "AI-generated content"}
              </p>
            </>
          ) : (
            <p className="text-sm font-semibold text-red-200">
              Processing failed
            </p>
          )}
        </div>

        {(speechEnhancing || autoSfxRunning || (!completed && !failed)) && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10">
            <div
              className={[
                "h-full rounded-r-full transition-all duration-700",
                speechEnhancing
                  ? "w-1/2 animate-pulse bg-gradient-to-r from-cyan-400 to-cyan-300 shadow-[0_0_12px_rgba(34,211,238,0.55)]"
                  : autoSfxRunning
                  ? "bg-gradient-to-r from-amber-400 to-orange-300 shadow-[0_0_12px_rgba(251,191,36,0.55)]"
                  : "bg-gradient-to-r from-violet-500 to-fuchsia-400 shadow-[0_0_12px_rgba(139,92,246,0.55)]",
              ].join(" ")}
              style={
                speechEnhancing
                  ? undefined
                  : autoSfxRunning
                  ? { width: `${progress}%` }
                  : { width: `${progress}%` }
              }
            />
          </div>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3">
        <div className="flex items-center gap-2 text-[9px] text-zinc-600">
          <Clock3 className="h-3.5 w-3.5" />
          {formatDuration(project.duration)}
        </div>

        <div className="flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-[0.14em] text-zinc-700">
          <Sparkles className="h-3 w-3 text-violet-500" />
          LumoClip AI
        </div>
      </div>
    </Surface>
  );
};

/* =========================================================
   ENHANCE SPEECH
========================================================= */

interface EnhanceSpeechPanelProps {
  project: Project;
  /** Lifted up so the rest of the page can react to this action running. */
  status: SpeechEnhanceStatus;
  onStatusChange: (status: SpeechEnhanceStatus) => void;
}

const EnhanceSpeechPanel: React.FC<EnhanceSpeechPanelProps> = ({
  project,
  status,
  onStatusChange: setStatus,
}) => {
  const supabase = getSupabase();

  const [outputUrl, setOutputUrl] =
    useState("");

  const [error, setError] =
    useState("");

  const [inputType, setInputType] =
    useState<"source" | "clip">("source");

  const [selectedClipId, setSelectedClipId] =
    useState("");

  const [startedAt, setStartedAt] =
    useState<number | null>(null);

  const sourceUrl =
    (project as any).source_media_url ||
    (project as any).video_url ||
    "";

  const enhancedFromProject =
    (project as any).enhanced_speech_url ||
    (project as any).enhancedSpeechUrl ||
    "";

  /*
   * If backend/project polling already contains the enhanced
   * speech URL, show it automatically.
   */
  useEffect(() => {
    if (!outputUrl && enhancedFromProject) {
      setOutputUrl(
        String(enhancedFromProject),
      );
      setStatus("completed");
    }
  }, [
    enhancedFromProject,
    outputUrl,
  ]);

  /*
   * Reset local result when user changes project.
   */
  useEffect(() => {
    setStatus("idle");
    setOutputUrl("");
    setError("");
    setSelectedClipId("");
    setInputType("source");
    setStartedAt(null);
    setElapsedTick(0);
  }, [project.id]);

  /*
   * Optional lightweight elapsed-time UI.
   * The actual timeout is enforced by the backend.
   */
  const [elapsedTick, setElapsedTick] = useState(0);

  const elapsedSeconds =
    startedAt
      ? Math.max(
          0,
          Math.floor(
            (Date.now() - startedAt) / 1000,
          ),
        )
      : 0;
  // Keep elapsedTick referenced so React re-renders while processing.
  void elapsedTick;

  useEffect(() => {
    if (status !== "processing") {
      return;
    }

    const timer = window.setInterval(() => {
      // Re-render once per second so elapsedSeconds stays live.
      setElapsedTick((value) => value + 1);
    }, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [status]);

  /*
   * NOTE:
   * ProjectDetailView receives clips separately, so the panel
   * receives them below through a property assigned locally.
   */
  const runEnhancement = async () => {
    if (status === "processing") {
      return;
    }

    setError("");

    if (
      inputType === "clip" &&
      !selectedClipId
    ) {
      setError(
        "Please select a clip first.",
      );
      return;
    }

    try {
      setStatus("processing");
      setOutputUrl("");
      setStartedAt(Date.now());

      const supabaseClient = await supabase;
      const {
        data: sessionData,
        error: sessionError,
      } = await supabaseClient.auth.getSession();

      if (sessionError) {
        throw new Error(
          sessionError.message ||
            "Unable to get your login session.",
        );
      }

      const accessToken =
        sessionData.session?.access_token;

      if (!accessToken) {
        throw new Error(
          "Your login session has expired. Please sign in again.",
        );
      }

      const body: {
        inputType: "source" | "clip";
        clipId?: string;
      } = {
        inputType,
      };

      if (
        inputType === "clip" &&
        selectedClipId
      ) {
        body.clipId = selectedClipId;
      }

      const response = await fetch(
        `/api/projects/${encodeURIComponent(
          project.id,
        )}/enhance-speech`,
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body),
        },
      );

      let data: any = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Speech enhancement failed (${response.status}).`,
        );
      }

      if (!data?.success) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Speech enhancement failed.",
        );
      }

      const enhancedUrl =
        data.outputUrl ||
        data.output_url ||
        data.url;

      if (!enhancedUrl) {
        throw new Error(
          "Enhancement completed, but no output video URL was returned.",
        );
      }

      setOutputUrl(
        String(enhancedUrl),
      );

      setStatus("completed");
    } catch (err) {
      console.error(
        "LumoClip: speech enhancement failed",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while enhancing the speech.",
      );

      setStatus("error");
    } finally {
      setStartedAt(null);
    }
  };

  const resetEnhancement = () => {
    setStatus("idle");
    setOutputUrl("");
    setError("");
    setStartedAt(null);
  };

  return (
    <section className="mt-5">
      <Surface className="overflow-hidden">
        {/* Header */}
        <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-500/[0.07]">
                {status === "processing" ? (
                  <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                ) : status === "completed" ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                ) : (
                  <AudioWaveform className="h-4 w-4 text-cyan-400" />
                )}
              </div>

              <div>
                <div className="flex items-center gap-2">
                  <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-cyan-400">
                    Audio enhancement
                  </p>

                  <span className="rounded-full border border-emerald-400/15 bg-emerald-500/[0.08] px-2 py-0.5 text-[7px] font-bold uppercase tracking-wider text-emerald-300">
                    Free
                  </span>
                </div>

                <h2 className="mt-1 text-base font-semibold text-white">
                  Enhance Speech
                </h2>

                <p className="mt-1 text-[9px] text-zinc-600">
                  Reduce background noise and make voices clearer.
                </p>
              </div>
            </div>

            {status === "completed" && (
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-400/10 bg-emerald-500/[0.07] px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-wider text-emerald-300">
                <Check className="h-3 w-3" />
                Enhanced
              </span>
            )}
          </div>
        </div>

        <div className="p-5 sm:p-6">
          {/* Processing */}
          {status === "processing" && (
            <div className="mb-5 rounded-xl border border-cyan-400/10 bg-cyan-500/[0.035] p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-cyan-400/10 bg-cyan-500/[0.07]">
                  <Volume2 className="h-4 w-4 animate-pulse text-cyan-400" />
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-white">
                    Enhancing your speech...
                  </p>

                  <p className="mt-1 text-[8px] text-zinc-600">
                    Removing noise, balancing voice levels and improving clarity.
                  </p>
                </div>

                <div className="ml-auto shrink-0 text-right">
                  <Loader2 className="ml-auto h-4 w-4 animate-spin text-cyan-400" />

                  {elapsedSeconds > 0 && (
                    <p className="mt-1 text-[7px] text-zinc-700">
                      {elapsedSeconds}s
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-cyan-400/60" />
              </div>
            </div>
          )}

          {/* Completed result */}
          {status === "completed" &&
            outputUrl && (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border border-emerald-400/10 bg-black">
                  <div className="flex items-center gap-2 border-b border-white/[0.05] bg-emerald-500/[0.025] px-4 py-3">
                    <Volume2 className="h-3.5 w-3.5 text-emerald-400" />

                    <div>
                      <p className="text-[9px] font-semibold text-white">
                        Enhanced speech ready
                      </p>

                      <p className="mt-0.5 text-[7px] text-zinc-600">
                        Cleaner voice • reduced background noise • normalized loudness
                      </p>
                    </div>
                  </div>

                  <video
                    src={outputUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="max-h-[600px] min-h-[220px] w-full object-contain"
                  />
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex flex-wrap items-center gap-2 text-[8px] text-zinc-600">
                    <span className="text-emerald-400/80">
                      Free enhancement
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <a
                      href={outputUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex min-h-10 flex-1 items-center justify-center gap-2 rounded-lg bg-gradient-to-b from-white to-zinc-100 px-4 py-2 text-[9px] font-bold text-black shadow-[0_6px_18px_rgba(0,0,0,0.25)] transition hover:from-white hover:to-white sm:flex-none"
                    >
                      <Download className="h-3 w-3" />
                      Download
                    </a>

                    <button
                      type="button"
                      onClick={resetEnhancement}
                      className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-4 py-2 text-[9px] font-bold text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Enhance again
                    </button>
                  </div>
                </div>
              </div>
            )}

          {/* Error */}
          {status === "error" && (
            <div className="mb-5 rounded-xl border border-red-400/10 bg-red-500/[0.035] p-4">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-red-400/10 bg-red-500/[0.07]">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                </div>

                <div className="min-w-0">
                  <p className="text-[10px] font-semibold text-red-200">
                    Speech enhancement failed
                  </p>

                  <p className="mt-1 text-[9px] leading-5 text-red-300/60">
                    {error ||
                      "Something went wrong while enhancing your audio."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={resetEnhancement}
                className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[8px] font-bold uppercase tracking-wider text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
              >
                <RefreshCw className="h-3 w-3" />
                Try again
              </button>
            </div>
          )}

          {/* Input selector */}
          {status !== "completed" &&
            status !== "processing" && (
              <>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      setInputType("source")
                    }
                    className={[
                      "rounded-xl border p-4 text-left transition",
                      inputType === "source"
                        ? "border-cyan-400/20 bg-cyan-500/[0.055]"
                        : "border-white/[0.06] bg-white/[0.015] hover:border-white/[0.11]",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]">
                        <FileVideo className="h-3.5 w-3.5 text-zinc-400" />
                      </div>

                      {inputType ===
                        "source" && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                      )}
                    </div>

                    <p className="mt-3 text-[10px] font-semibold text-white">
                      Full source video
                    </p>

                    <p className="mt-1 text-[8px] leading-5 text-zinc-600">
                      Enhance speech across the entire original video.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setInputType("clip")
                    }
                    className={[
                      "rounded-xl border p-4 text-left transition",
                      inputType === "clip"
                        ? "border-cyan-400/20 bg-cyan-500/[0.055]"
                        : "border-white/[0.06] bg-white/[0.015] hover:border-white/[0.11]",
                    ].join(" ")}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]">
                        <Scissors className="h-3.5 w-3.5 text-zinc-400" />
                      </div>

                      {inputType ===
                        "clip" && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                      )}
                    </div>

                    <p className="mt-3 text-[10px] font-semibold text-white">
                      Selected clip
                    </p>

                    <p className="mt-1 text-[8px] leading-5 text-zinc-600">
                      Enhance speech in one generated short clip.
                    </p>
                  </button>
                </div>

                {inputType === "clip" && (
                  <div className="mt-3">
                    <label className="mb-2 block text-[8px] font-bold uppercase tracking-[0.14em] text-zinc-600">
                      Select clip
                    </label>

                    <select
                      value={selectedClipId}
                      onChange={(event) =>
                        setSelectedClipId(
                          event.target.value,
                        )
                      }
                      className="h-11 w-full rounded-xl border border-white/[0.07] bg-[#060608] px-3 text-[10px] text-white outline-none transition focus:border-cyan-400/25"
                    >
                      <option value="">
                        Choose a clip...
                      </option>

                      {((project as any).__clipsForSpeech || []).map(
                        (clip: Clip, index: number) => (
                          <option
                            key={clip.id}
                            value={String(
                              clip.id,
                            )}
                          >
                            {String(
                              index + 1,
                            ).padStart(
                              2,
                              "0",
                            )}{" "}
                            —{" "}
                            {getClipTitle(
                              clip,
                            )}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                )}

                {/* Enhancement features */}
                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    [
                      "Noise reduction",
                      VolumeX,
                    ],
                    [
                      "Voice clarity",
                      Volume2,
                    ],
                    [
                      "Dynamic compression",
                      AudioWaveform,
                    ],
                    [
                      "Loudness normalize",
                      Wand2,
                    ],
                  ].map(
                    ([label, Icon]) => {
                      const FeatureIcon =
                        Icon as React.ElementType;

                      return (
                        <div
                          key={label as string}
                          className="flex items-center gap-2 rounded-xl border border-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] bg-white/[0.01] px-3 py-2.5"
                        >
                          <FeatureIcon className="h-3 w-3 text-cyan-400/70" />

                          <span className="text-[7.5px] font-medium text-zinc-500">
                            {label as string}
                          </span>
                        </div>
                      );
                    },
                  )}
                </div>

                {/* CTA */}
                <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-[9px] font-medium text-emerald-400/80">
                      Free for all users
                    </p>

                    <p className="mt-1 text-[7.5px] text-zinc-700">
                      Your original video will remain unchanged.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={runEnhancement}
                    className={[
                      "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.1em] transition active:scale-[0.98]",
                      "bg-gradient-to-r from-cyan-500 to-violet-500 text-white shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_10px_30px_rgba(34,211,238,0.16)] hover:from-cyan-400 hover:to-violet-400",
                    ].join(" ")}
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                    Enhance Speech · Free
                  </button>
                </div>
              </>
            )}

          {/* No source warning */}
          {!sourceUrl &&
            inputType === "source" &&
            status === "idle" && (
              <div className="mt-4 flex items-center gap-2 rounded-xl border border-amber-400/10 bg-amber-500/[0.03] px-3 py-3">
                <AlertCircle className="h-3.5 w-3.5 shrink-0 text-amber-400" />

                <p className="text-[8px] leading-5 text-amber-300/60">
                  The original source video is not currently available for enhancement.
                </p>
              </div>
            )}
        </div>
      </Surface>
    </section>
  );
};


/* =========================================================
   VIDEO DEBUGGER
========================================================= */

type VideoDebugStatus =
  | "idle"
  | "scanning"
  | "repairing"
  | "completed"
  | "error";

interface VideoDebugReport {
  healthy?: boolean;
  repairRecommended?: boolean;
  repaired?: boolean;
  repairMode?: string | null;
  duration?: number | null;
  format?: string | null;
  size?: number | null;
  bitrate?: number | null;
  hasVideo?: boolean;
  hasAudio?: boolean;
  videoCodec?: string | null;
  audioCodec?: string | null;
  streams?: Array<{
    index?: number;
    type?: string;
    codec?: string;
    codecName?: string;
    codecType?: string;
    width?: number;
    height?: number;
    fps?: number;
    sampleRate?: number;
    channels?: number;
  }>;
  issues?: string[];
  fixes?: string[];
  message?: string;
}

interface VideoDebuggerPanelProps {
  project: Project;
  clips: Clip[];
}

function formatBytes(value?: number | null) {
  const bytes = Number(value ?? 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function formatBitrate(value?: number | null) {
  const bitrate = Number(value ?? 0);
  if (!Number.isFinite(bitrate) || bitrate <= 0) return "—";
  if (bitrate >= 1_000_000) {
    return `${(bitrate / 1_000_000).toFixed(1)} Mbps`;
  }
  return `${Math.round(bitrate / 1000)} kbps`;
}

function getDebugReportIssues(report?: VideoDebugReport | null) {
  return Array.isArray(report?.issues) ? report.issues : [];
}

const VideoDebuggerPanel: React.FC<VideoDebuggerPanelProps> = ({
  project,
  clips,
}) => {
  const supabase = getSupabase();

  const [status, setStatus] =
    useState<VideoDebugStatus>("idle");
  const [report, setReport] =
    useState<VideoDebugReport | null>(null);
  const [repairedReport, setRepairedReport] =
    useState<VideoDebugReport | null>(null);
  const [outputUrl, setOutputUrl] = useState("");
  const [repairMode, setRepairMode] = useState("");
  const [error, setError] = useState("");
  const [inputType, setInputType] =
    useState<"source" | "clip">("source");
  const [selectedClipId, setSelectedClipId] = useState("");

  useEffect(() => {
    setStatus("idle");
    setReport(null);
    setRepairedReport(null);
    setOutputUrl("");
    setRepairMode("");
    setError("");
    setInputType("source");
    setSelectedClipId("");
  }, [project.id]);

  const projectSourceUrl = String(
    (project as any).source_media_url ||
      (project as any).sourceMediaUrl ||
      "",
  ).trim();

  const autoScanStartedRef = React.useRef<string>("");

  const selectedClip = useMemo(
    () =>
      clips.find(
        (clip) =>
          String(clip.id) ===
          String(selectedClipId),
      ),
    [clips, selectedClipId],
  );

  const getAccessToken = async () => {
    const client = await supabase;
    const {
      data: sessionData,
      error: sessionError,
    } = await client.auth.getSession();

    if (sessionError) {
      throw new Error(
        sessionError.message ||
          "Unable to get your login session.",
      );
    }

    const token =
      sessionData.session?.access_token;

    if (!token) {
      throw new Error(
        "Your login session has expired. Please sign in again.",
      );
    }

    return token;
  };

  const debugVideo = async (repair: boolean) => {
    if (status === "scanning" || status === "repairing") {
      return;
    }

    if (
      inputType === "clip" &&
      !selectedClipId
    ) {
      setError("Please select a clip first.");
      setStatus("error");
      return;
    }

    try {
      setError("");
      setStatus(
        repair ? "repairing" : "scanning",
      );

      if (!repair) {
        setRepairedReport(null);
        setOutputUrl("");
        setRepairMode("");
      }

      const accessToken =
        await getAccessToken();

      const body: {
        inputType: "source" | "clip";
        clipId?: string;
        repair: boolean;
      } = {
        inputType,
        repair,
      };

      if (
        inputType === "clip" &&
        selectedClipId
      ) {
        body.clipId = selectedClipId;
      }

      const response = await fetch(
        `/api/projects/${encodeURIComponent(
          project.id,
        )}/debug-video`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body),
        },
      );

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        throw new Error(
          data?.error ||
            data?.message ||
            `Video debugging failed (${response.status}).`,
        );
      }

      if (!data?.success) {
        throw new Error(
          data?.error ||
            data?.message ||
            "Video debugging failed.",
        );
      }

      if (repair) {
        // Backend returns the pre-repair diagnostic as `before` and the
        // validated repaired diagnostic as `report`.
        setReport(data.before || data.report || null);
      } else if (data.report) {
        setReport(data.report);
      }

      if (repair) {
        const url =
          data.outputUrl ||
          data.output_url ||
          data.url ||
          "";

        if (!url) {
          throw new Error(
            "Repair completed, but no repaired video URL was returned.",
          );
        }

        setOutputUrl(String(url));
        setRepairMode(
          String(data.repairMode || ""),
        );
        setRepairedReport(
          data.repairedReport ||
            data.after ||
            data.report ||
            null,
        );
        setStatus("completed");
      } else {
        setStatus("completed");
      }
    } catch (err) {
      console.error(
        "LumoClip: video debugger failed",
        err,
      );
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while checking the video.",
      );
      setStatus("error");
    }
  };

  const issues = getDebugReportIssues(report);
  const isBusy =
    status === "scanning" ||
    status === "repairing";
  const needsRepair =
    Boolean(report?.repairRecommended) ||
    report?.healthy === false ||
    issues.length > 0;

  useEffect(() => {
    const mode = getProcessingMode(project);
    const currentStep = String(
      (project as any).current_step ||
        (project as any).currentStep ||
        "",
    ).toLowerCase();

    const debuggerProject =
      mode === "video_debugger" ||
      currentStep.includes("video ready for debugging") ||
      currentStep.includes("debugging video") ||
      currentStep.includes("repairing video") ||
      currentStep.includes("video debugging");

    if (
      !debuggerProject ||
      !projectSourceUrl ||
      status !== "idle" ||
      autoScanStartedRef.current === String(project.id)
    ) {
      return;
    }

    autoScanStartedRef.current = String(project.id);
    void debugVideo(false);
  }, [project.id, projectSourceUrl, status]);

  const sourceLabel =
    inputType === "source"
      ? "Full source video"
      : selectedClip
      ? getClipTitle(selectedClip)
      : "Selected clip";

  return (
    <section className="mt-5">
      <Surface className="overflow-hidden">
        <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-amber-400/10 bg-amber-500/[0.07]">
                {isBusy ? (
                  <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                ) : status === "completed" &&
                  report?.healthy &&
                  !needsRepair ? (
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                ) : (
                  <Bug className="h-4 w-4 text-amber-400" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-amber-400">
                    Video diagnostics
                  </p>

                  <span className="rounded-full border border-emerald-400/15 bg-emerald-500/[0.08] px-2 py-0.5 text-[7px] font-bold uppercase tracking-wider text-emerald-300">
                    Free
                  </span>
                </div>

                <h2 className="mt-1 text-base font-semibold text-white">
                  Video Debugger
                </h2>

                <p className="mt-1 text-[9px] text-zinc-600">
                  Detect broken containers, missing streams and playback issues, then repair the file safely.
                </p>
              </div>
            </div>

            {status === "completed" &&
              report &&
              (report.healthy &&
              !needsRepair ? (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-400/10 bg-emerald-500/[0.07] px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-wider text-emerald-300">
                  <Check className="h-3 w-3" />
                  Healthy
                </span>
              ) : (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-400/10 bg-amber-500/[0.07] px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-wider text-amber-300">
                  <AlertTriangle className="h-3 w-3" />
                  Issues found
                </span>
              ))}
          </div>
        </div>

        <div className="p-5 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                setInputType("source");
                setError("");
              }}
              className={[
                "rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
                inputType === "source"
                  ? "border-amber-400/20 bg-amber-500/[0.055]"
                  : "border-white/[0.06] bg-white/[0.015] hover:border-white/[0.11]",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]">
                  <FileVideo className="h-3.5 w-3.5 text-zinc-400" />
                </div>

                {inputType === "source" && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                )}
              </div>

              <p className="mt-3 text-[10px] font-semibold text-white">
                Full source video
              </p>

              <p className="mt-1 text-[8px] leading-5 text-zinc-600">
                Check the original uploaded video before editing or exporting.
              </p>
            </button>

            <button
              type="button"
              disabled={isBusy}
              onClick={() => {
                setInputType("clip");
                setError("");
              }}
              className={[
                "rounded-xl border p-4 text-left transition disabled:cursor-not-allowed disabled:opacity-60",
                inputType === "clip"
                  ? "border-amber-400/20 bg-amber-500/[0.055]"
                  : "border-white/[0.06] bg-white/[0.015] hover:border-white/[0.11]",
              ].join(" ")}
            >
              <div className="flex items-center justify-between">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]">
                  <Scissors className="h-3.5 w-3.5 text-zinc-400" />
                </div>

                {inputType === "clip" && (
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                )}
              </div>

              <p className="mt-3 text-[10px] font-semibold text-white">
                Generated clip
              </p>

              <p className="mt-1 text-[8px] leading-5 text-zinc-600">
                Diagnose one generated short without touching the original source.
              </p>
            </button>
          </div>

          {inputType === "clip" && (
            <div className="mt-3">
              <label className="mb-2 block text-[8px] font-bold uppercase tracking-[0.14em] text-zinc-600">
                Select clip
              </label>

              <select
                value={selectedClipId}
                disabled={isBusy}
                onChange={(event) =>
                  setSelectedClipId(
                    event.target.value,
                  )
                }
                className="h-11 w-full rounded-xl border border-white/[0.07] bg-[#060608] px-3 text-[10px] text-white outline-none transition focus:border-amber-400/25 disabled:opacity-60"
              >
                <option value="">
                  Choose a clip...
                </option>

                {clips.map(
                  (clip, index) => (
                    <option
                      key={clip.id}
                      value={String(clip.id)}
                    >
                      {String(index + 1).padStart(
                        2,
                        "0",
                      )}{" "}
                      — {getClipTitle(clip)}
                    </option>
                  ),
                )}
              </select>
            </div>
          )}

          {status === "scanning" && (
            <div className="mt-4 rounded-xl border border-amber-400/10 bg-amber-500/[0.035] p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-amber-400" />
                <div>
                  <p className="text-[10px] font-semibold text-white">
                    Scanning {sourceLabel}...
                  </p>
                  <p className="mt-1 text-[8px] text-zinc-600">
                    Checking the container, streams, codecs and timestamps.
                  </p>
                </div>
              </div>

              <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                <div className="h-full w-1/2 animate-pulse rounded-full bg-amber-400/60" />
              </div>
            </div>
          )}

          {status === "repairing" && (
            <div className="mt-4 rounded-xl border border-violet-400/10 bg-violet-500/[0.035] p-4">
              <div className="flex items-center gap-3">
                <Loader2 className="h-4 w-4 animate-spin text-violet-400" />
                <div>
                  <p className="text-[10px] font-semibold text-white">
                    Repairing {sourceLabel}...
                  </p>
                  <p className="mt-1 text-[8px] text-zinc-600">
                    LumoClip is rebuilding the video container and validating the repaired output.
                  </p>
                </div>
              </div>

              <div className="mt-4 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                <div className="h-full w-2/3 animate-pulse rounded-full bg-violet-400/60" />
              </div>
            </div>
          )}

          {report && status === "completed" && (
            <div className="mt-4 space-y-3">
              <div
                className={[
                  "rounded-xl border p-4",
                  needsRepair
                    ? "border-amber-400/10 bg-amber-500/[0.035]"
                    : "border-emerald-400/10 bg-emerald-500/[0.035]",
                ].join(" ")}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={[
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
                      needsRepair
                        ? "bg-amber-500/[0.08]"
                        : "bg-emerald-500/[0.08]",
                    ].join(" ")}
                  >
                    {needsRepair ? (
                      <AlertTriangle className="h-4 w-4 text-amber-400" />
                    ) : (
                      <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="text-[10px] font-semibold text-white">
                      {needsRepair
                        ? "Potential video issues detected"
                        : "Video looks healthy"}
                    </p>

                    <p className="mt-1 text-[8px] leading-5 text-zinc-600">
                      {report.message ||
                        (needsRepair
                          ? "A repair is recommended before further processing."
                          : "Container and media streams passed the diagnostic checks.")}
                    </p>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {[
                    ["Format", report.format || "—"],
                    ["Duration", formatDuration(report.duration)],
                    ["Video", report.videoCodec || (report.hasVideo ? "Present" : "Missing")],
                    ["Audio", report.audioCodec || (report.hasAudio ? "Present" : "Missing")],
                    ["Size", formatBytes(report.size)],
                    ["Bitrate", formatBitrate(report.bitrate)],
                    ["Streams", String(report.streams?.length ?? 0)],
                    ["Repair", report.repairMode || "Not needed"],
                  ].map(([label, value]) => (
                    <div
                      key={label}
                      className="rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5"
                    >
                      <p className="text-[7px] font-bold uppercase tracking-wider text-zinc-700">
                        {label}
                      </p>
                      <p className="mt-1 truncate text-[9px] font-medium text-zinc-300">
                        {value}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {issues.length > 0 && (
                <div className="rounded-xl border border-red-400/10 bg-red-500/[0.025] p-4">
                  <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-red-400">
                    Detected issues
                  </p>

                  <div className="mt-2 space-y-2">
                    {issues.map(
                      (issue, index) => (
                        <div
                          key={`${issue}-${index}`}
                          className="flex items-start gap-2"
                        >
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-red-400/70" />
                          <p className="text-[9px] leading-5 text-red-300/70">
                            {issue}
                          </p>
                        </div>
                      ),
                    )}
                  </div>
                </div>
              )}

              {outputUrl && (
                <div className="overflow-hidden rounded-xl border border-emerald-400/10 bg-black">
                  <div className="flex items-center gap-2 border-b border-white/[0.05] bg-emerald-500/[0.025] px-4 py-3">
                    <Wrench className="h-3.5 w-3.5 text-emerald-400" />
                    <div>
                      <p className="text-[9px] font-semibold text-white">
                        Repaired video ready
                      </p>
                      <p className="mt-0.5 text-[7px] text-zinc-600">
                        {repairMode
                          ? `Repair mode: ${repairMode}`
                          : "Validated repaired output"}
                      </p>
                    </div>
                  </div>

                  <video
                    src={outputUrl}
                    controls
                    playsInline
                    preload="metadata"
                    className="max-h-[600px] min-h-[220px] w-full object-contain"
                  />
                </div>
              )}

              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-[8px] text-zinc-700">
                  Debugging does not use AI credits. Your original video stays unchanged.
                </div>

                <div className="flex flex-col gap-2 sm:flex-row">
                  {needsRepair && !outputUrl && (
                    <button
                      type="button"
                      onClick={() => debugVideo(true)}
                      disabled={isBusy}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_10px_30px_rgba(245,158,11,0.16)] transition hover:from-amber-400 hover:to-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <Wrench className="h-3.5 w-3.5" />
                      Repair Video
                    </button>
                  )}

                  {outputUrl && (
                    <a
                      href={outputUrl}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-white to-zinc-100 px-5 py-2.5 text-[9px] font-bold text-black shadow-[0_6px_18px_rgba(0,0,0,0.25)] transition hover:from-white hover:to-white"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download repaired
                    </a>
                  )}

                  <button
                    type="button"
                    onClick={() => debugVideo(false)}
                    disabled={isBusy}
                    className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/[0.07] bg-white/[0.02] px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.1em] text-zinc-400 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Scan again
                  </button>
                </div>
              </div>
            </div>
          )}

          {status === "error" && (
            <div className="mt-4 rounded-xl border border-red-400/10 bg-red-500/[0.035] p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                <div>
                  <p className="text-[10px] font-semibold text-red-200">
                    Video debugging failed
                  </p>
                  <p className="mt-1 text-[9px] leading-5 text-red-300/60">
                    {error ||
                      "Something went wrong while checking the video."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => debugVideo(false)}
                className="mt-3 inline-flex min-h-9 items-center gap-2 rounded-lg border border-white/[0.07] bg-white/[0.02] px-3 py-2 text-[8px] font-bold uppercase tracking-wider text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
              >
                <RefreshCw className="h-3 w-3" />
                Try again
              </button>
            </div>
          )}

          {status === "idle" && (
            <div className="mt-4 flex flex-col gap-3 rounded-xl border border-white/[0.06] bg-white/[0.015] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[10px] font-semibold text-white">
                  Ready to inspect {sourceLabel}
                </p>
                <p className="mt-1 text-[8px] leading-5 text-zinc-600">
                  Scan first. LumoClip only repairs the video when a problem is detected or you explicitly request a repair.
                </p>
              </div>

              <button
                type="button"
                onClick={() => debugVideo(false)}
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 px-5 py-2.5 text-[9px] font-bold uppercase tracking-[0.1em] text-white shadow-[0_1px_0_rgba(255,255,255,0.25)_inset,0_10px_30px_rgba(245,158,11,0.16)] transition hover:from-amber-400 hover:to-orange-400 active:scale-[0.98]"
              >
                <Bug className="h-3.5 w-3.5" />
                Scan Video
              </button>
            </div>
          )}

          {status === "completed" &&
            repairedReport && (
              <div className="mt-3 rounded-xl border border-emerald-400/10 bg-emerald-500/[0.025] p-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  <p className="text-[9px] font-semibold text-emerald-200">
                    Repair validation passed
                  </p>
                </div>
                <p className="mt-1 text-[8px] leading-5 text-zinc-600">
                  {formatDuration(repairedReport.duration)} output •{" "}
                  {repairedReport.videoCodec || "video stream"} •{" "}
                  {repairedReport.audioCodec || "audio stream"}
                </p>
              </div>
            )}
        </div>
      </Surface>
    </section>
  );
};

/* =========================================================
   FULL CAPTIONED VIDEO
========================================================= */

const FullCaptionedVideoResult: React.FC<{
  project: Project;
  onPublish: () => void;
  isPremium?: boolean;
  onUpgrade?: () => void;
}> = ({
  project,
  onPublish,
  isPremium = false,
  onUpgrade,
}) => {
  const fullVideoUrl =
    getFullVideoUrl(project);

  const thumbnail =
    project.thumbnail_url || "";

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Captions className="h-4 w-4 text-indigo-400" />

            <h2 className="text-lg font-semibold tracking-tight text-white">
              Captioned video
            </h2>
          </div>

          <p className="mt-1 text-[10px] text-zinc-600">
            Your full video with AI captions burned in.
          </p>
        </div>
      </div>

      <Surface className="overflow-hidden">
        <div className="bg-black">
          {fullVideoUrl ? (
            <video
              src={fullVideoUrl}
              controls
              playsInline
              preload="metadata"
              poster={thumbnail || undefined}
              className="max-h-[72vh] min-h-[220px] w-full object-contain sm:max-h-[680px]"
            />
          ) : (
            <div className="flex aspect-video flex-col items-center justify-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-indigo-400" />

              <p className="text-[10px] text-zinc-600">
                Preparing your captioned video...
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-[10px] text-zinc-600">
            <Clock3 className="h-3.5 w-3.5" />

            {formatDuration(project.duration)}

            <span>•</span>

            Captions burned in
          </div>

          {fullVideoUrl && (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <PublishToYouTubeButton
                onPublish={onPublish}
                className="sm:w-auto"
              />

              <div className="flex gap-2">
                <a
                  href={fullVideoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 flex-1 touch-manipulation items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-white to-zinc-100 px-4 py-2.5 text-[10px] font-bold text-black shadow-[0_6px_18px_rgba(0,0,0,0.25)] transition hover:from-white hover:to-white sm:flex-none"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>

                <a
                  href={fullVideoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>
      </Surface>
    </section>
  );
};

/* =========================================================
   VIDEO DUBBING RESULT
========================================================= */

const DUBBING_LANGUAGE_LABELS: Record<string, string> = {
  en: "English", de: "German", es: "Spanish", fr: "French", pt: "Portuguese",
  it: "Italian", nl: "Dutch", ru: "Russian", pl: "Polish", id: "Indonesian",
  uk: "Ukrainian", sv: "Swedish", tr: "Turkish", no: "Norwegian", hr: "Croatian",
  ro: "Romanian", sk: "Slovak", el: "Greek", da: "Danish", fi: "Finnish",
  hu: "Hungarian", cs: "Czech", ja: "Japanese", ko: "Korean", vi: "Vietnamese",
};

const DubbingVideoResult: React.FC<{
  project: Project;
  onPublish: () => void;
}> = ({ project, onPublish }) => {
  const fullVideoUrl =
    getFullVideoUrl(project);

  const thumbnail =
    project.thumbnail_url || "";

  const targetLanguageCode = String(
    (project as any).dubbing_config?.targetLanguage || "",
  );
  const languageLabel =
    DUBBING_LANGUAGE_LABELS[targetLanguageCode] || "";

  return (
    <section className="mt-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Languages className="h-4 w-4 text-sky-400" />

            <h2 className="text-lg font-semibold tracking-tight text-white">
              Dubbed video{languageLabel ? ` — ${languageLabel}` : ""}
            </h2>
          </div>

          <p className="mt-1 text-[10px] text-zinc-600">
            Your video's audio, translated and re-voiced by AI. Visuals are unchanged.
          </p>
        </div>
      </div>

      <Surface className="overflow-hidden">
        <div className="bg-black">
          {fullVideoUrl ? (
            <video
              src={fullVideoUrl}
              controls
              playsInline
              preload="metadata"
              poster={thumbnail || undefined}
              className="max-h-[72vh] min-h-[220px] w-full object-contain sm:max-h-[680px]"
            />
          ) : (
            <div className="flex aspect-video flex-col items-center justify-center gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-sky-400" />

              <p className="text-[10px] text-zinc-600">
                Preparing your dubbed video...
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2 text-[10px] text-zinc-600">
            <Clock3 className="h-3.5 w-3.5" />

            {formatDuration(project.duration)}

            <span>•</span>

            {languageLabel ? `Dubbed in ${languageLabel}` : "Dubbed audio"}
          </div>

          {fullVideoUrl && (
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
              <PublishToYouTubeButton
                onPublish={onPublish}
                className="sm:w-auto"
              />

              <div className="flex gap-2">
                <a
                  href={fullVideoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex min-h-11 flex-1 touch-manipulation items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-white to-zinc-100 px-4 py-2.5 text-[10px] font-bold text-black shadow-[0_6px_18px_rgba(0,0,0,0.25)] transition hover:from-white hover:to-white sm:flex-none"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>

                <a
                  href={fullVideoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>
      </Surface>
    </section>
  );
};

/* =========================================================
   AI REFRAME RESULT
========================================================= */

const AIReframeVideoResult: React.FC<{
  project: Project;
  onPublish: () => void;
}> = ({ project, onPublish }) => {
  const outputUrl = getFullVideoUrl(project);
  const thumbnail = project.thumbnail_url || "";

  const config = (project as any).reframe_config || {};
  const aspectRatio =
    config.aspectRatio ||
    config.aspect_ratio ||
    "9:16";
  const tracking =
    config.tracking || "smooth";
  const framingMode =
    config.mode || "auto";
  const addCaptions =
    config.addCaptions ??
    config.add_captions ??
    true;

  return (
    <section className="mt-8">
      <div className="relative mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-violet-400/10 bg-violet-500/[0.07]">
              <Target className="h-4 w-4 text-violet-400" />
            </div>
            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-violet-400">
                AI reframing
              </p>
              <h2 className="mt-1 text-lg font-semibold tracking-tight text-white">
                Reframed video
              </h2>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-zinc-600">
            AI-tracked framing optimized for short-form platforms.
          </p>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <span className="rounded-full border border-violet-400/10 bg-violet-500/[0.06] px-2.5 py-1 text-[7px] font-bold uppercase tracking-wider text-violet-300">
            {aspectRatio}
          </span>
          <span className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[7px] font-bold uppercase tracking-wider text-zinc-500">
            {framingMode} framing
          </span>
          <span className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2.5 py-1 text-[7px] font-bold uppercase tracking-wider text-zinc-500">
            {tracking} tracking
          </span>
          {addCaptions && (
            <span className="rounded-full border border-indigo-400/10 bg-indigo-500/[0.06] px-2.5 py-1 text-[7px] font-bold uppercase tracking-wider text-indigo-300">
              captions
            </span>
          )}
        </div>
      </div>

      <Surface className="overflow-hidden">
        <div className="relative bg-black">
          {outputUrl ? (
            <video
              src={outputUrl}
              controls
              playsInline
              preload="metadata"
              poster={thumbnail || undefined}
              className="mx-auto max-h-[78vh] w-full object-contain"
            />
          ) : (
            <div className="flex aspect-[9/16] max-h-[680px] min-h-[360px] flex-col items-center justify-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-violet-400/10 bg-violet-500/[0.07]">
                <Loader2 className="h-5 w-5 animate-spin text-violet-400" />
              </div>
              <div className="text-center">
                <p className="text-[10px] font-semibold text-white">
                  Preparing your AI reframed video...
                </p>
                <p className="mt-1 text-[8px] text-zinc-700">
                  Tracking the main subject and building the final crop.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-3 border-t border-white/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2 text-[9px] text-zinc-600">
            <Target className="h-3.5 w-3.5 text-violet-400/70" />
            <span>AI subject tracking</span>
            <span>•</span>
            <span>{aspectRatio} output</span>
            {addCaptions && (
              <>
                <span>•</span>
                <span>AI captions</span>
              </>
            )}
          </div>

          {outputUrl && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <PublishToYouTubeButton
                onPublish={onPublish}
                className="sm:w-auto"
              />

              <div className="flex gap-2">
                <a
                  href={outputUrl}
                  target="_blank"
                  rel="noreferrer"
                  download
                  className="inline-flex min-h-11 flex-1 touch-manipulation items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-white to-zinc-100 px-4 py-2.5 text-[10px] font-bold text-black shadow-[0_6px_18px_rgba(0,0,0,0.25)] transition hover:from-white hover:to-white sm:flex-none"
                >
                  <Download className="h-3.5 w-3.5" />
                  Download
                </a>

                <a
                  href={outputUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
                  title="Open in new tab"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          )}
        </div>
      </Surface>
    </section>
  );
};

/* =========================================================
   STATS
========================================================= */

const PremiumStats: React.FC<{
  project: Project;
  clips: Clip[];
}> = ({ project, clips }) => {
  const bestScore =
    clips.length > 0
      ? Math.max(...clips.map(getClipScore))
      : 0;

  const totalClipTime = clips.reduce(
    (sum, clip) =>
      sum + Number(clip.duration || 0),
    0,
  );

  const stats = [
    {
      label: "Source",
      value: formatDuration(project.duration),
      icon: Clock3,
    },
    {
      label: "AI clips",
      value: clips.length,
      icon: Layers3,
    },
    {
      label: "Best score",
      value: bestScore || "—",
      icon: Flame,
    },
    {
      label: "Clip time",
      value: formatDuration(totalClipTime),
      icon: BarChart3,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.label}
            className="group rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[#0c0c11] to-[#08080b] p-4 transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.14] hover:shadow-[0_16px_36px_rgba(0,0,0,0.35)]"
          >
            <div className="flex items-center justify-between">
              <span className="text-[8px] font-bold uppercase tracking-[0.16em] text-zinc-600">
                {stat.label}
              </span>

              <Icon className="h-3.5 w-3.5 text-zinc-700 transition group-hover:text-violet-400" />
            </div>

            <p className="mt-3 text-xl font-semibold tracking-tight text-white">
              {stat.value}
            </p>
          </div>
        );
      })}
    </div>
  );
};

/* =========================================================
   AI INSIGHTS
========================================================= */

const AIInsightPanel: React.FC<{
  project: Project;
  clips: Clip[];
}> = ({ project, clips }) => {
  const summary =
    (project as any).ai_summary ||
    (project as any).summary ||
    (project as any).description ||
    "";

  const averageScore =
    clips.length > 0
      ? Math.round(
          clips.reduce(
            (sum, clip) =>
              sum + getClipScore(clip),
            0,
          ) / clips.length,
        )
      : 0;

  const features = [
    ["Hook detection", Target],
    ["Viral scoring", Flame],
    ["9:16 framing", Video],
    ["Captions", Wand2],
    ["Titles", Sparkles],
    ["Hashtags", TrendingUp],
  ];

  return (
    <section className="rounded-2xl border border-white/[0.07] bg-[#09090d]">
      <div className="border-b border-white/[0.06] px-5 py-4 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-400/10 bg-violet-500/[0.07]">
              <Sparkles className="h-4 w-4 text-violet-400" />
            </div>

            <div>
              <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-violet-400">
                AI intelligence
              </p>

              <h2 className="mt-1 text-base font-semibold text-white">
                Content insights
              </h2>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <p className="text-[7px] font-bold uppercase tracking-wider text-zinc-600">
                Avg. score
              </p>

              <p className="mt-1 text-sm font-semibold text-violet-300">
                {averageScore || "—"}
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <p className="text-[7px] font-bold uppercase tracking-wider text-zinc-600">
                Clips
              </p>

              <p className="mt-1 text-sm font-semibold text-white">
                {clips.length}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        {summary ? (
          <div className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <p className="text-xs leading-6 text-zinc-400">
              {summary}
            </p>
          </div>
        ) : (
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-black/20 p-4">
            <Loader2 className="h-4 w-4 animate-spin text-violet-400" />

            <div>
              <p className="text-xs font-medium text-zinc-400">
                LumoClip is analyzing this project
              </p>

              <p className="mt-1 text-[9px] text-zinc-700">
                AI summary and content insights will appear here.
              </p>
            </div>
          </div>
        )}

        <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {features.map(([label, Icon]) => {
            const ItemIcon =
              Icon as React.ElementType;

            return (
              <div
                key={label as string}
                className="flex items-center gap-2 rounded-xl border border-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] px-3 py-2.5"
              >
                <ItemIcon className="h-3 w-3 text-zinc-600" />

                <span className="text-[8px] font-medium text-zinc-500">
                  {label as string}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};

/* =========================================================
   PROCESSING PIPELINE
========================================================= */

const Pipeline: React.FC<{
  project: Project;
  progress: number;
}> = ({ project, progress }) => {
  const fullVideoMode =
    getProcessingMode(project) ===
    "full_video_caption";

  const reframeMode =
    getProcessingMode(project) === "reframe";

  const speechOnlyMode =
    isSpeechOnlyProject(project);

  const steps = speechOnlyMode
    ? [
        {
          label: "Video received",
          description: "Source video successfully received",
          threshold: 5,
        },
        {
          label: "Preparing source",
          description: "Keeping the original video ready for audio enhancement",
          threshold: 20,
        },
        {
          label: "Audio ready",
          description: "Checking the source audio track",
          threshold: 60,
        },
        {
          label: "Ready for Enhanced Speech",
          description: "No clips or AI content analysis are generated in this mode",
          threshold: 96,
        },
      ]
    : reframeMode
    ? [
        {
          label: "Video received",
          description: "Source video successfully uploaded",
          threshold: 5,
        },
        {
          label: "Understanding content",
          description: "Analyzing speech and visual context",
          threshold: 30,
        },
        {
          label: "Tracking subject",
          description: "Finding the active speaker or visual focus",
          threshold: 55,
        },
        {
          label: "Building dynamic frame",
          description: "Generating smooth AI camera movement",
          threshold: 72,
        },
        {
          label: "Rendering reframed video",
          description: "Encoding the optimized short-form output",
          threshold: 88,
        },
        {
          label: "Finalizing",
          description: "Preparing everything for export",
          threshold: 96,
        },
      ]
    : fullVideoMode
    ? [
        {
          label: "Video received",
          description: "Source video successfully uploaded",
          threshold: 5,
        },
        {
          label: "Understanding content",
          description: "Analyzing speech and visual context",
          threshold: 30,
        },
        {
          label: "Building captions",
          description: "Timing words for the caption effect",
          threshold: 50,
        },
        {
          label: "Burning captions in",
          description: "Encoding the captioned video",
          threshold: 70,
        },
        {
          label: "Finalizing",
          description: "Preparing the file for download",
          threshold: 96,
        },
      ]
    : [
        {
          label: "Video received",
          description: "Source video successfully uploaded",
          threshold: 5,
        },
        {
          label: "Understanding content",
          description: "Analyzing speech and visual context",
          threshold: 25,
        },
        {
          label: "Finding viral moments",
          description: "Scoring potential highlights",
          threshold: 45,
        },
        {
          label: "Creating short clips",
          description: "Generating optimized 9:16 videos",
          threshold: 65,
        },
        {
          label: "Preparing publishing assets",
          description: "Creating titles, captions and hashtags",
          threshold: 85,
        },
        {
          label: "Finalizing",
          description: "Preparing everything for export",
          threshold: 96,
        },
      ];

  return (
    <Surface className="h-full p-5 sm:p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-violet-400">
            Live pipeline
          </p>

          <h3 className="mt-1 text-base font-semibold text-white">
            {speechOnlyMode
              ? "Preparing Enhanced Speech"
              : "Processing"}
          </h3>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/10 bg-violet-500/[0.05] px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-wider text-violet-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-violet-400" />
          Live
        </span>
      </div>

      <div className="mt-7 space-y-1">
        {steps.map((step, index) => {
          const done =
            progress >= step.threshold;

          const active =
            !done &&
            progress >=
              step.threshold - 15;

          return (
            <div
              key={step.label}
              className="relative flex gap-3"
            >
              {index < steps.length - 1 && (
                <div
                  className={[
                    "absolute left-[13px] top-7 h-[calc(100%-4px)] w-px",
                    done
                      ? "bg-emerald-500/25"
                      : "bg-white/[0.05]",
                  ].join(" ")}
                />
              )}

              <div
                className={[
                  "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                  done
                    ? "border-emerald-400/20 bg-emerald-400/[0.08]"
                    : active
                    ? "border-violet-400/20 bg-violet-500/[0.08]"
                    : "border-white/[0.06] bg-white/[0.02]",
                ].join(" ")}
              >
                {done ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : active ? (
                  <Loader2 className="h-3 w-3 animate-spin text-violet-400" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                )}
              </div>

              <div
                className={[
                  "mb-3 flex-1 rounded-xl px-3 py-2",
                  active
                    ? "bg-violet-500/[0.035]"
                    : "",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-3">
                  <p
                    className={[
                      "text-[10px] font-medium sm:text-[11px]",
                      done
                        ? "text-zinc-300"
                        : active
                        ? "text-white"
                        : "text-zinc-600",
                    ].join(" ")}
                  >
                    {step.label}
                  </p>

                  {done && (
                    <span className="text-[7px] font-bold uppercase tracking-wider text-emerald-400">
                      Done
                    </span>
                  )}

                  {active && (
                    <span className="text-[7px] font-bold uppercase tracking-wider text-violet-400">
                      Working
                    </span>
                  )}
                </div>

                <p className="mt-1 text-[9px] leading-5 text-zinc-700">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Surface>
  );
};

/* =========================================================
   SPEECH ENHANCEMENT PIPELINE
   (Shown instead of the clip-generation Pipeline while an
   Enhance Speech job is actively running, so the person sees
   the action they actually triggered.)
========================================================= */

const SpeechPipeline: React.FC = () => {
  const steps = [
    {
      label: "Audio received",
      description: "Source track queued for enhancement",
      state: "done" as const,
    },
    {
      label: "Reducing noise",
      description: "Removing background hiss and hum",
      state: "active" as const,
    },
    {
      label: "Balancing voice levels",
      description: "Normalizing loudness across the track",
      state: "pending" as const,
    },
    {
      label: "Finalizing audio",
      description: "Re-muxing enhanced audio with your video",
      state: "pending" as const,
    },
  ];

  return (
    <Surface className="h-full p-5 sm:p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-cyan-400">
            Live pipeline
          </p>

          <h3 className="mt-1 text-base font-semibold text-white">
            Enhancing speech
          </h3>
        </div>

        <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/10 bg-cyan-500/[0.05] px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-wider text-cyan-300">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
          Live
        </span>
      </div>

      <div className="mt-7 space-y-1">
        {steps.map((step, index) => {
          const done = step.state === "done";
          const active = step.state === "active";

          return (
            <div
              key={step.label}
              className="relative flex gap-3"
            >
              {index < steps.length - 1 && (
                <div
                  className={[
                    "absolute left-[13px] top-7 h-[calc(100%-4px)] w-px",
                    done
                      ? "bg-emerald-500/25"
                      : "bg-white/[0.05]",
                  ].join(" ")}
                />
              )}

              <div
                className={[
                  "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                  done
                    ? "border-emerald-400/20 bg-emerald-400/[0.08]"
                    : active
                    ? "border-cyan-400/20 bg-cyan-500/[0.08]"
                    : "border-white/[0.06] bg-white/[0.02]",
                ].join(" ")}
              >
                {done ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : active ? (
                  <Loader2 className="h-3 w-3 animate-spin text-cyan-400" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                )}
              </div>

              <div
                className={[
                  "mb-3 flex-1 rounded-xl px-3 py-2",
                  active
                    ? "bg-cyan-500/[0.035]"
                    : "",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-3">
                  <p
                    className={[
                      "text-[10px] font-medium sm:text-[11px]",
                      done
                        ? "text-zinc-300"
                        : active
                        ? "text-white"
                        : "text-zinc-600",
                    ].join(" ")}
                  >
                    {step.label}
                  </p>

                  {done && (
                    <span className="text-[7px] font-bold uppercase tracking-wider text-emerald-400">
                      Done
                    </span>
                  )}

                  {active && (
                    <span className="text-[7px] font-bold uppercase tracking-wider text-cyan-400">
                      Working
                    </span>
                  )}
                </div>

                <p className="mt-1 text-[9px] leading-5 text-zinc-700">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Surface>
  );
};

/* =========================================================
   AUTO SFX PIPELINE
   (Shown instead of the clip-generation Pipeline while an
   Auto SFX job is actively running. Progress-driven, same as
   Pipeline, so it reflects the real project.auto_sfx_progress
   as polling refreshes it.)
========================================================= */

const AUTO_SFX_STEPS = [
  {
    label: "Audio received",
    description: "Source track queued for effects analysis",
    threshold: 8,
  },
  {
    label: "Detecting sound moments",
    description: "Scanning for impacts, transitions and emphasis points",
    threshold: 32,
  },
  {
    label: "Selecting sound effects",
    description: "Matching effects from the SFX library to each moment",
    threshold: 58,
  },
  {
    label: "Mixing effects",
    description: "Blending SFX levels in with the original audio",
    threshold: 80,
  },
  {
    label: "Finalizing",
    description: "Rendering the final audio mix",
    threshold: 96,
  },
];

const AutoSfxPipeline: React.FC<{
  progress: number;
  failed?: boolean;
}> = ({ progress, failed = false }) => {
  const safeProgress = Math.max(
    0,
    Math.min(100, Math.round(progress || 0)),
  );

  return (
    <Surface className="h-full p-5 sm:p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-amber-400">
            Live pipeline
          </p>

          <h3 className="mt-1 text-base font-semibold text-white">
            {failed ? "Auto SFX failed" : "Adding sound effects"}
          </h3>
        </div>

        {failed ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/15 bg-red-500/[0.06] px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-wider text-red-300">
            <AlertCircle className="h-3 w-3" />
            Error
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/10 bg-amber-500/[0.05] px-2.5 py-1.5 text-[8px] font-bold uppercase tracking-wider text-amber-300">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
            Live
          </span>
        )}
      </div>

      <div className="mt-7 space-y-1">
        {AUTO_SFX_STEPS.map((step, index) => {
          const done = !failed && safeProgress >= step.threshold;
          const active =
            !failed && !done && safeProgress >= step.threshold - 15;

          return (
            <div key={step.label} className="relative flex gap-3">
              {index < AUTO_SFX_STEPS.length - 1 && (
                <div
                  className={[
                    "absolute left-[13px] top-7 h-[calc(100%-4px)] w-px",
                    done ? "bg-emerald-500/25" : "bg-white/[0.05]",
                  ].join(" ")}
                />
              )}

              <div
                className={[
                  "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border",
                  done
                    ? "border-emerald-400/20 bg-emerald-400/[0.08]"
                    : active
                    ? "border-amber-400/20 bg-amber-500/[0.08]"
                    : "border-white/[0.06] bg-white/[0.02]",
                ].join(" ")}
              >
                {done ? (
                  <Check className="h-3 w-3 text-emerald-400" />
                ) : active ? (
                  <Loader2 className="h-3 w-3 animate-spin text-amber-400" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                )}
              </div>

              <div
                className={[
                  "mb-3 flex-1 rounded-xl px-3 py-2",
                  active ? "bg-amber-500/[0.035]" : "",
                ].join(" ")}
              >
                <div className="flex items-center justify-between gap-3">
                  <p
                    className={[
                      "text-[10px] font-medium sm:text-[11px]",
                      done
                        ? "text-zinc-300"
                        : active
                        ? "text-white"
                        : "text-zinc-600",
                    ].join(" ")}
                  >
                    {step.label}
                  </p>

                  {done && (
                    <span className="text-[7px] font-bold uppercase tracking-wider text-emerald-400">
                      Done
                    </span>
                  )}

                  {active && (
                    <span className="text-[7px] font-bold uppercase tracking-wider text-amber-400">
                      Working
                    </span>
                  )}
                </div>

                <p className="mt-1 text-[9px] leading-5 text-zinc-700">
                  {step.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </Surface>
  );
};

/* =========================================================
   CLIP CARD
========================================================= */

const ClipCard: React.FC<{
  clip: Clip;
  index: number;
  onPublish?: (clip: Clip) => void;
  isPremium?: boolean;
  onUpgrade?: () => void;
}> = ({
  clip,
  index,
  onPublish,
  isPremium = false,
  onUpgrade,
}) => {
  const [showDetails, setShowDetails] =
    useState(false);

  const score = getClipScore(clip);
  const title = getClipTitle(clip);
  const reason = getClipReason(clip);
  const videoUrl = getClipVideoUrl(clip);

  const thumbnailUrl =
    getClipThumbnailUrl(clip);

  const caption =
    (clip as any).caption || "";

  const hookScore = Math.min(
    99,
    Math.max(40, score + 2),
  );

  const retentionScore = Math.min(
    99,
    Math.max(35, score - 1),
  );

  const shareScore = Math.min(
    99,
    Math.max(35, score + 1),
  );

  const copyCaption = async () => {
    if (!caption) return;

    try {
      await navigator.clipboard.writeText(
        caption,
      );
    } catch {
      // Clipboard unavailable.
    }
  };

  const metrics = [
    ["Hook", hookScore],
    ["Retention", retentionScore],
    ["Share", shareScore],
  ] as const;

  return (
    <article className="group overflow-hidden rounded-xl border border-white/[0.07] bg-[#09090d] transition duration-300 hover:border-violet-400/25 hover:shadow-[0_20px_45px_rgba(0,0,0,0.45)] sm:hover:-translate-y-1">
      <div className="relative aspect-[9/12] overflow-hidden bg-[#050507]">
        {videoUrl ? (
          <video
            src={videoUrl}
            controls
            playsInline
            preload="metadata"
            poster={
              thumbnailUrl || undefined
            }
            className="h-full w-full object-cover"
            onError={(event) => {
              console.error(
                "LumoClip: failed to load clip video",
                {
                  clipId: (clip as any).id,
                  videoUrl,
                  error:
                    event.currentTarget
                      .error,
                },
              );
            }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center bg-[#060608]">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.025]">
              <Film className="h-4 w-4 text-zinc-600" />
            </div>

            <p className="mt-2.5 text-[9px] text-zinc-700">
              Preview unavailable
            </p>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-black/70 to-transparent" />

        <div className="absolute left-2.5 top-2.5 flex h-6 w-6 items-center justify-center rounded-md border border-white/10 bg-black/55 text-[7px] font-bold text-white backdrop-blur-xl">
          {String(index + 1).padStart(
            2,
            "0",
          )}
        </div>

        {index === 0 && (
          <div className="absolute left-10 top-2.5 inline-flex items-center gap-1 rounded-md border border-amber-200/30 bg-gradient-to-b from-amber-300/90 to-amber-500/90 px-1.5 py-1 text-[6.5px] font-bold uppercase tracking-wider text-black shadow-[0_2px_10px_rgba(217,164,65,0.35)] backdrop-blur-xl">
            <Flame className="h-2.5 w-2.5" />
            Top pick
          </div>
        )}

        <div className="absolute right-2.5 top-2.5 flex items-center gap-1 rounded-md border border-white/10 bg-black/55 px-2 py-1 text-[7.5px] font-bold text-white backdrop-blur-xl">
          <Flame className="h-2.5 w-2.5 text-amber-300" />
          {score}
        </div>

        <div className="absolute bottom-2.5 left-2.5 right-2.5 flex items-center justify-between">
          <span className="rounded-md border border-white/10 bg-black/55 px-2 py-1 text-[6.5px] font-bold uppercase tracking-wider text-zinc-200 backdrop-blur-xl">
            9:16
          </span>

          <span className="rounded-md border border-white/10 bg-black/55 px-2 py-1 font-mono text-[7.5px] text-white backdrop-blur-xl">
            {formatDuration(clip.duration)}
          </span>
        </div>
      </div>

      <div className="p-3">
        <p className="mb-0.5 text-[6.5px] font-bold uppercase tracking-[0.16em] text-violet-400">
          AI selected
        </p>

        <h3 className="line-clamp-2 text-[12px] font-semibold leading-4 text-white">
          {title}
        </h3>

        <div className="mt-3 flex items-stretch divide-x divide-white/[0.06] rounded-lg bg-black/20 py-2">
          {metrics.map(
            ([label, value]) => (
              <div
                key={label}
                className="flex-1 px-2 first:pl-2.5 last:pr-2.5"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-[6px] font-bold uppercase tracking-wider text-zinc-600">
                    {label}
                  </span>

                  <span className="text-[7px] font-semibold text-zinc-400">
                    {value}
                  </span>
                </div>

                <div className="mt-1 h-[3px] overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-violet-500/60"
                    style={{
                      width: `${value}%`,
                    }}
                  />
                </div>
              </div>
            ),
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            setShowDetails(
              (value) => !value,
            )
          }
          className="mt-2.5 flex min-h-10 w-full touch-manipulation items-center justify-between text-left"
        >
          <span className="text-[7.5px] font-bold uppercase tracking-[0.14em] text-zinc-600">
            {showDetails
              ? "Hide details"
              : "Why this clip"}
          </span>

          <ChevronDown
            className={[
              "h-3 w-3 text-zinc-700 transition",
              showDetails
                ? "rotate-180"
                : "",
            ].join(" ")}
          />
        </button>

        {showDetails && (
          <div className="mb-1 space-y-2">
            <p className="text-[9px] leading-5 text-zinc-500">
              {reason}
            </p>

            {caption && (
              <div className="rounded-lg bg-black/20 p-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[6.5px] font-bold uppercase tracking-[0.14em] text-zinc-700">
                    Caption
                  </span>

                  <button
                    type="button"
                    onClick={copyCaption}
                    className="flex h-8 w-8 touch-manipulation items-center justify-center rounded-md text-zinc-600 transition hover:bg-white/[0.05] hover:text-white"
                    title="Copy caption"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>

                <p className="mt-1.5 line-clamp-3 text-[9px] leading-5 text-zinc-500">
                  {caption}
                </p>
              </div>
            )}
          </div>
        )}

        <div className="mt-2.5 grid grid-cols-[1fr_auto] gap-1.5 border-t border-white/[0.05] pt-2.5">
          {videoUrl ? (
            <>
              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex min-h-10 flex-1 touch-manipulation items-center justify-center gap-1.5 rounded-lg bg-gradient-to-b from-white to-zinc-100 px-3 py-2 text-[9px] font-bold text-black shadow-[0_6px_16px_rgba(0,0,0,0.25)] transition hover:from-white hover:to-white"
              >
                <Download className="h-3 w-3" />
                Export
              </a>

              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 shrink-0 touch-manipulation items-center justify-center rounded-lg border border-white/[0.07] bg-white/[0.02] text-zinc-600 transition hover:bg-white/[0.05] hover:text-white"
                title="Open clip"
              >
                <ExternalLink className="h-3 w-3" />
              </a>
            </>
          ) : (
            <div className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/[0.06] bg-white/[0.02] px-3 py-2 text-[9px] font-medium text-zinc-700">
              <Loader2 className="h-3 w-3 animate-spin" />
              Processing
            </div>
          )}
        </div>

        {videoUrl && onPublish && (
          <div className="mt-1.5">
            <PublishToYouTubeButton
              onPublish={() => onPublish(clip)}
              variant="outline"
            />
          </div>
        )}
      </div>
    </article>
  );
};

/* =========================================================
   CLIPS SECTION
========================================================= */

const ClipsSection: React.FC<{
  clips: Clip[];
  processing?: boolean;
  onPublish?: (clip: Clip) => void;
  isPremium?: boolean;
  onUpgrade?: () => void;
}> = ({
  clips,
  processing = false,
  onPublish,
  isPremium = false,
  onUpgrade,
}) => {
  const [sort, setSort] =
    useState<"score" | "newest">(
      "score",
    );

  const sortedClips = useMemo(() => {
    const copy = [...clips];

    if (sort === "score") {
      return copy.sort(
        (a, b) =>
          getClipScore(b) -
          getClipScore(a),
      );
    }

    return copy;
  }, [clips, sort]);

  return (
    <section className="mt-9">
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-2.5">
            <Scissors className="h-4 w-4 text-violet-400" />

            <h2 className="text-lg font-semibold tracking-tight text-white">
              Viral clips
            </h2>

            <span className="rounded-full border border-white/[0.06] bg-white/[0.025] px-2 py-0.5 text-[8px] font-bold text-zinc-500">
              {clips.length}
            </span>
          </div>

          <p className="mt-1 text-[10px] text-zinc-600">
            AI-ranked moments with the strongest short-form potential.
          </p>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-[#09090d] p-1">
          <button
            type="button"
            onClick={() =>
              setSort("score")
            }
            className={[
              "rounded-lg px-3 py-2 text-[8px] font-bold transition",
              sort === "score"
                ? "bg-white text-black"
                : "text-zinc-600 hover:text-zinc-300",
            ].join(" ")}
          >
            TOP PICKS
          </button>

          <button
            type="button"
            onClick={() =>
              setSort("newest")
            }
            className={[
              "rounded-lg px-3 py-2 text-[8px] font-bold transition",
              sort === "newest"
                ? "bg-white text-black"
                : "text-zinc-600 hover:text-zinc-300",
            ].join(" ")}
          >
            NEWEST
          </button>
        </div>
      </div>

      {processing && (
        <div className="mb-5 flex items-center gap-3 rounded-xl border border-violet-500/10 bg-violet-500/[0.035] px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-violet-500/[0.08]">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          </div>

          <div>
            <p className="text-[9px] font-bold uppercase tracking-wider text-violet-300">
              AI generation active
            </p>

            <p className="mt-0.5 text-[9px] text-zinc-600">
              New clips will appear automatically.
            </p>
          </div>

          <Loader2 className="ml-auto h-4 w-4 animate-spin text-violet-400" />
        </div>
      )}

      {sortedClips.length > 0 ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {sortedClips.map(
            (clip, index) => (
              <ClipCard
                key={clip.id}
                clip={clip}
                index={index}
                onPublish={onPublish}
              />
            ),
          )}

          {processing &&
            Array.from({
              length: Math.max(
                0,
                4 -
                  sortedClips.length,
              ),
            }).map(
              (_, index) => (
                <div
                  key={`loading-${index}`}
                  className="overflow-hidden rounded-2xl border border-white/[0.07] shadow-[0_18px_60px_rgba(0,0,0,0.18)] bg-[#09090d]"
                >
                  <div className="relative aspect-[9/14] animate-pulse bg-white/[0.02]">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Loader2 className="h-5 w-5 animate-spin text-violet-500/40" />
                    </div>

                    <div className="absolute bottom-5 left-4 right-4">
                      <div className="h-3 w-3/4 rounded bg-white/[0.05]" />

                      <div className="mt-2 h-2 w-1/2 rounded bg-white/[0.035]" />
                    </div>
                  </div>

                  <div className="space-y-2 p-4">
                    <div className="h-3 w-3/4 rounded bg-white/[0.05]" />

                    <div className="h-2 w-full rounded bg-white/[0.03]" />
                  </div>
                </div>
              ),
            )}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/[0.08] bg-[#09090d] px-6 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.07] shadow-[0_18px_60px_rgba(0,0,0,0.18)] bg-white/[0.02]">
            {processing ? (
              <Loader2 className="h-6 w-6 animate-spin text-violet-400" />
            ) : (
              <Film className="h-6 w-6 text-zinc-700" />
            )}
          </div>

          <h3 className="mt-5 text-sm font-semibold text-zinc-400">
            {processing
              ? "Finding your best moments..."
              : "No clips generated yet"}
          </h3>

          <p className="mx-auto mt-2 max-w-md text-[10px] leading-6 text-zinc-700">
            {processing
              ? "LumoClip AI is scanning your content for high-retention moments."
              : "Your viral clips will appear here once the project is processed."}
          </p>
        </div>
      )}
    </section>
  );
};

/* =========================================================
   COMPLETED OVERVIEW
========================================================= */

const CompletedOverview: React.FC<{
  project: Project;
  clips: Clip[];
}> = ({
  project,
  clips,
}) => {
  const averageScore =
    clips.length > 0
      ? Math.round(
          clips.reduce(
            (sum, clip) =>
              sum + getClipScore(clip),
            0,
          ) / clips.length,
        )
      : 0;

  const bestScore =
    clips.length > 0
      ? Math.max(
          ...clips.map(getClipScore),
        )
      : 0;

  return (
    <div className="space-y-3">
      <Surface className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-xl border border-emerald-400/10 bg-emerald-500/[0.07]">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>

          <div>
            <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-emerald-400">
              Project complete
            </p>

            <h3 className="mt-1 text-base font-semibold text-white">
              Ready to publish
            </h3>
          </div>
        </div>

        <p className="mt-5 text-[11px] leading-6 text-zinc-500">
          LumoClip analyzed your video and found{" "}
          <span className="font-semibold text-white">
            {clips.length}
          </span>{" "}
          high-potential moments for short-form content.
        </p>

        <div className="mt-5 divide-y divide-white/[0.05]">
          <div className="flex items-center justify-between py-3 first:pt-0">
            <span className="text-[10px] text-zinc-600">
              Source duration
            </span>

            <span className="text-[10px] font-semibold text-zinc-300">
              {formatDuration(
                project.duration,
              )}
            </span>
          </div>

          <div className="flex items-center justify-between py-3">
            <span className="text-[10px] text-zinc-600">
              Clips generated
            </span>

            <span className="text-[10px] font-semibold text-violet-300">
              {clips.length}
            </span>
          </div>

          <div className="flex items-center justify-between py-3 last:pb-0">
            <span className="text-[10px] text-zinc-600">
              Best viral score
            </span>

            <span className="flex items-center gap-1.5 text-[10px] font-semibold text-amber-300">
              <Flame className="h-3 w-3" />
              {bestScore || "—"}
            </span>
          </div>
        </div>
      </Surface>

      <Surface className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/[0.07]">
            <Wand2 className="h-4 w-4 text-violet-400" />
          </div>

          <div>
            <p className="text-sm font-semibold text-white">
              AI optimization
            </p>

            <p className="mt-1 text-[9px] text-zinc-600">
              Your content was optimized automatically.
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          {[
            ["Hook detection", Target],
            ["Viral scoring", Flame],
            ["9:16 framing", Video],
            ["Captions", Wand2],
            ["Titles", Sparkles],
            ["Hashtags", TrendingUp],
          ].map(([label, Icon]) => {
            const ItemIcon =
              Icon as React.ElementType;

            return (
              <div
                key={label as string}
                className="flex items-center gap-2 rounded-xl border border-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] px-3 py-2.5"
              >
                <ItemIcon className="h-3 w-3 text-violet-400/70" />

                <span className="text-[8px] font-medium text-zinc-500">
                  {label as string}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] bg-white/[0.015] px-3 py-3">
          <span className="text-[8px] font-bold uppercase tracking-wider text-zinc-600">
            Average AI score
          </span>

          <span className="text-sm font-semibold text-violet-300">
            {averageScore || "—"}/100
          </span>
        </div>
      </Surface>
    </div>
  );
};

/* =========================================================
   SOURCE VIDEO
========================================================= */

const SourceVideo: React.FC<{
  project: Project;
}> = ({ project }) => {
  const sourceUrl =
    (project as any).source_media_url ||
    (project as any).video_url ||
    "";

  return (
    <Surface className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
        <div>
          <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-zinc-600">
            Original source
          </p>

          <h3 className="mt-1 text-sm font-semibold text-white">
            Source video
          </h3>
        </div>

        <FileVideo className="h-4 w-4 text-zinc-700" />
      </div>

      <div className="bg-black">
        {sourceUrl ? (
          <video
            src={sourceUrl}
            controls
            playsInline
            preload="metadata"
            poster={
              project.thumbnail_url ||
              undefined
            }
            className="max-h-[72vh] min-h-[220px] w-full object-contain sm:max-h-[650px]"
          />
        ) : project.thumbnail_url ? (
          <img
            src={project.thumbnail_url}
            alt="Source video"
            className="max-h-[650px] w-full object-contain"
          />
        ) : (
          <div className="flex aspect-video items-center justify-center">
            <FileVideo className="h-9 w-9 text-zinc-800" />
          </div>
        )}
      </div>
    </Surface>
  );
};

/* =========================================================
   MAIN
========================================================= */

export const ProjectDetailView: React.FC<
  ProjectDetailViewProps
> = ({
  project,
  clips,
  onBack,
  onDeleteProject,
  isPremium = false,
  onUpgrade,
}) => {
  const progress = normalizeProgress(
    project.progress,
  );

  const status =
    getProjectStatus(project);

  const isProcessing =
    status === "processing" ||
    status === "pending" ||
    status === "queued" ||
    status === "analyzing" ||
    status === "worker_downloading";

  const isCompleted =
    status === "completed" ||
    status === "complete" ||
    progress >= 100;

  const isFailed =
    status === "failed" ||
    status === "error";

  const isFullVideoMode =
    getProcessingMode(project) ===
    "full_video_caption";

  const isReframeMode =
    isReframeProject(project);

  const isSpeechOnlyMode =
    isSpeechOnlyProject(project);

  const projectCurrentStep = String(
    (project as any).current_step ||
      (project as any).currentStep ||
      "",
  ).toLowerCase();

  const isVideoDebuggerMode =
    getProcessingMode(project) === "video_debugger" ||
    projectCurrentStep.includes("video ready for debugging") ||
    projectCurrentStep.includes("debugging video") ||
    projectCurrentStep.includes("repairing video") ||
    projectCurrentStep.includes("video debugging");

  const isDubbingMode =
    getProcessingMode(project) === "dubbing";

  const [showDeleteMenu, setShowDeleteMenu] =
    useState(false);

  const [publishTarget, setPublishTarget] =
    useState<
      | { kind: "clip"; clip: Clip }
      | { kind: "project" }
      | null
    >(null);

  /*
   * Lifted up from EnhanceSpeechPanel so the header, hero video,
   * and pipeline can all reflect "Enhancing speech" while that
   * specific action is running — instead of always showing the
   * generic clip-generation pipeline ("Creating short clips").
   */
  const [speechStatus, setSpeechStatus] =
    useState<SpeechEnhanceStatus>("idle");

  const isEnhancingSpeech =
    speechStatus === "processing";

  /*
   * Auto SFX status/progress come straight off the project
   * object (polled from the backend), unlike speech enhancement
   * which is a local, user-triggered action. See getAutoSfxStatus
   * / getAutoSfxProgress / isAutoSfxActive above.
   */
  const isAutoSfxRunning =
    isAutoSfxActive(project) && !isEnhancingSpeech;

  const autoSfxProgress =
    getAutoSfxProgress(project);

  const autoSfxFailed =
    isAutoSfxFailed(project);

  const safeClips = Array.isArray(clips)
    ? clips
    : [];

  const badgeStatus =
    isCompleted
      ? "completed"
      : isFailed
      ? "failed"
      : "processing";

  /*
   * Pass clips to the speech panel without changing
   * your Project type/interface.
   */
  const projectForSpeech =
    project as any;

  projectForSpeech.__clipsForSpeech =
    safeClips;

  return (
    <div className="min-h-full bg-[#030304] text-white">
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.06),transparent_35%),radial-gradient(circle_at_100%_100%,rgba(217,164,65,0.035),transparent_40%)]" />
      <div
        className="pointer-events-none fixed inset-0 opacity-[0.03] mix-blend-overlay"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")",
        }}
      />

      <div className="relative z-10 mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-6 sm:py-5 lg:px-8 lg:py-7">

        {/* =====================================================
            HEADER
        ====================================================== */}

        <header className="mb-7">
          <div className="flex flex-wrap items-center justify-between gap-3 sm:gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="group flex h-11 w-11 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-white/[0.07] bg-[#09090d] text-zinc-500 transition hover:border-white/[0.12] hover:bg-white/[0.03] hover:text-white"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
              </button>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate max-w-[62vw] text-base font-semibold tracking-[-0.01em] text-white sm:max-w-none sm:text-xl">
                    {project.name ||
                      "Untitled Project"}
                  </h1>

                  {isEnhancingSpeech ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/15 bg-cyan-400/[0.08] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-cyan-300">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                      Enhancing speech
                    </span>
                  ) : isAutoSfxRunning ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/15 bg-amber-400/[0.08] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-amber-300">
                      <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                      Adding SFX
                    </span>
                  ) : (
                    <StatusBadge
                      status={badgeStatus}
                      progress={progress}
                    />
                  )}

                  {isSpeechOnlyMode && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/10 bg-cyan-500/[0.07] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-cyan-300">
                      <AudioWaveform className="h-3 w-3" />
                      Speech enhancement
                    </span>
                  )}

                  {isFullVideoMode && !isSpeechOnlyMode && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/10 bg-indigo-500/[0.07] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-indigo-300">
                      <Captions className="h-3 w-3" />
                      Captions only
                    </span>
                  )}

                  {isReframeMode && !isSpeechOnlyMode && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/10 bg-violet-500/[0.07] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-violet-300">
                      <Target className="h-3 w-3" />
                      AI Reframe
                    </span>
                  )}
                </div>

                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[8px] font-medium uppercase tracking-[0.13em] text-zinc-700">
                  <span>
                    {project.source_type ||
                      "VIDEO"}
                  </span>

                  <span>•</span>

                  <span>
                    {formatDuration(
                      project.duration,
                    )}
                  </span>

                  {!isFullVideoMode && (
                    <>
                      <span>•</span>

                      <span>
                        {safeClips.length} clips
                      </span>
                    </>
                  )}

                  {isCompleted &&
                    !isEnhancingSpeech &&
                    !isAutoSfxRunning && (
                      <>
                        <span>•</span>

                        <span className="text-emerald-500/70">
                          AI optimized
                        </span>
                      </>
                    )}
                </div>
              </div>
            </div>

            <div className="relative ml-auto flex shrink-0 items-center gap-2">
              {!isPremium && (
                <a
                  href="/pricing"
                  onClick={(event) => {
                    if (onUpgrade) {
                      event.preventDefault();
                      onUpgrade();
                    }
                  }}
                  className="group relative inline-flex min-h-11 touch-manipulation items-center justify-center gap-1.5 overflow-hidden rounded-xl border border-amber-300/25 bg-gradient-to-b from-amber-300/[0.16] to-amber-500/[0.08] px-3 text-[9px] font-bold uppercase tracking-[0.12em] text-amber-200 shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_8px_28px_rgba(217,164,65,0.16)] transition hover:-translate-y-0.5 hover:border-amber-200/40 hover:from-amber-300/[0.24] hover:to-amber-500/[0.14] hover:text-amber-50 active:translate-y-0 sm:px-4"
                  aria-label="Upgrade to Premium"
                >
                  <span className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 -skew-x-12 bg-white/10 opacity-0 transition duration-500 group-hover:translate-x-[220%] group-hover:opacity-100" />
                  <Crown className="h-3.5 w-3.5 shrink-0 text-amber-300 transition group-hover:scale-110" />

                  <span className="hidden sm:inline">
                    Premium
                  </span>
                </a>
              )}

              <button
                type="button"
                onClick={() =>
                  setShowDeleteMenu(
                    (value) => !value,
                  )
                }
                className="flex h-11 w-11 touch-manipulation items-center justify-center rounded-xl border border-white/[0.07] bg-[#09090d] text-zinc-500 transition hover:border-white/[0.12] hover:bg-white/[0.03] hover:text-white active:scale-95"
                aria-label="Project actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {showDeleteMenu && (
                <div className="absolute right-0 top-12 z-50 w-[min(12rem,calc(100vw-1.5rem))] overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0e] p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteMenu(false);
                      onDeleteProject(
                        project.id,
                      );
                    }}
                    className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-[10px] font-medium text-red-400 transition hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Delete project
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* =====================================================
            PROCESSING (clip generation still running)
        ====================================================== */}

        {isProcessing && (
          <>
            <div className="grid gap-5 xl:grid-cols-12">
              <div className="xl:col-span-7 min-w-0">
                <HeroVideo
                  project={project}
                  progress={progress}
                  completed={false}
                  failed={false}
                  speechEnhancing={isEnhancingSpeech}
                  autoSfxRunning={isAutoSfxRunning}
                />
              </div>

              <div className="xl:col-span-5 min-w-0">
                {isEnhancingSpeech ? (
                  <SpeechPipeline />
                ) : isAutoSfxRunning ? (
                  <AutoSfxPipeline
                    progress={autoSfxProgress}
                    failed={autoSfxFailed}
                  />
                ) : (
                  <Pipeline
                    project={project}
                    progress={progress}
                  />
                )}
              </div>
            </div>

            {!isFullVideoMode &&
              !isReframeMode &&
              !isSpeechOnlyMode &&
              !isVideoDebuggerMode && (
              <>
                <div className="mt-5">
                  <PremiumStats
                    project={project}
                    clips={safeClips}
                  />
                </div>

                <div className="mt-5">
                  <AIInsightPanel
                    project={project}
                    clips={safeClips}
                  />
                </div>

                <ClipsSection
                  clips={safeClips}
                  processing
                  onPublish={(clip) =>
                    setPublishTarget({
                      kind: "clip",
                      clip,
                    })
                  }
                />
              </>
            )}
          </>
        )}

        {/* =====================================================
            FAILED
        ====================================================== */}

        {isFailed && (
          <>
            <div className="grid gap-5 xl:grid-cols-12">
              <div className="xl:col-span-7 min-w-0">
                <HeroVideo
                  project={project}
                  progress={progress}
                  completed={false}
                  failed
                />
              </div>

              <div className="xl:col-span-5 min-w-0">
                <Surface className="flex h-full flex-col justify-between border-red-500/10 bg-gradient-to-b from-red-500/[0.04] to-[#09090d] p-6">
                  <div>
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-400/10 bg-red-500/[0.07]">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    </div>

                    <p className="mt-6 text-[8px] font-bold uppercase tracking-[0.18em] text-red-400">
                      Processing error
                    </p>

                    <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
                      We couldn't finish this project
                    </h2>

                    <p className="mt-3 text-[11px] leading-6 text-zinc-500">
                      {project.current_step ||
                        "LumoClip encountered an error while processing your video."}
                    </p>
                  </div>

                  <div className="mt-8">
                    <button
                      type="button"
                      className="flex w-full items-center justify-center gap-2 min-h-11 touch-manipulation rounded-xl bg-white px-5 py-3 text-[10px] font-bold text-black shadow-[0_10px_30px_rgba(255,255,255,0.08)] transition duration-200 hover:-translate-y-0.5 hover:bg-zinc-100 hover:shadow-[0_14px_34px_rgba(255,255,255,0.12)] active:translate-y-0"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Try again
                    </button>

                    <button
                      type="button"
                      onClick={onBack}
                      className="mt-2 w-full rounded-xl border border-white/[0.08] bg-white/[0.025] px-5 py-3 text-[10px] font-medium shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] text-zinc-500 transition hover:bg-white/[0.04] hover:text-white"
                    >
                      Back to projects
                    </button>
                  </div>
                </Surface>
              </div>
            </div>

            {!isFullVideoMode &&
              !isVideoDebuggerMode &&
              safeClips.length > 0 && (
                <ClipsSection
                  clips={safeClips}
                  onPublish={(clip) =>
                    setPublishTarget({
                      kind: "clip",
                      clip,
                    })
                  }
                />
              )}
          </>
        )}

        {/* =====================================================
            COMPLETED
        ====================================================== */}

        {isCompleted && (
          <>
            <div
              className={[
                "mb-4 flex flex-col gap-3 rounded-2xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5",
                isEnhancingSpeech
                  ? "border-cyan-400/10 bg-cyan-500/[0.035]"
                  : isAutoSfxRunning
                  ? "border-amber-400/10 bg-amber-500/[0.035]"
                  : "border-emerald-400/10 bg-emerald-500/[0.035]",
              ].join(" ")}
            >
              <div className="flex items-center gap-3">
                <div
                  className={[
                    "flex h-9 w-9 items-center justify-center rounded-xl",
                    isEnhancingSpeech
                      ? "bg-cyan-500/[0.08]"
                      : isAutoSfxRunning
                      ? "bg-amber-500/[0.08]"
                      : "bg-emerald-500/[0.08]",
                  ].join(" ")}
                >
                  {isEnhancingSpeech || isAutoSfxRunning ? (
                    <Loader2
                      className={[
                        "h-4 w-4 animate-spin",
                        isEnhancingSpeech
                          ? "text-cyan-400"
                          : "text-amber-400",
                      ].join(" ")}
                    />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  )}
                </div>

                <div>
                  <p
                    className={[
                      "text-[8px] font-bold uppercase tracking-[0.18em]",
                      isEnhancingSpeech
                        ? "text-cyan-400"
                        : isAutoSfxRunning
                        ? "text-amber-400"
                        : "text-emerald-400",
                    ].join(" ")}
                  >
                    {isEnhancingSpeech
                      ? "Audio enhancement running"
                      : isAutoSfxRunning
                      ? "Auto SFX running"
                      : "AI processing complete"}
                  </p>

                  <p className="mt-1 text-sm font-semibold text-white">
                    {isEnhancingSpeech
                      ? "Cleaning up your audio..."
                      : isAutoSfxRunning
                      ? "Adding sound effects..."
                      : autoSfxFailed
                      ? "Sound effects could not be added."
                      : isSpeechOnlyMode
                      ? "Your source is ready for speech enhancement"
                      : isFullVideoMode
                      ? "Your captioned video is ready"
                      : "Your content is ready to publish"}
                  </p>
                </div>
              </div>

              {isEnhancingSpeech ? (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-cyan-400/10 bg-cyan-500/[0.07] px-3 py-1.5 text-[8px] font-bold uppercase tracking-wider text-cyan-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-cyan-400" />
                  Working
                </span>
              ) : isAutoSfxRunning ? (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-amber-400/10 bg-amber-500/[0.07] px-3 py-1.5 text-[8px] font-bold uppercase tracking-wider text-amber-300">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-400" />
                  Working
                </span>
              ) : (
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-400/10 bg-emerald-500/[0.07] px-3 py-1.5 text-[8px] font-bold uppercase tracking-wider text-emerald-300">
                  <Check className="h-3 w-3" />
                  Ready
                </span>
              )}
            </div>

            {isVideoDebuggerMode ? (
              <>
                <div className="grid gap-5 xl:grid-cols-12">
                  <div className="xl:col-span-12 min-w-0">
                    <VideoDebuggerPanel
                      project={project}
                      clips={safeClips}
                    />
                  </div>
                </div>
              </>
            ) : isDubbingMode ? (
              <>
                <div className="grid gap-5 xl:grid-cols-12">
                  <div className="xl:col-span-12 min-w-0">
                    <DubbingVideoResult
                      project={project}
                      onPublish={() =>
                        setPublishTarget({
                          kind: "project",
                        })
                      }
                    />
                  </div>
                </div>

                <div className="mt-5">
                  <PremiumStats
                    project={project}
                    clips={[]}
                  />
                </div>
              </>
            ) : isReframeMode ? (
              <>
                <div className="grid gap-5 xl:grid-cols-12">
                  <div
                    className={
                      isEnhancingSpeech || isAutoSfxRunning
                        ? "xl:col-span-7"
                        : "xl:col-span-12"
                    }
                  >
                    <AIReframeVideoResult
                      project={project}
                      onPublish={() =>
                        setPublishTarget({
                          kind: "project",
                        })
                      }
                    />
                  </div>

                  {isEnhancingSpeech && (
                    <div className="xl:col-span-5 min-w-0">
                      <SpeechPipeline />
                    </div>
                  )}

                  {isAutoSfxRunning && !isEnhancingSpeech && (
                    <div className="xl:col-span-5 min-w-0">
                      <AutoSfxPipeline
                        progress={autoSfxProgress}
                        failed={autoSfxFailed}
                      />
                    </div>
                  )}
                </div>

                <div className="mt-5">
                  <PremiumStats
                    project={project}
                    clips={[]}
                  />
                </div>

                <EnhanceSpeechPanel
                  project={project}
                  status={speechStatus}
                  onStatusChange={setSpeechStatus}
                />

              </>
            ) : isFullVideoMode ? (
              <>
                <div className="grid gap-5 xl:grid-cols-12">
                  <div
                    className={
                      isEnhancingSpeech || isAutoSfxRunning
                        ? "xl:col-span-7"
                        : "xl:col-span-12"
                    }
                  >
                    <FullCaptionedVideoResult
                      project={project}
                      onPublish={() =>
                        setPublishTarget({
                          kind: "project",
                        })
                      }
                    />
                  </div>

                  {isEnhancingSpeech && (
                    <div className="xl:col-span-5 min-w-0">
                      <SpeechPipeline />
                    </div>
                  )}

                  {isAutoSfxRunning && !isEnhancingSpeech && (
                    <div className="xl:col-span-5 min-w-0">
                      <AutoSfxPipeline
                        progress={autoSfxProgress}
                        failed={autoSfxFailed}
                      />
                    </div>
                  )}
                </div>

                <div className="mt-5">
                  <PremiumStats
                    project={project}
                    clips={[]}
                  />
                </div>

                <EnhanceSpeechPanel
                  project={project}
                  status={speechStatus}
                  onStatusChange={setSpeechStatus}
                />

              </>
            ) : (
              <>
                <div className="grid gap-5 xl:grid-cols-12">
                  <div
                    className={
                      isEnhancingSpeech
                        ? "xl:col-span-7"
                        : "xl:col-span-7"
                    }
                  >
                    <SourceVideo
                      project={project}
                    />
                  </div>

                  <div className="xl:col-span-5 min-w-0">
                    {isEnhancingSpeech ? (
                      <SpeechPipeline />
                    ) : isAutoSfxRunning ? (
                      <AutoSfxPipeline
                        progress={autoSfxProgress}
                        failed={autoSfxFailed}
                      />
                    ) : isSpeechOnlyMode ? (
                      <Surface className="h-full border-cyan-400/10 bg-gradient-to-b from-cyan-500/[0.045] to-[#09090d] p-6">
                        <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-cyan-400/10 bg-cyan-500/[0.07]">
                          <AudioWaveform className="h-5 w-5 text-cyan-400" />
                        </div>
                        <p className="mt-6 text-[8px] font-bold uppercase tracking-[0.18em] text-cyan-400">
                          Speech enhancement source
                        </p>
                        <h2 className="mt-2 text-xl font-semibold tracking-tight text-white">
                          Your audio is ready
                        </h2>
                        <p className="mt-3 text-[11px] leading-6 text-zinc-500">
                          The original video has been prepared without generating clips. Use Enhance Speech below to clean the voice while keeping the video intact.
                        </p>
                        <div className="mt-6 grid grid-cols-2 gap-2">
                          {[
                            ["Noise reduction", VolumeX],
                            ["Voice clarity", Volume2],
                            ["Dynamic compression", AudioWaveform],
                            ["Loudness normalize", Wand2],
                          ].map(([label, Icon]) => {
                            const FeatureIcon = Icon as React.ElementType;
                            return (
                              <div key={label as string} className="flex items-center gap-2 rounded-xl border border-white/[0.07] shadow-[inset_0_1px_0_rgba(255,255,255,0.025)] bg-white/[0.015] px-3 py-2.5">
                                <FeatureIcon className="h-3 w-3 text-cyan-400/70" />
                                <span className="text-[8px] font-medium text-zinc-500">{label as string}</span>
                              </div>
                            );
                          })}
                        </div>
                      </Surface>
                    ) : (
                      <CompletedOverview
                        project={project}
                        clips={safeClips}
                      />
                    )}
                  </div>
                </div>

                {!isSpeechOnlyMode && (
                  <div className="mt-5">
                    <PremiumStats
                      project={project}
                      clips={safeClips}
                    />
                  </div>
                )}

                {!isSpeechOnlyMode && (
                  <div className="mt-5">
                    <AIInsightPanel
                      project={project}
                      clips={safeClips}
                    />
                  </div>
                )}

                {/* =================================================
                    ENHANCE SPEECH
                    (status is lifted so the header/hero/pipeline
                    above react to it too)
                ================================================== */}

                <EnhanceSpeechPanel
                  project={project}
                  status={speechStatus}
                  onStatusChange={setSpeechStatus}
                />


                {!isSpeechOnlyMode &&
                  !isVideoDebuggerMode && (
                  <ClipsSection
                    clips={safeClips}
                    onPublish={(clip) =>
                      setPublishTarget({
                        kind: "clip",
                        clip,
                      })
                    }
                  />
                )}
              </>
            )}
          </>
        )}

        {/* =====================================================
            INITIAL / UNKNOWN
        ====================================================== */}

        {!isProcessing &&
          !isCompleted &&
          !isFailed && (
            <>
              <div className="grid gap-5 xl:grid-cols-12">
                <div className="xl:col-span-7 min-w-0">
                  <HeroVideo
                    project={project}
                    progress={progress}
                    completed={false}
                    failed={false}
                  />
                </div>

                <div className="xl:col-span-5 min-w-0">
                  <Pipeline
                    project={project}
                    progress={progress}
                  />
                </div>
              </div>

              {!isFullVideoMode &&
                !isReframeMode &&
                !isSpeechOnlyMode &&
                !isVideoDebuggerMode && (
                <>
                  <div className="mt-5">
                    <PremiumStats
                      project={project}
                      clips={safeClips}
                    />
                  </div>

                  <div className="mt-5">
                    <AIInsightPanel
                      project={project}
                      clips={safeClips}
                    />
                  </div>
                </>
              )}
            </>
          )}

        {/* =====================================================
            YOUTUBE PUBLISH MODAL
        ====================================================== */}

        {publishTarget && (
          <YouTubePublishModal
            open={Boolean(publishTarget)}
            onClose={() =>
              setPublishTarget(null)
            }
            target={
              publishTarget.kind ===
              "clip"
                ? {
                    kind: "clip",
                    clipId:
                      publishTarget.clip.id,
                    defaultTitle:
                      getClipTitle(
                        publishTarget.clip,
                      ),
                    defaultDescription:
                      (publishTarget.clip as any)
                        .caption || "",
                  }
                : {
                    kind: "project",
                    projectId:
                      project.id,
                    defaultTitle:
                      project.name ||
                      "LumoClip Captioned Video",
                    defaultDescription:
                      "",
                  }
            }
          />
        )}

        {/* =====================================================
            FOOTER
        ====================================================== */}

        <footer className="relative mt-10 flex flex-col items-center justify-between gap-3 border-t border-white/[0.06] pt-5 sm:mt-14 sm:flex-row">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-500/20 to-transparent" />
          <div className="flex items-center gap-2 text-[8px] font-medium uppercase tracking-[0.14em] text-zinc-800">
            <Sparkles className="h-3 w-3 text-violet-500/40" />
            Powered by LumoClip AI
          </div>

          <div className="flex items-center gap-2 text-[8px] font-medium uppercase tracking-[0.14em] text-zinc-800">
            <Zap className="h-3 w-3" />
            AI Content Repurposing
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ProjectDetailView;