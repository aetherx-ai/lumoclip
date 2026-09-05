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
  Clock3,
  FileCheck2,
  Film,
  Link2,
  Loader2,
  Mic,
  Play,
  ShieldCheck,
  Sparkles,
  Smartphone,
  Trash2,
  Upload,
  Video,
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
  // Where the user came in from. "enhance-speech" shows a contextual hint
  // explaining that a project must exist before speech can be enhanced,
  // since /api/projects/:projectId/enhance-speech runs on an existing
  // project's source or clip, not as a project-creation mode.
  intent?: "default" | "enhance-speech";
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
type ProcessingMode = "clips" | "full_video_caption" | "speech_only";

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
  backdrop: { a: string; b: string };
  style: Omit<CaptionStyle, "enabled">;
}[] = [
  {
    id: "karaoke",
    label: "Karaoke",
    backdrop: { a: "#26352b", b: "#090b0a" },
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
    id: "simple",
    label: "Simple",
    backdrop: { a: "#3b3937", b: "#0d0d0d" },
    style: {
      font: "Arial",
      textColor: "#FFFFFF",
      highlightColor: "#FFFFFF",
      position: "bottom",
      uppercase: false,
      box: false,
      boxColor: "#000000",
      animation: "none",
    },
  },
  {
    id: "youshaei",
    label: "Youshaei",
    backdrop: { a: "#244033", b: "#07100b" },
    style: {
      font: "Montserrat",
      textColor: "#FFFFFF",
      highlightColor: "#63F2A7",
      position: "bottom",
      uppercase: false,
      box: false,
      boxColor: "#000000",
      animation: "pop",
    },
  },
  {
    id: "pod-p",
    label: "Pod P",
    backdrop: { a: "#41203d", b: "#100810" },
    style: {
      font: "Poppins",
      textColor: "#FFFFFF",
      highlightColor: "#FF74D4",
      position: "bottom",
      uppercase: true,
      box: true,
      boxColor: "#251024",
      animation: "none",
    },
  },
  {
    id: "beastly",
    label: "Beastly",
    backdrop: { a: "#4a3b18", b: "#100d05" },
    style: {
      font: "Impact",
      textColor: "#FFFFFF",
      highlightColor: "#FFE100",
      position: "bottom",
      uppercase: true,
      box: false,
      boxColor: "#000000",
      animation: "pop",
    },
  },
  {
    id: "deep-diver",
    label: "Deep Diver",
    backdrop: { a: "#24334a", b: "#080c11" },
    style: {
      font: "Arial",
      textColor: "#111827",
      highlightColor: "#374151",
      position: "bottom",
      uppercase: false,
      box: true,
      boxColor: "#FFFFFF",
      animation: "none",
    },
  },
  {
    id: "mozi",
    label: "Mozi",
    backdrop: { a: "#243b29", b: "#09100b" },
    style: {
      font: "Montserrat",
      textColor: "#FFFFFF",
      highlightColor: "#A8FF5A",
      position: "bottom",
      uppercase: true,
      box: true,
      boxColor: "#1B2A1C",
      animation: "pop",
    },
  },
  {
    id: "popline",
    label: "Popline",
    backdrop: { a: "#2e2b4a", b: "#0b0a14" },
    style: {
      font: "Poppins",
      textColor: "#FFFFFF",
      highlightColor: "#B69CFF",
      position: "center",
      uppercase: true,
      box: true,
      boxColor: "#171329",
      animation: "pop",
    },
  },
  {
    id: "think-media",
    label: "Think Media",
    backdrop: { a: "#4a311c", b: "#110a05" },
    style: {
      font: "Montserrat",
      textColor: "#FFFFFF",
      highlightColor: "#FFD84D",
      position: "bottom",
      uppercase: true,
      box: true,
      boxColor: "#2A2110",
      animation: "none",
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
  const [activeTab, setActiveTab] = useState<"presets" | "templates">(
    "presets",
  );

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
      left: direction * 420,
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

  const previewWords = style.uppercase
    ? ["PHIR", "BHI", "TU", "ZINDA"]
    : ["Phir", "bhi", "tu", "zinda"];

  return (
    <section className="overflow-hidden rounded-[22px] border border-white/[0.08] bg-[#0d0d10] shadow-[0_18px_60px_rgba(0,0,0,0.3)]">
      <style>{`
        @keyframes lumoCaptionPop {
          0%, 58%, 100% { transform: scale(1); }
          72% { transform: scale(1.07); }
        }
        @keyframes lumoCaptionPulse {
          0%, 100% { filter: brightness(1); }
          50% { filter: brightness(1.18); }
        }
      `}</style>

      {/* Opus-style preview stays on top */}
      <div className="border-b border-white/[0.07] p-3 sm:p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-white/[0.035] text-zinc-300">
              <Captions className="h-4 w-4" />
            </div>
            <div>
              <p className="text-[11px] font-bold text-white">
                Caption
              </p>
              <p className="mt-0.5 text-[8px] text-zinc-600">
                Pick a style — preview updates instantly
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={style.enabled}
            disabled={disabled || lockEnabled}
            onClick={() => update({ enabled: !style.enabled })}
            className={`relative h-6 w-11 shrink-0 rounded-full border transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
              style.enabled
                ? "border-violet-400/35 bg-violet-600"
                : "border-white/[0.1] bg-white/[0.06]"
            }`}
          >
            <span
              className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition-all ${
                style.enabled ? "left-[22px]" : "left-1"
              }`}
            />
          </button>
        </div>

        <div className="relative mx-auto aspect-video w-full max-w-[520px] overflow-hidden rounded-[16px] border border-white/[0.09] bg-[#151518] shadow-[0_14px_35px_rgba(0,0,0,0.38)]">
          <div
            className="absolute inset-0"
            style={{
              background:
                "linear-gradient(90deg, rgba(91,35,38,.35), rgba(35,19,23,.45) 55%, rgba(5,5,8,.95)), radial-gradient(circle at 18% 28%, rgba(255,105,105,.28), transparent 34%), linear-gradient(135deg, #3a1f22 0%, #1d171b 48%, #07070a 100%)",
            }}
          />
          <div className="absolute -left-5 top-5 h-32 w-32 rounded-full bg-red-400/[0.08] blur-2xl" />
          <div className="absolute left-[12%] top-[22%] h-16 w-12 rounded-[45%] bg-black/30 blur-sm" />
          <div className="absolute left-[28%] top-[16%] h-20 w-14 rounded-[45%] bg-white/[0.06] blur-sm" />
          <div className="absolute left-[45%] top-[26%] h-16 w-12 rounded-[45%] bg-black/25 blur-sm" />
          <div className="absolute right-[15%] top-[20%] h-24 w-16 rounded-[45%] bg-white/[0.045] blur-md" />
          <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black/90 via-black/35 to-transparent" />

          <div className="absolute left-3 top-3 rounded-md border border-white/[0.08] bg-black/35 px-2 py-1 text-[6px] font-bold uppercase tracking-[0.16em] text-white/50 backdrop-blur">
            Live preview
          </div>

          {!style.enabled ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="rounded-xl border border-white/[0.08] bg-black/55 px-4 py-2 text-[10px] font-semibold text-zinc-400 backdrop-blur">
                No captions
              </div>
            </div>
          ) : (
            <div
              className={`absolute inset-x-4 flex justify-center text-center ${
                style.position === "top"
                  ? "top-6"
                  : style.position === "center"
                    ? "top-1/2 -translate-y-1/2"
                    : "bottom-6"
              }`}
            >
              <div
                className={`max-w-[94%] text-[clamp(13px,3vw,24px)] font-black leading-[1.08] tracking-[0.02em] ${
                  style.box ? "rounded-md px-3 py-2" : "px-1"
                }`}
                style={{
                  fontFamily: style.font,
                  backgroundColor: style.box
                    ? `${style.boxColor}D8`
                    : "transparent",
                  color: style.textColor,
                  textShadow: style.box
                    ? "none"
                    : "0 2px 8px rgba(0,0,0,.95), 0 0 2px #000",
                }}
              >
                {previewWords.map((word, index) => (
                  <span
                    key={`${word}-${index}`}
                    className="inline-block"
                    style={{
                      color:
                        index === 0
                          ? style.highlightColor
                          : style.textColor,
                      marginRight: index < previewWords.length - 1 ? "0.26em" : 0,
                      animation:
                        index === 0 && style.animation === "pop"
                          ? "lumoCaptionPop 1.5s ease-in-out infinite"
                          : undefined,
                    }}
                  >
                    {word}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="absolute bottom-2.5 left-1/2 h-1 w-16 -translate-x-1/2 rounded-full bg-white/10" />
        </div>
      </div>

      {/* Styles stay below the preview, like the OpusClip layout */}
      <div className="bg-[#111116]">
        <div className="flex items-end gap-5 border-b border-white/[0.07] px-4 sm:px-5">
          <button
            type="button"
            onClick={() => setActiveTab("presets")}
            className={`relative px-1 py-3 text-[10px] font-bold transition ${
              activeTab === "presets"
                ? "text-white"
                : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            Quick presets
            {activeTab === "presets" && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-violet-400" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("templates")}
            className={`relative px-1 py-3 text-[10px] font-bold transition ${
              activeTab === "templates"
                ? "text-white"
                : "text-zinc-600 hover:text-zinc-400"
            }`}
          >
            My templates
            {activeTab === "templates" && (
              <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-violet-400" />
            )}
          </button>
        </div>

        {activeTab === "presets" ? (
          <div className="p-4 sm:p-5">
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-zinc-200">
                  Caption
                </p>
                <p className="mt-0.5 text-[7px] text-zinc-600">
                  Choose from ready-made styles
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => scrollRail(-1)}
                  aria-label="Previous caption styles"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-zinc-500 transition hover:border-white/20 hover:text-white disabled:opacity-35"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => scrollRail(1)}
                  aria-label="Next caption styles"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-zinc-500 transition hover:border-white/20 hover:text-white disabled:opacity-35"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-4 bg-gradient-to-r from-[#111116] to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-4 bg-gradient-to-l from-[#111116] to-transparent" />

              <div
                ref={presetRailRef}
                className="grid auto-cols-[88px] grid-flow-col grid-rows-2 gap-x-3 gap-y-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden sm:auto-cols-[92px]"
              >
                {/* No caption */}
                <button
                  type="button"
                  disabled={disabled || lockEnabled}
                  onClick={() => update({ enabled: false })}
                  className="group flex flex-col items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <span
                    className={`relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-[11px] border bg-[#303035] transition ${
                      !style.enabled
                        ? "border-white ring-2 ring-violet-500/50"
                        : "border-white/[0.08] group-hover:border-white/20"
                    }`}
                  >
                    <span className="h-8 w-8 rounded-full border-[2px] border-zinc-400" />
                    <span className="absolute h-[2px] w-10 rotate-45 rounded-full bg-zinc-400" />
                    {!style.enabled && (
                      <span className="absolute right-1.5 top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-white">
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
                  const sampleWords = preset.style.uppercase
                    ? ["TO", "GET", "STARTED"]
                    : ["To", "get", "started"];

                  return (
                    <button
                      key={preset.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => selectPreset(preset)}
                      className="group flex flex-col items-center gap-1.5 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span
                        className={`relative flex aspect-[4/3] w-full overflow-hidden rounded-[11px] border transition-all duration-200 ${
                          isActive
                            ? "border-white ring-2 ring-violet-500/60 shadow-[0_0_22px_rgba(124,58,237,.22)]"
                            : "border-white/[0.08] group-hover:-translate-y-0.5 group-hover:border-white/20"
                        }`}
                        style={{
                          background: `radial-gradient(80% 80% at 50% 10%, ${preset.backdrop.a}, transparent 72%), linear-gradient(150deg, ${preset.backdrop.a}, ${preset.backdrop.b})`,
                        }}
                      >
                        <span className="absolute left-1/2 top-[14%] h-7 w-7 -translate-x-1/2 rounded-full bg-white/[0.13]" />
                        <span className="absolute bottom-0 left-1/2 h-[58%] w-[54%] -translate-x-1/2 rounded-t-[48%] bg-white/[0.10]" />
                        <span className="absolute inset-0 bg-gradient-to-b from-white/[0.05] via-transparent to-black/65" />

                        <span
                          className={`absolute inset-x-1.5 z-[2] text-center text-[8px] font-black leading-[1.12] ${
                            preset.style.position === "top"
                              ? "top-2"
                              : preset.style.position === "center"
                                ? "top-1/2 -translate-y-1/2"
                                : "bottom-2"
                          } ${preset.style.box ? "rounded px-1 py-1" : "px-0.5"}`}
                          style={{
                            fontFamily: preset.style.font,
                            color: preset.style.textColor,
                            backgroundColor: preset.style.box
                              ? `${preset.style.boxColor}D8`
                              : "transparent",
                            textShadow: preset.style.box
                              ? "none"
                              : "0 1px 4px rgba(0,0,0,.95)",
                          }}
                        >
                          {sampleWords.map((word, index) => (
                            <span
                              key={`${preset.id}-${word}`}
                              style={{
                                color:
                                  index === 1
                                    ? preset.style.highlightColor
                                    : preset.style.textColor,
                                marginRight:
                                  index < sampleWords.length - 1
                                    ? "0.18em"
                                    : 0,
                              }}
                            >
                              {word}
                            </span>
                          ))}
                        </span>

                        {isActive && (
                          <span className="absolute right-1.5 top-1.5 z-[4] flex h-4 w-4 items-center justify-center rounded-full bg-white shadow">
                            <Check className="h-2.5 w-2.5 text-black" strokeWidth={3} />
                          </span>
                        )}
                      </span>

                      <span className={`w-full truncate text-center text-[7px] font-bold ${isActive ? "text-white" : "text-zinc-500"}`}>
                        {preset.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex min-h-[210px] flex-col items-center justify-center px-5 py-10 text-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-zinc-600">
              <Captions className="h-4 w-4" />
            </div>
            <p className="mt-3 text-[10px] font-bold text-zinc-300">
              No saved templates yet
            </p>
            <p className="mt-1 max-w-[260px] text-[8px] leading-4 text-zinc-600">
              Your custom caption templates will appear here.
            </p>
          </div>
        )}
      </div>
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
  intent = "default",
}) => {
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
  const isSpeechEnhanceMode = intent === "enhance-speech";

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

  const canSubmit =
    !loading &&
    !insufficientCredits &&
    sourceReady;

  const sourceLabel =
    sourceType === "youtube"
      ? "YouTube"
      : sourceType === "podcast"
        ? "Podcast"
        : "Video upload";

  /* =======================================================
     RESET
  ======================================================= */

  const resetForm = useCallback(() => {
    setYoutubeUrl("");
    setProjectTitle("");
    setSelectedFile(null);
    setSourceType("youtube");
    setError("");
    setDragActive(false);
    setIsFocused(false);
    setCaptionStyle(DEFAULT_CAPTION_STYLE);
    setProcessingMode(
      intent === "enhance-speech"
        ? "speech_only"
        : DEFAULT_PROCESSING_MODE,
    );

    setUploadState({
      progress: 0,
      stage: "idle",
      message: "",
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [intent]);

  /* =======================================================
     OPEN / SYNC
  ======================================================= */

  useEffect(() => {
    if (!isOpen) return;

    setError("");
    setLoading(false);
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

    setProcessingMode(
      intent === "enhance-speech"
        ? "speech_only"
        : DEFAULT_PROCESSING_MODE,
    );

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
    intent,
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
     SUBMIT
  ======================================================= */

  const handleSubmit =
    async () => {
      if (loading) return;

      setError("");

      if (credits < MIN_CREDITS) {
        setError(
          isSpeechEnhanceMode
            ? `You need at least ${MIN_CREDITS} credits to prepare this video.`
            : `You need at least ${MIN_CREDITS} credits to create a project.`,
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

                  mode: isSpeechEnhanceMode ? "speech_only" : processingMode,

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
      void handleSubmit();
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
      className="
        fixed inset-0 z-[100]
        flex items-center justify-center
        overflow-y-auto
        bg-black/85
        px-3 py-4
        backdrop-blur-2xl
        sm:px-5 sm:py-7
      "
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-project-title"
      onMouseDown={(event) => {
        if (
          event.target ===
          event.currentTarget
        ) {
          handleClose();
        }
      }}
    >
      {/* =================================================
          AURORA BACKGROUND
      ================================================= */}

      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute left-1/2 top-1/2 h-[750px] w-[750px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-violet-600/[0.10] blur-[160px] animate-pulse" />

        <div className="absolute -left-40 top-0 h-[500px] w-[500px] rounded-full bg-indigo-600/[0.09] blur-[150px]" />

        <div className="absolute -right-40 bottom-0 h-[520px] w-[520px] rounded-full bg-fuchsia-600/[0.08] blur-[160px]" />

        <div className="absolute left-[30%] top-[20%] h-[220px] w-[220px] rounded-full bg-cyan-500/[0.035] blur-[100px]" />

        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.55)_100%)]" />

        <Particles />
      </div>

      {/* =================================================
          MODAL
      ================================================= */}

      <div
        ref={modalRef}
        tabIndex={-1}
        className="
          relative flex w-full max-w-[680px]
          max-h-[92vh]
          flex-col overflow-hidden
          rounded-[32px]
          border border-white/[0.11]
          bg-[#08080b]/[0.97]
          shadow-[0_50px_180px_rgba(0,0,0,0.85)]
          outline-none
          backdrop-blur-2xl
        "
      >
        {/* =================================================
            CINEMATIC BORDER
        ================================================= */}

        <div className="pointer-events-none absolute inset-0 rounded-[32px] ring-1 ring-inset ring-white/[0.035]" />

        <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/90 to-transparent" />

        <div className="pointer-events-none absolute left-1/2 top-0 h-20 w-[65%] -translate-x-1/2 bg-violet-500/[0.08] blur-3xl" />

        {/* =================================================
            HEADER
        ================================================= */}

        <header className="relative shrink-0 border-b border-white/[0.07] px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex min-w-0 items-center gap-4">
              <div className="relative flex h-13 w-13 shrink-0 items-center justify-center rounded-[18px] border border-violet-400/20 bg-gradient-to-br from-violet-500/20 via-indigo-500/10 to-fuchsia-500/10 shadow-[0_15px_50px_rgba(124,58,237,0.18)]">
                <div className="absolute inset-0 rounded-[18px] bg-violet-500/20 blur-xl" />

                <div className="absolute inset-[1px] rounded-[17px] border border-white/[0.05]" />

                {intent === "enhance-speech" ? (
                  <Mic className="relative h-5 w-5 text-violet-200" />
                ) : (
                  <WandSparkles className="relative h-5 w-5 text-violet-200" />
                )}
              </div>

              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    id="new-project-title"
                    className="text-[17px] font-bold tracking-[-0.02em] text-white sm:text-xl"
                  >
                    {intent === "enhance-speech"
                      ? "Start a project to enhance speech"
                      : "Create a new project"}
                  </h2>

                  <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-1 text-[7px] font-bold uppercase tracking-[0.16em] text-violet-300">
                    <Sparkles className="h-2.5 w-2.5" />
                    AI Studio
                  </span>
                </div>

                <p className="mt-1.5 max-w-[540px] text-[10px] leading-5 text-zinc-500 sm:text-[11px]">
                  {intent === "enhance-speech"
                    ? "Bring in your video first — you'll be able to clean up and enhance its speech once it's ready."
                    : "Turn long-form content into scroll-stopping short-form videos with LumoClip AI."}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleClose}
              disabled={loading}
              aria-label="Close new project dialog"
              className="
                flex h-9 w-9 shrink-0
                items-center justify-center
                rounded-xl
                border border-white/[0.05]
                bg-white/[0.018]
                text-zinc-500
                transition-all duration-300
                hover:rotate-90
                hover:border-white/[0.10]
                hover:bg-white/[0.06]
                hover:text-white
                focus:outline-none
                focus-visible:ring-2
                focus-visible:ring-violet-500/70
                disabled:cursor-not-allowed
                disabled:opacity-40
              "
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* TRUST STRIP */}

          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
            <span className="flex items-center gap-1.5 text-[8px] font-medium text-zinc-600">
              <ShieldCheck className="h-3 w-3 text-emerald-500" />
              Secure processing
            </span>

            <span className="flex items-center gap-1.5 text-[8px] font-medium text-zinc-600">
              <Sparkles className="h-3 w-3 text-violet-400" />
              {intent === "enhance-speech"
                ? "AI speech cleanup"
                : "AI-powered clipping"}
            </span>

            <span className="flex items-center gap-1.5 text-[8px] font-medium text-zinc-600">
              <Clock3 className="h-3 w-3 text-zinc-500" />
              Usually a few minutes
            </span>

            <span className="ml-auto hidden items-center gap-1.5 text-[8px] font-bold text-zinc-600 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
              AI engine online
            </span>
          </div>
        </header>

        {/* =================================================
            BODY
        ================================================= */}

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="space-y-7 px-5 py-6 sm:px-7">

            {/* =================================================
                CREDIT / STATUS
            ================================================= */}

            <section
              className={`
                relative overflow-hidden rounded-[22px]
                border p-4.5
                ${
                  insufficientCredits
                    ? "border-red-500/20 bg-red-500/[0.045]"
                    : "border-violet-400/15 bg-gradient-to-r from-violet-500/[0.10] via-indigo-500/[0.035] to-transparent"
                }
              `}
            >
              <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-violet-500/10 blur-3xl" />

              <div className="pointer-events-none absolute bottom-0 left-1/3 h-20 w-40 rounded-full bg-indigo-500/[0.04] blur-3xl" />

              <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3.5">
                  <div
                    className={`
                      relative flex h-11 w-11
                      items-center justify-center
                      rounded-[14px] border
                      ${
                        insufficientCredits
                          ? "border-red-500/10 bg-red-500/10"
                          : "border-violet-400/10 bg-violet-500/10"
                      }
                    `}
                  >
                    <Zap
                      className={`
                        h-4.5 w-4.5
                        ${
                          insufficientCredits
                            ? "text-red-400"
                            : "text-amber-300"
                        }
                      `}
                    />
                  </div>

                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-zinc-600">
                      Processing cost
                    </p>

                    <p className="mt-1 text-sm font-bold text-white">
                      {MIN_CREDITS} credits
                      <span className="ml-2 text-[9px] font-normal text-zinc-600">
                        per project
                      </span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:text-right">
                  <div className="hidden h-8 w-px bg-white/[0.06] sm:block" />

                  <div>
                    <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-zinc-600">
                      Available balance
                    </p>

                    <p
                      className={`
                        mt-1 text-base font-bold
                        ${
                          insufficientCredits
                            ? "text-red-400"
                            : "text-violet-300"
                        }
                      `}
                    >
                      {credits}
                      <span className="ml-1 text-[9px] font-medium text-zinc-600">
                        credits
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* =================================================
                SOURCE
            ================================================= */}

            <section>
              <div className="mb-3.5 flex items-end justify-between">
                <div>
                  <p className="text-xs font-bold tracking-tight text-white">
                    Choose your source
                  </p>

                  <p className="mt-1 text-[9px] text-zinc-600">
                    Start with a YouTube video, podcast,
                    or your own footage.
                  </p>
                </div>

                <span className="hidden rounded-full border border-white/[0.06] bg-white/[0.025] px-2.5 py-1 text-[8px] font-bold text-zinc-600 sm:block">
                  01 / SOURCE
                </span>
              </div>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                <SourceCard
                  active={
                    sourceType === "youtube"
                  }
                  disabled={loading}
                  icon={
                    <Youtube className="h-4.5 w-4.5" />
                  }
                  title="YouTube"
                  description="Video, Shorts or Live"
                  accent="rgba(239,68,68,0.25)"
                  onClick={() =>
                    handleSourceChange(
                      "youtube",
                    )
                  }
                />

                <SourceCard
                  active={
                    sourceType === "podcast"
                  }
                  disabled={loading}
                  icon={
                    <Mic className="h-4.5 w-4.5" />
                  }
                  title="Podcast"
                  description="Episode or audio URL"
                  badge="BETA"
                  accent="rgba(168,85,247,0.25)"
                  onClick={() =>
                    handleSourceChange(
                      "podcast",
                    )
                  }
                />

                <SourceCard
                  active={
                    sourceType === "file"
                  }
                  disabled={loading}
                  icon={
                    <Upload className="h-4.5 w-4.5" />
                  }
                  title="Upload"
                  description="MP4, MOV, WEBM & more"
                  accent="rgba(59,130,246,0.25)"
                  onClick={() =>
                    handleSourceChange(
                      "file",
                    )
                  }
                />
              </div>
            </section>

            {/* =================================================
                OUTPUT MODE
            ================================================= */}

            {intent !== "enhance-speech" && (
              <OutputModePicker
                mode={processingMode}
                onChange={setProcessingMode}
                disabled={loading}
              />
            )}

            {/* =================================================
                URL
            ================================================= */}

            {(sourceType === "youtube" ||
              sourceType === "podcast") && (
              <section>
                <div className="mb-3 flex items-end justify-between gap-3">
                  <div>
                    <label
                      htmlFor="source-url"
                      className="text-xs font-bold text-white"
                    >
                      {sourceType === "youtube"
                        ? "YouTube video URL"
                        : "Podcast URL"}
                    </label>

                    <p className="mt-1 text-[9px] text-zinc-600">
                      {sourceType === "youtube" &&
                      hasInitialUrl
                        ? "Imported from Dashboard — ready to process."
                        : "Paste a public source URL to continue."}
                    </p>
                  </div>

                  {(
                    sourceType ===
                    "youtube"
                      ? youtubeValid
                      : podcastValid
                  ) && (
                    <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/10 bg-emerald-500/[0.05] px-2 py-1 text-[8px] font-bold text-emerald-400">
                      <CheckCircle2 className="h-3 w-3" />
                      Ready
                    </span>
                  )}
                </div>

                {hasInitialUrl &&
                sourceType === "youtube" ? (
                  <div className="group relative overflow-hidden rounded-[22px] border border-emerald-500/20 bg-gradient-to-r from-emerald-500/[0.06] via-white/[0.015] to-transparent p-4">
                    <div className="pointer-events-none absolute -right-5 -top-5 h-28 w-28 rounded-full bg-emerald-500/10 blur-3xl" />

                    <div className="relative flex items-center gap-3.5">
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-emerald-500/10 bg-emerald-500/10">
                        <Link2 className="h-4 w-4 text-emerald-400" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="text-[7px] font-bold uppercase tracking-[0.18em] text-emerald-400">
                          Dashboard source
                        </p>

                        <p className="mt-1.5 truncate text-[11px] font-medium text-zinc-300">
                          {youtubeUrl}
                        </p>
                      </div>

                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`
                      group relative rounded-[22px]
                      border
                      bg-white/[0.025]
                      transition-all duration-300
                      ${
                        isFocused
                          ? "border-violet-500/45 bg-violet-500/[0.035] shadow-[0_0_50px_rgba(124,58,237,0.07)]"
                          : (
                              sourceType ===
                              "youtube"
                                ? youtubeValid
                                : podcastValid
                            )
                              ? "border-emerald-500/20"
                              : "border-white/[0.08]"
                      }
                    `}
                  >
                    <div className="pointer-events-none absolute inset-0 rounded-[22px] bg-gradient-to-r from-violet-500/[0.025] via-transparent to-indigo-500/[0.025] opacity-0 transition group-focus-within:opacity-100" />

                    <Link2
                      className={`
                        absolute left-4 top-1/2
                        h-4 w-4 -translate-y-1/2
                        transition
                        ${
                          isFocused
                            ? "text-violet-400"
                            : "text-zinc-600"
                        }
                      `}
                    />

                    <input
                      id="source-url"
                      type="url"
                      inputMode="url"
                      autoComplete="url"
                      value={youtubeUrl}
                      onFocus={() =>
                        setIsFocused(true)
                      }
                      onBlur={() =>
                        setIsFocused(false)
                      }
                      onChange={(event) => {
                        setYoutubeUrl(
                          event.target.value,
                        );

                        if (error) {
                          setError("");
                        }
                      }}
                      onKeyDown={
                        handleUrlKeyDown
                      }
                      disabled={loading}
                      placeholder={
                        sourceType ===
                        "youtube"
                          ? "https://youtube.com/watch?v=..."
                          : "https://example.com/podcast/episode"
                      }
                      className="
                        relative z-10 w-full
                        rounded-[22px]
                        bg-transparent
                        py-4.5 pl-11 pr-12
                        text-[11px] font-medium
                        text-white
                        outline-none
                        placeholder:text-zinc-700
                        disabled:cursor-not-allowed
                      "
                    />

                    {(
                      sourceType ===
                      "youtube"
                        ? youtubeValid
                        : podcastValid
                    ) && (
                      <CheckCircle2 className="absolute right-4 top-1/2 z-20 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                    )}
                  </div>
                )}
              </section>
            )}

            {/* =================================================
                UPLOAD
            ================================================= */}

            {sourceType === "file" && (
              <section>
                <div className="mb-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold text-white">
                      Upload your video
                    </p>

                    <span className="rounded-full border border-white/[0.06] bg-white/[0.025] px-2 py-1 text-[7px] font-bold uppercase tracking-[0.15em] text-zinc-600">
                      Max 500MB
                    </span>
                  </div>

                  <p className="mt-1 text-[9px] text-zinc-600">
                    Upload your source video and let
                    LumoClip handle the rest.
                  </p>
                </div>

                {!selectedFile ? (
                  <div
                    onClick={() =>
                      fileInputRef.current?.click()
                    }
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(event) => {
                      if (
                        event.key === "Enter" ||
                        event.key === " "
                      ) {
                        event.preventDefault();
                        fileInputRef.current?.click();
                      }
                    }}
                    className={`
                      group relative flex min-h-[245px]
                      cursor-pointer flex-col
                      items-center justify-center
                      overflow-hidden rounded-[24px]
                      border border-dashed
                      transition-all duration-500
                      focus:outline-none
                      focus-visible:ring-2
                      focus-visible:ring-violet-500/70
                      ${
                        dragActive
                          ? "scale-[1.01] border-violet-400 bg-violet-500/[0.08] shadow-[0_0_70px_rgba(139,92,246,0.15)]"
                          : "border-white/[0.10] bg-white/[0.018] hover:border-violet-500/35 hover:bg-violet-500/[0.025]"
                      }
                    `}
                  >
                    <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(139,92,246,0.10),transparent_55%)] opacity-0 transition duration-500 group-hover:opacity-100" />

                    <div className="pointer-events-none absolute inset-x-20 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/40 to-transparent" />

                    <div
                      className={`
                        relative flex h-16 w-16
                        items-center justify-center
                        rounded-[20px] border
                        transition-all duration-500
                        ${
                          dragActive
                            ? "scale-110 border-violet-400/40 bg-violet-500/15 shadow-[0_0_40px_rgba(139,92,246,0.2)]"
                            : "border-white/[0.08] bg-zinc-950 group-hover:-translate-y-1 group-hover:border-violet-400/25"
                        }
                      `}
                    >
                      <Upload
                        className={`
                          h-6 w-6 transition
                          ${
                            dragActive
                              ? "text-violet-300"
                              : "text-zinc-500 group-hover:text-violet-300"
                          }
                        `}
                      />
                    </div>

                    <p className="relative mt-5 text-[12px] font-bold text-zinc-200">
                      {dragActive
                        ? "Drop your video here"
                        : "Drop video or browse files"}
                    </p>

                    <p className="relative mt-1.5 text-[9px] text-zinc-600">
                      Drag & drop or click to choose a
                      video
                    </p>

                    <div className="relative mt-4 flex flex-wrap justify-center gap-1.5">
                      {[
                        "MP4",
                        "MOV",
                        "AVI",
                        "WEBM",
                        "MKV",
                      ].map((format) => (
                        <span
                          key={format}
                          className="rounded-md border border-white/[0.06] bg-black/20 px-2 py-1 text-[7px] font-bold tracking-wider text-zinc-600"
                        >
                          {format}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="relative overflow-hidden rounded-[23px] border border-emerald-500/20 bg-gradient-to-r from-emerald-500/[0.06] via-white/[0.015] to-transparent p-4.5">
                    <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />

                    <div className="relative flex items-center gap-4">
                      <div className="relative flex h-13 w-13 shrink-0 items-center justify-center rounded-[16px] border border-emerald-500/10 bg-emerald-500/10">
                        <FileCheck2 className="h-5 w-5 text-emerald-400" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[11px] font-bold text-white">
                          {selectedFile.name}
                        </p>

                        <div className="mt-1.5 flex items-center gap-2 text-[8px] text-zinc-600">
                          <span>
                            {formatFileSize(
                              selectedFile.size,
                            )}
                          </span>

                          <span className="h-0.5 w-0.5 rounded-full bg-zinc-700" />

                          <span className="text-emerald-400/80">
                            Ready for AI
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={
                          removeSelectedFile
                        }
                        disabled={loading}
                        aria-label="Remove selected file"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl text-zinc-600 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".mp4,.mov,.avi,.webm,.mpeg,.mpg,.mkv,video/*"
                  onChange={handleFileChange}
                  disabled={loading}
                  className="hidden"
                />
              </section>
            )}

            {/* =================================================
                TITLE
            ================================================= */}

            <section>
              <div className="mb-2.5 flex items-end justify-between gap-3">
                <label
                  htmlFor="project-title"
                  className="text-xs font-bold text-white"
                >
                  Project title
                  <span className="ml-1.5 font-normal text-zinc-700">
                    Optional
                  </span>
                </label>

                <span
                  className={`
                    text-[8px]
                    ${
                      projectTitle.length >=
                      MAX_TITLE_LENGTH
                        ? "text-amber-400"
                        : "text-zinc-700"
                    }
                  `}
                >
                  {projectTitle.length}/
                  {MAX_TITLE_LENGTH}
                </span>
              </div>

              <div className="relative">
                <input
                  id="project-title"
                  type="text"
                  maxLength={
                    MAX_TITLE_LENGTH
                  }
                  value={projectTitle}
                  onChange={(event) =>
                    setProjectTitle(
                      event.target.value,
                    )
                  }
                  disabled={loading}
                  placeholder="e.g. Founder Interview — Episode 10"
                  className="w-full rounded-[20px] border border-white/[0.08] bg-white/[0.025] px-4 py-3.5 text-[11px] font-medium text-white outline-none transition-all duration-300 placeholder:text-zinc-700 focus:border-violet-500/40 focus:bg-violet-500/[0.025] focus:shadow-[0_0_35px_rgba(124,58,237,0.06)]"
                />
              </div>
            </section>

            {/* =================================================
                AI CAPTIONS
            ================================================= */}

            {intent !== "enhance-speech" && (
              <CaptionStylePicker
                style={captionStyle}
                onChange={setCaptionStyle}
                disabled={loading}
                lockEnabled={isFullVideoMode}
              />
            )}

            {/* =================================================
                ERROR
            ================================================= */}

            {error && (
              <div
                role="alert"
                className="relative flex items-start gap-3 overflow-hidden rounded-[20px] border border-red-500/20 bg-gradient-to-r from-red-500/[0.07] to-transparent p-4"
              >
                <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-red-500/[0.06] blur-3xl" />

                <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-500/10">
                  <AlertCircle className="h-4 w-4 text-red-400" />
                </div>

                <div className="relative min-w-0">
                  <p className="text-[8px] font-bold uppercase tracking-[0.15em] text-red-400">
                    Unable to continue
                  </p>

                  <p className="mt-1 text-[10px] leading-5 text-red-300/80">
                    {error}
                  </p>
                </div>
              </div>
            )}
          </div>
        </main>

        {/* =================================================
            UPLOAD PROGRESS
        ================================================= */}

        {loading &&
          sourceType === "file" && (
            <div className="relative shrink-0 border-t border-white/[0.06] bg-[#07070a]/95 px-5 pt-4 sm:px-7">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-violet-400/10 bg-violet-500/10">
                    {uploadState.stage ===
                    "complete" ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                    ) : (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-violet-300" />
                    )}
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-[9px] font-bold text-zinc-300">
                      {uploadState.message ||
                        "Preparing your video"}
                    </p>

                    <p className="mt-0.5 text-[7px] text-zinc-700">
                      {uploadState.stage ===
                      "uploading"
                        ? "Uploading source file"
                        : uploadState.stage ===
                            "processing"
                          ? "AI pipeline started"
                          : "Secure transfer"}
                    </p>
                  </div>
                </div>

                <span className="shrink-0 text-[10px] font-bold tabular-nums text-violet-300">
                  {uploadState.progress}%
                </span>
              </div>

              <div
                className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={
                  uploadState.progress
                }
                aria-label="Video upload progress"
              >
                <div
                  className="relative h-full rounded-full bg-gradient-to-r from-violet-600 via-fuchsia-500 to-indigo-400 transition-[width] duration-200 ease-out"
                  style={{
                    width: `${uploadState.progress}%`,
                  }}
                >
                  <div className="absolute inset-0 bg-white/25 blur-sm" />

                  <div className="absolute right-0 top-0 h-full w-10 bg-white/30 blur-md" />
                </div>
              </div>

              <p className="pb-3 pt-2.5 text-[7px] text-zinc-700">
                Please keep this window open while
                your video uploads.
              </p>
            </div>
          )}

        {/* =================================================
            FOOTER
        ================================================= */}

        <footer className="relative shrink-0 border-t border-white/[0.07] bg-black/30 px-5 py-4 sm:px-7">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.025]">
                <ShieldCheck className="h-3 w-3 text-zinc-600" />
              </div>

              <div>
                <p className="text-[8px] font-medium text-zinc-600">
                  Your content is processed securely.
                </p>

                <p className="text-[7px] text-zinc-800">
                  Powered by LumoClip AI
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="
                  rounded-xl
                  border border-transparent
                  px-4 py-2.5
                  text-[9px]
                  font-bold
                  text-zinc-500
                  transition-all
                  hover:border-white/[0.06]
                  hover:bg-white/[0.04]
                  hover:text-white
                  focus:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-violet-500/70
                  disabled:cursor-not-allowed
                  disabled:opacity-40
                "
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => {
                  void handleSubmit();
                }}
                disabled={!canSubmit}
                className="
                  group relative inline-flex
                  min-w-[190px]
                  items-center justify-center
                  gap-2 overflow-hidden
                  rounded-[14px]
                  border border-violet-400/20
                  bg-gradient-to-r
                  from-violet-600
                  via-violet-600
                  to-indigo-600
                  px-5 py-3
                  text-[9px]
                  font-bold
                  text-white
                  shadow-[0_10px_35px_rgba(124,58,237,0.25)]
                  transition-all duration-300
                  hover:-translate-y-0.5
                  hover:border-violet-300/30
                  hover:shadow-[0_15px_45px_rgba(124,58,237,0.38)]
                  focus:outline-none
                  focus-visible:ring-2
                  focus-visible:ring-violet-400
                  active:translate-y-0
                  disabled:cursor-not-allowed
                  disabled:opacity-35
                  disabled:hover:translate-y-0
                "
              >
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />

                <span className="absolute inset-[1px] rounded-[13px] bg-gradient-to-b from-white/[0.08] to-transparent" />

                <span className="relative flex items-center justify-center gap-2">
                  {loading ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />

                      <span className="truncate">
                        {uploadState.message ||
                          "Starting AI..."}
                      </span>

                      {sourceType ===
                        "file" && (
                        <span className="tabular-nums text-white/55">
                          {uploadState.progress}%
                        </span>
                      )}
                    </>
                  ) : insufficientCredits ? (
                    <>
                      <Zap className="h-3.5 w-3.5" />

                      <span>
                        Not enough credits
                      </span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-3.5 w-3.5" />

                      <span>
                        {intent === "enhance-speech"
                          ? "Continue"
                          : "Create my clips"}
                      </span>

                      <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-1" />
                    </>
                  )}
                </span>
              </button>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default NewProjectModal;

/* =========================================================
   SAMPLE VIDEOS
   (kept at bottom, referenced above — unchanged from original)
========================================================= */

const SAMPLE_VIDEOS = [
  {
    id: 1,
    tag: "SaaS & Tech",
    title: "How We Built a $100k/mo AI SaaS Startup",
    description: "Startup lessons, growth and AI.",
    url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  },
  {
    id: 2,
    tag: "Creator Economy",
    title: "Mastering Short-Form Video & Viral Hooks",
    description: "Hooks, retention and content strategy.",
    url: "https://www.youtube.com/watch?v=jNQXAC9IVRw",
  },
  {
    id: 10,
    tag: "Podcast",
    title: "The Future of Artificial Intelligence — Ep #42",
    description: "AI trends and the creator economy.",
    url: "https://www.youtube.com/watch?v=9bZkp7q19f0",
  },
];