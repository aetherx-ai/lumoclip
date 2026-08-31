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
  ChevronDown,
  FileCheck2,
  Link2,
  Loader2,
  Mic,
  Sparkles,
  Trash2,
  Upload,
  X,
  Youtube,
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

const CAPTION_HIGHLIGHT_PRESETS = [
  { label: "Neon green", value: "#39FF14" },
  { label: "Electric yellow", value: "#FFE600" },
  { label: "Hot pink", value: "#FF2E9A" },
  { label: "Sky blue", value: "#3AB0FF" },
  { label: "Orange", value: "#FF7A00" },
  { label: "White", value: "#FFFFFF" },
];

const DEFAULT_CAPTION_STYLE: CaptionStyle = {
  enabled: true,
  font: "Liberation Sans",
  textColor: "#FFFFFF",
  highlightColor: "#39FF14",
  position: "bottom",
  uppercase: true,
};

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
      "full_video_caption",
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
   SOURCE TAB (small pill, not a big card)
========================================================= */

interface SourceTabProps {
  active: boolean;
  disabled: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}

const SourceTab: React.FC<SourceTabProps> = ({
  active,
  disabled,
  icon,
  label,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={`
        flex items-center gap-2 rounded-xl px-4 py-2.5
        text-[11px] font-semibold transition-all duration-200
        focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30
        disabled:cursor-not-allowed disabled:opacity-40
        ${
          active
            ? "bg-white text-black"
            : "bg-white/[0.04] text-zinc-400 hover:bg-white/[0.08] hover:text-white"
        }
      `}
    >
      {icon}
      {label}
    </button>
  );
};

/* =========================================================
   CAPTION STYLE PICKER (collapsible, closed by default)
========================================================= */

const CaptionStylePicker: React.FC<{
  style: CaptionStyle;
  onChange: (next: CaptionStyle) => void;
  disabled: boolean;
  open: boolean;
  onToggle: () => void;
}> = ({ style, onChange, disabled, open, onToggle }) => {
  const update = (patch: Partial<CaptionStyle>) => {
    onChange({ ...style, ...patch });
  };

  return (
    <section className="rounded-2xl border border-white/[0.07] bg-white/[0.02]">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left"
      >
        <span className="flex items-center gap-2.5">
          <Captions className="h-4 w-4 text-zinc-400" />

          <span className="text-[11px] font-semibold text-zinc-200">
            AI captions
          </span>

          <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[8px] font-bold text-zinc-500">
            {style.enabled ? "On" : "Off"}
          </span>
        </span>

        <ChevronDown
          className={`h-4 w-4 text-zinc-500 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="space-y-4 border-t border-white/[0.06] px-4 py-4">
          <label className="flex items-center justify-between">
            <span className="text-[10px] text-zinc-500">
              Burn captions into full video
            </span>

            <button
              type="button"
              role="switch"
              aria-checked={style.enabled}
              disabled={disabled}
              onClick={() => update({ enabled: !style.enabled })}
              className={`relative h-5 w-9 rounded-full border transition-colors disabled:opacity-40 ${
                style.enabled
                  ? "border-white/30 bg-white"
                  : "border-white/10 bg-white/[0.08]"
              }`}
            >
              <span
                className={`absolute top-1/2 h-3.5 w-3.5 -translate-y-1/2 rounded-full transition-all ${
                  style.enabled
                    ? "left-[18px] bg-black"
                    : "left-1 bg-white"
                }`}
              />
            </button>
          </label>

          {style.enabled && (
            <>
              <div>
                <p className="mb-2 text-[9px] font-semibold uppercase tracking-wide text-zinc-600">
                  Highlight color
                </p>

                <div className="flex flex-wrap gap-2">
                  {CAPTION_HIGHLIGHT_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      type="button"
                      disabled={disabled}
                      title={preset.label}
                      onClick={() => update({ highlightColor: preset.value })}
                      className={`h-6 w-6 rounded-full border-2 transition disabled:opacity-40 ${
                        style.highlightColor.toUpperCase() ===
                        preset.value.toUpperCase()
                          ? "border-white scale-110"
                          : "border-white/20 hover:border-white/50"
                      }`}
                      style={{ background: preset.value }}
                    />
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-600">
                    Font
                  </p>

                  <select
                    value={style.font}
                    disabled={disabled}
                    onChange={(event) => update({ font: event.target.value })}
                    className="w-full rounded-lg border border-white/10 bg-black/30 px-2.5 py-2 text-[10px] text-white outline-none disabled:opacity-40"
                  >
                    {CAPTION_FONTS.map((font) => (
                      <option key={font} value={font} className="bg-[#0a0a0e]">
                        {font}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-wide text-zinc-600">
                    Position
                  </p>

                  <div className="flex overflow-hidden rounded-lg border border-white/10">
                    {(["top", "center", "bottom"] as const).map((position) => (
                      <button
                        key={position}
                        type="button"
                        disabled={disabled}
                        onClick={() => update({ position })}
                        className={`flex-1 py-2 text-[9px] font-semibold capitalize transition disabled:opacity-40 ${
                          style.position === position
                            ? "bg-white text-black"
                            : "bg-transparent text-zinc-500 hover:bg-white/[0.05]"
                        }`}
                      >
                        {position}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </section>
  );
};

/* =========================================================
   COMPONENT
========================================================= */

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  credits = 0,
  initialUrl = "",
  initialTitle = "",
}) => {
  const [sourceType, setSourceType] = useState<SourceType>("youtube");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [projectTitle, setProjectTitle] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [dragActive, setDragActive] = useState(false);

  const [uploadState, setUploadState] = useState<UploadState>({
    progress: 0,
    stage: "idle",
    message: "",
  });

  const [isFocused, setIsFocused] = useState(false);
  const [captionOpen, setCaptionOpen] = useState(false);

  const [captionStyle, setCaptionStyle] = useState<CaptionStyle>(
    DEFAULT_CAPTION_STYLE,
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const modalRef = useRef<HTMLDivElement | null>(null);
  const urlInputRef = useRef<HTMLInputElement | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /* =======================================================
     DERIVED
  ======================================================= */

  const dashboardUrl = useMemo(() => cleanUrl(initialUrl), [initialUrl]);
  const hasInitialUrl = Boolean(dashboardUrl);
  const insufficientCredits = credits < MIN_CREDITS;
  const youtubeValid = isValidYouTubeUrl(youtubeUrl);
  const podcastValid = isValidHttpUrl(youtubeUrl);

  const sourceReady =
    sourceType === "file"
      ? Boolean(selectedFile)
      : sourceType === "youtube"
        ? youtubeValid
        : podcastValid;

  const canSubmit = !loading && !insufficientCredits && sourceReady;

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
    setCaptionOpen(false);
    setCaptionStyle(DEFAULT_CAPTION_STYLE);

    setUploadState({ progress: 0, stage: "idle", message: "" });

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
    setSelectedFile(null);
    setDragActive(false);

    setUploadState({ progress: 0, stage: "idle", message: "" });

    if (dashboardUrl) {
      setSourceType("youtube");
      setYoutubeUrl(dashboardUrl);
    } else {
      setSourceType("youtube");
      setYoutubeUrl("");
    }

    setProjectTitle(initialTitle?.trim() || "");

    const frame = requestAnimationFrame(() => {
      urlInputRef.current?.focus();
    });

    return () => cancelAnimationFrame(frame);
  }, [isOpen, dashboardUrl, initialTitle]);

  /* =======================================================
     BODY LOCK
  ======================================================= */

  useEffect(() => {
    if (!isOpen) return;

    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previous;
    };
  }, [isOpen]);

  /* =======================================================
     KEYBOARD
  ======================================================= */

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !loading) {
        handleClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const handleSourceChange = (type: SourceType) => {
    if (loading) return;

    setSourceType(type);
    setError("");

    setUploadState({ progress: 0, stage: "idle", message: "" });

    if (type === "file") {
      setYoutubeUrl("");
    } else {
      setSelectedFile(null);

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }

      if (type === "youtube" && dashboardUrl) {
        setYoutubeUrl(dashboardUrl);
      }

      window.setTimeout(() => urlInputRef.current?.focus(), 50);
    }
  };

  /* =======================================================
     FILE
  ======================================================= */

  const processSelectedFile = (file: File | null) => {
    if (!file || loading) return;

    const validationError = validateVideoFile(file);

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
      setProjectTitle(file.name.replace(/\.[^/.]+$/, ""));
    }
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    processSelectedFile(event.target.files?.[0] || null);
  };

  /* =======================================================
     DRAG
  ======================================================= */

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (!loading) setDragActive(true);
  };

  const handleDragLeave = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    setDragActive(false);
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();

    setDragActive(false);

    if (loading) return;

    processSelectedFile(event.dataTransfer.files?.[0] || null);
  };

  const removeSelectedFile = () => {
    if (loading) return;

    setSelectedFile(null);

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  /* =======================================================
     UPLOAD STATE
  ======================================================= */

  const handleUploadStage = (stage: UploadStage, message: string) => {
    setUploadState((current) => ({ ...current, stage, message }));
  };

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = async () => {
    if (loading) return;

    setError("");

    if (credits < MIN_CREDITS) {
      setError(
        `You need at least ${MIN_CREDITS} credits to create a project.`,
      );
      return;
    }

    const finalUrl = cleanUrl(youtubeUrl);

    if (sourceType === "youtube") {
      if (!finalUrl) {
        setError("Please enter a YouTube URL.");
        return;
      }

      if (!isValidYouTubeUrl(finalUrl)) {
        setError("Please enter a valid YouTube video, Shorts or Live URL.");
        return;
      }
    }

    if (sourceType === "podcast") {
      if (!finalUrl) {
        setError("Please enter a podcast URL.");
        return;
      }

      if (!isValidHttpUrl(finalUrl)) {
        setError("Please enter a valid podcast URL.");
        return;
      }
    }

    if (sourceType === "file" && !selectedFile) {
      setError("Please select a video file.");
      return;
    }

    setLoading(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Please log in before creating a project.");
      }

      let data: ApiResponse | null = null;

      /* =================================================
         FILE
      ================================================= */

      if (sourceType === "file" && selectedFile) {
        const controller = new AbortController();
        abortControllerRef.current = controller;

        setUploadState({
          progress: 0,
          stage: "preparing",
          message: "Preparing secure upload",
        });

        data = await uploadVideoWithProgress({
          file: selectedFile,
          projectName: projectTitle.trim() || selectedFile.name,
          accessToken: session.access_token,
          captionStyle,
          signal: controller.signal,

          onProgress: (progress) => {
            setUploadState((current) => ({ ...current, progress }));
          },

          onStage: handleUploadStage,
        });
      }

      /* =================================================
         URL
      ================================================= */

      else {
        setUploadState({
          progress: 0,
          stage: "processing",
          message: "Starting AI processing",
        });

        const response = await fetch("/api/projects/process", {
          method: "POST",

          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },

          body: JSON.stringify({
            name: projectTitle.trim() || "LumoClip Project",
            sourceType: sourceType === "podcast" ? "podcast" : "youtube",
            sourceUrl: finalUrl,
            mode: "full_video_caption",
            captionStyle,
          }),
        });

        const responseData = await parseResponse(response);

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
        message: "Your project is being processed",
      });

      onSuccess?.(data);

      resetForm();
      onClose();
    } catch (err) {
      console.error("[LumoClip] New project error:", err);

      const message =
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.";

      setError(message);

      setUploadState((current) => ({
        ...current,
        stage: "error",
        message: "Something went wrong",
      }));
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  /* =======================================================
     URL ENTER
  ======================================================= */

  const handleUrlKeyDown = (
    event: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (event.key === "Enter" && !loading) {
      event.preventDefault();
      void handleSubmit();
    }
  };

  /* =======================================================
     CLOSED
  ======================================================= */

  if (!isOpen) return null;

  /* =======================================================
     RENDER — Opus-simple: just source, link/upload, submit
  ======================================================= */

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/80 px-4 py-6 backdrop-blur-xl"
      role="dialog"
      aria-modal="true"
      aria-labelledby="new-project-title"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div
        ref={modalRef}
        tabIndex={-1}
        className="relative flex w-full max-w-[520px] max-h-[90vh] flex-col overflow-hidden rounded-[26px] border border-white/[0.09] bg-[#0a0a0d] shadow-[0_40px_140px_rgba(0,0,0,0.7)] outline-none"
      >
        {/* HEADER */}

        <header className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-4">
          <h2
            id="new-project-title"
            className="text-sm font-bold text-white"
          >
            New project
          </h2>

          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            aria-label="Close new project dialog"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {/* BODY */}

        <main className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          <div className="space-y-4 px-5 py-5">
            {/* SOURCE TABS */}

            <div className="flex flex-wrap gap-2">
              <SourceTab
                active={sourceType === "youtube"}
                disabled={loading}
                icon={<Youtube className="h-3.5 w-3.5" />}
                label="YouTube"
                onClick={() => handleSourceChange("youtube")}
              />

              <SourceTab
                active={sourceType === "podcast"}
                disabled={loading}
                icon={<Mic className="h-3.5 w-3.5" />}
                label="Podcast"
                onClick={() => handleSourceChange("podcast")}
              />

              <SourceTab
                active={sourceType === "file"}
                disabled={loading}
                icon={<Upload className="h-3.5 w-3.5" />}
                label="Upload"
                onClick={() => handleSourceChange("file")}
              />
            </div>

            {/* URL */}

            {(sourceType === "youtube" || sourceType === "podcast") &&
              (hasInitialUrl && sourceType === "youtube" ? (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                    <Link2 className="h-4 w-4 text-emerald-400" />
                  </div>

                  <p className="min-w-0 flex-1 truncate text-[11px] font-medium text-zinc-300">
                    {youtubeUrl}
                  </p>

                  <Check className="h-4 w-4 shrink-0 text-emerald-400" />
                </div>
              ) : (
                <div
                  className={`relative rounded-2xl border bg-white/[0.02] transition ${
                    isFocused
                      ? "border-white/25"
                      : (sourceType === "youtube" ? youtubeValid : podcastValid)
                        ? "border-emerald-500/25"
                        : "border-white/[0.08]"
                  }`}
                >
                  <Link2
                    className={`absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 ${
                      isFocused ? "text-white" : "text-zinc-600"
                    }`}
                  />

                  <input
                    id="source-url"
                    ref={urlInputRef}
                    type="url"
                    inputMode="url"
                    autoComplete="url"
                    value={youtubeUrl}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    onChange={(event) => {
                      setYoutubeUrl(event.target.value);
                      if (error) setError("");
                    }}
                    onKeyDown={handleUrlKeyDown}
                    disabled={loading}
                    placeholder={
                      sourceType === "youtube"
                        ? "Paste a YouTube link..."
                        : "Paste a podcast episode URL..."
                    }
                    className="w-full rounded-2xl bg-transparent py-3.5 pl-10 pr-10 text-[12px] font-medium text-white outline-none placeholder:text-zinc-700 disabled:cursor-not-allowed"
                  />

                  {(sourceType === "youtube" ? youtubeValid : podcastValid) && (
                    <CheckCircle2 className="absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-emerald-400" />
                  )}
                </div>
              ))}

            {/* UPLOAD */}

            {sourceType === "file" &&
              (!selectedFile ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      fileInputRef.current?.click();
                    }
                  }}
                  className={`flex min-h-[150px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed p-6 text-center transition ${
                    dragActive
                      ? "border-white/40 bg-white/[0.05]"
                      : "border-white/[0.12] bg-white/[0.015] hover:border-white/25 hover:bg-white/[0.03]"
                  }`}
                >
                  <Upload className="h-5 w-5 text-zinc-500" />

                  <p className="mt-3 text-[11px] font-semibold text-zinc-300">
                    {dragActive ? "Drop your video" : "Drop video or click to upload"}
                  </p>

                  <p className="mt-1 text-[9px] text-zinc-600">
                    MP4, MOV, AVI, WEBM, MKV · up to 500MB
                  </p>
                </div>
              ) : (
                <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-3.5">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10">
                    <FileCheck2 className="h-4 w-4 text-emerald-400" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[11px] font-semibold text-white">
                      {selectedFile.name}
                    </p>

                    <p className="mt-0.5 text-[9px] text-zinc-600">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={removeSelectedFile}
                    disabled={loading}
                    aria-label="Remove selected file"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-zinc-600 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

            <input
              ref={fileInputRef}
              type="file"
              accept=".mp4,.mov,.avi,.webm,.mpeg,.mpg,.mkv,video/*"
              onChange={handleFileChange}
              disabled={loading}
              className="hidden"
            />

            {/* TITLE */}

            <input
              type="text"
              maxLength={MAX_TITLE_LENGTH}
              value={projectTitle}
              onChange={(event) => setProjectTitle(event.target.value)}
              disabled={loading}
              placeholder="Project title (optional)"
              className="w-full rounded-2xl border border-white/[0.08] bg-white/[0.02] px-4 py-3 text-[11px] font-medium text-white outline-none transition placeholder:text-zinc-700 focus:border-white/20 disabled:cursor-not-allowed"
            />

            {/* CAPTIONS */}

            <CaptionStylePicker
              style={captionStyle}
              onChange={setCaptionStyle}
              disabled={loading}
              open={captionOpen}
              onToggle={() => setCaptionOpen((value) => !value)}
            />

            {/* ERROR */}

            {error && (
              <div
                role="alert"
                className="flex items-start gap-2.5 rounded-2xl border border-red-500/20 bg-red-500/[0.06] p-3.5"
              >
                <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />

                <p className="text-[10px] leading-5 text-red-300/90">
                  {error}
                </p>
              </div>
            )}

            {/* UPLOAD PROGRESS */}

            {loading && sourceType === "file" && (
              <div>
                <div className="mb-2 flex items-center justify-between text-[9px] text-zinc-500">
                  <span className="flex items-center gap-1.5">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    {uploadState.message || "Uploading"}
                  </span>

                  <span className="font-bold text-white">
                    {uploadState.progress}%
                  </span>
                </div>

                <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-white transition-[width] duration-200 ease-out"
                    style={{ width: `${uploadState.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </main>

        {/* FOOTER */}

        <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-white/[0.06] px-5 py-4">
          <button
            type="button"
            onClick={handleClose}
            disabled={loading}
            className="rounded-xl px-4 py-2.5 text-[10px] font-bold text-zinc-500 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={() => {
              void handleSubmit();
            }}
            disabled={!canSubmit}
            className="group inline-flex min-w-[150px] items-center justify-center gap-2 rounded-xl bg-white px-5 py-2.5 text-[10px] font-bold text-black transition-all duration-200 hover:bg-zinc-200 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35"
          >
            {loading ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="truncate">
                  {uploadState.message || "Starting..."}
                </span>
              </>
            ) : insufficientCredits ? (
              <span>Not enough credits</span>
            ) : (
              <>
                <Sparkles className="h-3.5 w-3.5" />
                <span>Generate Full Video</span>
                <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
              </>
            )}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default NewProjectModal;