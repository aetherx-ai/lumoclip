import React, {
  useEffect,
  useRef,
  useState,
} from "react";

import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Globe,
  Link2,
  Loader2,
  Lock,
  Send,
  Users,
  X,
  Youtube,
} from "lucide-react";

import { supabase } from "../lib/supabase";

/* =========================================================
   TYPES
========================================================= */

type PrivacyStatus = "private" | "unlisted" | "public";

type PublishTarget =
  | {
      kind: "clip";
      clipId: string;
      defaultTitle: string;
      defaultDescription?: string;
    }
  | {
      kind: "project";
      projectId: string;
      defaultTitle: string;
      defaultDescription?: string;
    };

interface YouTubePublishModalProps {
  open: boolean;
  onClose: () => void;
  target: PublishTarget;
}

interface YouTubeAccount {
  id: string;
  name: string;
  avatar: string;
}

type ConnectionState =
  | "checking"
  | "disconnected"
  | "connecting"
  | "connected";

type PublishState =
  | "idle"
  | "publishing"
  | "success"
  | "error";

/* =========================================================
   HELPERS
========================================================= */

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Please log in first.");
  }

  return session.access_token;
}

async function parseJson(response: Response): Promise<any> {
  const text = await response.text();

  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      "The server returned an invalid response.",
    );
  }
}

/* =========================================================
   PRIVACY OPTION
========================================================= */

const PRIVACY_OPTIONS: {
  value: PrivacyStatus;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    value: "private",
    label: "Private",
    description: "Only you can watch",
    icon: Lock,
  },
  {
    value: "unlisted",
    label: "Unlisted",
    description: "Anyone with the link",
    icon: Link2,
  },
  {
    value: "public",
    label: "Public",
    description: "Visible to everyone",
    icon: Globe,
  },
];

/* =========================================================
   COMPONENT
========================================================= */

export const YouTubePublishModal: React.FC<
  YouTubePublishModalProps
> = ({ open, onClose, target }) => {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("checking");

  const [account, setAccount] =
    useState<YouTubeAccount | null>(null);

  const [connectError, setConnectError] =
    useState("");

  const [title, setTitle] = useState(
    target.defaultTitle || "",
  );

  const [description, setDescription] = useState(
    target.defaultDescription || "",
  );

  const [tagsInput, setTagsInput] = useState("");

  const [privacyStatus, setPrivacyStatus] =
    useState<PrivacyStatus>("private");

  const [publishState, setPublishState] =
    useState<PublishState>("idle");

  const [publishError, setPublishError] =
    useState("");

  const [publishedUrl, setPublishedUrl] =
    useState("");

  const popupRef = useRef<Window | null>(null);
  const pollTimerRef = useRef<number | undefined>(
    undefined,
  );

  /* =======================================================
     RESET ON OPEN
  ======================================================= */

  useEffect(() => {
    if (!open) return;

    setTitle(target.defaultTitle || "");
    setDescription(target.defaultDescription || "");
    setTagsInput("");
    setPrivacyStatus("private");
    setPublishState("idle");
    setPublishError("");
    setPublishedUrl("");
    setConnectError("");

    void checkConnection();

    return () => {
      if (pollTimerRef.current !== undefined) {
        window.clearTimeout(pollTimerRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  /* =======================================================
     CONNECTION CHECK
  ======================================================= */

  const checkConnection = async () => {
    setConnectionState((current) =>
      current === "connecting" ? current : "checking",
    );

    try {
      const token = await getAccessToken();

      const response = await fetch(
        "/api/social/youtube/status",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await parseJson(response);

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to check YouTube connection.",
        );
      }

      if (data?.connected) {
        setAccount(
          data.account
            ? {
                id: data.account.id || "",
                name: data.account.name || "YouTube channel",
                avatar: data.account.avatar || "",
              }
            : null,
        );

        setConnectionState("connected");

        if (pollTimerRef.current !== undefined) {
          window.clearTimeout(pollTimerRef.current);
          pollTimerRef.current = undefined;
        }
      } else {
        setAccount(null);
        setConnectionState((current) =>
          current === "connecting" ? current : "disconnected",
        );
      }
    } catch (error) {
      console.error(
        "YouTube status check failed:",
        error,
      );

      setConnectError(
        error instanceof Error
          ? error.message
          : "Couldn't check your YouTube connection.",
      );

      setConnectionState("disconnected");
    }
  };

  /* =======================================================
     CONNECT FLOW
  ======================================================= */

  const handleConnect = async () => {
    setConnectError("");
    setConnectionState("connecting");

    try {
      const token = await getAccessToken();

      const response = await fetch(
        "/api/social/youtube/connect",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await parseJson(response);

      if (!response.ok || !data?.url) {
        throw new Error(
          data?.error ||
            "Couldn't start the YouTube connection.",
        );
      }

      const popup = window.open(
        data.url,
        "lumoclip-youtube-connect",
        "width=520,height=680,noopener,noreferrer",
      );

      popupRef.current = popup;

      // Poll for the connection to complete instead of relying on the
      // popup posting a message back — the OAuth callback happens on
      // our own backend, not in a page we control.
      let attempts = 0;
      const MAX_ATTEMPTS = 90; // ~3 minutes at 2s intervals

      const poll = async () => {
        attempts += 1;

        await checkConnection();

        if (
          popupRef.current &&
          popupRef.current.closed &&
          attempts < MAX_ATTEMPTS
        ) {
          // Popup closed — give one last status check a moment to land,
          // then stop polling either way.
          pollTimerRef.current = window.setTimeout(async () => {
            await checkConnection();
          }, 1200);
          return;
        }

        if (attempts >= MAX_ATTEMPTS) {
          setConnectionState((current) =>
            current === "connected" ? current : "disconnected",
          );
          return;
        }

        pollTimerRef.current = window.setTimeout(poll, 2000);
      };

      pollTimerRef.current = window.setTimeout(poll, 2000);
    } catch (error) {
      console.error("YouTube connect failed:", error);

      setConnectError(
        error instanceof Error
          ? error.message
          : "Couldn't connect to YouTube.",
      );

      setConnectionState("disconnected");
    }
  };

  /* =======================================================
     PUBLISH
  ======================================================= */

  const handlePublish = async () => {
    if (publishState === "publishing") return;

    if (!title.trim()) {
      setPublishError("Please add a title.");
      setPublishState("error");
      return;
    }

    setPublishState("publishing");
    setPublishError("");

    try {
      const token = await getAccessToken();

      const tags = tagsInput
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const endpoint =
        target.kind === "clip"
          ? "/api/social/youtube/upload"
          : "/api/social/youtube/upload-project";

      const body =
        target.kind === "clip"
          ? {
              clipId: target.clipId,
              title: title.trim(),
              description: description.trim(),
              tags,
              privacyStatus,
            }
          : {
              projectId: target.projectId,
              title: title.trim(),
              description: description.trim(),
              tags,
              privacyStatus,
            };

      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
      });

      const data = await parseJson(response);

      if (!response.ok || !data?.url) {
        throw new Error(
          data?.error || "Failed to publish to YouTube.",
        );
      }

      setPublishedUrl(data.url);
      setPublishState("success");
    } catch (error) {
      console.error("YouTube publish failed:", error);

      setPublishError(
        error instanceof Error
          ? error.message
          : "Something went wrong while publishing.",
      );

      setPublishState("error");
    }
  };

  /* =======================================================
     DISCONNECT
  ======================================================= */

  const handleDisconnect = async () => {
    try {
      const token = await getAccessToken();

      await fetch("/api/social/youtube/disconnect", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
    } catch (error) {
      console.error("YouTube disconnect failed:", error);
    } finally {
      setAccount(null);
      setConnectionState("disconnected");
    }
  };

  /* =======================================================
     CLOSE
  ======================================================= */

  const handleClose = () => {
    if (publishState === "publishing") return;
    onClose();
  };

  if (!open) return null;

  const isPublishing = publishState === "publishing";

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center overflow-y-auto bg-black/85 px-3 py-6 backdrop-blur-2xl sm:px-5"
      role="dialog"
      aria-modal="true"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
    >
      <div className="relative flex w-full max-w-[480px] flex-col overflow-hidden rounded-[28px] border border-white/[0.1] bg-[#0a0a0e] shadow-[0_40px_140px_rgba(0,0,0,0.8)]">
        {/* header */}
        <div className="flex items-center justify-between gap-3 border-b border-white/[0.07] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10">
              <Youtube className="h-4.5 w-4.5 text-red-400" />
            </div>

            <div>
              <h2 className="text-sm font-bold text-white">
                Publish to YouTube
              </h2>

              <p className="mt-0.5 text-[9px] text-zinc-600">
                {target.kind === "clip"
                  ? "Uploads this clip directly to your channel"
                  : "Uploads your captioned video directly to your channel"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            disabled={isPublishing}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-white/[0.06] hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-5">
          {/* =================================================
              SUCCESS
          ================================================= */}

          {publishState === "success" ? (
            <div className="flex flex-col items-center py-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-emerald-400/20 bg-emerald-500/10">
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              </div>

              <h3 className="mt-4 text-sm font-bold text-white">
                Published to YouTube
              </h3>

              <p className="mt-1.5 max-w-[320px] text-[10px] leading-5 text-zinc-500">
                Your video is live. It may take a minute to fully
                process on YouTube's side.
              </p>

              <div className="mt-5 flex w-full gap-2">
                <a
                  href={publishedUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-white px-4 py-2.5 text-[10px] font-bold text-black transition hover:bg-zinc-200"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  View on YouTube
                </a>

                <button
                  type="button"
                  onClick={handleClose}
                  className="flex-1 rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-2.5 text-[10px] font-bold text-zinc-300 transition hover:bg-white/[0.06]"
                >
                  Done
                </button>
              </div>
            </div>
          ) : connectionState === "checking" ? (
            /* =================================================
                CHECKING CONNECTION
            ================================================= */
            <div className="flex flex-col items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-zinc-500" />
              <p className="mt-3 text-[10px] text-zinc-600">
                Checking your YouTube connection...
              </p>
            </div>
          ) : connectionState === "disconnected" ||
            connectionState === "connecting" ? (
            /* =================================================
                CONNECT
            ================================================= */
            <div className="flex flex-col items-center py-6 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-red-500/20 bg-red-500/10">
                <Youtube className="h-7 w-7 text-red-400" />
              </div>

              <h3 className="mt-4 text-sm font-bold text-white">
                Connect your YouTube channel
              </h3>

              <p className="mt-1.5 max-w-[320px] text-[10px] leading-5 text-zinc-500">
                LumoClip needs permission to upload videos to your
                channel on your behalf.
              </p>

              {connectError && (
                <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2.5 text-left">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                  <p className="text-[9px] leading-4 text-red-300/90">
                    {connectError}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={handleConnect}
                disabled={connectionState === "connecting"}
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-[10px] font-black text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {connectionState === "connecting" ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Waiting for you to finish in the popup...
                  </>
                ) : (
                  <>
                    <Youtube className="h-3.5 w-3.5 text-red-500" />
                    Connect YouTube
                  </>
                )}
              </button>

              {connectionState === "connecting" && (
                <button
                  type="button"
                  onClick={() => void checkConnection()}
                  className="mt-2 text-[9px] font-semibold text-zinc-600 underline-offset-2 transition hover:text-zinc-300 hover:underline"
                >
                  I finished connecting — check again
                </button>
              )}
            </div>
          ) : (
            /* =================================================
                PUBLISH FORM
            ================================================= */
            <div className="space-y-4">
              {account && (
                <div className="flex items-center justify-between rounded-xl border border-white/[0.07] bg-white/[0.02] px-3 py-2.5">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {account.avatar ? (
                      <img
                        src={account.avatar}
                        alt={account.name}
                        className="h-7 w-7 shrink-0 rounded-full border border-white/10"
                      />
                    ) : (
                      <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                        <Users className="h-3.5 w-3.5 text-red-400" />
                      </div>
                    )}

                    <div className="min-w-0">
                      <p className="truncate text-[10px] font-bold text-white">
                        {account.name}
                      </p>
                      <p className="text-[8px] text-emerald-400/80">
                        Connected
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleDisconnect()}
                    className="shrink-0 text-[8px] font-semibold text-zinc-600 underline-offset-2 transition hover:text-red-400 hover:underline"
                  >
                    Switch account
                  </button>
                </div>
              )}

              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                  Title
                </label>

                <input
                  type="text"
                  value={title}
                  onChange={(event) =>
                    setTitle(event.target.value)
                  }
                  maxLength={100}
                  disabled={isPublishing}
                  placeholder="A catchy title for your video"
                  className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-[11px] font-medium text-white outline-none transition focus:border-red-500/40 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                  Description
                </label>

                <textarea
                  value={description}
                  onChange={(event) =>
                    setDescription(event.target.value)
                  }
                  disabled={isPublishing}
                  rows={3}
                  maxLength={5000}
                  placeholder="What's this video about?"
                  className="mt-1.5 w-full resize-none rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-[10px] leading-5 text-white outline-none transition focus:border-red-500/40 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                  Tags
                  <span className="ml-1.5 font-normal normal-case text-zinc-700">
                    comma separated, optional
                  </span>
                </label>

                <input
                  type="text"
                  value={tagsInput}
                  onChange={(event) =>
                    setTagsInput(event.target.value)
                  }
                  disabled={isPublishing}
                  placeholder="shorts, ai, viral"
                  className="mt-1.5 w-full rounded-xl border border-white/[0.08] bg-white/[0.02] px-3 py-2.5 text-[10px] text-white outline-none transition focus:border-red-500/40 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="text-[9px] font-bold uppercase tracking-wider text-zinc-500">
                  Privacy
                </label>

                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {PRIVACY_OPTIONS.map((option) => {
                    const Icon = option.icon;
                    const active = privacyStatus === option.value;

                    return (
                      <button
                        key={option.value}
                        type="button"
                        disabled={isPublishing}
                        onClick={() =>
                          setPrivacyStatus(option.value)
                        }
                        className={`flex flex-col items-center gap-1 rounded-xl border px-2 py-2.5 text-center transition disabled:cursor-not-allowed disabled:opacity-50 ${
                          active
                            ? "border-red-500/40 bg-red-500/10"
                            : "border-white/[0.07] bg-white/[0.02] hover:border-white/20"
                        }`}
                      >
                        <Icon
                          className={`h-3.5 w-3.5 ${
                            active ? "text-red-300" : "text-zinc-500"
                          }`}
                        />
                        <span
                          className={`text-[8px] font-bold ${
                            active ? "text-red-200" : "text-zinc-400"
                          }`}
                        >
                          {option.label}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <p className="mt-1.5 text-[8px] text-zinc-700">
                  {
                    PRIVACY_OPTIONS.find(
                      (option) => option.value === privacyStatus,
                    )?.description
                  }
                </p>
              </div>

              {publishState === "error" && publishError && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/[0.06] px-3 py-2.5">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
                  <p className="text-[9px] leading-4 text-red-300/90">
                    {publishError}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => void handlePublish()}
                disabled={isPublishing || !title.trim()}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-red-600 to-red-500 px-4 py-3 text-[10px] font-black text-white shadow-[0_10px_30px_rgba(220,38,38,0.25)] transition hover:from-red-500 hover:to-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isPublishing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Publishing to YouTube...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Publish
                  </>
                )}
              </button>

              <p className="text-center text-[8px] text-zinc-700">
                This uploads directly to your connected channel — you
                can still edit or delete it from YouTube Studio anytime.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default YouTubePublishModal;