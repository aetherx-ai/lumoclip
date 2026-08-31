import React, { useMemo, useState } from "react";
import {
  AlertCircle,
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
  Zap,
} from "lucide-react";

import { Project, Clip } from "../types.js";

interface ProjectDetailViewProps {
  project: Project;
  clips: Clip[];
  onBack: () => void;
  onDeleteProject: (id: string) => void;
}

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
  return (
    clip.title ||
    (clip as any).name ||
    "Viral Clip"
  );
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

/* =========================================================
   SHARED UI
========================================================= */

const Surface: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = "" }) => (
  <div
    className={[
      "rounded-2xl border border-white/[0.07] bg-[#09090d]",
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
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/[0.08] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-emerald-300">
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

/* =========================================================
   HERO VIDEO
========================================================= */

const HeroVideo: React.FC<{
  project: Project;
  progress: number;
  completed: boolean;
  failed: boolean;
}> = ({
  project,
  progress,
  completed,
  failed,
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

        {/* Minimal cinematic overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-black/20" />

        {/* top metadata */}
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
        </div>

        {/* bottom information */}
        <div className="absolute bottom-5 left-5 right-5">
          {!completed && !failed && (
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
          )}

          {completed && (
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
          )}

          {failed && (
            <p className="text-sm font-semibold text-red-200">
              Processing failed
            </p>
          )}
        </div>

        {/* progress */}
        {!completed && !failed && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10">
            <div
              className="h-full bg-violet-500 transition-all duration-700"
              style={{
                width: `${progress}%`,
              }}
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
   FULL CAPTIONED VIDEO
========================================================= */

const FullCaptionedVideoResult: React.FC<{
  project: Project;
}> = ({ project }) => {
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
              className="max-h-[680px] w-full"
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
            <div className="flex gap-2">
              <a
                href={fullVideoUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-white px-4 py-2.5 text-[10px] font-bold text-black transition hover:bg-zinc-200"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </a>

              <a
                href={fullVideoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] text-zinc-500 transition hover:bg-white/[0.05] hover:text-white"
                title="Open in new tab"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
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
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.label}
            className="group rounded-2xl border border-white/[0.07] bg-[#09090d] p-4 transition hover:border-white/[0.12]"
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
                className="flex items-center gap-2 rounded-xl border border-white/[0.05] px-3 py-2.5"
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

  const steps = fullVideoMode
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
            Processing
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
            progress >= step.threshold - 15;

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
                      "text-[11px] font-medium",
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
   CLIP CARD
========================================================= */

const ClipCard: React.FC<{
  clip: Clip;
  index: number;
}> = ({ clip, index }) => {
  const [showReason, setShowReason] =
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
  ];

  return (
    <article
      className="group overflow-hidden rounded-2xl border border-white/[0.07] bg-[#09090d] transition duration-300 hover:-translate-y-0.5 hover:border-white/[0.12]"
      style={{
        contentVisibility: "auto",
        containIntrinsicSize: "0 700px",
      }}
    >
      {/* preview */}
      <div className="relative aspect-[9/14] overflow-hidden bg-[#050507]">
        {videoUrl ? (
          <video
            src={videoUrl}
            controls
            playsInline
            preload="metadata"
            poster={thumbnailUrl || undefined}
            className="h-full w-full object-cover"
            onError={(event) => {
              console.error(
                "LumoClip: failed to load clip video",
                {
                  clipId: (clip as any).id,
                  videoUrl,
                  error:
                    event.currentTarget.error,
                },
              );
            }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center bg-[#060608]">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025]">
              <Film className="h-5 w-5 text-zinc-600" />
            </div>

            <p className="mt-3 text-[9px] text-zinc-700">
              Preview unavailable
            </p>
          </div>
        )}

        <div className="pointer-events-none absolute inset-x-0 top-0 h-20 bg-gradient-to-b from-black/70 to-transparent" />

        {/* clip number */}
        <div className="absolute left-3 top-3 flex h-7 w-7 items-center justify-center rounded-lg border border-white/10 bg-black/55 text-[8px] font-bold text-white backdrop-blur-xl">
          {String(index + 1).padStart(2, "0")}
        </div>

        {/* top pick */}
        {index === 0 && (
          <div className="absolute left-12 top-3 inline-flex items-center gap-1.5 rounded-lg border border-amber-300/15 bg-black/55 px-2 py-1.5 text-[7px] font-bold uppercase tracking-wider text-amber-300 backdrop-blur-xl">
            <Flame className="h-3 w-3" />
            Top pick
          </div>
        )}

        {/* score */}
        <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg border border-white/10 bg-black/55 px-2.5 py-1.5 text-[8px] font-bold text-white backdrop-blur-xl">
          <Flame className="h-3 w-3 text-amber-300" />
          {score}
        </div>

        {/* bottom metadata */}
        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
          <span className="rounded-lg border border-white/10 bg-black/55 px-2.5 py-1.5 text-[7px] font-bold uppercase tracking-wider text-zinc-200 backdrop-blur-xl">
            9:16
          </span>

          <span className="rounded-lg border border-white/10 bg-black/55 px-2.5 py-1.5 font-mono text-[8px] text-white backdrop-blur-xl">
            {formatDuration(clip.duration)}
          </span>
        </div>
      </div>

      {/* body */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[7px] font-bold uppercase tracking-[0.16em] text-violet-400">
              AI selected
            </p>

            <h3 className="line-clamp-2 text-[13px] font-semibold leading-5 text-white">
              {title}
            </h3>
          </div>

          <div className="shrink-0 rounded-lg border border-white/[0.06] bg-white/[0.025] px-2 py-1.5">
            <p className="text-[8px] font-semibold text-violet-300">
              {score}/100
            </p>
          </div>
        </div>

        {/* metrics */}
        <div className="mt-4 grid grid-cols-3 gap-1.5">
          {metrics.map(([label, value]) => (
            <div
              key={label}
              className="rounded-xl border border-white/[0.05] bg-black/20 p-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-[6px] font-bold uppercase tracking-wider text-zinc-700">
                  {label}
                </span>

                <span className="text-[7px] font-semibold text-zinc-400">
                  {value}
                </span>
              </div>

              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                <div
                  className="h-full rounded-full bg-violet-500/60"
                  style={{
                    width: `${value}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* why */}
        <button
          type="button"
          onClick={() =>
            setShowReason((value) => !value)
          }
          className="mt-4 flex w-full items-center justify-between border-t border-white/[0.05] pt-3 text-left"
        >
          <span className="text-[8px] font-bold uppercase tracking-[0.14em] text-zinc-600">
            Why this clip
          </span>

          <ChevronDown
            className={[
              "h-3.5 w-3.5 text-zinc-700 transition",
              showReason
                ? "rotate-180"
                : "",
            ].join(" ")}
          />
        </button>

        {showReason && (
          <div className="mt-2 rounded-xl border border-white/[0.05] bg-white/[0.02] p-3">
            <p className="text-[9px] leading-5 text-zinc-500">
              {reason}
            </p>
          </div>
        )}

        {/* caption */}
        {caption && (
          <div className="mt-4 rounded-xl border border-white/[0.05] bg-black/20 p-3">
            <div className="flex items-center justify-between">
              <span className="text-[7px] font-bold uppercase tracking-[0.14em] text-zinc-700">
                Caption
              </span>

              <button
                type="button"
                onClick={copyCaption}
                className="rounded-lg p-1.5 text-zinc-600 transition hover:bg-white/[0.05] hover:text-white"
                title="Copy caption"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>

            <p className="mt-2 line-clamp-3 text-[9px] leading-5 text-zinc-500">
              {caption}
            </p>
          </div>
        )}

        {/* actions */}
        <div className="mt-4 flex gap-2 border-t border-white/[0.05] pt-3">
          {videoUrl ? (
            <>
              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2.5 text-[9px] font-bold text-black transition hover:bg-zinc-200"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </a>

              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] text-zinc-600 transition hover:bg-white/[0.05] hover:text-white"
                title="Open clip"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </>
          ) : (
            <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-[9px] font-medium text-zinc-700">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Processing
            </div>
          )}
        </div>
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
}> = ({
  clips,
  processing = false,
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
      {/* heading */}
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
            onClick={() => setSort("score")}
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
            onClick={() => setSort("newest")}
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

      {/* processing notice */}
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
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {sortedClips.map(
            (clip, index) => (
              <ClipCard
                key={clip.id}
                clip={clip}
                index={index}
              />
            ),
          )}

          {processing &&
            Array.from({
              length: Math.max(
                0,
                4 - sortedClips.length,
              ),
            }).map((_, index) => (
              <div
                key={`loading-${index}`}
                className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#09090d]"
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
            ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-white/[0.08] bg-[#09090d] px-6 py-16 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.06] bg-white/[0.02]">
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
      ? Math.max(...clips.map(getClipScore))
      : 0;

  return (
    <div className="space-y-3">
      {/* summary */}
      <Surface className="p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-400/10 bg-emerald-500/[0.07]">
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
              {formatDuration(project.duration)}
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

      {/* optimization */}
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
                className="flex items-center gap-2 rounded-xl border border-white/[0.05] px-3 py-2.5"
              >
                <ItemIcon className="h-3 w-3 text-violet-400/70" />

                <span className="text-[8px] font-medium text-zinc-500">
                  {label as string}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.015] px-3 py-3">
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
            className="max-h-[650px] w-full"
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
    status === "analyzing";

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

  const [showDeleteMenu, setShowDeleteMenu] =
    useState(false);

  const safeClips = Array.isArray(clips)
    ? clips
    : [];

  const badgeStatus =
    isCompleted
      ? "completed"
      : isFailed
      ? "failed"
      : "processing";

  return (
    <div className="min-h-full bg-[#030304] text-white">
      {/* very subtle background */}
      <div className="pointer-events-none fixed inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(124,58,237,0.055),transparent_35%)]" />

      <div className="relative z-10 mx-auto w-full max-w-[1500px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {/* =====================================================
            HEADER
        ====================================================== */}

        <header className="mb-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="group flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-[#09090d] text-zinc-500 transition hover:border-white/[0.12] hover:bg-white/[0.03] hover:text-white"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
              </button>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-lg font-semibold tracking-tight text-white sm:text-xl">
                    {project.name ||
                      "Untitled Project"}
                  </h1>

                  <StatusBadge
                    status={badgeStatus}
                    progress={progress}
                  />

                  {isFullVideoMode && (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-400/10 bg-indigo-500/[0.07] px-2.5 py-1 text-[8px] font-bold uppercase tracking-[0.12em] text-indigo-300">
                      <Captions className="h-3 w-3" />
                      Captions only
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

                  {isCompleted && (
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

            {/* project actions */}
            <div className="relative shrink-0">
              <button
                type="button"
                onClick={() =>
                  setShowDeleteMenu(
                    (value) => !value,
                  )
                }
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-[#09090d] text-zinc-600 transition hover:border-white/[0.12] hover:text-white"
                aria-label="Project actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {showDeleteMenu && (
                <div className="absolute right-0 top-11 z-50 w-48 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0e] p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
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
            PROCESSING
        ====================================================== */}

        {isProcessing && (
          <>
            <div className="grid gap-4 xl:grid-cols-12">
              <div className="xl:col-span-7">
                <HeroVideo
                  project={project}
                  progress={progress}
                  completed={false}
                  failed={false}
                />
              </div>

              <div className="xl:col-span-5">
                <Pipeline
                  project={project}
                  progress={progress}
                />
              </div>
            </div>

            {!isFullVideoMode && (
              <>
                <div className="mt-4">
                  <PremiumStats
                    project={project}
                    clips={safeClips}
                  />
                </div>

                <div className="mt-4">
                  <AIInsightPanel
                    project={project}
                    clips={safeClips}
                  />
                </div>

                <ClipsSection
                  clips={safeClips}
                  processing
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
            <div className="grid gap-4 xl:grid-cols-12">
              <div className="xl:col-span-7">
                <HeroVideo
                  project={project}
                  progress={progress}
                  completed={false}
                  failed
                />
              </div>

              <div className="xl:col-span-5">
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
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-[10px] font-bold text-black transition hover:bg-zinc-200"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Try again
                    </button>

                    <button
                      type="button"
                      onClick={onBack}
                      className="mt-2 w-full rounded-xl border border-white/[0.07] bg-white/[0.02] px-5 py-3 text-[10px] font-medium text-zinc-500 transition hover:bg-white/[0.04] hover:text-white"
                    >
                      Back to projects
                    </button>
                  </div>
                </Surface>
              </div>
            </div>

            {!isFullVideoMode &&
              safeClips.length > 0 && (
                <ClipsSection
                  clips={safeClips}
                />
              )}
          </>
        )}

        {/* =====================================================
            COMPLETED
        ====================================================== */}

        {isCompleted && (
          <>
            {/* success strip */}
            <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-emerald-400/10 bg-emerald-500/[0.035] px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/[0.08]">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                </div>

                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-emerald-400">
                    AI processing complete
                  </p>

                  <p className="mt-1 text-sm font-semibold text-white">
                    {isFullVideoMode
                      ? "Your captioned video is ready"
                      : "Your content is ready to publish"}
                  </p>
                </div>
              </div>

              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-400/10 bg-emerald-500/[0.07] px-3 py-1.5 text-[8px] font-bold uppercase tracking-wider text-emerald-300">
                <Check className="h-3 w-3" />
                Ready
              </span>
            </div>

            {isFullVideoMode ? (
              <>
                <FullCaptionedVideoResult
                  project={project}
                />

                <div className="mt-4">
                  <PremiumStats
                    project={project}
                    clips={[]}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="grid gap-4 xl:grid-cols-12">
                  <div className="xl:col-span-7">
                    <SourceVideo
                      project={project}
                    />
                  </div>

                  <div className="xl:col-span-5">
                    <CompletedOverview
                      project={project}
                      clips={safeClips}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <PremiumStats
                    project={project}
                    clips={safeClips}
                  />
                </div>

                <div className="mt-4">
                  <AIInsightPanel
                    project={project}
                    clips={safeClips}
                  />
                </div>

                <ClipsSection
                  clips={safeClips}
                />
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
              <div className="grid gap-4 xl:grid-cols-12">
                <div className="xl:col-span-7">
                  <HeroVideo
                    project={project}
                    progress={progress}
                    completed={false}
                    failed={false}
                  />
                </div>

                <div className="xl:col-span-5">
                  <Pipeline
                    project={project}
                    progress={progress}
                  />
                </div>
              </div>

              {!isFullVideoMode && (
                <>
                  <div className="mt-4">
                    <PremiumStats
                      project={project}
                      clips={safeClips}
                    />
                  </div>

                  <div className="mt-4">
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
            FOOTER
        ====================================================== */}

        <footer className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-white/[0.05] pt-5 sm:flex-row">
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