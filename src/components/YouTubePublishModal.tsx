import React, { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Link2,
  Loader2,
  RefreshCw,
  Upload,
  X,
  Youtube,
} from "lucide-react";
import { supabase } from "../lib/supabase.js";

/**
 * A PublishTarget is anything we can push to YouTube: either a single
 * generated short clip, or the full captioned video for a project.
 * `kind` tells the backend which record to look up (`clipId` vs
 * `projectId`) when it goes to fetch the actual media file to upload.
 */
export interface PublishTarget {
  id: string;
  title: string;
  caption?: string;
  kind: "clip" | "full_video";
}

interface YouTubePublishModalProps {
  target: PublishTarget | null;
  open: boolean;
  onClose: () => void;
}

type PrivacyStatus = "private" | "public" | "unlisted";

interface YouTubeStatusResponse {
  connected?: boolean;
  provider?: string;
  account?: {
    id?: string;
    name?: string;
    avatar?: string;
  };
  error?: string;
}

interface YouTubeUploadResponse {
  success?: boolean;
  provider?: string;
  videoId?: string;
  url?: string;
  message?: string;
  error?: string;
}

function targetTitle(target: PublishTarget) {
  return String(target.title || "LumoClip Short").trim();
}

function targetCaption(target: PublishTarget) {
  return String(target.caption || "").trim();
}

function normalizeTags(value: string): string[] {
  return value
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.replace(/^#/, ""))
    .filter(Boolean)
    .slice(0, 30);
}

function defaultDescription(target: PublishTarget) {
  const caption = targetCaption(target);

  if (caption) {
    return `${caption}\n\nCreated with LumoClip AI.\n#shorts #lumoClip`;
  }

  return "Created with LumoClip AI.\n\n#shorts #lumoClip";
}

function defaultTags() {
  return "shorts, youtube shorts, viral, lumoClip, short form";
}

export const YouTubePublishModal: React.FC<
  YouTubePublishModalProps
> = ({ target, open, onClose }) => {
  const [connected, setConnected] = useState(false);
  const [accountName, setAccountName] = useState("");
  const [accountAvatar, setAccountAvatar] = useState("");

  const [checkingStatus, setCheckingStatus] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [privacyStatus, setPrivacyStatus] =
    useState<PrivacyStatus>("public");

  const [publishedUrl, setPublishedUrl] = useState("");
  const [error, setError] = useState("");

  const tagCount = useMemo(
    () => normalizeTags(tags).length,
    [tags],
  );

  const getAccessToken = async () => {
    const { data, error: sessionError } =
      await supabase.auth.getSession();

    if (sessionError) {
      throw sessionError;
    }

    const token = data.session?.access_token;

    if (!token) {
      throw new Error(
        "Your login session has expired. Please sign in again.",
      );
    }

    return token;
  };

  const apiFetch = async (
    url: string,
    init: RequestInit = {},
  ) => {
    const token = await getAccessToken();
    const headers = new Headers(init.headers || {});

    headers.set("Authorization", `Bearer ${token}`);

    if (init.body && !headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }

    return fetch(url, {
      ...init,
      headers,
    });
  };

  const checkYouTubeStatus = async () => {
    setCheckingStatus(true);
    setError("");

    try {
      const response = await apiFetch(
        "/api/social/youtube/status",
      );

      const data =
        (await response.json()) as YouTubeStatusResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to check YouTube connection.",
        );
      }

      const isConnected = data.connected === true;

      setConnected(isConnected);
      setAccountName(data.account?.name || "");
      setAccountAvatar(data.account?.avatar || "");
    } catch (err: any) {
      console.error("YouTube status check failed:", err);
      setConnected(false);
      setError(
        err?.message ||
          "Failed to check YouTube connection.",
      );
    } finally {
      setCheckingStatus(false);
    }
  };

  useEffect(() => {
    if (!open || !target) return;

    setTitle(targetTitle(target).slice(0, 100));
    setDescription(
      defaultDescription(target).slice(0, 5000),
    );
    setTags(defaultTags());
    setPrivacyStatus("public");
    setPublishedUrl("");
    setError("");
    setConnected(false);
    setAccountName("");
    setAccountAvatar("");

    void checkYouTubeStatus();
  }, [open, target?.id, target?.kind]);

  const connectYouTube = async () => {
    setConnecting(true);
    setError("");

    try {
      const response = await apiFetch(
        "/api/social/youtube/connect",
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to start YouTube connection.",
        );
      }

      if (!data?.url) {
        throw new Error(
          "YouTube authorization URL was not returned.",
        );
      }

      window.location.assign(data.url);
    } catch (err: any) {
      console.error("YouTube connect failed:", err);
      setError(
        err?.message ||
          "Failed to connect YouTube.",
      );
      setConnecting(false);
    }
  };

  const publishToYouTube = async () => {
    if (!target?.id) {
      setError("Nothing selected to publish.");
      return;
    }

    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setError("Please enter a YouTube title.");
      return;
    }

    if (!connected) {
      setError("Connect your YouTube channel first.");
      return;
    }

    setPublishing(true);
    setError("");
    setPublishedUrl("");

    try {
      // The backend exposes two separate endpoints: one for a single
      // generated clip (clipId) and one for the full captioned video
      // (projectId). Route to the right one based on the target kind.
      const endpoint =
        target.kind === "clip"
          ? "/api/social/youtube/upload"
          : "/api/social/youtube/upload-project";

      const body: Record<string, unknown> = {
        title: cleanTitle.slice(0, 100),
        description: description.trim().slice(0, 5000),
        tags: normalizeTags(tags),
        privacyStatus,
      };

      if (target.kind === "clip") {
        body.clipId = target.id;
      } else {
        body.projectId = target.id;
      }

      const response = await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(body),
      });

      const data =
        (await response.json()) as YouTubeUploadResponse;

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to publish to YouTube.",
        );
      }

      if (!data.url) {
        throw new Error(
          "YouTube upload completed, but no video URL was returned.",
        );
      }

      setPublishedUrl(data.url);
    } catch (err: any) {
      console.error("YouTube publish failed:", err);
      setError(
        err?.message ||
          "Failed to publish to YouTube.",
      );
    } finally {
      setPublishing(false);
    }
  };

  if (!open || !target) return null;

  const isFullVideo = target.kind === "full_video";

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget &&
          !publishing &&
          !connecting
        ) {
          onClose();
        }
      }}
    >
      <div className="relative flex max-h-[92vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/[0.09] bg-[#0a0a0f] shadow-[0_30px_100px_rgba(0,0,0,0.65)]">
        <div className="flex shrink-0 items-center justify-between border-b border-white/[0.06] px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-red-400/15 bg-red-500/[0.08]">
              <Youtube className="h-5 w-5 text-red-400" />
            </div>

            <div className="min-w-0">
              <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-red-400">
                Publish
              </p>
              <h2 className="mt-1 truncate text-base font-semibold text-white">
                {isFullVideo
                  ? "Publish captioned video to YouTube"
                  : "Publish clip to YouTube"}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={publishing || connecting}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.07] bg-white/[0.02] text-zinc-500 transition hover:bg-white/[0.05] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="overflow-y-auto p-5 sm:p-6">
          <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
            <div className="flex items-center gap-3">
              {accountAvatar ? (
                <img
                  src={accountAvatar}
                  alt=""
                  className="h-10 w-10 rounded-full object-cover"
                />
              ) : (
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-500/[0.08]">
                  <Youtube className="h-4 w-4 text-red-400" />
                </div>
              )}

              <div className="min-w-0 flex-1">
                <p className="text-[8px] font-bold uppercase tracking-[0.14em] text-zinc-600">
                  YouTube channel
                </p>

                {checkingStatus ? (
                  <div className="mt-1 flex items-center gap-2 text-[10px] text-zinc-500">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Checking connection...
                  </div>
                ) : connected ? (
                  <p className="mt-1 truncate text-xs font-semibold text-white">
                    {accountName || "Connected channel"}
                  </p>
                ) : (
                  <p className="mt-1 text-[10px] text-zinc-500">
                    Connect your channel before publishing.
                  </p>
                )}
              </div>

              {!checkingStatus && connected && (
                <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-emerald-400/10 bg-emerald-500/[0.07] px-2.5 py-1.5 text-[7px] font-bold uppercase tracking-wider text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  Connected
                </span>
              )}
            </div>

            {!checkingStatus && !connected && (
              <button
                type="button"
                onClick={connectYouTube}
                disabled={connecting}
                className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-[10px] font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {connecting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4" />
                    Connect YouTube
                  </>
                )}
              </button>
            )}
          </div>

          {connected && !publishedUrl && (
            <div className="mt-5 space-y-4">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="youtube-publish-title"
                    className="text-[8px] font-bold uppercase tracking-[0.14em] text-zinc-600"
                  >
                    Title
                  </label>
                  <span className="text-[8px] text-zinc-700">
                    {title.length}/100
                  </span>
                </div>

                <input
                  id="youtube-publish-title"
                  value={title}
                  maxLength={100}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  className="w-full rounded-xl border border-white/[0.07] bg-black/30 px-3.5 py-3 text-xs text-white outline-none placeholder:text-zinc-700 focus:border-violet-400/30 focus:ring-1 focus:ring-violet-400/10"
                  placeholder="Enter your YouTube title"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="youtube-publish-description"
                    className="text-[8px] font-bold uppercase tracking-[0.14em] text-zinc-600"
                  >
                    Description
                  </label>
                  <span className="text-[8px] text-zinc-700">
                    {description.length}/5000
                  </span>
                </div>

                <textarea
                  id="youtube-publish-description"
                  value={description}
                  maxLength={5000}
                  rows={5}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  className="w-full resize-none rounded-xl border border-white/[0.07] bg-black/30 px-3.5 py-3 text-xs leading-5 text-white outline-none placeholder:text-zinc-700 focus:border-violet-400/30 focus:ring-1 focus:ring-violet-400/10"
                  placeholder="Write a YouTube description"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="youtube-publish-tags"
                    className="text-[8px] font-bold uppercase tracking-[0.14em] text-zinc-600"
                  >
                    Tags
                  </label>
                  <span className="text-[8px] text-zinc-700">
                    {tagCount}/30
                  </span>
                </div>

                <input
                  id="youtube-publish-tags"
                  value={tags}
                  onChange={(event) =>
                    setTags(event.target.value)
                  }
                  className="w-full rounded-xl border border-white/[0.07] bg-black/30 px-3.5 py-3 text-xs text-white outline-none placeholder:text-zinc-700 focus:border-violet-400/30 focus:ring-1 focus:ring-violet-400/10"
                  placeholder="shorts, viral, podcast"
                />
              </div>

              <div>
                <label
                  htmlFor="youtube-publish-privacy"
                  className="mb-2 block text-[8px] font-bold uppercase tracking-[0.14em] text-zinc-600"
                >
                  Visibility
                </label>

                <select
                  id="youtube-publish-privacy"
                  value={privacyStatus}
                  onChange={(event) =>
                    setPrivacyStatus(
                      event.target.value as PrivacyStatus,
                    )
                  }
                  className="w-full rounded-xl border border-white/[0.07] bg-black/30 px-3.5 py-3 text-xs text-white outline-none focus:border-violet-400/30 focus:ring-1 focus:ring-violet-400/10"
                >
                  <option value="public">
                    Public — Anyone can watch
                  </option>
                  <option value="unlisted">
                    Unlisted — Anyone with the link
                  </option>
                  <option value="private">
                    Private — Only you
                  </option>
                </select>
              </div>

              <div className="rounded-xl border border-white/[0.05] bg-white/[0.015] px-3.5 py-3">
                <p className="text-[9px] leading-5 text-zinc-600">
                  {isFullVideo
                    ? "LumoClip uploads the full captioned video directly from the server to your connected YouTube channel."
                    : "LumoClip uploads the generated clip directly from the server to your connected YouTube channel."}{" "}
                  Your original file does not need to be uploaded again from
                  the browser.
                </p>
              </div>

              <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={publishing}
                  className="flex-1 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3 text-[10px] font-semibold text-zinc-500 transition hover:bg-white/[0.05] hover:text-white disabled:opacity-40"
                >
                  Cancel
                </button>

                <button
                  type="button"
                  onClick={publishToYouTube}
                  disabled={publishing || checkingStatus}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-[10px] font-bold text-white transition hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {publishing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Publishing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Publish to YouTube
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {publishedUrl && (
            <div className="mt-5 rounded-2xl border border-emerald-400/10 bg-emerald-500/[0.035] p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/[0.09]">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-emerald-400">
                    Published successfully
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-white">
                    Your video is on YouTube
                  </h3>
                </div>
              </div>

              <div className="mt-4 rounded-xl border border-white/[0.06] bg-black/20 px-3 py-2.5">
                <p className="truncate text-[9px] text-zinc-500">
                  {publishedUrl}
                </p>
              </div>

              <div className="mt-3 flex gap-2">
                <a
                  href={publishedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-[10px] font-bold text-black transition hover:bg-zinc-200"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View on YouTube
                </a>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-white/[0.07] bg-white/[0.02] px-5 py-3 text-[10px] font-semibold text-zinc-400 transition hover:bg-white/[0.05] hover:text-white"
                >
                  Done
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="mt-4 rounded-xl border border-red-400/10 bg-red-500/[0.045] px-3.5 py-3">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-[9px] leading-5 text-red-300">
                    {error}
                  </p>

                  <button
                    type="button"
                    onClick={() => {
                      setError("");
                      void checkYouTubeStatus();
                    }}
                    className="mt-2 inline-flex items-center gap-1.5 text-[8px] font-bold uppercase tracking-wider text-zinc-500 transition hover:text-white"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Retry
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default YouTubePublishModal;