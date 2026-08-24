import React, { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowLeft,
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
  Loader2,
  MoreHorizontal,
  Play,
  RefreshCw,
  Scissors,
  Sparkles,
  Trash2,
  Wand2,
  Zap,
  BarChart3,
  Layers3,
  Target,
  TrendingUp,
  Video,
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

/* =========================================================
   PREMIUM STATUS BADGE
========================================================= */

const StatusBadge: React.FC<{
  status: "processing" | "completed" | "failed";
  progress?: number;
}> = ({ status, progress = 0 }) => {
  if (status === "completed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-300">
        <CheckCircle2 className="h-3 w-3" />
        Ready
      </span>
    );
  }

  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-400/20 bg-red-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-red-300">
        <AlertCircle className="h-3 w-3" />
        Failed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-violet-300">
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

  return (
    <div className="group relative overflow-hidden rounded-[30px] border border-white/[0.08] bg-[#09090d] shadow-[0_30px_100px_rgba(0,0,0,0.45)]">
      {/* ambient glow */}
      <div className="pointer-events-none absolute -inset-20 bg-[radial-gradient(circle_at_50%_30%,rgba(124,58,237,0.15),transparent_50%)]" />

      <div className="relative aspect-video overflow-hidden bg-black">
        {sourceUrl ? (
          <video
            src={sourceUrl}
            controls
            playsInline
            preload="none"
            poster={thumbnail || undefined}
            className="h-full w-full object-cover"
          />
        ) : thumbnail ? (
          <img
            src={thumbnail}
            alt={project.name || "Project preview"}
            className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.015]"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-[radial-gradient(circle_at_50%_40%,rgba(124,58,237,0.16),transparent_45%),#050507]">
            <div className="flex h-20 w-20 items-center justify-center rounded-[26px] border border-violet-400/15 bg-violet-500/10 shadow-[0_0_60px_rgba(124,58,237,0.12)]">
              <Video className="h-8 w-8 text-violet-400" />
            </div>
          </div>
        )}

        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20" />

        {/* top left */}
        <div className="absolute left-5 top-5 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-white/10 bg-black/55 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-white backdrop-blur-xl">
            {project.source_type || "VIDEO"}
          </span>

          {!completed && !failed && (
            <span className="flex items-center gap-1.5 rounded-full border border-violet-400/20 bg-violet-500/20 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-violet-200 backdrop-blur-xl">
              <Sparkles className="h-3 w-3" />
              AI editing
            </span>
          )}

          {completed && (
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-400/20 bg-emerald-500/20 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-emerald-200 backdrop-blur-xl">
              <Check className="h-3 w-3" />
              Ready
            </span>
          )}
        </div>

        {/* bottom metadata */}
        <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
          <div>
            {!completed && !failed && (
              <>
                <p className="text-sm font-black text-white">
                  AI is turning your long video into shorts
                </p>

                <p className="mt-1 text-[10px] text-zinc-300">
                  {project.current_step ||
                    "Analyzing your content..."}
                </p>
              </>
            )}

            {completed && (
              <>
                <p className="text-sm font-black text-white">
                  Your content is ready to publish
                </p>

                <p className="mt-1 text-[10px] text-zinc-300">
                  {project.duration
                    ? `${formatDuration(project.duration)} source video`
                    : "AI-generated short-form content"}
                </p>
              </>
            )}

            {failed && (
              <p className="text-sm font-black text-red-200">
                Processing failed
              </p>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-black/60 px-3 py-2 font-mono text-[10px] text-white backdrop-blur-xl">
            {formatDuration(project.duration)}
          </div>
        </div>

        {/* processing progress */}
        {!completed && !failed && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/40">
            <div
              className="relative h-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-400 transition-all duration-700"
              style={{
                width: `${progress}%`,
              }}
            >
              <div className="absolute inset-0 animate-pulse bg-white/30" />
            </div>
          </div>
        )}
      </div>

      {/* footer */}
      <div className="flex items-center justify-between border-t border-white/[0.06] bg-[#09090d] px-5 py-3.5">
        <div className="flex items-center gap-2 text-[9px] font-semibold text-zinc-600">
          <Clock3 className="h-3.5 w-3.5" />
          Source • {formatDuration(project.duration)}
        </div>

        <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-zinc-700">
          <Sparkles className="h-3.5 w-3.5 text-violet-500" />
          LumoClip AI
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   PREMIUM STATS
========================================================= */

const PremiumStats: React.FC<{
  project: Project;
  clips: Clip[];
}> = ({ project, clips }) => {
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
      accent: "text-white",
    },
    {
      label: "AI Clips",
      value: clips.length,
      icon: Layers3,
      accent: "text-violet-300",
    },
    {
      label: "Best Score",
      value: bestScore,
      icon: Flame,
      accent: "text-amber-300",
    },
    {
      label: "Clip Time",
      value: formatDuration(totalClipTime),
      icon: BarChart3,
      accent: "text-emerald-300",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <div
            key={stat.label}
            className="group relative overflow-hidden rounded-[22px] border border-white/[0.07] bg-[#09090d] p-4 transition duration-300 hover:-translate-y-0.5 hover:border-violet-500/20"
          >
            <div className="absolute right-0 top-0 h-20 w-20 rounded-full bg-violet-500/[0.04] blur-2xl transition group-hover:bg-violet-500/[0.08]" />

            <div className="relative">
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-black uppercase tracking-[0.18em] text-zinc-700">
                  {stat.label}
                </span>

                <Icon
                  className={`h-3.5 w-3.5 ${stat.accent} opacity-60`}
                />
              </div>

              <p
                className={`mt-3 text-xl font-black tracking-tight ${stat.accent}`}
              >
                {stat.value}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
};

/* =========================================================
   AI INSIGHT PANEL
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

  return (
    <section className="relative overflow-hidden rounded-[28px] border border-violet-500/10 bg-[#09090d] shadow-[0_25px_80px_rgba(0,0,0,0.25)]">
      <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-violet-600/10 blur-[90px]" />

      <div className="relative p-5 sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-violet-400/15 bg-violet-500/10">
              <Sparkles className="h-5 w-5 text-violet-300" />
            </div>

            <div>
              <p className="text-[8px] font-black uppercase tracking-[0.22em] text-violet-400">
                AI Intelligence
              </p>

              <h2 className="mt-1.5 text-lg font-black tracking-tight text-white">
                Why these moments matter
              </h2>

              <p className="mt-1 text-[10px] text-zinc-600">
                LumoClip analyzed the strongest moments in your video.
              </p>
            </div>
          </div>

          <div className="flex gap-2">
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <p className="text-[7px] font-black uppercase tracking-wider text-zinc-700">
                AI Score
              </p>

              <p className="mt-1 flex items-center gap-1 text-sm font-black text-violet-300">
                <Target className="h-3 w-3" />
                {averageScore || "—"}
              </p>
            </div>

            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2">
              <p className="text-[7px] font-black uppercase tracking-wider text-zinc-700">
                Clips
              </p>

              <p className="mt-1 text-sm font-black text-white">
                {clips.length}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-white/[0.05] bg-black/20 p-4">
          {summary ? (
            <p className="text-xs leading-6 text-zinc-400">
              {summary}
            </p>
          ) : (
            <div className="flex items-center gap-3">
              <Loader2 className="h-4 w-4 animate-spin text-violet-400" />

              <div>
                <p className="text-xs font-semibold text-zinc-400">
                  LumoClip is analyzing this project
                </p>

                <p className="mt-1 text-[9px] text-zinc-700">
                  AI summary and content insights will appear here.
                </p>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {[
            "Hook detection",
            "Viral scoring",
            "9:16 framing",
            "Caption generation",
            "Title generation",
            "Hashtags",
          ].map((item) => (
            <span
              key={item}
              className="rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5 text-[8px] font-semibold text-zinc-500"
            >
              {item}
            </span>
          ))}
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
  const steps = [
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
      description: "AI is scoring potential highlights",
      threshold: 45,
    },
    {
      label: "Creating short clips",
      description: "Generating optimized 9:16 videos",
      threshold: 65,
    },
    {
      label: "Preparing publishing assets",
      description: "Titles, captions and hashtags",
      threshold: 85,
    },
    {
      label: "Finalizing",
      description: "Preparing everything for export",
      threshold: 96,
    },
  ];

  return (
    <section className="rounded-[28px] border border-white/[0.07] bg-[#09090d] p-5 sm:p-6">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-violet-400">
            Live AI pipeline
          </p>

          <h3 className="mt-1 text-base font-black text-white">
            Processing workflow
          </h3>
        </div>

        <span className="flex items-center gap-1.5 rounded-full border border-violet-400/10 bg-violet-500/5 px-3 py-1.5 text-[8px] font-black uppercase tracking-wider text-violet-300">
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
              {index <
                steps.length - 1 && (
                <div
                  className={`absolute left-[15px] top-8 h-[calc(100%-8px)] w-px ${
                    done
                      ? "bg-emerald-500/30"
                      : "bg-white/[0.05]"
                  }`}
                />
              )}

              <div
                className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${
                  done
                    ? "border-emerald-400/20 bg-emerald-400/10"
                    : active
                    ? "border-violet-400/20 bg-violet-500/10"
                    : "border-white/[0.06] bg-white/[0.02]"
                }`}
              >
                {done ? (
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                ) : active ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-400" />
                ) : (
                  <span className="h-1.5 w-1.5 rounded-full bg-zinc-700" />
                )}
              </div>

              <div
                className={`mb-3 flex-1 rounded-2xl px-3 py-2.5 ${
                  active
                    ? "bg-violet-500/[0.035]"
                    : ""
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <p
                    className={`text-[11px] font-bold ${
                      done
                        ? "text-zinc-300"
                        : active
                        ? "text-white"
                        : "text-zinc-600"
                    }`}
                  >
                    {step.label}
                  </p>

                  {done && (
                    <span className="text-[7px] font-black uppercase tracking-wider text-emerald-400">
                      Done
                    </span>
                  )}

                  {active && (
                    <span className="text-[7px] font-black uppercase tracking-wider text-violet-400">
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
    </section>
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
  const thumbnailUrl = getClipThumbnailUrl(clip);

  const caption =
    (clip as any).caption || "";

  const copyCaption = async () => {
    if (!caption) return;

    try {
      await navigator.clipboard.writeText(
        caption,
      );
    } catch {
      // ignore
    }
  };

  return (
    <article
      className="group relative overflow-hidden rounded-[25px] border border-white/[0.07] bg-[#09090d] shadow-[0_20px_70px_rgba(0,0,0,0.2)] transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/25 hover:shadow-[0_25px_80px_rgba(124,58,237,0.08)]"
      style={{ contentVisibility: "auto", containIntrinsicSize: "0 720px" }}
    >
      {/* video */}
      <div className="relative aspect-[9/14] overflow-hidden bg-[#050507]">
        {videoUrl ? (
          <video
            src={videoUrl}
            controls
            playsInline
            preload="auto"
            poster={thumbnailUrl || undefined}
            className="h-full w-full object-cover"
            onError={(event) => {
              console.error(
                "LumoClip: failed to load clip video",
                {
                  clipId: (clip as any).id,
                  videoUrl,
                  error: event.currentTarget.error,
                },
              );
            }}
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center bg-[radial-gradient(circle_at_50%_35%,rgba(124,58,237,0.14),transparent_45%),#050507]">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-500/15 bg-violet-500/10">
              <Film className="h-6 w-6 text-violet-400" />
            </div>

            <p className="mt-3 text-[9px] text-zinc-700">
              Preview unavailable
            </p>
          </div>
        )}

        {/* overlay */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-black/70 to-transparent" />

        {/* index */}
        <div className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-xl border border-white/10 bg-black/60 text-[9px] font-black text-white backdrop-blur-xl">
          {String(index + 1).padStart(2, "0")}
        </div>

        {index === 0 && (
          <span className="absolute left-14 top-3 flex items-center gap-1 rounded-lg border border-amber-300/20 bg-amber-300/10 px-2 py-1.5 text-[7px] font-black uppercase tracking-wider text-amber-300 backdrop-blur-xl">
            <Flame className="h-3 w-3" />
            Top pick
          </span>
        )}

        {/* score */}
        <div className="absolute right-3 top-3 flex items-center gap-1.5 rounded-xl border border-amber-300/15 bg-black/65 px-2.5 py-1.5 text-[9px] font-black text-amber-300 backdrop-blur-xl">
          <Flame className="h-3 w-3" />
          {score}
        </div>

        {/* format */}
        <div className="absolute bottom-3 left-3 rounded-lg border border-white/10 bg-black/65 px-2.5 py-1.5 text-[8px] font-black uppercase tracking-wider text-zinc-200 backdrop-blur-xl">
          9:16
        </div>

        <div className="absolute bottom-3 right-3 rounded-lg border border-white/10 bg-black/65 px-2.5 py-1.5 font-mono text-[8px] text-white backdrop-blur-xl">
          {formatDuration(clip.duration)}
        </div>
      </div>

      {/* body */}
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className="min-w-0 flex-1">
            <p className="mb-1 text-[7px] font-black uppercase tracking-[0.18em] text-violet-400">
              AI Selected
            </p>

            <h3 className="line-clamp-2 text-[13px] font-black leading-5 text-white">
              {title}
            </h3>
          </div>

          <div className="shrink-0 rounded-xl border border-violet-500/10 bg-violet-500/[0.06] px-2 py-1.5">
            <p className="text-[8px] font-black text-violet-300">
              {score}/100
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-1.5">
          {[
            ["Hook", Math.min(99, Math.max(40, score + 2))],
            ["Retention", Math.min(99, Math.max(35, score - 1))],
            ["Share", Math.min(99, Math.max(35, score + 1))],
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-white/[0.05] bg-black/20 p-2">
              <div className="flex items-center justify-between">
                <span className="text-[6px] font-black uppercase tracking-wider text-zinc-700">{label}</span>
                <span className="text-[7px] font-black text-zinc-400">{value}</span>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/[0.05]">
                <div className="h-full rounded-full bg-violet-500/60" style={{ width: `${value}%` }} />
              </div>
            </div>
          ))}
        </div>

        {/* reason */}
        <button
          type="button"
          onClick={() =>
            setShowReason(
              (value) => !value,
            )
          }
          className="mt-4 flex w-full items-center justify-between border-t border-white/[0.05] pt-3 text-left"
        >
          <span className="text-[8px] font-black uppercase tracking-[0.16em] text-zinc-600">
            Why this clip
          </span>

          <ChevronDown
            className={`h-3.5 w-3.5 text-zinc-700 transition ${
              showReason
                ? "rotate-180"
                : ""
            }`}
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
              <span className="text-[7px] font-black uppercase tracking-[0.16em] text-zinc-700">
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
                className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white px-3 py-2.5 text-[9px] font-black text-black transition hover:bg-zinc-200"
              >
                <Download className="h-3.5 w-3.5" />
                Export
              </a>

              <a
                href={videoUrl}
                target="_blank"
                rel="noreferrer"
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] text-zinc-500 transition hover:border-white/10 hover:text-white"
                title="Open clip"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </>
          ) : (
            <div className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5 text-[9px] font-semibold text-zinc-700">
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
    <section className="mt-10">
      {/* heading */}
      <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-violet-500/10 bg-violet-500/[0.06]">
              <Scissors className="h-4 w-4 text-violet-400" />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black tracking-tight text-white">
                  Your viral clips
                </h2>

                <span className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-1 text-[8px] font-black text-zinc-500">
                  {clips.length}
                </span>
              </div>

              <p className="mt-1 text-[10px] text-zinc-600">
                Ranked by AI for hook strength, retention and shareability.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1 rounded-xl border border-white/[0.06] bg-[#09090d] p-1">
          <button
            type="button"
            onClick={() =>
              setSort("score")
            }
            className={`rounded-lg px-3 py-2 text-[8px] font-black ${
              sort === "score"
                ? "bg-white text-black"
                : "text-zinc-600 hover:text-zinc-300"
            }`}
          >
            TOP PICKS
          </button>

          <button
            type="button"
            onClick={() =>
              setSort("newest")
            }
            className={`rounded-lg px-3 py-2 text-[8px] font-black ${
              sort === "newest"
                ? "bg-white text-black"
                : "text-zinc-600 hover:text-zinc-300"
            }`}
          >
            NEWEST
          </button>
        </div>
      </div>

      {processing && (
        <div className="mb-5 flex items-center gap-3 rounded-2xl border border-violet-500/10 bg-violet-500/[0.035] px-4 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-500/10">
            <Sparkles className="h-3.5 w-3.5 text-violet-400" />
          </div>

          <div>
            <p className="text-[9px] font-black uppercase tracking-wider text-violet-300">
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
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
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
                4 -
                  sortedClips.length,
              ),
            }).map((_, index) => (
              <div
                key={`loading-${index}`}
                className="overflow-hidden rounded-[25px] border border-white/[0.06] bg-[#09090d]"
              >
                <div className="relative aspect-[9/14] animate-pulse bg-white/[0.025]">
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/[0.05] bg-black/30">
                      <Loader2 className="h-4 w-4 animate-spin text-violet-500/50" />
                    </div>
                  </div>

                  <div className="absolute bottom-5 left-4 right-4">
                    <div className="h-3 w-3/4 rounded bg-white/[0.05]" />
                    <div className="mt-2 h-2 w-1/2 rounded bg-white/[0.04]" />
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
        <div className="relative overflow-hidden rounded-[30px] border border-dashed border-white/[0.08] bg-[#09090d] p-16 text-center">
          <div className="pointer-events-none absolute left-1/2 top-0 h-40 w-40 -translate-x-1/2 rounded-full bg-violet-500/[0.06] blur-[70px]" />

          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-violet-500/10 bg-violet-500/[0.05]">
            {processing ? (
              <Loader2 className="h-7 w-7 animate-spin text-violet-400" />
            ) : (
              <Film className="h-7 w-7 text-zinc-700" />
            )}
          </div>

          <h3 className="relative mt-5 text-sm font-black text-zinc-400">
            {processing
              ? "Finding your best moments..."
              : "No clips generated yet"}
          </h3>

          <p className="relative mx-auto mt-2 max-w-md text-[10px] leading-6 text-zinc-700">
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
    <div className="space-y-4">
      <div className="relative overflow-hidden rounded-[28px] border border-emerald-400/10 bg-[#09090d] p-6">
        <div className="pointer-events-none absolute -right-20 -top-20 h-48 w-48 rounded-full bg-emerald-500/[0.05] blur-[70px]" />

        <div className="relative flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-emerald-400/10 bg-emerald-500/10">
            <CheckCircle2 className="h-5 w-5 text-emerald-400" />
          </div>

          <div>
            <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-400">
              Project complete
            </p>

            <h3 className="mt-1 text-base font-black text-white">
              Ready to publish
            </h3>
          </div>
        </div>

        <p className="relative mt-5 text-[11px] leading-6 text-zinc-500">
          LumoClip analyzed your video and found{" "}
          <span className="font-bold text-white">
            {clips.length}
          </span>{" "}
          high-potential moments for short-form content.
        </p>

        <div className="relative mt-6 space-y-3">
          <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
            <span className="text-[10px] text-zinc-600">
              Source duration
            </span>

            <span className="text-[10px] font-black text-zinc-300">
              {formatDuration(
                project.duration,
              )}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
            <span className="text-[10px] text-zinc-600">
              Clips generated
            </span>

            <span className="text-[10px] font-black text-violet-300">
              {clips.length}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-600">
              Best viral score
            </span>

            <span className="flex items-center gap-1.5 text-[10px] font-black text-amber-300">
              <Flame className="h-3 w-3" />
              {bestScore}
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-violet-500/10 bg-gradient-to-br from-violet-500/[0.08] via-[#09090d] to-[#09090d] p-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/10">
            <Wand2 className="h-4 w-4 text-violet-400" />
          </div>

          <div>
            <p className="text-sm font-black text-white">
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
                className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-black/20 px-3 py-2.5"
              >
                <ItemIcon className="h-3 w-3 text-violet-400/70" />

                <span className="text-[8px] font-semibold text-zinc-500">
                  {label as string}
                </span>
              </div>
            );
          })}
        </div>

        <div className="mt-5 flex items-center justify-between rounded-xl border border-white/[0.05] bg-black/20 px-3 py-3">
          <span className="text-[8px] font-black uppercase tracking-wider text-zinc-700">
            Average AI score
          </span>

          <span className="text-sm font-black text-violet-300">
            {averageScore}/100
          </span>
        </div>
      </div>
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
    <section className="overflow-hidden rounded-[28px] border border-white/[0.07] bg-[#09090d]">
      <div className="flex items-center justify-between border-b border-white/[0.05] px-5 py-4">
        <div>
          <p className="text-[8px] font-black uppercase tracking-[0.2em] text-zinc-700">
            Original source
          </p>

          <h3 className="mt-1 text-sm font-black text-white">
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
            preload="none"
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
            <FileVideo className="h-10 w-10 text-zinc-800" />
          </div>
        )}
      </div>
    </section>
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

  const [showDeleteMenu, setShowDeleteMenu] =
    useState(false);

  const safeClips = Array.isArray(clips)
    ? clips
    : [];

  return (
    <div className="min-h-full bg-[#020204] text-white">
      {/* background grid */}
      <div className="pointer-events-none fixed inset-0 -z-0 opacity-[0.025] [background-image:linear-gradient(rgba(255,255,255,.5)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.5)_1px,transparent_1px)] [background-size:48px_48px]" />

      <div className="relative z-10 mx-auto w-full max-w-[1580px] px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        {/* =====================================================
            HEADER
        ====================================================== */}

        <header className="mb-7">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <button
                type="button"
                onClick={onBack}
                className="group flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-[#09090d] text-zinc-500 transition hover:border-violet-500/20 hover:bg-violet-500/[0.04] hover:text-white"
                aria-label="Back"
              >
                <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-0.5" />
              </button>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="truncate text-lg font-black tracking-tight text-white sm:text-xl">
                    {project.name ||
                      "Untitled Project"}
                  </h1>

                  <StatusBadge
                    status={
                      isCompleted
                        ? "completed"
                        : isFailed
                        ? "failed"
                        : "processing"
                    }
                    progress={progress}
                  />
                </div>

                <div className="mt-1.5 flex items-center gap-2 text-[8px] font-semibold uppercase tracking-[0.14em] text-zinc-700">
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

                  <span>•</span>

                  <span>
                    {safeClips.length} clips
                  </span>

                  {isCompleted && (
                    <>
                      <span>•</span>
                      <span className="text-emerald-500/70">AI optimized</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="relative">
              <button
                type="button"
                onClick={() =>
                  setShowDeleteMenu(
                    (value) => !value,
                  )
                }
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-[#09090d] text-zinc-600 transition hover:border-white/10 hover:text-white"
                aria-label="Project actions"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {showDeleteMenu && (
                <div className="absolute right-0 top-12 z-50 w-48 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0a0e] p-1.5 shadow-[0_20px_80px_rgba(0,0,0,0.6)]">
                  <button
                    type="button"
                    onClick={() => {
                      setShowDeleteMenu(false);
                      onDeleteProject(
                        project.id,
                      );
                    }}
                    className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-[10px] font-bold text-red-400 transition hover:bg-red-500/10"
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
            <div className="grid gap-5 xl:grid-cols-12">
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
            />
          </>
        )}

        {/* =====================================================
            FAILED
        ====================================================== */}

        {isFailed && (
          <>
            <div className="grid gap-5 xl:grid-cols-12">
              <div className="xl:col-span-7">
                <HeroVideo
                  project={project}
                  progress={progress}
                  completed={false}
                  failed
                />
              </div>

              <div className="xl:col-span-5">
                <div className="flex h-full flex-col justify-between rounded-[30px] border border-red-500/10 bg-gradient-to-br from-red-500/[0.06] to-[#09090d] p-7">
                  <div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-red-400/10 bg-red-500/10">
                      <AlertCircle className="h-6 w-6 text-red-400" />
                    </div>

                    <p className="mt-7 text-[8px] font-black uppercase tracking-[0.2em] text-red-400">
                      Processing error
                    </p>

                    <h2 className="mt-2 text-2xl font-black tracking-tight text-white">
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
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-5 py-3 text-[10px] font-black text-black transition hover:bg-zinc-200"
                    >
                      <RefreshCw className="h-4 w-4" />
                      Try again
                    </button>

                    <button
                      type="button"
                      onClick={onBack}
                      className="mt-2 w-full rounded-xl border border-white/[0.07] bg-white/[0.02] px-5 py-3 text-[10px] font-bold text-zinc-500 transition hover:text-white"
                    >
                      Back to projects
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {safeClips.length > 0 && (
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
            {/* success hero */}
            <div className="relative mb-5 overflow-hidden rounded-[30px] border border-emerald-400/10 bg-gradient-to-r from-emerald-500/[0.07] via-[#09090d] to-[#09090d] p-5 sm:p-6">
              <div className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-full bg-emerald-500/[0.06] blur-[80px]" />

              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-400/10 bg-emerald-500/10">
                    <CheckCircle2 className="h-6 w-6 text-emerald-400" />
                  </div>

                  <div>
                    <p className="text-[8px] font-black uppercase tracking-[0.2em] text-emerald-400">
                      AI processing complete
                    </p>

                    <h2 className="mt-1 text-base font-black text-white">
                      Your content is ready to publish
                    </h2>

                    <p className="mt-1 text-[9px] text-zinc-600">
                      {safeClips.length} clips generated and optimized for publishing.
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-emerald-400/10 bg-emerald-500/10 px-4 py-2 text-[8px] font-black uppercase tracking-wider text-emerald-300">
                  <Check className="h-3 w-3" />
                  Ready to publish
                </div>
              </div>
            </div>

            {/* source + overview */}
            <div className="grid gap-5 xl:grid-cols-12">
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

            {/* stats */}
            <div className="mt-5">
              <PremiumStats
                project={project}
                clips={safeClips}
              />
            </div>

            {/* AI */}
            <div className="mt-5">
              <AIInsightPanel
                project={project}
                clips={safeClips}
              />
            </div>

            {/* clips */}
            <ClipsSection
              clips={safeClips}
            />
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

        {/* =====================================================
            FOOTER
        ====================================================== */}

        <footer className="mt-16 flex flex-col items-center justify-between gap-3 border-t border-white/[0.05] pt-6 sm:flex-row">
          <div className="flex items-center gap-2 text-[8px] font-semibold uppercase tracking-[0.16em] text-zinc-800">
            <Sparkles className="h-3 w-3 text-violet-500/50" />
            Powered by LumoClip AI
          </div>

          <div className="flex items-center gap-2 text-[8px] font-semibold uppercase tracking-[0.16em] text-zinc-800">
            <Zap className="h-3 w-3" />
            AI Content Repurposing
          </div>
        </footer>
      </div>
    </div>
  );
};

export default ProjectDetailView;