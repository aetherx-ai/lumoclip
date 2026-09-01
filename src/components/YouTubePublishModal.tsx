import React, { useMemo, useState } from "react";
import { CheckCircle2, Loader2, Upload, X } from "lucide-react";
import type { Clip } from "../types";
import { supabase } from "../lib/supabase";

type PrivacyStatus = "private" | "public" | "unlisted";

interface YouTubePublishModalProps {
  clip: Clip;
  onClose: () => void;
}

interface PublishResult {
  videoId: string;
  url: string;
}

export const YouTubePublishModal: React.FC<YouTubePublishModalProps> = ({
  clip,
  onClose,
}) => {
  const defaultDescription = useMemo(() => {
    const caption = clip.captions?.youtube_shorts || clip.transcript_snippet || "";
    const hashtags = (clip.hashtags || [])
      .map((tag) => (tag.startsWith("#") ? tag : `#${tag}`))
      .join(" ");
    const cta = clip.cta ? `\n\n${clip.cta}` : "";
    return `${caption}${cta}${hashtags ? `\n\n${hashtags}` : ""}`.trim();
  }, [clip]);

  const [title, setTitle] = useState(clip.title.slice(0, 100));
  const [description, setDescription] = useState(defaultDescription.slice(0, 5000));
  const [privacyStatus, setPrivacyStatus] = useState<PrivacyStatus>("private");
  const [connected, setConnected] = useState<boolean | null>(null);
  const [loadingStatus, setLoadingStatus] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<PublishResult | null>(null);

  React.useEffect(() => {
    let active = true;

    const loadStatus = async () => {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (!token) throw new Error("Your session has expired. Please sign in again.");

        const response = await fetch("/api/social/youtube/status", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json();
        if (!response.ok) throw new Error(payload.error || "Could not check YouTube connection.");
        if (active) setConnected(Boolean(payload.connected));
      } catch (err: any) {
        if (active) setError(err?.message || "Could not check YouTube connection.");
      } finally {
        if (active) setLoadingStatus(false);
      }
    };

    void loadStatus();
    return () => {
      active = false;
    };
  }, []);

  const connectYouTube = async () => {
    setError("");
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your session has expired. Please sign in again.");

      const response = await fetch("/api/social/youtube/connect", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const payload = await response.json();
      if (!response.ok || !payload.url) {
        throw new Error(payload.error || "Could not start YouTube connection.");
      }
      window.location.assign(payload.url);
    } catch (err: any) {
      setError(err?.message || "Could not connect YouTube.");
    }
  };

  const publish = async () => {
    if (!title.trim()) {
      setError("A title is required.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) throw new Error("Your session has expired. Please sign in again.");

      const tags = (clip.hashtags || [])
        .map((tag) => tag.trim().replace(/^#/, ""))
        .filter(Boolean)
        .slice(0, 500);

      const response = await fetch("/api/social/youtube/upload", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          clipId: clip.id,
          title: title.trim().slice(0, 100),
          description: description.trim().slice(0, 5000),
          tags,
          privacyStatus,
        }),
      });

      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "YouTube upload failed.");

      setResult({ videoId: payload.videoId, url: payload.url });
    } catch (err: any) {
      setError(err?.message || "YouTube upload failed.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#09090d] p-5 text-white shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-red-400">
              YouTube Shorts
            </p>
            <h2 className="mt-1 text-lg font-semibold">Publish your generated clip</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        {result ? (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-5 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
            <h3 className="mt-3 font-semibold">Published successfully</h3>
            <a href={result.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-black hover:bg-zinc-200">
              Open on YouTube
            </a>
          </div>
        ) : loadingStatus ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-500">
            <Loader2 className="h-4 w-4 animate-spin" /> Checking YouTube connection…
          </div>
        ) : !connected ? (
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
            <p className="text-sm text-zinc-300">Connect your YouTube channel before publishing this Short.</p>
            <button type="button" onClick={connectYouTube} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-red-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-red-400">
              Connect YouTube
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Title</span>
              <input value={title} maxLength={100} onChange={(event) => setTitle(event.target.value)} className="w-full rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none focus:border-red-400/60" />
              <span className="mt-1 block text-right text-[10px] text-zinc-600">{title.length}/100</span>
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Description</span>
              <textarea value={description} maxLength={5000} rows={6} onChange={(event) => setDescription(event.target.value)} className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5 text-sm outline-none focus:border-red-400/60" />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-[10px] font-bold uppercase tracking-wider text-zinc-500">Visibility</span>
              <select value={privacyStatus} onChange={(event) => setPrivacyStatus(event.target.value as PrivacyStatus)} className="w-full rounded-xl border border-white/10 bg-[#111116] px-3 py-2.5 text-sm outline-none focus:border-red-400/60">
                <option value="private">Private</option>
                <option value="unlisted">Unlisted</option>
                <option value="public">Public</option>
              </select>
            </label>

            <button type="button" disabled={submitting} onClick={publish} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-red-500 px-4 py-3 text-xs font-bold text-white hover:bg-red-400 disabled:cursor-not-allowed disabled:opacity-60">
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              {submitting ? "Publishing…" : "Publish to YouTube Shorts"}
            </button>
          </div>
        )}

        {error && <p className="mt-4 rounded-xl border border-red-400/20 bg-red-400/10 p-3 text-xs text-red-200">{error}</p>}
      </div>
    </div>
  );
};

export default YouTubePublishModal;

/*
  Adjust these two imports to match your project paths:
  ../src/types.js
  ../src/lib/supabase.js
*/
