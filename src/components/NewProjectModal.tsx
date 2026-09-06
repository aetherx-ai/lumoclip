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
   OPUS-STYLE SPEECH STEP 2 — FINAL
   Step 1 accepts YouTube/MP4; Enhance Speech Step 2 mirrors the
   compact Opus-style modal: preview + Enhancement settings +
   three toggles + white "Enhance speech in 1 click" CTA.
========================================================= */

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
  // Set when the user selected a file on the landing page hero (before this
  // modal ever opened). Pre-loads that File directly into the upload step
  // so the person never has to re-select it — see the "OPEN / SYNC" effect
  // below, which seeds `selectedFile` / `sourceType` from this on open.
  initialFile?: File | null;
  // Where the user came in from. "enhance-speech" shows a contextual hint
  // explaining that a project must exist before speech can be enhanced,
  // since /api/projects/:projectId/enhance-speech runs on an existing
  // project's source or clip, not as a project-creation mode.
  intent?: "default" | "enhance-speech";
  // Set when the user picked a specific output (e.g. clicked "AI Reframe"
  // on the landing page instead of the generic "New Project" button). When
  // present, the "What do you want to make?" step opens locked to this one
  // mode instead of showing all three — the user already told us which one
  // they want. A "Change" link still lets them see the other options.
  initialProcessingMode?: ProcessingMode;
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
type ProcessingMode =
  | "clips"
  | "full_video_caption"
  | "reframe"
  | "speech_only";

interface ReframeConfig {
  enabled: boolean;
  aspectRatio: "9:16" | "1:1" | "4:5";
  outputWidth: number;
  outputHeight: number;
  mode: "auto" | "speaker" | "center";
  tracking: "smooth" | "fast";
  addCaptions: boolean;
}

interface SpeechSettings {
  enhancement: boolean;
  removeFillerWords: boolean;
  removePauses: boolean;
}

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

const DEFAULT_REFRAME_CONFIG: ReframeConfig = {
  enabled: true,
  aspectRatio: "9:16",
  outputWidth: 720,
  outputHeight: 1280,
  mode: "auto",
  tracking: "smooth",
  addCaptions: true,
};

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

const getYouTubeVideoId = (value: string): string => {
  try {
    const url = new URL(cleanUrl(value));
    const host = url.hostname.toLowerCase().replace(/^www\./, "");
    if (host === "youtu.be") return url.pathname.slice(1).split("/")[0] || "";
    if (url.pathname === "/watch") return url.searchParams.get("v") || "";
    if (url.pathname.startsWith("/shorts/")) return url.pathname.slice(8).split("/")[0] || "";
    if (url.pathname.startsWith("/live/")) return url.pathname.slice(6).split("/")[0] || "";
  } catch {}
  return "";
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
  reframe: ReframeConfig;
  speechSettings?: SpeechSettings;

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
  reframe,
  speechSettings,
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
      "reframe",
      JSON.stringify(reframe),
    );

    if (speechSettings) {
      formData.append(
        "speechSettings",
        JSON.stringify(speechSettings),
      );
    }

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
   OPUS-STYLE CAPTION SETTINGS
========================================================= */

const CaptionOpusSettings: React.FC<{
  style: CaptionStyle;
  onChange: (next: CaptionStyle) => void;
  disabled: boolean;
  sourceType: SourceType;
  selectedFile: File | null;
  youtubeUrl: string;
}> = ({ style, onChange, disabled, selectedFile, youtubeUrl }) => {
  const railRef = useRef<HTMLDivElement>(null);
  const [activeTab, setActiveTab] = useState<"presets" | "templates">("presets");

  const selectPreset = (preset: (typeof CAPTION_STYLE_PRESETS)[number]) => {
    onChange({ ...style, ...preset.style, enabled: true });
  };

  const isActive = (preset: (typeof CAPTION_STYLE_PRESETS)[number]) =>
    style.enabled &&
    style.font === preset.style.font &&
    style.textColor.toUpperCase() === preset.style.textColor.toUpperCase() &&
    style.highlightColor.toUpperCase() === preset.style.highlightColor.toUpperCase() &&
    style.position === preset.style.position &&
    style.uppercase === preset.style.uppercase &&
    style.box === preset.style.box &&
    style.boxColor.toUpperCase() === preset.style.boxColor.toUpperCase() &&
    style.animation === preset.style.animation;

  const scroll = (amount: number) => {
    railRef.current?.scrollBy({ left: amount, behavior: "smooth" });
  };

  const youtubeId = getYouTubeVideoId(youtubeUrl);
  const videoSrc = selectedFile ? URL.createObjectURL(selectedFile) : "";

  return (
    <div className="space-y-4">
      {/* Video preview — exactly the same visual hierarchy as the speech screen */}
      <div className="flex justify-center">
        <div className="relative h-[140px] w-[266px] overflow-hidden rounded-[12px] bg-[#151519] shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
          {selectedFile ? (
            <video src={videoSrc} className="h-full w-full object-cover" muted playsInline preload="metadata" />
          ) : youtubeId ? (
            <img src={`https://i.ytimg.com/vi/${youtubeId}/hqdefault.jpg`} alt="Video preview" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950">
              <Video className="h-8 w-8 text-zinc-600" />
            </div>
          )}
          <div className="absolute left-2 top-2 rounded-md bg-black/75 px-2 py-1 text-[9px] font-bold text-white backdrop-blur">720p</div>
          <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/55 to-transparent" />
        </div>
      </div>

      {/* Opus-style caption panel */}
      <div className="overflow-hidden rounded-[4px] bg-[#1b1b1f]">
        <div className="flex border-b border-black/30 bg-[#18181c]">
          <button
            type="button"
            disabled={disabled}
            onClick={() => setActiveTab("presets")}
            className={`relative px-4 py-3 text-[12px] font-bold transition ${activeTab === "presets" ? "bg-[#202024] text-white" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            Quick presets
          </button>
          <button
            type="button"
            disabled={disabled}
            onClick={() => setActiveTab("templates")}
            className={`relative px-4 py-3 text-[12px] font-bold transition ${activeTab === "templates" ? "bg-[#202024] text-white" : "text-zinc-500 hover:text-zinc-300"}`}
          >
            My templates
          </button>
        </div>

        {activeTab === "presets" ? (
          <div className="px-4 pb-4 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <p className="text-[12px] font-bold text-zinc-300">Caption</p>
              <div className="flex gap-2">
                <button type="button" disabled={disabled} onClick={() => scroll(-300)} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-zinc-500 transition hover:text-white disabled:opacity-40" aria-label="Previous caption styles">
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button type="button" disabled={disabled} onClick={() => scroll(300)} className="flex h-8 w-8 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.03] text-zinc-500 transition hover:text-white disabled:opacity-40" aria-label="Next caption styles">
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div ref={railRef} className="grid auto-cols-[67px] grid-flow-col grid-rows-2 gap-x-3.5 gap-y-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                disabled={disabled}
                onClick={() => onChange({ ...style, enabled: false })}
                className="group flex w-[67px] flex-col items-center gap-1.5 disabled:opacity-40"
              >
                <span className={`relative flex h-[50px] w-[67px] items-center justify-center rounded-[9px] border bg-[#3a3a3f] ${!style.enabled ? "border-white ring-2 ring-violet-500/60" : "border-white/[0.06]"}`}>
                  <span className="h-7 w-7 rounded-full border-2 border-zinc-300" />
                  <span className="absolute h-[2px] w-9 rotate-45 bg-zinc-300" />
                  {!style.enabled && <span className="absolute right-1 top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white"><Check className="h-2 w-2 text-black" strokeWidth={3} /></span>}
                </span>
                <span className={`text-[8px] font-semibold ${!style.enabled ? "text-white" : "text-zinc-500"}`}>No caption</span>
              </button>

              {CAPTION_STYLE_PRESETS.map((preset) => {
                const active = isActive(preset);
                const words = preset.style.uppercase ? ["TO", "GET", "STARTED"] : ["To", "get", "started"];
                return (
                  <button key={preset.id} type="button" disabled={disabled} onClick={() => selectPreset(preset)} className="group flex w-[67px] flex-col items-center gap-1.5 disabled:opacity-40">
                    <span
                      className={`relative flex h-[50px] w-[67px] items-center justify-center overflow-hidden rounded-[9px] border transition ${active ? "border-white ring-2 ring-violet-500/60" : "border-white/[0.06] group-hover:border-white/20"}`}
                      style={{ background: `radial-gradient(80% 80% at 50% 10%, ${preset.backdrop.a}, transparent 72%), linear-gradient(150deg, ${preset.backdrop.a}, ${preset.backdrop.b})` }}
                    >
                      <span className="absolute left-1/2 top-[13%] h-5 w-5 -translate-x-1/2 rounded-full bg-white/[0.12]" />
                      <span className="absolute bottom-0 left-1/2 h-[58%] w-[52%] -translate-x-1/2 rounded-t-full bg-white/[0.09]" />
                      <span className={`relative z-[2] text-center text-[7px] font-black leading-[1.1] ${preset.style.box ? "rounded px-1 py-0.5" : "px-0.5"}`} style={{ fontFamily: preset.style.font, color: preset.style.textColor, backgroundColor: preset.style.box ? `${preset.style.boxColor}D8` : "transparent", textShadow: preset.style.box ? "none" : "0 1px 4px rgba(0,0,0,.95)" }}>
                        {words.map((word, index) => <span key={`${preset.id}-${word}`} style={{ color: index === 1 ? preset.style.highlightColor : preset.style.textColor, marginRight: index < words.length - 1 ? "0.14em" : 0 }}>{word}</span>)}
                      </span>
                      {active && <span className="absolute right-1 top-1 z-[4] flex h-3.5 w-3.5 items-center justify-center rounded-full bg-white"><Check className="h-2 w-2 text-black" strokeWidth={3} /></span>}
                    </span>
                    <span className={`w-full truncate text-center text-[8px] font-semibold ${active ? "text-white" : "text-zinc-500"}`}>{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex min-h-[145px] flex-col items-center justify-center px-5 py-8 text-center">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.03] text-zinc-600"><Captions className="h-4 w-4" /></div>
            <p className="mt-3 text-[10px] font-bold text-zinc-300">No saved templates yet</p>
            <p className="mt-1 text-[8px] text-zinc-600">Your custom caption templates will appear here.</p>
          </div>
        )}
      </div>
    </div>
  );
};

/* =========================================================
   OUTPUT MODE PICKER
========================================================= */

const OutputModePicker: React.FC<{
  mode: ProcessingMode;
  onChange: (mode: ProcessingMode) => void;
  disabled: boolean;
  // When set, only this mode's card is shown (the user already chose it
  // from the landing page) instead of all three options.
  lockedMode?: ProcessingMode | null;
  // Shown next to the heading only while locked; lets the user reveal the
  // other two options if they change their mind.
  onUnlock?: () => void;
}> = ({ mode, onChange, disabled, lockedMode, onUnlock }) => {
  const options: {
    value: ProcessingMode;
    icon: React.ReactNode;
    title: string;
    description: string;
    badge?: string;
    accent: string;
  }[] = [
    {
      value: "clips",
      icon: <Film className="h-4.5 w-4.5" />,
      title: "AI Short Clips",
      description: "AI finds the best moments and cuts several social-ready clips",
      accent: "rgba(139,92,246,0.25)",
    },
    {
      value: "reframe",
      icon: <Smartphone className="h-4.5 w-4.5" />,
      title: "AI Reframe",
      description: "Automatically keep the speaker in frame for vertical social video",
      badge: "NEW",
      accent: "rgba(34,211,238,0.25)",
    },
    {
      value: "full_video_caption",
      icon: <Captions className="h-4.5 w-4.5" />,
      title: "Full Video + Captions",
      description: "Keep the whole video and burn in stylish captions — no clipping",
      accent: "rgba(99,102,241,0.25)",
    },
  ];

  const visibleOptions = lockedMode
    ? options.filter(
        (option) => option.value === lockedMode,
      )
    : options;

  return (
    <section>
      <div className="mb-3.5 flex items-end justify-between gap-3">
        <div>
          <p className="text-xs font-bold tracking-tight text-white">
            What do you want to make?
          </p>
          <p className="mt-1 text-[9px] text-zinc-600">
            {lockedMode
              ? "Picked from the home screen."
              : "Choose clips, reframe the full video, or caption the original."}
          </p>
        </div>

        {lockedMode ? (
          onUnlock && (
            <button
              type="button"
              onClick={onUnlock}
              disabled={disabled}
              className="shrink-0 rounded-full border border-white/[0.06] bg-white/[0.025] px-2.5 py-1 text-[8px] font-bold text-zinc-400 transition-colors hover:border-white/[0.12] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Change
            </button>
          )
        ) : (
          <span className="hidden rounded-full border border-white/[0.06] bg-white/[0.025] px-2.5 py-1 text-[8px] font-bold text-zinc-600 sm:block">
            02 / OUTPUT
          </span>
        )}
      </div>

      <div
        className={`grid grid-cols-1 gap-2.5 ${
          lockedMode ? "" : "sm:grid-cols-3"
        }`}
      >
        {visibleOptions.map((option) => (
          <SourceCard
            key={option.value}
            active={mode === option.value}
            disabled={disabled}
            icon={option.icon}
            title={option.title}
            description={option.description}
            badge={option.badge}
            accent={option.accent}
            onClick={() => onChange(option.value)}
          />
        ))}
      </div>
    </section>
  );
};

const ReframeSettings: React.FC<{
  config: ReframeConfig;
  onChange: (config: ReframeConfig) => void;
  disabled: boolean;
}> = ({ config, onChange, disabled }) => {
  const aspectOptions: {
    value: ReframeConfig["aspectRatio"];
    label: string;
    size: string;
  }[] = [
    { value: "9:16", label: "9:16", size: "Shorts / Reels / TikTok" },
    { value: "1:1", label: "1:1", size: "Square social" },
    { value: "4:5", label: "4:5", size: "Instagram feed" },
  ];

  const setAspectRatio = (aspectRatio: ReframeConfig["aspectRatio"]) => {
    const sizes: Record<ReframeConfig["aspectRatio"], [number, number]> = {
      "9:16": [720, 1280],
      "1:1": [720, 720],
      "4:5": [720, 900],
    };

    const [outputWidth, outputHeight] = sizes[aspectRatio];

    onChange({
      ...config,
      aspectRatio,
      outputWidth,
      outputHeight,
    });
  };

  return (
    <section className="overflow-hidden rounded-[22px] border border-cyan-400/[0.12] bg-gradient-to-br from-cyan-500/[0.045] via-white/[0.02] to-violet-500/[0.035]">
      <div className="border-b border-white/[0.06] px-4 py-4 sm:px-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[13px] border border-cyan-400/15 bg-cyan-400/10 text-cyan-300">
            <WandSparkles className="h-4.5 w-4.5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="text-[11px] font-bold text-white">
                AI Reframe
              </p>
              <span className="rounded-full border border-cyan-400/15 bg-cyan-400/10 px-1.5 py-0.5 text-[6px] font-black uppercase tracking-[0.14em] text-cyan-300">
                Auto tracking
              </span>
            </div>
            <p className="mt-1 text-[8px] leading-4 text-zinc-500">
              AI follows the main speaker and creates a social-ready frame from your full video.
            </p>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={config.enabled}
            disabled={disabled}
            onClick={() => onChange({ ...config, enabled: !config.enabled })}
            className={`relative h-6 w-11 shrink-0 rounded-full border transition-all disabled:opacity-40 ${
              config.enabled
                ? "border-cyan-400/30 bg-cyan-500"
                : "border-white/[0.1] bg-white/[0.06]"
            }`}
          >
            <span
              className={`absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full bg-white shadow transition-all ${
                config.enabled ? "left-[22px]" : "left-1"
              }`}
            />
          </button>
        </div>
      </div>

      <div className="space-y-4 p-4 sm:p-5">
        <div>
          <div className="mb-2.5 flex items-center justify-between">
            <p className="text-[9px] font-bold text-zinc-300">
              Output format
            </p>
            <span className="text-[7px] text-zinc-700">
              Social optimized
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {aspectOptions.map((option) => {
              const active = config.aspectRatio === option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={disabled || !config.enabled}
                  onClick={() => setAspectRatio(option.value)}
                  className={`group rounded-[14px] border p-3 text-left transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                    active
                      ? "border-cyan-400/30 bg-cyan-400/[0.09] shadow-[0_10px_30px_rgba(34,211,238,0.08)]"
                      : "border-white/[0.07] bg-white/[0.025] hover:border-white/[0.14] hover:bg-white/[0.04]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span
                      className={`text-[11px] font-black ${
                        active ? "text-cyan-300" : "text-white"
                      }`}
                    >
                      {option.label}
                    </span>
                    {active && (
                      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-cyan-400">
                        <Check className="h-2.5 w-2.5 text-black" strokeWidth={3} />
                      </span>
                    )}
                  </div>
                  <p className="mt-1 text-[7px] leading-3 text-zinc-600">
                    {option.size}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <div>
            <p className="mb-2 text-[9px] font-bold text-zinc-300">
              Framing
            </p>
            <div className="grid grid-cols-3 gap-1.5">
              {(["auto", "speaker", "center"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={disabled || !config.enabled}
                  onClick={() => onChange({ ...config, mode: value })}
                  className={`rounded-xl border px-2 py-2 text-[7px] font-bold capitalize transition ${
                    config.mode === value
                      ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-300"
                      : "border-white/[0.07] bg-white/[0.025] text-zinc-500 hover:text-zinc-300"
                  } disabled:opacity-40`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-[9px] font-bold text-zinc-300">
              Tracking
            </p>
            <div className="grid grid-cols-2 gap-1.5">
              {(["smooth", "fast"] as const).map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={disabled || !config.enabled}
                  onClick={() => onChange({ ...config, tracking: value })}
                  className={`rounded-xl border px-2 py-2 text-[7px] font-bold capitalize transition ${
                    config.tracking === value
                      ? "border-violet-400/25 bg-violet-400/10 text-violet-300"
                      : "border-white/[0.07] bg-white/[0.025] text-zinc-500 hover:text-zinc-300"
                  } disabled:opacity-40`}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={config.addCaptions}
          disabled={disabled || !config.enabled}
          onClick={() =>
            onChange({
              ...config,
              addCaptions: !config.addCaptions,
            })
          }
          className="flex w-full items-center justify-between rounded-[14px] border border-white/[0.07] bg-white/[0.025] px-3.5 py-3 text-left disabled:opacity-40"
        >
          <div className="flex items-center gap-2.5">
            <Captions className="h-4 w-4 text-zinc-500" />
            <div>
              <p className="text-[9px] font-bold text-zinc-300">
                Burn in AI captions
              </p>
              <p className="mt-0.5 text-[7px] text-zinc-600">
                Use the caption style selected below
              </p>
            </div>
          </div>

          <span
            className={`relative h-5 w-9 rounded-full border ${
              config.addCaptions
                ? "border-violet-400/30 bg-violet-600"
                : "border-white/[0.1] bg-white/[0.06]"
            }`}
          >
            <span
              className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full bg-white transition-all ${
                config.addCaptions ? "left-[18px]" : "left-0.5"
              }`}
            />
          </span>
        </button>
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
  initialFile = null,
  intent = "default",
  initialProcessingMode,
}) => {
  const [sourceType, setSourceType] =
    useState<SourceType>("youtube");

  // Opus-style two-step flow: source first, feature settings second.
  const [wizardStep, setWizardStep] =
    useState<1 | 2>(1);

  // True while the output-mode step is locked to a single card because the
  // user arrived via a specific landing-page button (e.g. "AI Reframe").
  const [modeLocked, setModeLocked] = useState(
    Boolean(initialProcessingMode),
  );

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

  const [reframeConfig, setReframeConfig] =
    useState<ReframeConfig>(DEFAULT_REFRAME_CONFIG);

  const [speechSettings, setSpeechSettings] =
    useState<SpeechSettings>({
      enhancement: false,
      removeFillerWords: true,
      removePauses: true,
    });

  const isFullVideoMode =
    processingMode === "full_video_caption";

  const isReframeMode =
    processingMode === "reframe";

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

  // Keep the reframe caption toggle and the caption style picker in sync.
  useEffect(() => {
    if (!isReframeMode) return;

    setCaptionStyle((current) => {
      if (current.enabled === reframeConfig.addCaptions) {
        return current;
      }

      return {
        ...current,
        enabled: reframeConfig.addCaptions,
      };
    });
  }, [isReframeMode, reframeConfig.addCaptions]);

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
    intent !== "enhance-speech" &&
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
    setWizardStep(1);
    setError("");
    setDragActive(false);
    setIsFocused(false);
    setCaptionStyle(DEFAULT_CAPTION_STYLE);
    setReframeConfig(DEFAULT_REFRAME_CONFIG);
    setSpeechSettings({
      enhancement: false,
      removeFillerWords: true,
      removePauses: true,
    });
    setProcessingMode(
      intent === "enhance-speech"
        ? "speech_only"
        : (initialProcessingMode ??
            DEFAULT_PROCESSING_MODE),
    );
    setModeLocked(Boolean(initialProcessingMode));

    setUploadState({
      progress: 0,
      stage: "idle",
      message: "",
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [intent, initialProcessingMode]);

  /* =======================================================
     OPEN / SYNC
  ======================================================= */

  useEffect(() => {
    if (!isOpen) return;

    setError("");
    setLoading(false);
    setWizardStep(initialFile || dashboardUrl ? 2 : 1);
    setSelectedFile(null);
    setReframeConfig(DEFAULT_REFRAME_CONFIG);
    setSpeechSettings({
      enhancement: false,
      removeFillerWords: true,
      removePauses: true,
    });
    setDragActive(false);

    // Tool intent is authoritative: Enhance Speech can never fall back
    // to normal clip generation, even if stale modal state exists.
    // Otherwise, a mode passed in from the landing page (e.g. the "AI
    // Reframe" button) wins over the generic default.
    setProcessingMode(
      intent === "enhance-speech"
        ? "speech_only"
        : (initialProcessingMode ??
            DEFAULT_PROCESSING_MODE),
    );
    setModeLocked(Boolean(initialProcessingMode));

    setUploadState({
      progress: 0,
      stage: "idle",
      message: "",
    });

    if (initialFile) {
      setSourceType("file");
      setSelectedFile(initialFile);
      setYoutubeUrl("");
    } else if (dashboardUrl) {
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
    intent,
    initialProcessingMode,
    initialFile,
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
     WIZARD
  ======================================================= */

  const handleContinueToSettings = () => {
    if (loading) return;
    setError("");
    if (!sourceReady) {
      setError("Add a YouTube link or upload a video to continue.");
      return;
    }
    setWizardStep(2);
  };

  const handleBackToSource = () => {
    if (loading) return;
    setError("");
    setWizardStep(1);
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit =
    async () => {
      if (loading) return;

      setError("");

      // Enhance Speech is completely free (server.ts never charges credits
      // for it), so it must never be blocked by the credit-balance check
      // below — only paid modes (clips / full video / reframe) require it.
      if (
        intent !== "enhance-speech" &&
        credits < MIN_CREDITS
      ) {
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

      // Never trust stale React state for Enhance Speech.
      // This action is always a speech-only source-preparation job.
      const effectiveProcessingMode: ProcessingMode =
        intent === "enhance-speech"
          ? "speech_only"
          : processingMode;

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

                mode: effectiveProcessingMode,

                reframe: reframeConfig,
                speechSettings,

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

                  mode: effectiveProcessingMode,

                  captionStyle,

                  reframe: reframeConfig,
                  speechSettings,
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
        className={`
          relative flex w-full
          ${wizardStep === 2 && (intent === "enhance-speech" || isFullVideoMode) ? "max-w-[500px]" : "max-w-[680px]"}
          max-h-[92vh]
          flex-col overflow-hidden
          rounded-[32px]
          border border-white/[0.11]
          bg-[#08080b]/[0.97]
          shadow-[0_50px_180px_rgba(0,0,0,0.85)]
          outline-none
          backdrop-blur-2xl
        `}
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

        <header className={`relative shrink-0 border-b border-white/[0.07] ${wizardStep === 2 && (intent === "enhance-speech" || isFullVideoMode) ? "px-6 pb-3.5 pt-5" : "px-5 py-5 sm:px-7 sm:py-6"}`}>
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              {wizardStep === 2 && (intent === "enhance-speech" || isFullVideoMode) ? (
                <>
                  <h2 id="new-project-title" className="text-[18px] font-bold tracking-[-0.03em] text-white">{isFullVideoMode ? "AI Captions" : "Enhance speech"}</h2>
                  <p className="mt-1 text-[10px] leading-4 text-zinc-500">{isFullVideoMode ? "Add stylish captions or translate your content with one click." : "Enhance voice clarity and remove filler words with one click."}</p>
                </>
              ) : (
                <div className="flex items-start gap-4">
                  <div className="relative flex h-13 w-13 shrink-0 items-center justify-center rounded-[18px] border border-violet-400/20 bg-gradient-to-br from-violet-500/20 via-indigo-500/10 to-fuchsia-500/10 shadow-[0_15px_50px_rgba(124,58,237,0.18)]">
                    <div className="absolute inset-0 rounded-[18px] bg-violet-500/20 blur-xl" />
                    <div className="absolute inset-[1px] rounded-[17px] border border-white/[0.05]" />
                    <WandSparkles className="relative h-5 w-5 text-violet-200" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 id="new-project-title" className="text-[17px] font-bold tracking-[-0.02em] text-white sm:text-xl">Create a new project</h2>
                      <span className="inline-flex items-center gap-1 rounded-full border border-violet-400/20 bg-violet-500/10 px-2 py-1 text-[7px] font-bold uppercase tracking-[0.16em] text-violet-300"><Sparkles className="h-2.5 w-2.5" />AI Studio</span>
                    </div>
                    <p className="mt-1.5 max-w-[540px] text-[10px] leading-5 text-zinc-500 sm:text-[11px]">Turn long-form content into scroll-stopping short-form videos with LumoClip AI.</p>
                  </div>
                </div>
              )}
            </div>

            <button type="button" onClick={handleClose} disabled={loading} aria-label="Close new project dialog" className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-white/[0.05] hover:text-zinc-300 disabled:opacity-40">
              <X className="h-4 w-4" />
            </button>
          </div>

          {!(wizardStep === 2 && intent === "enhance-speech") && (
            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2">
              <span className="flex items-center gap-1.5 text-[8px] font-medium text-zinc-600"><ShieldCheck className="h-3 w-3 text-emerald-500" />Secure processing</span>
              <span className="flex items-center gap-1.5 text-[8px] font-medium text-zinc-600"><Sparkles className="h-3 w-3 text-violet-400" />AI-powered clipping</span>
              <span className="flex items-center gap-1.5 text-[8px] font-medium text-zinc-600"><Clock3 className="h-3 w-3 text-zinc-500" />Usually a few minutes</span>
            </div>
          )}
        </header>

        {/* =================================================
            BODY — OPUS-STYLE TWO STEP WIZARD
        ================================================= */}

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="px-5 py-6 sm:px-7">
            {wizardStep === 1 ? (
              <section className="mx-auto max-w-[590px]">
                <div className="mb-7 text-center">
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-[16px] border border-violet-400/15 bg-violet-500/10 shadow-[0_0_45px_rgba(124,58,237,0.12)]">
                    <Video className="h-5 w-5 text-violet-300" />
                  </div>
                  <p className="text-xl font-semibold tracking-tight text-white sm:text-2xl">Start with your video</p>
                  <p className="mx-auto mt-2 max-w-md text-[10px] leading-5 text-zinc-500 sm:text-[11px]">
                    Paste a video link or upload an MP4. We’ll take you to your AI settings next.
                  </p>
                </div>

                <div className={`relative overflow-hidden rounded-[24px] border transition-all duration-300 ${sourceType === "youtube" && youtubeValid ? "border-emerald-500/25 bg-emerald-500/[0.035]" : "border-white/[0.08] bg-white/[0.02] hover:border-violet-500/25"}`}>
                  <div className="pointer-events-none absolute -right-16 -top-16 h-36 w-36 rounded-full bg-violet-500/[0.08] blur-3xl" />
                  <div className="relative p-5 sm:p-6">
                    <div className="mb-4 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-red-400/10 bg-red-500/10">
                        <Youtube className="h-4 w-4 text-red-400" />
                      </div>
                      <div>
                        <p className="text-[11px] font-bold text-white">Paste a video link</p>
                        <p className="mt-0.5 text-[8px] text-zinc-600">YouTube video, Shorts or Live</p>
                      </div>
                      {youtubeValid && <CheckCircle2 className="ml-auto h-4 w-4 text-emerald-400" />}
                    </div>
                    <div className={`relative rounded-[18px] border ${isFocused ? "border-violet-500/45 bg-violet-500/[0.035]" : "border-white/[0.08] bg-black/20"}`}>
                      <Link2 className={`absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 ${isFocused ? "text-violet-400" : "text-zinc-600"}`} />
                      <input
                        id="source-url"
                        type="url"
                        inputMode="url"
                        autoComplete="url"
                        value={youtubeUrl}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        onChange={(event) => {
                          setYoutubeUrl(event.target.value);
                          if (event.target.value.trim()) setSourceType("youtube");
                          if (error) setError("");
                        }}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && youtubeValid && !loading) {
                            event.preventDefault();
                            handleContinueToSettings();
                          }
                        }}
                        disabled={loading}
                        placeholder="Paste a YouTube URL..."
                        className="w-full rounded-[18px] bg-transparent py-4 pl-11 pr-11 text-[11px] font-medium text-white outline-none placeholder:text-zinc-700"
                      />
                    </div>
                  </div>
                </div>

                <div className="my-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-white/[0.06]" />
                  <span className="text-[8px] font-bold uppercase tracking-[0.18em] text-zinc-700">or</span>
                  <div className="h-px flex-1 bg-white/[0.06]" />
                </div>

                <div
                  onClick={() => !selectedFile && fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if ((event.key === "Enter" || event.key === " ") && !selectedFile) {
                      event.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`group relative overflow-hidden rounded-[24px] border-2 border-dashed transition-all duration-300 ${dragActive ? "scale-[1.01] border-violet-400 bg-violet-500/[0.08]" : selectedFile ? "border-emerald-500/20 bg-emerald-500/[0.035]" : "border-white/[0.10] bg-white/[0.018] hover:border-violet-500/30 hover:bg-violet-500/[0.025]"}`}
                >
                  <div className="relative flex min-h-[170px] flex-col items-center justify-center px-6 py-7 text-center">
                    {selectedFile ? (
                      <>
                        <div className="flex h-12 w-12 items-center justify-center rounded-[15px] border border-emerald-500/15 bg-emerald-500/10"><FileCheck2 className="h-5 w-5 text-emerald-400" /></div>
                        <p className="mt-4 max-w-full truncate text-[11px] font-bold text-white">{selectedFile.name}</p>
                        <p className="mt-1 text-[8px] text-emerald-400/80">{formatFileSize(selectedFile.size)} · Ready</p>
                        <button type="button" onClick={(event) => { event.stopPropagation(); removeSelectedFile(); }} disabled={loading} className="mt-3 rounded-lg px-2.5 py-1 text-[8px] font-bold text-zinc-600 transition hover:bg-red-500/10 hover:text-red-400">Remove & choose another</button>
                      </>
                    ) : (
                      <>
                        <div className={`flex h-12 w-12 items-center justify-center rounded-[15px] border transition-all ${dragActive ? "border-violet-400/30 bg-violet-500/15" : "border-white/[0.08] bg-zinc-950 group-hover:-translate-y-1 group-hover:border-violet-400/25"}`}><Upload className={`h-5 w-5 ${dragActive ? "text-violet-300" : "text-zinc-500 group-hover:text-violet-300"}`} /></div>
                        <p className="mt-4 text-[11px] font-bold text-zinc-200">Upload your video</p>
                        <p className="mt-1.5 text-[8px] text-zinc-600">Drag & drop or click to browse · MP4, MOV, WEBM, MKV</p>
                        <span className="mt-3 rounded-full border border-white/[0.06] bg-black/20 px-2.5 py-1 text-[7px] font-bold uppercase tracking-[0.14em] text-zinc-700">Max 500MB</span>
                      </>
                    )}
                  </div>
                </div>

                <input ref={fileInputRef} type="file" accept=".mp4,.mov,.avi,.webm,.mpeg,.mpg,.mkv,video/*" onChange={handleFileChange} disabled={loading} className="hidden" />

                <div className="mt-5 flex items-center justify-center gap-5 text-[8px] text-zinc-700">
                  <span className="flex items-center gap-1.5"><ShieldCheck className="h-3 w-3 text-emerald-500/70" /> Secure upload</span>
                  <span className="flex items-center gap-1.5"><Sparkles className="h-3 w-3 text-violet-400/70" /> AI powered</span>
                  <span className="flex items-center gap-1.5"><Clock3 className="h-3 w-3" /> Fast setup</span>
                </div>
              </section>
            ) : (
              <section className={intent === "enhance-speech" ? "space-y-4" : "space-y-6"}>
                {intent === "enhance-speech" ? (
                  <>
                    <div className="flex justify-center">
                      <div className="relative h-[140px] w-[266px] overflow-hidden rounded-[12px] bg-[#151519] shadow-[0_12px_40px_rgba(0,0,0,0.45)]">
                        {selectedFile ? (
                          <video src={URL.createObjectURL(selectedFile)} className="h-full w-full object-cover" muted playsInline preload="metadata" />
                        ) : getYouTubeVideoId(youtubeUrl) ? (
                          <img src={`https://i.ytimg.com/vi/${getYouTubeVideoId(youtubeUrl)}/hqdefault.jpg`} alt="Video preview" className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-zinc-800 to-zinc-950"><Video className="h-8 w-8 text-zinc-600" /></div>
                        )}
                        <div className="absolute left-2 top-2 rounded-md bg-black/75 px-2 py-1 text-[9px] font-bold text-white backdrop-blur">720p</div>
                        <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/55 to-transparent" />
                      </div>
                    </div>

                    <div className="overflow-hidden rounded-[4px] bg-[#1b1b1f]">
                      <div className="border-b border-black/30 bg-[#18181c] px-4 py-3">
                        <p className="text-[12px] font-bold text-white">Enhancement settings</p>
                      </div>
                      <div className="divide-y divide-black/35">
                        {[
                          { key: "enhancement", icon: Mic, title: "Speech enhancement", desc: "Improve vocal clarity and richness" },
                          { key: "removeFillerWords", icon: Captions, title: "Remove filler words", desc: "Manage default words" },
                          { key: "removePauses", icon: WandSparkles, title: "Remove pauses", desc: "Remove unnecessary silence" },
                        ].map((item) => {
                          const Icon = item.icon;
                          const enabled = speechSettings[item.key as keyof SpeechSettings];
                          return (
                            <button key={item.key} type="button" disabled={loading} onClick={() => setSpeechSettings((current) => ({ ...current, [item.key]: !current[item.key as keyof SpeechSettings] }))} className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition hover:bg-white/[0.025] disabled:opacity-50">
                              <Icon className={`h-4 w-4 shrink-0 ${item.key === "enhancement" ? "text-indigo-300" : item.key === "removeFillerWords" ? "text-cyan-200" : "text-violet-300"}`} />
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-bold text-zinc-200">{item.title}</p>
                                <p className="mt-0.5 text-[8px] text-zinc-500">{item.desc}</p>
                              </div>
                              <span className={`relative h-5 w-9 shrink-0 rounded-full transition ${enabled ? "bg-white" : "bg-[#4b4b51]"}`}>
                                <span className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-all ${enabled ? "left-[18px] bg-[#111114]" : "left-0.5 bg-[#202024]"}`} />
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    {error && (
                      <div role="alert" className="rounded-lg border border-red-500/20 bg-red-500/[0.06] px-3 py-2.5 text-[9px] text-red-300">{error}</div>
                    )}
                  </>
                ) : (
                  <>
                    {isFullVideoMode ? (
                      <div className="-mt-1">
                        <CaptionOpusSettings
                          style={captionStyle}
                          onChange={setCaptionStyle}
                          disabled={loading}
                          selectedFile={selectedFile}
                          youtubeUrl={youtubeUrl}
                        />
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-3">
                          <button type="button" onClick={handleBackToSource} disabled={loading} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.025] text-zinc-500 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                          <div className="min-w-0 flex-1"><p className="text-[8px] font-bold uppercase tracking-[0.18em] text-violet-400">Step 2 of 2</p><p className="mt-1 truncate text-lg font-semibold tracking-tight text-white">{isReframeMode ? "AI Reframe" : "AI clips"}</p></div>
                        </div>
                        <div className="flex items-center gap-3 rounded-[18px] border border-emerald-500/15 bg-emerald-500/[0.035] px-4 py-3"><div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">{sourceType === "file" ? <FileCheck2 className="h-4 w-4 text-emerald-400" /> : <Link2 className="h-4 w-4 text-emerald-400" />}</div><div className="min-w-0 flex-1"><p className="text-[7px] font-bold uppercase tracking-[0.16em] text-emerald-400">Source ready</p><p className="mt-1 truncate text-[9px] font-medium text-zinc-300">{sourceType === "file" ? selectedFile?.name : youtubeUrl}</p></div><CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" /></div>
                        {isReframeMode && <ReframeSettings config={reframeConfig} onChange={setReframeConfig} disabled={loading} />}
                        {(!isReframeMode || reframeConfig.addCaptions) && <CaptionStylePicker style={captionStyle} onChange={setCaptionStyle} disabled={loading} lockEnabled={false} />}
                        <section><div className="mb-2.5 flex items-end justify-between gap-3"><label htmlFor="project-title" className="text-xs font-bold text-white">Project title <span className="ml-1.5 font-normal text-zinc-700">Optional</span></label><span className={`text-[8px] ${projectTitle.length >= MAX_TITLE_LENGTH ? "text-amber-400" : "text-zinc-700"}`}>{projectTitle.length}/{MAX_TITLE_LENGTH}</span></div><input id="project-title" type="text" maxLength={MAX_TITLE_LENGTH} value={projectTitle} onChange={(event) => setProjectTitle(event.target.value)} disabled={loading} placeholder="Give your project a name" className="w-full rounded-[18px] border border-white/[0.08] bg-white/[0.025] px-4 py-3.5 text-[10px] font-medium text-white outline-none placeholder:text-zinc-700" /></section>
                      </>
                    )}
                  </>
                )}
              </section>
            )}

            {wizardStep === 1 && error && (
              <div role="alert" className="mx-auto mt-5 flex max-w-[590px] items-start gap-3 rounded-[18px] border border-red-500/20 bg-red-500/[0.06] p-4"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" /><div><p className="text-[8px] font-bold uppercase tracking-[0.15em] text-red-400">Unable to continue</p><p className="mt-1 text-[10px] leading-5 text-red-300/80">{error}</p></div></div>
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

        <footer className={`relative shrink-0 border-t border-white/[0.07] bg-black/30 ${wizardStep === 2 && (intent === "enhance-speech" || isFullVideoMode) ? "px-6 py-3" : "px-5 py-4 sm:px-7"}`}>
          <div className="flex items-center justify-between gap-3">
            {wizardStep === 2 && (intent === "enhance-speech" || isFullVideoMode) ? (
              <div className="ml-auto w-full">
                <button type="button" onClick={() => void handleSubmit()} disabled={!canSubmit || loading} className="group relative flex h-12 w-full items-center justify-center overflow-hidden rounded-[7px] bg-white px-5 text-[13px] font-bold text-[#161619] transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-45">
                  <span className="relative flex items-center gap-2">{loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}{loading ? (uploadState.message || (isFullVideoMode ? "Adding captions..." : "Enhancing speech...")) : (isFullVideoMode ? "Add captions in 1 click" : "Enhance speech in 1 click")}</span>
                </button>
              </div>
            ) : (
              <>
                <div className="hidden items-center gap-2 sm:flex"><div className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/[0.025]"><ShieldCheck className="h-3 w-3 text-zinc-600" /></div><div><p className="text-[8px] font-medium text-zinc-600">Secure processing</p><p className="text-[7px] text-zinc-800">Powered by LumoClip AI</p></div></div>
                <div className="ml-auto flex items-center gap-2"><button type="button" onClick={wizardStep === 2 ? handleBackToSource : handleClose} disabled={loading} className="rounded-xl border border-transparent px-4 py-2.5 text-[9px] font-bold text-zinc-500 transition hover:border-white/[0.06] hover:bg-white/[0.04] hover:text-white disabled:opacity-40">{wizardStep === 2 ? "Back" : "Cancel"}</button><button type="button" onClick={() => wizardStep === 1 ? handleContinueToSettings() : void handleSubmit()} disabled={wizardStep === 1 ? loading : !canSubmit} className="group relative inline-flex min-w-[190px] items-center justify-center gap-2 overflow-hidden rounded-[14px] border border-violet-400/20 bg-gradient-to-r from-violet-600 via-violet-600 to-indigo-600 px-5 py-3 text-[9px] font-bold text-white shadow-[0_10px_35px_rgba(124,58,237,0.25)] transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-35"><span className="relative flex items-center justify-center gap-2">{loading ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /><span className="truncate">{uploadState.message || "Starting AI..."}</span></> : wizardStep === 1 ? <><span>Continue</span><ArrowRight className="h-3.5 w-3.5" /></> : insufficientCredits ? <><Zap className="h-3.5 w-3.5" /><span>Not enough credits</span></> : <><Sparkles className="h-3.5 w-3.5" /><span>{processingMode === "reframe" ? "Create AI Reframe" : processingMode === "full_video_caption" ? "Create full video" : "Create my clips"}</span><ArrowRight className="h-3.5 w-3.5" /></>}</span></button></div>
              </>
            )}
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