import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowRight,
  Captions,
  Check,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  FileCheck2,
  Film,
  Link2,
  Loader2,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
  WandSparkles,
  X,
  Youtube,
  Zap,
} from "lucide-react";

import { supabase } from "../lib/supabase";

/* =========================================================
   TYPES
========================================================= */

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (data: unknown) => void;
  credits?: number;
  initialUrl?: string;
  initialTitle?: string;
  initialMode?: ProcessingMode;
}

type SourceType = "youtube" | "podcast" | "file";

type UploadStage =
  | "idle"
  | "preparing"
  | "uploading"
  | "finalizing"
  | "processing"
  | "complete"
  | "error";

interface UploadState {
  progress: number;
  stage: UploadStage;
  message: string;
}

interface ApiResponse {
  success?: boolean;
  error?: string;
  message?: string;
  [key: string]: unknown;
}

/* =========================================================
   CAPTION STYLE TYPES
========================================================= */

interface CaptionStyle {
  enabled: boolean;
  font: string;
  textColor: string;
  highlightColor: string;
  position: "bottom" | "center" | "top";
  uppercase: boolean;
  box: boolean;
  boxColor: string;
  animation: "pop" | "none";
}

// Must match ProcessingMode on the server (server.ts).
type ProcessingMode = "clips" | "full_video_caption";

/* =========================================================
   CONSTANTS
========================================================= */

const MIN_CREDITS = 10;

const MAX_FILE_SIZE = 500 * 1024 * 1024;

const MAX_TITLE_LENGTH = 80;

const ACCEPTED_EXTENSIONS =
  /\.(mp4|mov|avi|webm|mpeg|mpg|mkv)$/i;

const ACCEPTED_MIME_TYPES = new Set([
  "video/mp4",
  "video/quicktime",
  "video/x-msvideo",
  "video/webm",
  "video/mpeg",
  "video/x-matroska",
]);

// Must match ALLOWED_CAPTION_FONTS on the server (server.ts).
// Anything outside this list silently falls back to the server default.
const CAPTION_FONTS = [
  "Liberation Sans",
  "Arial",
  "Montserrat",
  "Poppins",
  "Impact",
];


const DEFAULT_PROCESSING_MODE: ProcessingMode = "clips";

const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  enabled: true,
  font: "Liberation Sans",
  textColor: "#FFFFFF",
  highlightColor: "#39FF14",
  position: "bottom",
  uppercase: true,
  box: true,
  boxColor: "#000000",
  animation: "pop",
};

/* =========================================================
   CAPTION STYLE PRESETS
   Named looks like OpusClip/CapCut caption templates — each bundles
   font + colors + box + animation into one click. "enabled" is left
   out here since that's controlled separately by the on/off toggle.
========================================================= */

const CAPTION_STYLE_PRESETS: {
  id: string;
  label: string;
  // Duotone backdrop the thumbnail's "photo" silhouette is tinted with —
  // stands in for a real clip frame the way OpusClip/CapCut style tiles do.
  backdrop: { a: string; b: string };
  style: Omit<CaptionStyle, "enabled">;
}[] = [
  {
    id: "bold-pop",
    label: "Bold Pop",
    backdrop: { a: "#3a2f55", b: "#0c0a14" },
    style: {
      font: "Liberation Sans",
      textColor: "#FFFFFF",
      highlightColor: "#39FF14",
      position: "bottom",
      uppercase: true,
      box: true,
      boxColor: "#000000",
      animation: "pop",
    },
  },
  {
    id: "clean-minimal",
    label: "Clean Minimal",
    backdrop: { a: "#4a4238", b: "#100e0a" },
    style: {
      font: "Arial",
      textColor: "#FFFFFF",
      highlightColor: "#FFE600",
      position: "bottom",
      uppercase: false,
      box: false,
      boxColor: "#000000",
      animation: "none",
    },
  },
  {
    id: "neon-nights",
    label: "Neon Nights",
    backdrop: { a: "#3d1f52", b: "#0a0611" },
    style: {
      font: "Montserrat",
      textColor: "#FFFFFF",
      highlightColor: "#FF2E9A",
      position: "center",
      uppercase: true,
      box: true,
      boxColor: "#1A0B2E",
      animation: "pop",
    },
  },
  {
    id: "impact-bold",
    label: "Impact Bold",
    backdrop: { a: "#4a3418", b: "#0f0a05" },
    style: {
      font: "Impact",
      textColor: "#FFFFFF",
      highlightColor: "#FFD400",
      position: "bottom",
      uppercase: true,
      box: false,
      boxColor: "#000000",
      animation: "pop",
    },
  },
  {
    id: "karaoke-blue",
    label: "Karaoke Blue",
    backdrop: { a: "#173a52", b: "#070c11" },
    style: {
      font: "Poppins",
      textColor: "#FFFFFF",
      highlightColor: "#3AB0FF",
      position: "bottom",
      uppercase: true,
      box: true,
      boxColor: "#000000",
      animation: "none",
    },
  },
  {
    id: "soft-glow",
    label: "Soft Glow",
    backdrop: { a: "#4a3d2c", b: "#110d08" },
    style: {
      font: "Poppins",
      textColor: "#FFFFFF",
      highlightColor: "#FFE600",
      position: "bottom",
      uppercase: false,
      box: false,
      boxColor: "#000000",
      animation: "none",
    },
  },
  {
    id: "retro-frame",
    label: "Retro Frame",
    backdrop: { a: "#4a2415", b: "#100804" },
    style: {
      font: "Impact",
      textColor: "#FFFFFF",
      highlightColor: "#FF7A00",
      position: "center",
      uppercase: true,
      box: true,
      boxColor: "#2A1200",
      animation: "none",
    },
  },
  {
    id: "y2k-pop",
    label: "Y2K Pop",
    backdrop: { a: "#123a4a", b: "#050d11" },
    style: {
      font: "Montserrat",
      textColor: "#FFFFFF",
      highlightColor: "#3AB0FF",
      position: "top",
      uppercase: true,
      box: false,
      boxColor: "#000000",
      animation: "pop",
    },
  },
];

/* =========================================================
   HELPERS
========================================================= */

const cleanUrl = (value: string): string => {
  const trimmed = value.trim();

  if (!trimmed) return "";

  const markdownMatch = trimmed.match(
    /^\[[^\]]*\]\((https?:\/\/[^)\s]+)\)$/i,
  );

  if (markdownMatch?.[1]) {
    return markdownMatch[1].trim();
  }

  const embeddedMatch = trimmed.match(
    /https?:\/\/[^\s)]+/i,
  );

  if (embeddedMatch?.[0]) {
    return embeddedMatch[0].trim();
  }

  return trimmed;
};

const isValidHttpUrl = (value: string): boolean => {
  try {
    const url = new URL(cleanUrl(value));

    return (
      url.protocol === "http:" ||
      url.protocol === "https:"
    );
  } catch {
    return false;
  }
};

const isValidYouTubeUrl = (value: string): boolean => {
  try {
    const cleaned = cleanUrl(value);

    if (!cleaned) return false;

    const url = new URL(cleaned);

    const hostname = url.hostname
      .toLowerCase()
      .replace(/^www\./, "");

    const isYouTubeHost =
      hostname === "youtube.com" ||
      hostname === "m.youtube.com" ||
      hostname === "youtu.be";

    if (!isYouTubeHost) return false;

    if (hostname === "youtu.be") {
      return url.pathname.length > 1;
    }

    if (url.pathname === "/watch") {
      return Boolean(url.searchParams.get("v"));
    }

    if (url.pathname.startsWith("/shorts/")) {
      return url.pathname.length > 8;
    }

    if (url.pathname.startsWith("/live/")) {
      return url.pathname.length > 6;
    }

    return false;
  } catch {
    return false;
  }
};

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024 * 1024) {
    return `${Math.max(
      1,
      Math.round(bytes / 1024),
    )} KB`;
  }

  if (bytes < 1024 * 1024 * 1024) {
    return `${(
      bytes /
      (1024 * 1024)
    ).toFixed(1)} MB`;
  }

  return `${(
    bytes /
    (1024 * 1024 * 1024)
  ).toFixed(2)} GB`;
};

const validateVideoFile = (
  file: File,
): string | null => {
  const validMime =
    !file.type ||
    ACCEPTED_MIME_TYPES.has(file.type);

  const validExtension =
    ACCEPTED_EXTENSIONS.test(file.name);

  if (!validMime && !validExtension) {
    return (
      "Unsupported video format. Please upload MP4, MOV, AVI, WEBM, MPEG or MKV."
    );
  }

  if (file.size <= 0) {
    return "This file appears to be empty.";
  }

  if (file.size > MAX_FILE_SIZE) {
    return "File size must be under 500MB.";
  }

  return null;
};

const parseResponse = async (
  response: Response,
): Promise<ApiResponse | null> => {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text) as ApiResponse;
  } catch {
    throw new Error(
      "The server returned an invalid response.",
    );
  }
};

/* =========================================================
   UPLOAD ENGINE
========================================================= */

interface UploadVideoOptions {
  file: File;
  projectName: string;
  accessToken: string;
  captionStyle: CaptionStyle;
  mode: ProcessingMode;

  onProgress?: (progress: number) => void;

  onStage?: (
    stage: UploadStage,
    message: string,
  ) => void;

  signal?: AbortSignal;
}

const uploadVideoWithProgress = ({
  file,
  projectName,
  accessToken,
  captionStyle,
  mode,
  onProgress,
  onStage,
  signal,
}: UploadVideoOptions): Promise<ApiResponse | null> => {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();

    let settled = false;

    const cleanup = () => {
      signal?.removeEventListener(
        "abort",
        handleAbort,
      );
    };

    const finish = (callback: () => void) => {
      if (settled) return;

      settled = true;
      cleanup();

      callback();
    };

    const handleAbort = () => {
      if (
        xhr.readyState !==
        XMLHttpRequest.DONE
      ) {
        xhr.abort();
      }

      finish(() => {
        reject(
          new Error("Upload cancelled."),
        );
      });
    };

    if (signal) {
      if (signal.aborted) {
        reject(
          new Error("Upload cancelled."),
        );
        return;
      }

      signal.addEventListener(
        "abort",
        handleAbort,
        { once: true },
      );
    }

    xhr.open(
      "POST",
      "/api/projects/upload",
      true,
    );

    xhr.setRequestHeader(
      "Authorization",
      `Bearer ${accessToken}`,
    );

    xhr.timeout = 30 * 60 * 1000;

    xhr.upload.onloadstart = () => {
      onProgress?.(0);

      onStage?.(
        "preparing",
        "Preparing secure upload",
      );
    };

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return;

      const progress = Math.min(
        99,
        Math.max(
          0,
          Math.round(
            (event.loaded / event.total) * 100,
          ),
        ),
      );

      onProgress?.(progress);

      onStage?.(
        "uploading",
        `Uploading ${file.name}`,
      );
    };

    xhr.upload.onloadend = () => {
      onProgress?.(100);

      onStage?.(
        "finalizing",
        "Finalizing secure upload",
      );
    };

    xhr.onerror = () => {
      finish(() => {
        reject(
          new Error(
            "Upload failed. Please check your connection and make sure the LumoClip server is running.",
          ),
        );
      });
    };

    xhr.ontimeout = () => {
      finish(() => {
        reject(
          new Error(
            "Upload timed out after 30 minutes. Try a smaller video or check your server connection.",
          ),
        );
      });
    };

    xhr.onabort = () => {
      finish(() => {
        reject(
          new Error("Upload cancelled."),
        );
      });
    };

    xhr.onload = () => {
      finish(() => {
        const responseText =
          xhr.responseText || "";

        let data: ApiResponse | null =
          null;

        if (responseText) {
          try {
            data = JSON.parse(
              responseText,
            ) as ApiResponse;
          } catch {
            reject(
              new Error(
                "The server returned an invalid response.",
              ),
            );
            return;
          }
        }

        if (
          xhr.status < 200 ||
          xhr.status >= 300
        ) {
          reject(
            new Error(
              data?.error ||
                data?.message ||
                `Upload failed (${xhr.status}).`,
            ),
          );
          return;
        }

        onProgress?.(100);

        onStage?.(
          "processing",
          "AI processing started",
        );

        resolve(data);
      });
    };

    const formData = new FormData();

    formData.append(
      "name",
      projectName.trim() || file.name,
    );

    formData.append(
      "sourceType",
      "upload",
    );

    formData.append(
      "mode",
      mode,
    );

    formData.append(
      "captionStyle",
      JSON.stringify(captionStyle),
    );

    formData.append(
      "video",
      file,
      file.name,
    );

    xhr.send(formData);
  });
};

/* =========================================================
   SOURCE CARD
========================================================= */

interface SourceCardProps {
  active: boolean;
  disabled: boolean;
  icon: React.ReactNode;
  title: string;
  description: string;
  badge?: string;
  accent: string;
  onClick: () => void;
}

const SourceCard: React.FC<
  SourceCardProps
> = ({
  active,
  disabled,
  icon,
  title,
  description,
  badge,
  accent,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`
        group relative min-w-0 overflow-hidden
        rounded-[22px] border p-4
        text-left transition-all duration-500
        focus:outline-none
        focus-visible:ring-2
        focus-visible:ring-violet-500/70
        disabled:pointer-events-none
        disabled:opacity-50
        ${
          active
            ? "border-violet-400/30 bg-gradient-to-br from-violet-500/[0.14] via-white/[0.035] to-indigo-500/[0.06] shadow-[0_20px_60px_rgba(124,58,237,0.13)]"
            : "border-white/[0.07] bg-white/[0.025] hover:-translate-y-0.5 hover:border-white/[0.14] hover:bg-white/[0.045]"
        }
      `}
    >
      <div
        className={`
          pointer-events-none absolute -right-8 -top-8
          h-24 w-24 rounded-full blur-3xl
          transition-opacity duration-500
          ${active ? "opacity-100" : "opacity-0 group-hover:opacity-60"}
        `}
        style={{
          background: accent,
        }}
      />

      {active && (
        <>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/80 to-transparent" />

          <div className="pointer-events-none absolute inset-0 rounded-[22px] ring-1 ring-inset ring-white/[0.04]" />
        </>
      )}

      <div className="relative flex items-start justify-between gap-3">
        <div
          className={`
            flex h-11 w-11 shrink-0
            items-center justify-center
            rounded-[14px] border
            transition-all duration-300
            ${
              active
                ? "border-violet-400/20 bg-violet-500/15 text-violet-300 shadow-[0_8px_25px_rgba(139,92,246,0.15)]"
                : "border-white/[0.06] bg-zinc-950/80 text-zinc-500 group-hover:text-zinc-300"
            }
          `}
        >
          {icon}
        </div>

        {active ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-full border border-white/10 bg-violet-500 shadow-lg shadow-violet-500/30">
            <Check className="h-3 w-3 text-white" />
          </span>
        ) : (
          badge && (
            <span className="rounded-full border border-white/[0.07] bg-black/20 px-2 py-1 text-[7px] font-bold uppercase tracking-[0.15em] text-zinc-600">
              {badge}
            </span>
          )
        )}
      </div>

      <div className="relative mt-4">
        <p className="text-[11px] font-bold tracking-tight text-white">
          {title}
        </p>

        <p className="mt-1 text-[9px] leading-4 text-zinc-600">
          {description}
        </p>
      </div>

      <div
        className={`
          relative mt-4 flex items-center gap-1
          text-[8px] font-bold
          transition
          ${
            active
              ? "text-violet-300"
              : "text-zinc-700 group-hover:text-zinc-500"
          }
        `}
      >
        <span>
          {active
            ? "Selected"
            : "Choose source"}
        </span>

        <ChevronRight className="h-3 w-3" />
      </div>
    </button>
  );
};

/* =========================================================
   PARTICLES
========================================================= */

const Particles = () => {
  const particles = useMemo(
    () =>
      Array.from(
        { length: 18 },
        (_, index) => ({
          id: index,
          left: `${(index * 37) % 100}%`,
          top: `${(index * 61) % 100}%`,
          delay: `${(index % 6) * 0.7}s`,
          duration: `${4 + (index % 5)}s`,
        }),
      ),
    [],
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {particles.map((particle) => (
        <span
          key={particle.id}
          className="absolute h-1 w-1 rounded-full bg-violet-300/20 animate-pulse"
          style={{
            left: particle.left,
            top: particle.top,
            animationDelay: particle.delay,
            animationDuration:
              particle.duration,
          }}
        />
      ))}
    </div>
  );
};

/* =========================================================
   CAPTION STYLE PICKER
========================================================= */

const CaptionStylePicker: React.FC<{
  style: CaptionStyle;
  onChange: (next: CaptionStyle) => void;
  disabled: boolean;
  lockEnabled?: boolean;
}> = ({ style, onChange, disabled, lockEnabled = false }) => {
  const presetRailRef = useRef<HTMLDivElement>(null);

  const update = (patch: Partial<CaptionStyle>) => {
    onChange({ ...style, ...patch });
  };

  const selectPreset = (
    preset: (typeof CAPTION_STYLE_PRESETS)[number],
  ) => {
    onChange({
      ...style,
      ...preset.style,
      enabled: true,
    });
  };

  const scrollRail = (direction: 1 | -1) => {
    presetRailRef.current?.scrollBy({
      left: direction * 250,
      behavior: "smooth",
    });
  };

  const isPresetActive = (
    preset: (typeof CAPTION_STYLE_PRESETS)[number],
  ) =>
    style.enabled &&
    style.font === preset.style.font &&
    style.textColor.toUpperCase() ===
      preset.style.textColor.toUpperCase() &&
    style.highlightColor.toUpperCase() ===
      preset.style.highlightColor.toUpperCase() &&
    style.position === preset.style.position &&
    style.uppercase === preset.style.uppercase &&
    style.box === preset.style.box &&
    style.boxColor.toUpperCase() ===
      preset.style.boxColor.toUpperCase() &&
    style.animation === preset.style.animation;

  return (
    <section className="relative overflow-hidden rounded-[24px] border border-white/[0.08] bg-[#0f0f12] shadow-[0_18px_70px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.04)]">
      <style>{`
        @keyframes lumoCaptionPop {
          0%, 58%, 100% { transform: scale(1); }
          72% { transform: scale(1.08); }
        }
        @keyframes lumoCaptionGlow {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.16); }
        }
      `}</style>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3.5 sm:px-5">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] bg-white/[0.045] text-zinc-300">
            <Captions className="h-4 w-4" />
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold tracking-tight text-white">
                Caption
              </p>
              <span className="rounded-md bg-violet-500/10 px-1.5 py-0.5 text-[6px] font-bold uppercase tracking-[0.14em] text-violet-300">
                AI
              </span>
            </div>
            <p className="mt-0.5 text-[8px] text-zinc-600">
              Add stylish captions or translate your content with one click.
            </p>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={style.enabled}
          disabled={disabled || lockEnabled}
          onClick={() => update({ enabled: !style.enabled })}
          title={
            lockEnabled
              ? "Captions can't be turned off in full-video mode"
              : "Toggle captions"
          }
          className={`relative h-6 w-11 shrink-0 rounded-full border transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/70 disabled:cursor-not-allowed disabled:opacity-50 ${
            style.enabled
              ? "border-violet-400/30 bg-violet-600 shadow-[0_0_18px_rgba(124,58,237,0.22)]"
              : "border-white/[0.10] bg-white/[0.06]"
          }`}
        >
          <span
            className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition-all duration-200 ${
              style.enabled ? "left-[22px]" : "left-1"
            }`}
          />
        </button>
      </div>

      {!style.enabled ? (
        <div className="px-4 py-5 sm:px-5">
          <div className="flex items-center gap-3 rounded-[16px] border border-white/[0.06] bg-white/[0.02] px-3.5 py-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04] text-zinc-500">
              <Captions className="h-3.5 w-3.5" />
            </div>
            <div>
              <p className="text-[9px] font-semibold text-zinc-300">No captions</p>
              <p className="mt-0.5 text-[7px] text-zinc-600">
                Your video will be exported without subtitles.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 sm:p-5">
          {/* Preview */}
          <div className="relative mx-auto h-[190px] max-w-[430px] overflow-hidden rounded-[18px] border border-white/[0.09] bg-[#18181c] shadow-[0_20px_55px_rgba(0,0,0,0.45)]">
            {/* faux video frame */}
            <div
              className="absolute inset-0"
              style={{
                background: `
                  radial-gradient(80% 90% at 72% 18%, ${style.highlightColor}35 0%, transparent 48%),
                  radial-gradient(60% 70% at 20% 75%, rgba(139,92,246,0.20) 0%, transparent 55%),
                  linear-gradient(135deg, #34343c 0%, #1b1b20 45%, #08080b 100%)
                `,
              }}
            />

            <div className="absolute left-[13%] top-[13%] h-20 w-20 rounded-full bg-white/[0.07] blur-xl" />
            <div className="absolute right-[16%] top-[19%] h-28 w-20 rotate-12 rounded-[40%] bg-white/[0.055] blur-lg" />
            <div className="absolute bottom-0 left-0 right-0 h-[62%] bg-gradient-to-t from-black/90 via-black/25 to-transparent" />

            <div className="absolute left-3 top-3 rounded-md border border-white/[0.08] bg-black/35 px-2 py-1 text-[6px] font-bold uppercase tracking-[0.16em] text-white/45 backdrop-blur-md">
              Live preview
            </div>

            {/* caption */}
            <div
              className={`absolute inset-x-4 flex justify-center text-center ${
                style.position === "top"
                  ? "top-9"
                  : style.position === "center"
                    ? "top-1/2 -translate-y-1/2"
                    : "bottom-7"
              }`}
            >
              <p
                className={`max-w-[92%] text-[18px] font-black leading-[1.05] tracking-[-0.02em] sm:text-[20px] ${
                  style.box ? "rounded-lg px-2.5 py-1.5" : "px-1"
                }`}
                style={{
                  fontFamily: style.font,
                  backgroundColor: style.box
                    ? `${style.boxColor}D0`
                    : "transparent",
                  color: style.textColor,
                  textShadow: style.box
                    ? "none"
                    : "0 2px 9px rgba(0,0,0,.95), 0 0 2px rgba(0,0,0,.9)",
                }}
              >
                <span>
                  {style.uppercase ? "THIS IS " : "This is "}
                </span>
                <span
                  style={{
                    color: style.highlightColor,
                    animation:
                      style.animation === "pop"
                        ? "lumoCaptionPop 1.6s ease-in-out infinite"
                        : "lumoCaptionGlow 2.8s ease-in-out infinite",
                  }}
                >
                  {style.uppercase ? "AWESOME" : "awesome"}
                </span>
              </p>
            </div>

            <div className="absolute bottom-3 left-1/2 h-1 w-20 -translate-x-1/2 rounded-full bg-white/10" />
          </div>

          {/* Preset rail */}
          <div className="mt-5">
            <div className="mb-2.5 flex items-center justify-between">
              <div>
                <p className="text-[9px] font-bold text-zinc-200">Caption</p>
                <p className="mt-0.5 text-[7px] text-zinc-600">
                  Choose a style
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => scrollRail(-1)}
                  aria-label="Scroll caption styles left"
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.035] text-zinc-500 transition hover:border-white/[0.18] hover:bg-white/[0.06] hover:text-white disabled:opacity-35"
                >
                  <ChevronLeft className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => scrollRail(1)}
                  aria-label="Scroll caption styles right"
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.035] text-zinc-500 transition hover:border-white/[0.18] hover:bg-white/[0.06] hover:text-white disabled:opacity-35"
                >
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-7 bg-gradient-to-r from-[#0f0f12] to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-7 bg-gradient-to-l from-[#0f0f12] to-transparent" />

              <div
                ref={presetRailRef}
                className="flex gap-2.5 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
              >
                {/* No Caption */}
                <button
                  type="button"
                  disabled={disabled || lockEnabled}
                  onClick={() => update({ enabled: false })}
                  className="group flex w-[92px] shrink-0 flex-col gap-1.5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span
                    className={`relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-[13px] border bg-[#27272b] transition-all duration-200 ${
                      !style.enabled
                        ? "border-white ring-1 ring-white/20"
                        : "border-white/[0.08] group-hover:border-white/20"
                    }`}
                  >
                    <span className="h-10 w-10 rounded-full border-[3px] border-zinc-500/70" />
                    <span className="absolute h-[3px] w-11 rotate-45 rounded-full bg-zinc-500/80" />
                    {!style.enabled && (
                      <span className="absolute right-1.5 top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white">
                        <Check className="h-2.5 w-2.5 text-black" strokeWidth={3} />
                      </span>
                    )}
                  </span>
                  <span className={`text-[7px] font-bold ${!style.enabled ? "text-white" : "text-zinc-500"}`}>
                    No caption
                  </span>
                </button>

                {CAPTION_STYLE_PRESETS.map((preset) => {
                  const isActive = isPresetActive(preset);

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => selectPreset(preset)}
                      aria-label={`Use ${preset.label} caption style`}
                      className="group flex w-[92px] shrink-0 flex-col gap-1.5 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span
                        className={`relative flex aspect-[4/5] w-full overflow-hidden rounded-[13px] border transition-all duration-200 ${
                          isActive
                            ? "border-white ring-2 ring-violet-500/55 shadow-[0_0_24px_rgba(124,58,237,0.20)]"
                            : "border-white/[0.08] group-hover:-translate-y-0.5 group-hover:border-white/20"
                        }`}
                        style={{
                          background: `radial-gradient(90% 75% at 50% 15%, ${preset.backdrop.a}, transparent 68%), linear-gradient(150deg, ${preset.backdrop.a}, ${preset.backdrop.b})`,
                        }}
                      >
                        {/* subtle person / video silhouette */}
                        <span className="absolute bottom-0 left-1/2 h-[73%] w-[78%] -translate-x-1/2 opacity-65">
                          <span className="absolute left-1/2 top-0 h-9 w-9 -translate-x-1/2 rounded-full bg-white/[0.15] blur-[1px]" />
                          <span className="absolute bottom-0 left-1/2 h-[72%] w-[82%] -translate-x-1/2 rounded-t-[45%] bg-white/[0.11]" />
                        </span>

                        <span className="absolute inset-0 bg-gradient-to-b from-white/[0.07] via-transparent to-black/60" />

                        <span
                          className={`absolute inset-x-1.5 z-[2] text-center text-[9px] font-black leading-[1.05] ${
                            preset.style.box ? "rounded px-1 py-1" : "bottom-2"
                          } ${
                            preset.style.position === "top"
                              ? "top-2"
                              : preset.style.position === "center"
                                ? "top-1/2 -translate-y-1/2"
                                : "bottom-2"
                          }`}
                          style={{
                            fontFamily: preset.style.font,
                            color: preset.style.textColor,
                            backgroundColor: preset.style.box
                              ? `${preset.style.boxColor}C8`
                              : "transparent",
                            textShadow: preset.style.box
                              ? "none"
                              : "0 2px 5px #000",
                          }}
                        >
                          {preset.style.uppercase ? "TO GET " : "To get "}
                          <span style={{ color: preset.style.highlightColor }}>
                            {preset.style.uppercase ? "STARTED" : "started"}
                          </span>
                        </span>

                        {isActive && (
                          <span className="absolute right-1.5 top-1.5 z-[4] flex h-4.5 w-4.5 items-center justify-center rounded-full bg-white shadow-[0_2px_10px_rgba(0,0,0,0.35)]">
                            <Check className="h-2.5 w-2.5 text-black" strokeWidth={3} />
                          </span>
                        )}
                      </span>

                      <span className={`truncate text-[7px] font-bold ${isActive ? "text-white" : "text-zinc-500"}`}>
                        {preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

/* =========================================================
   OUTPUT MODE PICKER
========================================================= */

const OutputModePicker: React.FC<{
  mode: ProcessingMode;
  onChange: (mode: ProcessingMode) => void;
  disabled: boolean;
}> = ({ mode, onChange, disabled }) => {
  const options: {
    value: ProcessingMode;
    icon: React.ReactNode;
    title: string;
    description: string;
  }[] = [
    {
      value: "clips",
      icon: <Film className="h-4.5 w-4.5" />,
      title: "Short clips",
      description:
        "AI finds the best moments and cuts several 9:16 clips",
    },
    {
      value: "full_video_caption",
      icon: <Captions className="h-4.5 w-4.5" />,
      title: "Full video + captions",
      description:
        "Keep the whole video, just burn in stylish captions — no clipping",
    },
  ];

  return (
    <section>
      <div className="mb-3.5 flex items-end justify-between">
        <div>
          <p className="text-xs font-bold tracking-tight text-white">
            What do you want to make?
          </p>

          <p className="mt-1 text-[9px] text-zinc-600">
            Choose clips for social feeds, or just caption the full video.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
        {options.map((option) => (
          <SourceCard
            key={option.value}
            active={mode === option.value}
            disabled={disabled}
            icon={option.icon}
            title={option.title}
            description={option.description}
            accent="rgba(139,92,246,0.25)"
            onClick={() => onChange(option.value)}
          />
        ))}
      </div>
    </section>
  );
};

/* =========================================================
   COMPONENT
========================================================= */

export const NewProjectModal: React.FC<
  NewProjectModalProps
> = ({
  isOpen,
  onClose,
  onSuccess,
  credits = 0,
  initialUrl = "",
  initialTitle = "",
  initialMode = DEFAULT_PROCESSING_MODE,
}) => {
  const [step, setStep] = useState<1 | 2>(1);

  const [sourceType, setSourceType] =
    useState<SourceType>("youtube");

  const [youtubeUrl, setYoutubeUrl] =
    useState("");

  const [projectTitle, setProjectTitle] =
    useState("");

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [loading, setLoading] =
    useState(false);

  const [error, setError] =
    useState("");

  const [dragActive, setDragActive] =
    useState(false);

  const [uploadState, setUploadState] =
    useState<UploadState>({
      progress: 0,
      stage: "idle",
      message: "",
    });

  const [isFocused, setIsFocused] =
    useState(false);

  const [captionStyle, setCaptionStyle] =
    useState<CaptionStyle>(
      DEFAULT_CAPTION_STYLE,
    );

  const [processingMode, setProcessingMode] =
    useState<ProcessingMode>(
      DEFAULT_PROCESSING_MODE,
    );

  const isFullVideoMode =
    processingMode === "full_video_caption";

  // Full-video mode has no purpose without captions, so force them on
  // (and keep the toggle locked) whenever this mode is selected.
  useEffect(() => {
    if (
      isFullVideoMode &&
      !captionStyle.enabled
    ) {
      setCaptionStyle((current) => ({
        ...current,
        enabled: true,
      }));
    }
  }, [isFullVideoMode, captionStyle.enabled]);

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null,
    );

  const modalRef =
    useRef<HTMLDivElement | null>(
      null,
    );

  const abortControllerRef =
    useRef<AbortController | null>(
      null,
    );

  /* =======================================================
     DERIVED
  ======================================================= */

  const dashboardUrl = useMemo(
    () => cleanUrl(initialUrl),
    [initialUrl],
  );

  const hasInitialUrl =
    Boolean(dashboardUrl);

  const insufficientCredits =
    credits < MIN_CREDITS;

  const youtubeValid =
    isValidYouTubeUrl(youtubeUrl);

  const podcastValid =
    isValidHttpUrl(youtubeUrl);

  const sourceReady =
    sourceType === "file"
      ? Boolean(selectedFile)
      : sourceType === "youtube"
        ? youtubeValid
        : podcastValid;

  const canContinue =
    !loading &&
    !insufficientCredits &&
    sourceReady;

  const canSubmit =
    !loading &&
    !insufficientCredits &&
    sourceReady &&
    step === 2;


  /* =======================================================
     RESET
  ======================================================= */

  const resetForm = useCallback(() => {
    setStep(1);
    setYoutubeUrl("");
    setProjectTitle("");
    setSelectedFile(null);
    setSourceType("youtube");
    setError("");
    setDragActive(false);
    setIsFocused(false);
    setCaptionStyle(DEFAULT_CAPTION_STYLE);
    setProcessingMode(DEFAULT_PROCESSING_MODE);

    setUploadState({
      progress: 0,
      stage: "idle",
      message: "",
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  /* =======================================================
     OPEN / SYNC
  ======================================================= */

  useEffect(() => {
    if (!isOpen) return;

    setError("");
    setLoading(false);
    setStep(1);
    setProcessingMode(initialMode);
    setSelectedFile(null);
    setDragActive(false);

    setUploadState({
      progress: 0,
      stage: "idle",
      message: "",
    });

    if (dashboardUrl) {
      setSourceType("youtube");
      setYoutubeUrl(dashboardUrl);
    } else {
      setSourceType("youtube");
      setYoutubeUrl("");
    }

    setProjectTitle(
      initialTitle?.trim() || "",
    );

    const frame =
      requestAnimationFrame(() => {
        modalRef.current?.focus();
      });

    return () =>
      cancelAnimationFrame(frame);
  }, [
    isOpen,
    dashboardUrl,
    initialTitle,
    initialMode,
  ]);

  /* =======================================================
     BODY LOCK
  ======================================================= */

  useEffect(() => {
    if (!isOpen) return;

    const previous =
      document.body.style.overflow;

    document.body.style.overflow =
      "hidden";

    return () => {
      document.body.style.overflow =
        previous;
    };
  }, [isOpen]);

  /* =======================================================
     KEYBOARD
  ======================================================= */

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (
      event: KeyboardEvent,
    ) => {
      if (
        event.key === "Escape" &&
        !loading
      ) {
        handleClose();
      }
    };

    document.addEventListener(
      "keydown",
      handleKeyDown,
    );

    return () => {
      document.removeEventListener(
        "keydown",
        handleKeyDown,
      );
    };
  }, [isOpen, loading]);

  /* =======================================================
     UNMOUNT ABORT
  ======================================================= */

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  /* =======================================================
     CLOSE
  ======================================================= */

  const handleClose = () => {
    if (loading) return;

    resetForm();
    onClose();
  };

  /* =======================================================
     SOURCE CHANGE
  ======================================================= */

  const handleSourceChange = (
    type: SourceType,
  ) => {
    if (loading) return;

    setSourceType(type);
    setError("");

    setUploadState({
      progress: 0,
      stage: "idle",
      message: "",
    });

    if (type === "file") {
      setYoutubeUrl("");
    } else {
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (
        type === "youtube" &&
        dashboardUrl
      ) {
        setYoutubeUrl(dashboardUrl);
      }
    }
  };

  /* =======================================================
     FILE
  ======================================================= */

  const processSelectedFile = (
    file: File | null,
  ) => {
    if (!file || loading) return;

    const validationError =
      validateVideoFile(file);

    if (validationError) {
      setSelectedFile(null);
      setError(validationError);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      return;
    }

    setSelectedFile(file);
    setError("");

    if (!projectTitle.trim()) {
      setProjectTitle(
        file.name.replace(
          /\.[^/.]+$/,
          "",
        ),
      );
    }
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    processSelectedFile(
      event.target.files?.[0] || null,
    );
  };

  /* =======================================================
     DRAG
  ======================================================= */

  const handleDragOver = (
    event: React.DragEvent,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    if (!loading) {
      setDragActive(true);
    }
  };

  const handleDragLeave = (
    event: React.DragEvent,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setDragActive(false);
  };

  const handleDrop = (
    event: React.DragEvent,
  ) => {
    event.preventDefault();
    event.stopPropagation();

    setDragActive(false);

    if (loading) return;

    processSelectedFile(
      event.dataTransfer.files?.[0] ||
        null,
    );
  };

  const removeSelectedFile = () => {
    if (loading) return;

    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /* =======================================================
     SAMPLE
  ======================================================= */

  const handleSampleClick = (
    url: string,
    title: string,
  ) => {
    if (loading) return;

    setSourceType("youtube");
    setYoutubeUrl(cleanUrl(url));
    setProjectTitle(title);
    setSelectedFile(null);
    setError("");
  };

  /* =======================================================
     UPLOAD STATE
  ======================================================= */

  const handleUploadStage = (
    stage: UploadStage,
    message: string,
  ) => {
    setUploadState((current) => ({
      ...current,
      stage,
      message,
    }));
  };

  /* =======================================================
     STEP NAVIGATION
  ======================================================= */

  const validateSourceAndContinue = () => {
    if (loading) return;

    setError("");

    if (credits < MIN_CREDITS) {
      setError(`You need at least ${MIN_CREDITS} credits to create a project.`);
      return;
    }

    if (sourceType === "youtube" && !youtubeValid) {
      setError("Please enter a valid YouTube video, Shorts or Live URL.");
      return;
    }

    if (sourceType === "podcast" && !podcastValid) {
      setError("Please enter a valid podcast URL.");
      return;
    }

    if (sourceType === "file" && !selectedFile) {
      setError("Please select a video file.");
      return;
    }

    setStep(2);
  };

  const goBackToSource = () => {
    if (loading) return;
    setError("");
    setStep(1);
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit =
    async () => {
      if (loading) return;

      setError("");

      if (credits < MIN_CREDITS) {
        setError(
          `You need at least ${MIN_CREDITS} credits to create a project.`,
        );
        return;
      }

      const finalUrl =
        cleanUrl(youtubeUrl);

      if (sourceType === "youtube") {
        if (!finalUrl) {
          setError(
            "Please enter a YouTube URL.",
          );
          return;
        }

        if (
          !isValidYouTubeUrl(
            finalUrl,
          )
        ) {
          setError(
            "Please enter a valid YouTube video, Shorts or Live URL.",
          );
          return;
        }
      }

      if (sourceType === "podcast") {
        if (!finalUrl) {
          setError(
            "Please enter a podcast URL.",
          );
          return;
        }

        if (
          !isValidHttpUrl(finalUrl)
        ) {
          setError(
            "Please enter a valid podcast URL.",
          );
          return;
        }
      }

      if (
        sourceType === "file" &&
        !selectedFile
      ) {
        setError(
          "Please select a video file.",
        );
        return;
      }

      setLoading(true);

      try {
        const {
          data: { session },
        } =
          await supabase.auth.getSession();

        if (!session) {
          throw new Error(
            "Please log in before creating a project.",
          );
        }

        let data: ApiResponse | null =
          null;

        /* =================================================
           FILE
        ================================================= */

        if (
          sourceType === "file" &&
          selectedFile
        ) {
          const controller =
            new AbortController();

          abortControllerRef.current =
            controller;

          setUploadState({
            progress: 0,
            stage: "preparing",
            message:
              "Preparing secure upload",
          });

          data =
            await uploadVideoWithProgress(
              {
                file: selectedFile,

                projectName:
                  projectTitle.trim() ||
                  selectedFile.name,

                accessToken:
                  session.access_token,

                captionStyle,

                mode: processingMode,

                signal:
                  controller.signal,

                onProgress:
                  (progress) => {
                    setUploadState(
                      (current) => ({
                        ...current,
                        progress,
                      }),
                    );
                  },

                onStage:
                  handleUploadStage,
              },
            );
        }

        /* =================================================
           URL
        ================================================= */

        else {
          setUploadState({
            progress: 0,
            stage: "processing",
            message:
              "Starting AI processing",
          });

          const response =
            await fetch(
              "/api/projects/process",
              {
                method: "POST",

                headers: {
                  "Content-Type":
                    "application/json",

                  Authorization:
                    `Bearer ${session.access_token}`,
                },

                body: JSON.stringify({
                  name:
                    projectTitle.trim() ||
                    "LumoClip Project",

                  sourceType:
                    sourceType ===
                    "podcast"
                      ? "podcast"
                      : "youtube",

                  sourceUrl: finalUrl,

                  mode: processingMode,

                  captionStyle,
                }),
              },
            );

          const responseData =
            await parseResponse(
              response,
            );

          if (!response.ok) {
            throw new Error(
              responseData?.error ||
                responseData?.message ||
                `Failed to process source (${response.status}).`,
            );
          }

          data = responseData;
        }

        /* =================================================
           SUCCESS
        ================================================= */

        setUploadState({
          progress: 100,
          stage: "complete",
          message:
            "Your project is being processed",
        });

        onSuccess?.(data);

        resetForm();

        onClose();
      } catch (err) {
        console.error(
          "[LumoClip] New project error:",
          err,
        );

        const message =
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.";

        setError(message);

        setUploadState(
          (current) => ({
            ...current,
            stage: "error",
            message:
              "Something went wrong",
          }),
        );
      } finally {
        setLoading(false);
        abortControllerRef.current =
          null;
      }
    };

  /* =======================================================
     URL ENTER
  ======================================================= */

  const handleUrlKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (
      event.key === "Enter" &&
      !loading
    ) {
      event.preventDefault();
      if (step === 1) {
        validateSourceAndContinue();
      } else {
        void handleSubmit();
      }
    }
  };

  /* =======================================================
     CLOSED
  ======================================================= */

  if (!isOpen) return null;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/85 px-3 py-4 backdrop-blur-2xl sm:px-5 sm:py-7"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-project-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) handleClose();
      }}
    >
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[700px] w-[700px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/[0.09] blur-[150px]" />
        <div className="absolute -left-40 top-0 h-[450px] w-[450px] rounded-full bg-indigo-600/[0.07] blur-[140px]" />
        <div className="absolute -right-40 bottom-0 h-[500px] w-[500px] rounded-full bg-fuchsia-600/[0.06] blur-[150px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.58)_100%)]" />
        <Particles />
      </div>

      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative flex w-full max-w-[680px] max-h-[92vh] flex-col overflow-hidden rounded-[30px] border border-white/[0.11] bg-[#08080b]/[0.98] shadow-[0_50px_180px_rgba(0,0,0,0.85)] outline-none backdrop-blur-2xl"
      >
        <div className="pointer-events-none absolute inset-0 rounded-[30px] ring-1 ring-inset ring-white/[0.035]" />
        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/90 to-transparent" />

        <header className="relative shrink-0 border-b border-white/[0.07] px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3.5">
              <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[16px] border border-violet-400/20 bg-violet-500/10">
                <WandSparkles className="relative h-5 w-5 text-violet-200" />
              </div>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 id="new-project-title" className="text-[17px] font-bold tracking-tight text-white sm:text-xl">
                    Create a new project
                  </h2>
                  <span className="rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-1 text-[7px] font-bold uppercase tracking-[0.15em] text-violet-300">
                    AI Studio
                  </span>
                </div>
                <p className="mt-1 text-[9px] leading-5 text-zinc-600 sm:text-[10px]">
                  {step === 1
                    ? "Add your source first. Then choose exactly what LumoClip should create."
                    : processingMode === "clips"
                      ? "Short clips selected — LumoClip will only generate short-form clips."
                      : "Full video selected — LumoClip will only caption the original video."}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              aria-label="Close new project dialog"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.06] bg-white/[0.02] text-zinc-500 transition hover:rotate-90 hover:bg-white/[0.06] hover:text-white disabled:opacity-40"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className={`rounded-xl border px-3 py-2.5 ${step === 1 ? "border-violet-400/25 bg-violet-500/10" : "border-white/[0.06] bg-white/[0.02]"}`}>
              <div className="flex items-center gap-2">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-black ${step === 1 ? "bg-violet-500 text-white" : "bg-white/[0.07] text-zinc-500"}`}>1</span>
                <span className={`text-[9px] font-bold ${step === 1 ? "text-white" : "text-zinc-500"}`}>Source</span>
              </div>
            </div>
            <div className={`rounded-xl border px-3 py-2.5 ${step === 2 ? "border-violet-400/25 bg-violet-500/10" : "border-white/[0.06] bg-white/[0.02]"}`}>
              <div className="flex items-center gap-2">
                <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[8px] font-black ${step === 2 ? "bg-violet-500 text-white" : "bg-white/[0.07] text-zinc-500"}`}>2</span>
                <span className={`text-[9px] font-bold ${step === 2 ? "text-white" : "text-zinc-500"}`}>Output</span>
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="space-y-6 px-5 py-6 sm:px-7">
            <section className={`relative overflow-hidden rounded-[20px] border p-4 ${insufficientCredits ? "border-red-500/20 bg-red-500/[0.045]" : "border-violet-400/10 bg-violet-500/[0.055]"}`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/[0.045]">
                    <Zap className="h-4 w-4 text-amber-300" />
                  </div>
                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-zinc-600">Processing cost</p>
                    <p className="mt-0.5 text-xs font-bold text-white">{MIN_CREDITS} credits <span className="font-normal text-zinc-600">per project</span></p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-zinc-600">Balance</p>
                  <p className={`mt-0.5 text-sm font-bold ${insufficientCredits ? "text-red-400" : "text-violet-300"}`}>{credits}</p>
                </div>
              </div>
            </section>

            {step === 1 ? (
              <>
                <section>
                  <div className="mb-3 flex items-end justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">Choose your source</p>
                      <p className="mt-1 text-[9px] text-zinc-600">YouTube or your own video file.</p>
                    </div>
                    <span className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[7px] font-bold text-zinc-600">STEP 1</span>
                  </div>

                  <div className="grid grid-cols-2 gap-2.5">
                    <SourceCard
                      active={sourceType === "youtube"}
                      disabled={loading}
                      icon={<Youtube className="h-4.5 w-4.5" />}
                      title="YouTube"
                      description="Video, Shorts or Live"
                      accent="rgba(239,68,68,0.25)"
                      onClick={() => handleSourceChange("youtube")}
                    />
                    <SourceCard
                      active={sourceType === "file"}
                      disabled={loading}
                      icon={<Upload className="h-4.5 w-4.5" />}
                      title="Upload MP4"
                      description="MP4, MOV, WEBM & more"
                      accent="rgba(59,130,246,0.25)"
                      onClick={() => handleSourceChange("file")}
                    />
                  </div>
                </section>

                {sourceType === "youtube" && (
                  <section>
                    <div className="mb-2.5 flex items-center justify-between">
                      <label htmlFor="source-url" className="text-xs font-bold text-white">YouTube link</label>
                      {youtubeValid && <span className="flex items-center gap-1 text-[8px] font-bold text-emerald-400"><CheckCircle2 className="h-3 w-3" /> Ready</span>}
                    </div>
                    <div className={`rounded-[18px] border bg-white/[0.025] ${isFocused ? "border-violet-500/40" : "border-white/[0.08]"}`}>
                      <div className="flex items-center gap-2.5 px-4">
                        <Link2 className="h-4 w-4 shrink-0 text-zinc-600" />
                        <input
                          id="source-url"
                          type="url"
                          value={youtubeUrl}
                          onChange={(e) => { setYoutubeUrl(e.target.value); setError(""); }}
                          onKeyDown={handleUrlKeyDown}
                          onFocus={() => setIsFocused(true)}
                          onBlur={() => setIsFocused(false)}
                          disabled={loading}
                          placeholder="https://youtube.com/watch?v=..."
                          className="w-full bg-transparent py-4 text-[11px] font-medium text-white outline-none placeholder:text-zinc-700"
                          autoFocus={!hasInitialUrl}
                        />
                      </div>
                    </div>
                    {hasInitialUrl && <p className="mt-2 text-[8px] text-emerald-400/80">Imported from your previous source.</p>}
                  </section>
                )}

                {sourceType === "file" && (
                  <section>
                    <p className="mb-2.5 text-xs font-bold text-white">Upload your video</p>
                    {selectedFile ? (
                      <div className="flex items-center gap-3 rounded-[18px] border border-emerald-500/20 bg-emerald-500/[0.05] p-4">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10"><FileCheck2 className="h-4 w-4 text-emerald-400" /></div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[10px] font-bold text-white">{selectedFile.name}</p>
                          <p className="mt-1 text-[8px] text-zinc-600">{formatFileSize(selectedFile.size)} · Ready</p>
                        </div>
                        <button type="button" onClick={removeSelectedFile} disabled={loading} className="rounded-lg p-2 text-zinc-600 hover:bg-red-500/10 hover:text-red-400"><Trash2 className="h-3.5 w-3.5" /></button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        disabled={loading}
                        className={`group flex w-full flex-col items-center justify-center rounded-[20px] border border-dashed px-6 py-10 text-center transition ${dragActive ? "border-violet-400 bg-violet-500/[0.08]" : "border-white/[0.10] bg-white/[0.018] hover:border-violet-400/35 hover:bg-violet-500/[0.025]"}`}
                      >
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/[0.04] text-zinc-500 group-hover:text-violet-300"><Upload className="h-5 w-5" /></span>
                        <span className="mt-4 text-[11px] font-bold text-zinc-200">Drop video or browse files</span>
                        <span className="mt-1 text-[8px] text-zinc-600">Up to 500MB</span>
                      </button>
                    )}
                    <input ref={fileInputRef} type="file" accept=".mp4,.mov,.avi,.webm,.mpeg,.mpg,.mkv,video/*" onChange={handleFileChange} disabled={loading} className="hidden" />
                  </section>
                )}

                <section>
                  <div className="mb-2.5 flex items-center justify-between">
                    <label htmlFor="project-title" className="text-xs font-bold text-white">Project title <span className="font-normal text-zinc-700">Optional</span></label>
                    <span className="text-[8px] text-zinc-700">{projectTitle.length}/{MAX_TITLE_LENGTH}</span>
                  </div>
                  <input
                    id="project-title"
                    type="text"
                    maxLength={MAX_TITLE_LENGTH}
                    value={projectTitle}
                    onChange={(e) => setProjectTitle(e.target.value)}
                    disabled={loading}
                    placeholder="e.g. Founder Interview — Episode 10"
                    className="w-full rounded-[18px] border border-white/[0.08] bg-white/[0.025] px-4 py-3.5 text-[10px] font-medium text-white outline-none placeholder:text-zinc-700 focus:border-violet-500/40"
                  />
                </section>

                {error && (
                  <div role="alert" className="flex items-start gap-3 rounded-[18px] border border-red-500/20 bg-red-500/[0.06] p-3.5">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    <p className="text-[9px] leading-5 text-red-300/80">{error}</p>
                  </div>
                )}
              </>
            ) : (
              <>
                <section>
                  <div className="mb-3 flex items-end justify-between">
                    <div>
                      <p className="text-xs font-bold text-white">What should LumoClip create?</p>
                      <p className="mt-1 text-[9px] text-zinc-600">Choose one output. LumoClip will not run the other mode.</p>
                    </div>
                    <span className="rounded-full border border-white/[0.06] bg-white/[0.02] px-2 py-1 text-[7px] font-bold text-zinc-600">STEP 2</span>
                  </div>
                  <OutputModePicker mode={processingMode} onChange={setProcessingMode} disabled={loading} />
                </section>

                <section className="rounded-[18px] border border-violet-400/10 bg-violet-500/[0.045] p-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-500/10">
                      {processingMode === "clips" ? <Film className="h-4 w-4 text-violet-300" /> : <Captions className="h-4 w-4 text-violet-300" />}
                    </div>
                    <div>
                      <p className="text-[9px] font-bold uppercase tracking-[0.15em] text-violet-300">Selected output</p>
                      <p className="mt-0.5 text-[11px] font-bold text-white">{processingMode === "clips" ? "Short clips only" : "Full video + captions only"}</p>
                    </div>
                  </div>
                </section>

                <CaptionStylePicker
                  style={captionStyle}
                  onChange={setCaptionStyle}
                  disabled={loading}
                  lockEnabled={isFullVideoMode}
                />

                {error && (
                  <div role="alert" className="flex items-start gap-3 rounded-[18px] border border-red-500/20 bg-red-500/[0.06] p-3.5">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                    <p className="text-[9px] leading-5 text-red-300/80">{error}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </main>

        {loading && sourceType === "file" && (
          <div className="shrink-0 border-t border-white/[0.06] bg-[#07070a] px-5 pt-3 sm:px-7">
            <div className="flex items-center justify-between gap-3">
              <p className="truncate text-[8px] font-bold text-zinc-400">{uploadState.message || "Processing"}</p>
              <span className="text-[9px] font-bold text-violet-300">{uploadState.progress}%</span>
            </div>
            <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-400 transition-[width]" style={{ width: `${uploadState.progress}%` }} />
            </div>
            <p className="pb-3 pt-2 text-[7px] text-zinc-700">Please keep this window open while your video uploads.</p>
          </div>
        )}

        <footer className="relative shrink-0 border-t border-white/[0.07] bg-black/30 px-5 py-4 sm:px-7">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-[8px] text-zinc-600">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              Secure processing
            </div>
            <div className="flex items-center gap-2">
              <button type="button" onClick={step === 2 ? goBackToSource : handleClose} disabled={loading} className="rounded-xl px-4 py-2.5 text-[9px] font-bold text-zinc-500 transition hover:bg-white/[0.04] hover:text-white disabled:opacity-40">
                {step === 2 ? "Back" : "Cancel"}
              </button>
              {step === 1 ? (
                <button
                  type="button"
                  onClick={validateSourceAndContinue}
                  disabled={!canContinue}
                  className="group inline-flex min-w-[150px] items-center justify-center gap-2 rounded-[13px] bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-[9px] font-bold text-white shadow-[0_10px_35px_rgba(124,58,237,0.25)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <span>Continue</span>
                  <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => void handleSubmit()}
                  disabled={!canSubmit}
                  className="group inline-flex min-w-[190px] items-center justify-center gap-2 rounded-[13px] bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-[9px] font-bold text-white shadow-[0_10px_35px_rgba(124,58,237,0.25)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : processingMode === "clips" ? <Film className="h-3.5 w-3.5" /> : <Captions className="h-3.5 w-3.5" />}
                  <span>{loading ? uploadState.message || "Starting AI..." : processingMode === "clips" ? "Create short clips" : "Caption full video"}</span>
                  {!loading && <ArrowRight className="h-3.5 w-3.5 transition group-hover:translate-x-1" />}
                </button>
              )}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default NewProjectModal;

