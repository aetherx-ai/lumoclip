import React, {
  useEffect,
  useMemo,
  useState,
} from "react";

import type { Project, User } from "../types";

import {
  ArrowUpRight,
  Check,
  ChevronDown,
  ChevronRight,
  Clock3,
  Film,
  FolderOpen,
  Link2,
  Loader2,
  MoreHorizontal,
  Play,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Video,
  WandSparkles,
  X,
  Zap,
} from "lucide-react";

/* =========================================================
   TYPES
========================================================= */

interface DashboardViewProps {
  user: User | null;
  projects: Project[];

  onSelectProject: (project: Project) => void;

  onOpenNewProject: (url?: string) => void;

  onProcessYouTube: (url: string) => Promise<unknown>;

  onDeleteProject: (id: string) => void;

  onOpenPricing: () => void;
}

/* =========================================================
   EXTENDED PROJECT TYPE
========================================================= */

type ExtendedProject = Project & {
  thumbnail_url?: string | null;
  thumbnail?: string | null;
  thumbnailUrl?: string | null;

  video_url?: string | null;
  videoUrl?: string | null;

  file_url?: string | null;
  fileUrl?: string | null;

  source_url?: string | null;
  sourceUrl?: string | null;

  media_url?: string | null;
  mediaUrl?: string | null;

  input_url?: string | null;
  inputUrl?: string | null;

  url?: string | null;

  clip_count?: number | null;
  total_clips?: number | null;
  clips_count?: number | null;

  error?: string | null;
  error_message?: string | null;
  message?: string | null;
};

/* =========================================================
   HELPERS
========================================================= */

const cleanUrl = (value: string): string => {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  const markdownMatch = trimmed.match(
    /^\[.*?\]\((https?:\/\/[^)\s]+)\)$/i
  );

  if (markdownMatch?.[1]) {
    return markdownMatch[1].trim();
  }

  const embeddedUrlMatch = trimmed.match(
    /https?:\/\/[^\s)]+/i
  );

  if (embeddedUrlMatch?.[0]) {
    return embeddedUrlMatch[0].trim();
  }

  return trimmed;
};

const isValidYouTubeUrl = (value: string): boolean => {
  const url = cleanUrl(value);

  if (!url) {
    return false;
  }

  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    return (
      hostname === "youtube.com" ||
      hostname === "www.youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname === "youtu.be" ||
      hostname === "www.youtu.be"
    );
  } catch {
    return false;
  }
};

const formatDuration = (
  duration?: number | null
): string => {
  if (
    duration === undefined ||
    duration === null
  ) {
    return "--:--";
  }

  const value = Number(duration);

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return "--:--";
  }

  const totalSeconds = Math.round(value);

  const hours = Math.floor(
    totalSeconds / 3600
  );

  const minutes = Math.floor(
    (totalSeconds % 3600) / 60
  );

  const seconds = totalSeconds % 60;

  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");

  if (hours > 0) {
    return `${String(hours).padStart(
      2,
      "0"
    )}:${mm}:${ss}`;
  }

  return `${mm}:${ss}`;
};

const formatDate = (
  date?: string | null
): string => {
  if (!date) {
    return "Unknown date";
  }

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return "Unknown date";
  }

  return parsed.toLocaleDateString(
    undefined,
    {
      month: "short",
      day: "numeric",
      year: "numeric",
    }
  );
};

const getProjectStatus = (
  project: Project
): string => {
  return String(
    project.status ?? ""
  ).toLowerCase();
};

const getProgress = (
  project: Project
): number => {
  const value = Number(
    project.progress ?? 0
  );

  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.min(
    100,
    Math.max(0, Math.round(value))
  );
};

const getClipCount = (
  project: Project
): number => {
  const data =
    project as ExtendedProject;

  const value = Number(
    data.clip_count ??
      data.total_clips ??
      data.clips_count ??
      0
  );

  if (!Number.isFinite(value)) {
    return 0;
  }

  return Math.max(
    0,
    Math.round(value)
  );
};

/* =========================================================
   THUMBNAIL HELPERS
========================================================= */

const getThumbnail = (
  project: Project
): string => {
  const data =
    project as ExtendedProject;

  const values = [
    data.thumbnail_url,
    data.thumbnail,
    data.thumbnailUrl,
  ];

  for (const value of values) {
    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return "";
};

const getVideoSource = (
  project: Project
): string => {
  const data =
    project as ExtendedProject;

  const values = [
    data.video_url,
    data.videoUrl,
    data.file_url,
    data.fileUrl,
    data.media_url,
    data.mediaUrl,
    data.source_url,
    data.sourceUrl,
    data.input_url,
    data.inputUrl,
    data.url,
  ];

  for (const value of values) {
    if (
      typeof value === "string" &&
      value.trim()
    ) {
      return value.trim();
    }
  }

  return "";
};

const generateVideoThumbnail = (
  videoSource: string
): Promise<string> => {
  return new Promise(
    (resolve, reject) => {
      if (!videoSource) {
        reject(
          new Error(
            "Video source is empty."
          )
        );
        return;
      }

      const video =
        document.createElement("video");

      const canvas =
        document.createElement("canvas");

      let finished = false;

      const cleanup = () => {
        video.pause();

        video.removeAttribute("src");

        video.load();

        video.onloadedmetadata = null;
        video.onloadeddata = null;
        video.onseeked = null;
        video.onerror = null;
      };

      const fail = (
        error: Error
      ) => {
        if (finished) {
          return;
        }

        finished = true;

        cleanup();

        reject(error);
      };

      const capture = () => {
        if (finished) {
          return;
        }

        try {
          const width =
            video.videoWidth || 640;

          const height =
            video.videoHeight || 360;

          canvas.width = width;
          canvas.height = height;

          const context =
            canvas.getContext("2d");

          if (!context) {
            fail(
              new Error(
                "Canvas is not supported."
              )
            );
            return;
          }

          context.drawImage(
            video,
            0,
            0,
            width,
            height
          );

          const image =
            canvas.toDataURL(
              "image/jpeg",
              0.82
            );

          finished = true;

          cleanup();

          resolve(image);
        } catch (error) {
          fail(
            error instanceof Error
              ? error
              : new Error(
                  "Thumbnail generation failed."
                )
          );
        }
      };

      video.muted = true;
      video.playsInline = true;
      video.preload = "metadata";

      try {
        video.crossOrigin = "anonymous";
      } catch {
        // Ignore.
      }

      video.onloadedmetadata = () => {
        try {
          const duration =
            Number(video.duration);

          if (
            Number.isFinite(duration) &&
            duration > 0
          ) {
            video.currentTime = Math.min(
              0.5,
              Math.max(
                0.1,
                duration * 0.02
              )
            );
          } else {
            capture();
          }
        } catch {
          capture();
        }
      };

      video.onloadeddata = () => {
        if (
          video.currentTime === 0
        ) {
          try {
            video.currentTime = 0.1;
          } catch {
            capture();
          }
        }
      };

      video.onseeked = () => {
        capture();
      };

      video.onerror = () => {
        fail(
          new Error(
            "Video could not be loaded."
          )
        );
      };

      video.src = videoSource;
      video.load();
    }
  );
};

/* =========================================================
   STAT CARD
========================================================= */

interface StatCardProps {
  label: string;
  value: string | number;
  meta: string;
  icon: React.ReactNode;
  accent?:
    | "default"
    | "violet"
    | "emerald"
    | "amber";
  onClick?: () => void;
}

const StatCard: React.FC<
  StatCardProps
> = ({
  label,
  value,
  meta,
  icon,
  accent = "default",
  onClick,
}) => {
  const styles = {
    default: {
      border:
        "border-white/[0.065] hover:border-white/[0.12]",
      icon:
        "bg-white/[0.045] text-zinc-400",
      glow: "",
    },

    violet: {
      border:
        "border-violet-500/15 hover:border-violet-500/30",
      icon:
        "bg-violet-500/10 text-violet-400",
      glow:
        "bg-violet-500/[0.07]",
    },

    emerald: {
      border:
        "border-emerald-500/10 hover:border-emerald-500/20",
      icon:
        "bg-emerald-500/10 text-emerald-400",
      glow:
        "bg-emerald-500/[0.035]",
    },

    amber: {
      border:
        "border-amber-500/10 hover:border-amber-500/20",
      icon:
        "bg-amber-500/10 text-amber-400",
      glow:
        "bg-amber-500/[0.035]",
    },
  };

  const style =
    styles[accent];

  const Component = onClick
    ? "button"
    : "div";

  return (
    <Component
      type={
        onClick
          ? "button"
          : undefined
      }
      onClick={onClick}
      className={`
        group
        relative
        overflow-hidden
        rounded-[22px]
        border
        ${style.border}
        bg-[#0a0a0e]
        p-5
        text-left
        transition-all
        duration-300
        hover:-translate-y-1
        hover:bg-[#0d0d12]
        ${
          onClick
            ? "cursor-pointer"
            : ""
        }
      `}
    >
      {style.glow && (
        <div
          className={`
            pointer-events-none
            absolute
            -right-12
            -top-12
            h-32
            w-32
            rounded-full
            ${style.glow}
            blur-[55px]
          `}
        />
      )}

      <div className="relative flex items-start justify-between">
        <div
          className={`
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-xl
            ${style.icon}
          `}
        >
          {icon}
        </div>

        {onClick && (
          <ChevronRight
            className="
              h-4
              w-4
              text-zinc-700
              transition
              group-hover:translate-x-1
              group-hover:text-violet-400
            "
          />
        )}
      </div>

      <div className="relative mt-5">
        <span
          className="
            text-[28px]
            font-black
            tracking-[-0.05em]
            text-white
          "
        >
          {value}
        </span>

        <p
          className="
            mt-1
            text-[10px]
            font-bold
            uppercase
            tracking-[0.14em]
            text-zinc-600
          "
        >
          {label}
        </p>

        <p
          className="
            mt-3
            text-[10px]
            font-medium
            text-zinc-700
          "
        >
          {meta}
        </p>
      </div>
    </Component>
  );
};

/* =========================================================
   PROJECT CARD
========================================================= */

interface ProjectCardProps {
  project: Project;

  onSelectProject: (
    project: Project
  ) => void;

  onDeleteProject: (
    id: string
  ) => void;
}

const ProjectCard: React.FC<
  ProjectCardProps
> = ({
  project,
  onSelectProject,
  onDeleteProject,
}) => {
  const status =
    getProjectStatus(project);

  const processing =
    status === "processing";

  const completed =
    status === "completed" ||
    status === "complete" ||
    status === "ready";

  const failed =
    status === "failed" ||
    status === "error";

  const existingThumbnail =
    getThumbnail(project);

  const videoSource =
    getVideoSource(project);

  const [
    generatedThumbnail,
    setGeneratedThumbnail,
  ] = useState("");

  const [
    thumbnailLoading,
    setThumbnailLoading,
  ] = useState(false);

  const [
    imageError,
    setImageError,
  ] = useState(false);

  useEffect(() => {
    let cancelled = false;

    setImageError(false);

    if (
      existingThumbnail ||
      !videoSource
    ) {
      setThumbnailLoading(false);
      return;
    }

    if (
      videoSource
        .toLowerCase()
        .startsWith("data:image/")
    ) {
      return;
    }

    setThumbnailLoading(true);

    generateVideoThumbnail(
      videoSource
    )
      .then((thumbnail) => {
        if (!cancelled) {
          setGeneratedThumbnail(
            thumbnail
          );
        }
      })
      .catch(() => {
        if (!cancelled) {
          setGeneratedThumbnail("");
        }
      })
      .finally(() => {
        if (!cancelled) {
          setThumbnailLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    existingThumbnail,
    videoSource,
  ]);

  const thumbnail =
    !imageError
      ? existingThumbnail ||
        generatedThumbnail
      : "";

  const clips =
    getClipCount(project);

  const progress =
    getProgress(project);

  const sourceType =
    String(
      project.source_type ||
        "VIDEO"
    ).toUpperCase();

  const errorMessage =
    (project as ExtendedProject)
      .error_message ||
    (project as ExtendedProject)
      .error ||
    (project as ExtendedProject)
      .message ||
    project.current_step ||
    "AI could not process this project.";

  return (
    <article
      className="
        group
        relative
        overflow-hidden
        rounded-[24px]
        border
        border-white/[0.065]
        bg-[#0a0a0e]
        shadow-[0_20px_70px_rgba(0,0,0,0.24)]
        transition-all
        duration-500
        hover:-translate-y-1
        hover:border-violet-500/25
        hover:shadow-[0_30px_90px_rgba(124,58,237,0.12)]
      "
    >
      {/* =====================================================
          MEDIA
      ===================================================== */}

      <button
        type="button"
        onClick={() =>
          onSelectProject(project)
        }
        className="
          relative
          block
          w-full
          cursor-pointer
          text-left
        "
      >
        <div
          className="
            relative
            aspect-video
            overflow-hidden
            bg-[#111116]
          "
        >
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={
                project.name ||
                "Project thumbnail"
              }
              loading="lazy"
              className="
                h-full
                w-full
                object-cover
                transition-transform
                duration-700
                ease-out
                group-hover:scale-[1.06]
              "
              onError={() => {
                setImageError(true);
              }}
            />
          ) : (
            <div
              className="
                relative
                flex
                h-full
                w-full
                items-center
                justify-center
                overflow-hidden
                bg-[radial-gradient(circle_at_20%_15%,rgba(139,92,246,0.28),transparent_32%),radial-gradient(circle_at_85%_85%,rgba(79,70,229,0.18),transparent_38%),linear-gradient(135deg,#17131f,#09090c)]
              "
            >
              <div
                className="
                  absolute
                  -left-16
                  -top-16
                  h-40
                  w-40
                  rounded-full
                  bg-violet-500/10
                  blur-2xl
                "
              />

              <div
                className="
                  absolute
                  -bottom-20
                  -right-10
                  h-44
                  w-44
                  rounded-full
                  bg-indigo-500/10
                  blur-2xl
                "
              />

              <div
                className="
                  relative
                  flex
                  h-[68px]
                  w-[68px]
                  items-center
                  justify-center
                  rounded-[20px]
                  border
                  border-white/[0.09]
                  bg-white/[0.045]
                  shadow-[0_20px_60px_rgba(0,0,0,0.45)]
                  backdrop-blur-xl
                "
              >
                {thumbnailLoading ? (
                  <Loader2
                    className="
                      h-7
                      w-7
                      animate-spin
                      text-violet-400
                    "
                  />
                ) : (
                  <Video
                    className="
                      h-7
                      w-7
                      text-violet-400
                    "
                  />
                )}
              </div>

              <span
                className="
                  absolute
                  bottom-4
                  left-1/2
                  -translate-x-1/2
                  whitespace-nowrap
                  text-[8px]
                  font-bold
                  uppercase
                  tracking-[0.16em]
                  text-zinc-600
                "
              >
                {thumbnailLoading
                  ? "Generating preview"
                  : "Video preview"}
              </span>
            </div>
          )}

          {/* Image overlay */}

          <div
            className="
              pointer-events-none
              absolute
              inset-0
              bg-gradient-to-t
              from-black/90
              via-black/15
              to-black/10
            "
          />

          <div
            className="
              pointer-events-none
              absolute
              inset-0
              bg-gradient-to-br
              from-violet-500/[0.04]
              to-transparent
              opacity-0
              transition-opacity
              duration-500
              group-hover:opacity-100
            "
          />

          {/* =================================================
              TOP BADGES
          ================================================= */}

          <div
            className="
              absolute
              left-3.5
              right-3.5
              top-3.5
              flex
              items-start
              justify-between
              gap-2
            "
          >
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="
                  rounded-lg
                  border
                  border-white/10
                  bg-black/65
                  px-2.5
                  py-1.5
                  text-[8px]
                  font-black
                  uppercase
                  tracking-[0.13em]
                  text-white
                  backdrop-blur-xl
                "
              >
                {sourceType}
              </span>

              {completed && (
                <span
                  className="
                    flex
                    items-center
                    gap-1
                    rounded-lg
                    border
                    border-emerald-400/20
                    bg-emerald-400
                    px-2
                    py-1.5
                    text-[8px]
                    font-black
                    tracking-wide
                    text-black
                    shadow-[0_5px_20px_rgba(16,185,129,0.18)]
                  "
                >
                  <Check className="h-3 w-3" />
                  READY
                </span>
              )}

              {processing && (
                <span
                  className="
                    flex
                    items-center
                    gap-1.5
                    rounded-lg
                    border
                    border-violet-400/20
                    bg-violet-600/90
                    px-2.5
                    py-1.5
                    text-[8px]
                    font-black
                    text-white
                    shadow-[0_8px_25px_rgba(124,58,237,0.3)]
                    backdrop-blur-xl
                  "
                >
                  <Loader2
                    className="
                      h-3
                      w-3
                      animate-spin
                    "
                  />
                  AI WORKING
                </span>
              )}

              {failed && (
                <span
                  className="
                    flex
                    items-center
                    gap-1
                    rounded-lg
                    border
                    border-red-400/20
                    bg-red-500
                    px-2.5
                    py-1.5
                    text-[8px]
                    font-black
                    text-white
                    shadow-[0_8px_25px_rgba(239,68,68,0.2)]
                  "
                >
                  <X className="h-3 w-3" />
                  FAILED
                </span>
              )}
            </div>

            {clips > 0 && (
              <span
                className="
                  shrink-0
                  rounded-lg
                  border
                  border-white/10
                  bg-black/60
                  px-2
                  py-1.5
                  text-[8px]
                  font-bold
                  text-zinc-300
                  backdrop-blur-xl
                "
              >
                {clips}{" "}
                {clips === 1
                  ? "clip"
                  : "clips"}
              </span>
            )}
          </div>

          {/* =================================================
              PLAY BUTTON
          ================================================= */}

          {!processing && (
            <div
              className="
                pointer-events-none
                absolute
                inset-0
                flex
                items-center
                justify-center
                opacity-0
                transition-all
                duration-300
                group-hover:opacity-100
              "
            >
              <div
                className="
                  flex
                  h-14
                  w-14
                  items-center
                  justify-center
                  rounded-full
                  border
                  border-white/20
                  bg-black/60
                  text-white
                  shadow-[0_20px_70px_rgba(0,0,0,0.65)]
                  backdrop-blur-xl
                  transition-transform
                  duration-300
                  group-hover:scale-110
                "
              >
                <Play
                  className="
                    ml-1
                    h-5
                    w-5
                    fill-white
                  "
                />
              </div>
            </div>
          )}

          {/* =================================================
              BOTTOM MEDIA INFO
          ================================================= */}

          <div
            className="
              absolute
              bottom-3.5
              left-3.5
              right-3.5
              flex
              items-end
              justify-between
              gap-3
            "
          >
            {processing ? (
              <div>
                <div
                  className="
                    flex
                    items-end
                    gap-2
                  "
                >
                  <span
                    className="
                      text-2xl
                      font-black
                      tracking-tight
                      text-white
                    "
                  >
                    {progress}%
                  </span>

                  <span
                    className="
                      mb-1
                      text-[8px]
                      font-bold
                      uppercase
                      tracking-[0.14em]
                      text-zinc-400
                    "
                  >
                    processing
                  </span>
                </div>
              </div>
            ) : (
              <span
                className="
                  rounded-lg
                  border
                  border-white/10
                  bg-black/65
                  px-2.5
                  py-1.5
                  font-mono
                  text-[9px]
                  font-medium
                  text-white
                  backdrop-blur-xl
                "
              >
                {formatDuration(
                  project.duration
                )}
              </span>
            )}

            {completed && (
              <span
                className="
                  flex
                  items-center
                  gap-1.5
                  rounded-lg
                  border
                  border-white/10
                  bg-black/60
                  px-2.5
                  py-1.5
                  text-[8px]
                  font-bold
                  text-zinc-300
                  backdrop-blur-xl
                "
              >
                <Film className="h-3 w-3 text-violet-400" />

                {clips} generated
              </span>
            )}
          </div>
        </div>
      </button>

      {/* =====================================================
          CARD CONTENT
      ===================================================== */}

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <button
            type="button"
            onClick={() =>
              onSelectProject(project)
            }
            className="
              min-w-0
              flex-1
              text-left
            "
          >
            <h3
              className="
                line-clamp-1
                text-[14px]
                font-bold
                tracking-tight
                text-white
                transition
                group-hover:text-violet-200
              "
            >
              {project.name ||
                "Untitled Project"}
            </h3>

            <div
              className="
                mt-2
                flex
                items-center
                gap-2
              "
            >
              <Clock3
                className="
                  h-3
                  w-3
                  text-zinc-700
                "
              />

              <p
                className="
                  text-[9px]
                  font-medium
                  text-zinc-600
                "
              >
                {formatDate(
                  project.created_at
                )}
              </p>
            </div>
          </button>

          <button
            type="button"
            aria-label="Project options"
            onClick={(event) => {
              event.stopPropagation();
            }}
            className="
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-lg
              border
              border-transparent
              text-zinc-600
              transition
              hover:border-white/[0.07]
              hover:bg-white/[0.04]
              hover:text-white
            "
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
        </div>

        {/* =================================================
            COMPLETED
        ================================================= */}

        {completed && (
          <div
            className="
              mt-5
              flex
              items-center
              justify-between
              rounded-xl
              border
              border-white/[0.045]
              bg-white/[0.018]
              px-3
              py-2.5
            "
          >
            <div
              className="
                flex
                items-center
                gap-2.5
              "
            >
              <div
                className="
                  flex
                  h-7
                  w-7
                  items-center
                  justify-center
                  rounded-lg
                  bg-violet-500/10
                "
              >
                <Film
                  className="
                    h-3.5
                    w-3.5
                    text-violet-400
                  "
                />
              </div>

              <div>
                <p
                  className="
                    text-[10px]
                    font-semibold
                    text-zinc-400
                  "
                >
                  Content pack ready
                </p>

                <p
                  className="
                    mt-0.5
                    text-[8px]
                    text-zinc-700
                  "
                >
                  {clips}{" "}
                  {clips === 1
                    ? "short"
                    : "shorts"}{" "}
                  generated
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();

                onSelectProject(
                  project
                );
              }}
              className="
                flex
                items-center
                gap-1
                text-[10px]
                font-bold
                text-violet-400
                transition
                hover:text-violet-300
              "
            >
              Open

              <ChevronRight
                className="
                  h-3.5
                  w-3.5
                  transition
                  group-hover:translate-x-1
                "
              />
            </button>
          </div>
        )}

        {/* =================================================
            PROCESSING
        ================================================= */}

        {processing && (
          <div className="mt-5">
            <div
              className="
                mb-2.5
                flex
                items-center
                justify-between
                gap-3
              "
            >
              <span
                className="
                  max-w-[72%]
                  truncate
                  text-[9px]
                  font-medium
                  text-zinc-500
                "
              >
                {project.current_step ||
                  "Analyzing your video..."}
              </span>

              <span
                className="
                  text-[10px]
                  font-black
                  text-violet-300
                "
              >
                {progress}%
              </span>
            </div>

            <div
              className="
                relative
                h-1.5
                overflow-hidden
                rounded-full
                bg-white/[0.055]
              "
            >
              <div
                className="
                  relative
                  h-full
                  rounded-full
                  bg-gradient-to-r
                  from-violet-600
                  via-purple-500
                  to-indigo-400
                  shadow-[0_0_20px_rgba(139,92,246,0.5)]
                  transition-all
                  duration-700
                "
                style={{
                  width: `${progress}%`,
                }}
              >
                <div
                  className="
                    absolute
                    inset-0
                    animate-pulse
                    bg-white/20
                  "
                />
              </div>
            </div>
          </div>
        )}

        {/* =================================================
            FAILED
        ================================================= */}

        {failed && (
          <div
            className="
              mt-5
              overflow-hidden
              rounded-xl
              border
              border-red-500/10
              bg-red-500/[0.035]
            "
          >
            <div
              className="
                flex
                items-start
                gap-2.5
                px-3
                py-3
              "
            >
              <div
                className="
                  mt-0.5
                  flex
                  h-6
                  w-6
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  bg-red-500/10
                "
              >
                <X
                  className="
                    h-3
                    w-3
                    text-red-400
                  "
                />
              </div>

              <div className="min-w-0">
                <p
                  className="
                    text-[10px]
                    font-bold
                    text-red-400
                  "
                >
                  Processing failed
                </p>

                <p
                  className="
                    mt-1
                    line-clamp-2
                    text-[9px]
                    leading-5
                    text-red-400/60
                  "
                >
                  {errorMessage}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* =====================================================
          FOOTER
      ===================================================== */}

      <div
        className="
          flex
          items-center
          justify-between
          border-t
          border-white/[0.045]
          bg-white/[0.012]
          px-5
          py-3
        "
      >
        <div
          className="
            flex
            items-center
            gap-1.5
          "
        >
          <Sparkles
            className="
              h-3
              w-3
              text-violet-500/70
            "
          />

          <span
            className="
              text-[8px]
              font-bold
              uppercase
              tracking-[0.14em]
              text-zinc-700
            "
          >
            LumoClip AI
          </span>
        </div>

        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();

            onDeleteProject(
              project.id
            );
          }}
          className="
            flex
            items-center
            gap-1.5
            rounded-lg
            px-2
            py-1.5
            text-[9px]
            font-medium
            text-zinc-700
            transition
            hover:bg-red-500/[0.06]
            hover:text-red-400
          "
        >
          <Trash2 className="h-3 w-3" />

          Delete
        </button>
      </div>
    </article>
  );
};

/* =========================================================
   MAIN DASHBOARD
========================================================= */

export const DashboardView: React.FC<
  DashboardViewProps
> = ({
  user,
  projects,
  onSelectProject,
  onOpenNewProject,
  onProcessYouTube,
  onDeleteProject,
  onOpenPricing,
}) => {
  const [
    youtubeUrl,
    setYoutubeUrl,
  ] = useState("");

  const [
    isGenerating,
    setIsGenerating,
  ] = useState(false);

  const [
    searchQuery,
    setSearchQuery,
  ] = useState("");

  const [
    projectFilter,
    setProjectFilter,
  ] = useState<
    "all" | "completed" | "processing" | "failed"
  >("all");

  const safeProjects =
    Array.isArray(projects)
      ? projects
      : [];

  const urlValid =
    youtubeUrl.trim().length > 0
      ? isValidYouTubeUrl(
          youtubeUrl
        )
      : false;

  /* =======================================================
     TODAY
  ======================================================= */

  const todayProjects =
    useMemo(() => {
      const today = new Date();

      return safeProjects.filter(
        (project) => {
          if (
            !project.created_at
          ) {
            return false;
          }

          const created =
            new Date(
              project.created_at
            );

          return (
            created.getFullYear() ===
              today.getFullYear() &&
            created.getMonth() ===
              today.getMonth() &&
            created.getDate() ===
              today.getDate()
          );
        }
      );
    }, [safeProjects]);

  /* =======================================================
     TOTAL CLIPS
  ======================================================= */

  const totalClips =
    useMemo(() => {
      return safeProjects.reduce(
        (total, project) =>
          total +
          getClipCount(project),
        0
      );
    }, [safeProjects]);

  /* =======================================================
     PROCESSING
  ======================================================= */

  const processingCount =
    useMemo(() => {
      return safeProjects.filter(
        (project) =>
          getProjectStatus(
            project
          ) === "processing"
      ).length;
    }, [safeProjects]);

  /* =======================================================
     COMPLETED
  ======================================================= */

  const completedCount =
    useMemo(() => {
      return safeProjects.filter(
        (project) => {
          const status =
            getProjectStatus(
              project
            );

          return (
            status === "completed" ||
            status === "complete" ||
            status === "ready"
          );
        }
      ).length;
    }, [safeProjects]);

  /* =======================================================
     FAILED
  ======================================================= */

  const failedCount =
    useMemo(() => {
      return safeProjects.filter(
        (project) => {
          const status =
            getProjectStatus(
              project
            );

          return (
            status === "failed" ||
            status === "error"
          );
        }
      ).length;
    }, [safeProjects]);

  /* =======================================================
     FILTERED PROJECTS
  ======================================================= */

  const filteredProjects =
    useMemo(() => {
      const query =
        searchQuery
          .trim()
          .toLowerCase();

      return safeProjects.filter(
        (project) => {
          const status =
            getProjectStatus(
              project
            );

          const matchesFilter =
            projectFilter ===
              "all" ||
            (projectFilter ===
              "completed" &&
              (status ===
                "completed" ||
                status ===
                  "complete" ||
                status ===
                  "ready")) ||
            (projectFilter ===
              "processing" &&
              status ===
                "processing") ||
            (projectFilter ===
              "failed" &&
              (status ===
                "failed" ||
                status ===
                  "error"));

          const name =
            String(
              project.name || ""
            ).toLowerCase();

          const matchesSearch =
            !query ||
            name.includes(query);

          return (
            matchesFilter &&
            matchesSearch
          );
        }
      );
    }, [
      safeProjects,
      projectFilter,
      searchQuery,
    ]);

  /* =======================================================
     GENERATE
  ======================================================= */

  const handleGenerate =
    async () => {
      const cleanedUrl =
        cleanUrl(youtubeUrl);

      if (
        !cleanedUrl ||
        isGenerating
      ) {
        return;
      }

      if (
        !isValidYouTubeUrl(
          cleanedUrl
        )
      ) {
        return;
      }

      try {
        setIsGenerating(true);

        await onProcessYouTube(
          cleanedUrl
        );

        setYoutubeUrl("");
      } catch (error) {
        console.error(
          "YouTube processing failed:",
          error
        );
      } finally {
        setIsGenerating(false);
      }
    };

  /* =======================================================
     ENTER
  ======================================================= */

  const handleUrlKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (
      event.key === "Enter" &&
      !isGenerating &&
      urlValid
    ) {
      event.preventDefault();

      void handleGenerate();
    }
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="relative min-h-full">
      {/* =====================================================
          BACKGROUND
      ===================================================== */}

      <div
        className="
          pointer-events-none
          absolute
          left-1/2
          top-[-180px]
          h-[500px]
          w-[850px]
          -translate-x-1/2
          rounded-full
          bg-violet-600/[0.035]
          blur-[70px]
        "
      />

      <div
        className="
          pointer-events-none
          fixed
          bottom-[-200px]
          right-[-150px]
          h-[450px]
          w-[450px]
          rounded-full
          bg-indigo-600/[0.025]
          blur-[70px]
        "
      />

      {/* =====================================================
          HEADER
      ===================================================== */}

      <header className="relative mb-8">
        <div
          className="
            flex
            flex-col
            justify-between
            gap-6
            md:flex-row
            md:items-end
          "
        >
          <div>
            <div
              className="
                mb-3
                flex
                items-center
                gap-2
              "
            >
              <span className="relative flex h-2 w-2">
                <span
                  className="
                    absolute
                    inline-flex
                    h-full
                    w-full
                    animate-ping
                    rounded-full
                    bg-emerald-400
                    opacity-60
                  "
                />

                <span
                  className="
                    relative
                    inline-flex
                    h-2
                    w-2
                    rounded-full
                    bg-emerald-400
                  "
                />
              </span>

              <span
                className="
                  text-[9px]
                  font-black
                  uppercase
                  tracking-[0.24em]
                  text-zinc-600
                "
              >
                LumoClip Studio
              </span>
            </div>

            <h1
              className="
                text-3xl
                font-black
                tracking-[-0.045em]
                text-white
                sm:text-4xl
              "
            >
              Welcome back,{" "}
              <span
                className="
                  bg-gradient-to-r
                  from-violet-400
                  via-purple-300
                  to-indigo-400
                  bg-clip-text
                  text-transparent
                "
              >
                {user?.name ||
                  "Creator"}
              </span>
            </h1>

            <p
              className="
                mt-2
                max-w-lg
                text-sm
                leading-6
                text-zinc-600
              "
            >
              Your AI-powered
              content workspace.
              Create more. Edit
              less.
            </p>
          </div>

          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <button
              type="button"
              onClick={
                onOpenPricing
              }
              className="
                group
                flex
                items-center
                gap-2.5
                rounded-xl
                border
                border-violet-500/20
                bg-violet-500/[0.055]
                px-4
                py-2.5
                text-xs
                font-bold
                text-zinc-300
                transition-all
                hover:border-violet-500/40
                hover:bg-violet-500/10
              "
            >
              <span
                className="
                  flex
                  h-6
                  w-6
                  items-center
                  justify-center
                  rounded-lg
                  bg-violet-500/10
                "
              >
                <Zap
                  className="
                    h-3.5
                    w-3.5
                    text-violet-400
                  "
                />
              </span>

              <span>
                {user?.credits ??
                  0}{" "}
                credits
              </span>

              <ChevronRight
                className="
                  h-3
                  w-3
                  text-zinc-600
                  transition
                  group-hover:translate-x-0.5
                "
              />
            </button>

            <button
              type="button"
              onClick={() =>
                onOpenNewProject()
              }
              className="
                flex
                items-center
                gap-2
                rounded-xl
                bg-white
                px-4
                py-2.5
                text-xs
                font-black
                text-black
                shadow-[0_8px_30px_rgba(255,255,255,0.04)]
                transition-all
                hover:bg-zinc-200
                active:scale-[0.98]
              "
            >
              <Plus className="h-4 w-4" />

              New project
            </button>
          </div>
        </div>
      </header>

      {/* =====================================================
          HERO
      ===================================================== */}

      <section
        className="
          relative
          mb-10
          overflow-hidden
          rounded-[30px]
          border
          border-white/[0.075]
          bg-[#09090d]
          shadow-[0_30px_110px_rgba(0,0,0,0.35)]
        "
      >
        <div
          className="
            pointer-events-none
            absolute
            -right-32
            -top-32
            h-[430px]
            w-[430px]
            rounded-full
            bg-violet-600/[0.12]
            blur-[70px]
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            -bottom-40
            left-1/4
            h-[320px]
            w-[450px]
            rounded-full
            bg-indigo-600/[0.07]
            blur-[70px]
          "
        />

        <div
          className="
            pointer-events-none
            absolute
            inset-0
            opacity-[0.035]
            [background-image:linear-gradient(rgba(255,255,255,.8)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.8)_1px,transparent_1px)]
            [background-size:40px_40px]
          "
        />

        <div
          className="
            absolute
            left-0
            right-0
            top-0
            h-px
            bg-gradient-to-r
            from-transparent
            via-violet-500/40
            to-transparent
          "
        />

        <div
          className="
            relative
            px-5
            py-12
            sm:px-10
            sm:py-16
            lg:py-20
          "
        >
          <div className="mx-auto max-w-3xl text-center">
            <div
              className="
                relative
                mx-auto
                mb-6
                flex
                h-16
                w-16
                items-center
                justify-center
                rounded-[20px]
                border
                border-violet-500/20
                bg-violet-500/[0.08]
                shadow-[0_0_60px_rgba(124,58,237,0.12)]
              "
            >
              <div
                className="
                  absolute
                  inset-0
                  rounded-[20px]
                  bg-violet-500/10
                  blur-xl
                "
              />

              <WandSparkles
                className="
                  relative
                  h-7
                  w-7
                  text-violet-400
                "
              />
            </div>

            <div
              className="
                mx-auto
                mb-5
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-violet-500/20
                bg-violet-500/[0.06]
                px-3
                py-1.5
              "
            >
              <Sparkles
                className="
                  h-3
                  w-3
                  text-violet-400
                "
              />

              <span
                className="
                  text-[8px]
                  font-black
                  uppercase
                  tracking-[0.2em]
                  text-violet-300
                "
              >
                AI content engine
              </span>
            </div>

            <h2
              className="
                text-3xl
                font-black
                leading-[1.05]
                tracking-[-0.055em]
                text-white
                sm:text-5xl
              "
            >
              Turn long videos into
              <br />

              <span
                className="
                  bg-gradient-to-r
                  from-violet-400
                  via-purple-300
                  to-indigo-400
                  bg-clip-text
                  text-transparent
                "
              >
                short-form content.
              </span>
            </h2>

            <p
              className="
                mx-auto
                mt-5
                max-w-2xl
                text-sm
                leading-6
                text-zinc-500
                sm:text-[15px]
              "
            >
              Paste a YouTube video
              and let LumoClip find
              the strongest moments,
              create clips, captions,
              titles and hashtags
              automatically.
            </p>

            {/* =================================================
                URL INPUT
            ================================================= */}

            <div
              className={`
                mx-auto
                mt-9
                max-w-2xl
                rounded-[21px]
                border
                bg-black/45
                p-1.5
                shadow-[0_20px_80px_rgba(0,0,0,0.4)]
                backdrop-blur-xl
                transition-all
                ${
                  youtubeUrl &&
                  !urlValid
                    ? "border-red-500/20"
                    : "border-white/[0.08] focus-within:border-violet-500/40 focus-within:shadow-[0_0_60px_rgba(124,58,237,0.08)]"
                }
              `}
            >
              <div
                className="
                  flex
                  flex-col
                  gap-1.5
                  sm:flex-row
                "
              >
                <div
                  className="
                    flex
                    min-w-0
                    flex-1
                    items-center
                  "
                >
                  <div
                    className={`
                      ml-2
                      flex
                      h-10
                      w-10
                      shrink-0
                      items-center
                      justify-center
                      rounded-xl
                      ${
                        youtubeUrl &&
                        !urlValid
                          ? "bg-red-500/10"
                          : "bg-white/[0.04]"
                      }
                    `}
                  >
                    <Link2
                      className={`
                        h-4
                        w-4
                        ${
                          youtubeUrl &&
                          !urlValid
                            ? "text-red-400"
                            : "text-zinc-500"
                        }
                      `}
                    />
                  </div>

                  <input
                    type="url"
                    value={
                      youtubeUrl
                    }
                    onChange={(
                      event
                    ) =>
                      setYoutubeUrl(
                        event.target
                          .value
                      )
                    }
                    onKeyDown={
                      handleUrlKeyDown
                    }
                    placeholder="Paste a YouTube video URL..."
                    className="
                      min-w-0
                      flex-1
                      bg-transparent
                      px-3
                      py-3.5
                      text-sm
                      text-white
                      outline-none
                      placeholder:text-zinc-700
                    "
                  />

                  {youtubeUrl &&
                    urlValid && (
                      <Check
                        className="
                          mr-3
                          h-4
                          w-4
                          text-emerald-400
                        "
                      />
                    )}
                </div>

                <button
                  type="button"
                  onClick={() => {
                    void handleGenerate();
                  }}
                  disabled={
                    isGenerating ||
                    !urlValid
                  }
                  className="
                    flex
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-gradient-to-r
                    from-violet-600
                    to-indigo-500
                    px-7
                    py-3.5
                    text-sm
                    font-black
                    text-white
                    shadow-[0_10px_35px_rgba(124,58,237,0.28)]
                    transition-all
                    hover:from-violet-500
                    hover:to-indigo-400
                    active:scale-[0.98]
                    disabled:cursor-not-allowed
                    disabled:opacity-35
                  "
                >
                  {isGenerating ? (
                    <>
                      <Loader2
                        className="
                          h-4
                          w-4
                          animate-spin
                        "
                      />

                      Starting...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />

                      Generate clips
                    </>
                  )}
                </button>
              </div>
            </div>

            {youtubeUrl &&
              !urlValid && (
                <p
                  className="
                    mx-auto
                    mt-2.5
                    max-w-2xl
                    text-left
                    text-[9px]
                    font-medium
                    text-red-400/80
                  "
                >
                  Enter a valid
                  YouTube video URL.
                </p>
              )}

            <button
              type="button"
              onClick={() =>
                onOpenNewProject()
              }
              className="
                mx-auto
                mt-5
                flex
                items-center
                gap-2
                text-xs
                font-medium
                text-zinc-600
                transition
                hover:text-zinc-300
              "
            >
              <Upload className="h-3.5 w-3.5" />

              Or upload an MP4 instead

              <ArrowUpRight className="h-3 w-3" />
            </button>

            <div
              className="
                mt-8
                flex
                flex-wrap
                items-center
                justify-center
                gap-x-6
                gap-y-3
              "
            >
              {[
                "AI moment detection",
                "Auto captions",
                "9:16 clips",
                "AI titles",
                "Ready to export",
              ].map(
                (feature) => (
                  <span
                    key={feature}
                    className="
                      flex
                      items-center
                      gap-1.5
                      text-[9px]
                      font-medium
                      text-zinc-600
                    "
                  >
                    <Check
                      className="
                        h-3
                        w-3
                        text-emerald-500
                      "
                    />

                    {feature}
                  </span>
                )
              )}
            </div>
          </div>
        </div>
      </section>

      {/* =====================================================
          STATS
      ===================================================== */}

      <section
        className="
          mb-10
          grid
          grid-cols-2
          gap-3
          lg:grid-cols-4
        "
      >
        <StatCard
          label="Projects"
          value={
            safeProjects.length
          }
          meta={
            todayProjects.length >
            0
              ? `+${todayProjects.length} created today`
              : "No projects today"
          }
          icon={
            <FolderOpen className="h-4 w-4" />
          }
        />

        <StatCard
          label="Clips created"
          value={totalClips}
          meta="Across your workspace"
          icon={
            <Film className="h-4 w-4" />
          }
        />

        <StatCard
          label="Processing"
          value={
            processingCount
          }
          meta={
            processingCount > 0
              ? "AI jobs running now"
              : "Everything is idle"
          }
          icon={
            <Loader2
              className={`
                h-4
                w-4
                ${
                  processingCount >
                  0
                    ? "animate-spin"
                    : ""
                }
              `}
            />
          }
          accent={
            processingCount > 0
              ? "violet"
              : "default"
          }
        />

        <StatCard
          label="Credits available"
          value={
            user?.credits ?? 0
          }
          meta="Upgrade for more"
          icon={
            <Zap className="h-4 w-4" />
          }
          accent="violet"
          onClick={
            onOpenPricing
          }
        />
      </section>

      {/* =====================================================
          PROJECT HEADER
      ===================================================== */}

      <section>
        <div
          className="
            mb-5
            flex
            flex-col
            gap-5
            xl:flex-row
            xl:items-end
            xl:justify-between
          "
        >
          <div>
            <div
              className="
                flex
                flex-wrap
                items-center
                gap-2.5
              "
            >
              <h2
                className="
                  text-xl
                  font-black
                  tracking-tight
                  text-white
                "
              >
                Recent projects
              </h2>

              {processingCount >
                0 && (
                <span
                  className="
                    flex
                    items-center
                    gap-1.5
                    rounded-full
                    border
                    border-violet-500/20
                    bg-violet-500/10
                    px-2.5
                    py-1
                    text-[8px]
                    font-black
                    uppercase
                    tracking-wider
                    text-violet-300
                  "
                >
                  <span
                    className="
                      h-1.5
                      w-1.5
                      animate-pulse
                      rounded-full
                      bg-violet-400
                    "
                  />

                  {processingCount}{" "}
                  active
                </span>
              )}
            </div>

            <p
              className="
                mt-1.5
                text-xs
                text-zinc-600
              "
            >
              Your latest content
              repurposing projects.
            </p>
          </div>

          <div
            className="
              flex
              flex-col
              gap-3
              sm:flex-row
              sm:items-center
            "
          >
            {/* Search */}

            <div
              className="
                flex
                h-10
                min-w-[230px]
                items-center
                rounded-xl
                border
                border-white/[0.07]
                bg-[#0a0a0e]
                px-3
                transition
                focus-within:border-violet-500/30
              "
            >
              <Search
                className="
                  h-3.5
                  w-3.5
                  shrink-0
                  text-zinc-700
                "
              />

              <input
                type="text"
                value={
                  searchQuery
                }
                onChange={(event) =>
                  setSearchQuery(
                    event.target
                      .value
                  )
                }
                placeholder="Search projects..."
                className="
                  min-w-0
                  flex-1
                  bg-transparent
                  px-2
                  text-[10px]
                  text-white
                  outline-none
                  placeholder:text-zinc-700
                "
              />

              {searchQuery && (
                <button
                  type="button"
                  onClick={() =>
                    setSearchQuery(
                      ""
                    )
                  }
                  className="
                    text-zinc-700
                    transition
                    hover:text-white
                  "
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Filter */}

            <div
              className="
                relative
                flex
                h-10
                items-center
                rounded-xl
                border
                border-white/[0.07]
                bg-[#0a0a0e]
              "
            >
              <select
                value={
                  projectFilter
                }
                onChange={(event) =>
                  setProjectFilter(
                    event.target
                      .value as
                      | "all"
                      | "completed"
                      | "processing"
                      | "failed"
                  )
                }
                className="
                  h-full
                  appearance-none
                  bg-transparent
                  px-3
                  pr-9
                  text-[10px]
                  font-bold
                  text-zinc-400
                  outline-none
                "
              >
                <option value="all">
                  All projects
                </option>

                <option value="completed">
                  Completed
                </option>

                <option value="processing">
                  Processing
                </option>

                <option value="failed">
                  Failed
                </option>
              </select>

              <ChevronDown
                className="
                  pointer-events-none
                  absolute
                  right-3
                  h-3
                  w-3
                  text-zinc-700
                "
              />
            </div>
          </div>
        </div>

        {/* =================================================
            PROJECT SUMMARY
        ================================================= */}

        <div
          className="
            mb-6
            flex
            flex-wrap
            items-center
            justify-between
            gap-4
          "
        >
          <div
            className="
              flex
              items-center
              gap-5
            "
          >
            <div className="text-left">
              <p
                className="
                  text-sm
                  font-bold
                  text-white
                "
              >
                {todayProjects.length}
              </p>

              <p
                className="
                  text-[8px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-zinc-700
                "
              >
                Today
              </p>
            </div>

            <div
              className="
                h-7
                w-px
                bg-white/[0.06]
              "
            />

            <div className="text-left">
              <p
                className="
                  text-sm
                  font-bold
                  text-white
                "
              >
                {completedCount}
              </p>

              <p
                className="
                  text-[8px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-zinc-700
                "
              >
                Completed
              </p>
            </div>

            <div
              className="
                h-7
                w-px
                bg-white/[0.06]
              "
            />

            <div className="text-left">
              <p
                className="
                  text-sm
                  font-bold
                  text-white
                "
              >
                {failedCount}
              </p>

              <p
                className="
                  text-[8px]
                  font-bold
                  uppercase
                  tracking-wider
                  text-zinc-700
                "
              >
                Failed
              </p>
            </div>
          </div>

          <span
            className="
              text-[9px]
              font-medium
              text-zinc-700
            "
          >
            Showing{" "}
            {filteredProjects.length}{" "}
            of {safeProjects.length}{" "}
            projects
          </span>
        </div>

        {/* =================================================
            EMPTY
        ================================================= */}

        {safeProjects.length ===
        0 ? (
          <div
            className="
              relative
              overflow-hidden
              rounded-[28px]
              border
              border-dashed
              border-white/[0.08]
              bg-[#0a0a0e]
              px-6
              py-24
              text-center
            "
          >
            <div
              className="
                pointer-events-none
                absolute
                left-1/2
                top-0
                h-48
                w-96
                -translate-x-1/2
                rounded-full
                bg-violet-600/[0.07]
                blur-[70px]
              "
            />

            <div
              className="
                relative
                mx-auto
                flex
                h-16
                w-16
                items-center
                justify-center
                rounded-2xl
                border
                border-violet-500/15
                bg-violet-500/[0.06]
              "
            >
              <WandSparkles
                className="
                  h-7
                  w-7
                  text-violet-400
                "
              />
            </div>

            <h3
              className="
                relative
                mt-6
                text-xl
                font-black
                text-white
              "
            >
              Your workspace is
              empty
            </h3>

            <p
              className="
                relative
                mx-auto
                mt-2
                max-w-md
                text-sm
                leading-6
                text-zinc-600
              "
            >
              Drop in your first
              long-form video and
              let LumoClip discover
              the moments worth
              sharing.
            </p>

            <button
              type="button"
              onClick={() =>
                onOpenNewProject()
              }
              className="
                relative
                mt-7
                inline-flex
                items-center
                gap-2
                rounded-xl
                bg-white
                px-5
                py-3
                text-xs
                font-black
                text-black
                transition
                hover:bg-zinc-200
              "
            >
              <Plus className="h-4 w-4" />

              Create your first
              project
            </button>
          </div>
        ) : filteredProjects.length ===
          0 ? (
          <div
            className="
              rounded-[24px]
              border
              border-dashed
              border-white/[0.08]
              bg-[#0a0a0e]
              px-6
              py-20
              text-center
            "
          >
            <div
              className="
                mx-auto
                flex
                h-14
                w-14
                items-center
                justify-center
                rounded-2xl
                bg-white/[0.035]
              "
            >
              <Search
                className="
                  h-6
                  w-6
                  text-zinc-700
                "
              />
            </div>

            <h3
              className="
                mt-5
                text-lg
                font-black
                text-white
              "
            >
              No projects found
            </h3>

            <p
              className="
                mx-auto
                mt-2
                max-w-sm
                text-xs
                leading-5
                text-zinc-600
              "
            >
              Try another search or
              change the project
              filter.
            </p>

            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setProjectFilter(
                  "all"
                );
              }}
              className="
                mt-6
                rounded-xl
                border
                border-white/[0.08]
                bg-white/[0.035]
                px-4
                py-2.5
                text-[10px]
                font-bold
                text-zinc-400
                transition
                hover:bg-white/[0.06]
                hover:text-white
              "
            >
              Clear filters
            </button>
          </div>
        ) : (
          <div
            className="
              grid
              gap-5
              sm:grid-cols-2
              xl:grid-cols-3
            "
          >
            {filteredProjects.map(
              (project) => (
                <ProjectCard
                  key={
                    project.id
                  }
                  project={
                    project
                  }
                  onSelectProject={
                    onSelectProject
                  }
                  onDeleteProject={
                    onDeleteProject
                  }
                />
              )
            )}

            {/* =================================================
                CREATE CARD
            ================================================= */}

            <button
              type="button"
              onClick={() =>
                onOpenNewProject()
              }
              className="
                group
                relative
                flex
                min-h-[430px]
                flex-col
                items-center
                justify-center
                overflow-hidden
                rounded-[24px]
                border
                border-dashed
                border-white/[0.08]
                bg-[#0a0a0e]
                transition-all
                duration-500
                hover:border-violet-500/30
                hover:bg-violet-500/[0.025]
              "
            >
              <div
                className="
                  pointer-events-none
                  absolute
                  left-1/2
                  top-1/2
                  h-56
                  w-56
                  -translate-x-1/2
                  -translate-y-1/2
                  rounded-full
                  bg-violet-600/[0.07]
                  blur-[80px]
                  opacity-0
                  transition-opacity
                  duration-500
                  group-hover:opacity-100
                "
              />

              <div
                className="
                  relative
                  flex
                  h-16
                  w-16
                  items-center
                  justify-center
                  rounded-[20px]
                  border
                  border-white/[0.08]
                  bg-white/[0.03]
                  transition-all
                  duration-300
                  group-hover:scale-105
                  group-hover:border-violet-500/30
                  group-hover:bg-violet-500/10
                "
              >
                <Plus
                  className="
                    h-6
                    w-6
                    text-zinc-600
                    transition
                    group-hover:text-violet-400
                  "
                />
              </div>

              <span
                className="
                  relative
                  mt-5
                  text-xs
                  font-bold
                  text-zinc-500
                  transition
                  group-hover:text-white
                "
              >
                Create new project
              </span>

              <span
                className="
                  relative
                  mt-1.5
                  text-[9px]
                  text-zinc-700
                "
              >
                Upload video or
                paste a URL
              </span>
            </button>
          </div>
        )}
      </section>

      {/* =====================================================
          BOTTOM CTA
      ===================================================== */}

      {safeProjects.length >
        0 && (
        <section
          className="
            relative
            mt-10
            overflow-hidden
            rounded-[24px]
            border
            border-violet-500/10
            bg-gradient-to-r
            from-violet-500/[0.055]
            via-[#0b0b0f]
            to-indigo-500/[0.04]
            p-5
            sm:p-6
          "
        >
          <div
            className="
              pointer-events-none
              absolute
              -right-20
              -top-20
              h-48
              w-48
              rounded-full
              bg-violet-600/[0.08]
              blur-[70px]
            "
          />

          <div
            className="
              relative
              flex
              flex-col
              items-center
              justify-between
              gap-5
              sm:flex-row
            "
          >
            <div
              className="
                flex
                items-center
                gap-4
              "
            >
              <div
                className="
                  flex
                  h-11
                  w-11
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  border
                  border-violet-500/15
                  bg-violet-500/[0.08]
                "
              >
                <Sparkles
                  className="
                    h-5
                    w-5
                    text-violet-400
                  "
                />
              </div>

              <div>
                <p
                  className="
                    text-sm
                    font-bold
                    text-white
                  "
                >
                  Ready for another
                  one?
                </p>

                <p
                  className="
                    mt-1
                    text-[10px]
                    text-zinc-600
                  "
                >
                  Turn your next long
                  video into a complete
                  content pack.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                onOpenNewProject()
              }
              className="
                flex
                items-center
                gap-2
                rounded-xl
                bg-white
                px-5
                py-3
                text-xs
                font-black
                text-black
                transition
                hover:bg-zinc-200
                active:scale-[0.98]
              "
            >
              Create project

              <ArrowUpRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </section>
      )}
    </div>
  );
};

export default DashboardView;