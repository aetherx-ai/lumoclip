import { supabase } from "../lib/supabase";

import {
  User,
  Project,
  Clip,
  UsageLog,
  Subscription,
} from "../types";

// ======================================================
// TYPES
// ======================================================

type ApiResponse = Record<string, any> | null;

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  project_id?: string | null;
  metadata?: Record<string, any> | null;
  created_at: string;
}

// ======================================================
// API BASE
// ======================================================
//
// IMPORTANT:
// Vite proxy থাকলে frontend থেকে শুধু /api/... ব্যবহার করবে.
// এখানে আর /api যোগ করবে না.
//
// Example:
// authFetch("/api/projects")
// authFetch("/api/projects/123")
//
// NEVER:
// authFetch(`${API_URL}/api/projects`)
//

// ======================================================
// SAFE JSON
// ======================================================

async function parseJsonResponse(
  response: Response
): Promise<ApiResponse> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      "Invalid server response. The server did not return valid JSON."
    );
  }
}

// ======================================================
// YOUTUBE HELPERS
// ======================================================

function getYouTubeVideoId(
  url?: string | null
): string {
  if (!url) {
    return "";
  }

  try {
    const value = url.trim();
    const parsed = new URL(value);

    const hostname =
      parsed.hostname.toLowerCase();

    // youtube.com/watch?v=VIDEO_ID
    if (
      hostname === "youtube.com" ||
      hostname === "www.youtube.com" ||
      hostname === "m.youtube.com"
    ) {
      const videoId =
        parsed.searchParams.get("v");

      if (videoId) {
        return videoId;
      }

      // /shorts/VIDEO_ID
      const shortsMatch =
        parsed.pathname.match(
          /\/shorts\/([^/?#]+)/
        );

      if (shortsMatch?.[1]) {
        return shortsMatch[1];
      }

      // /embed/VIDEO_ID
      const embedMatch =
        parsed.pathname.match(
          /\/embed\/([^/?#]+)/
        );

      if (embedMatch?.[1]) {
        return embedMatch[1];
      }

      // /live/VIDEO_ID
      const liveMatch =
        parsed.pathname.match(
          /\/live\/([^/?#]+)/
        );

      if (liveMatch?.[1]) {
        return liveMatch[1];
      }
    }

    // youtu.be/VIDEO_ID
    if (hostname === "youtu.be") {
      const id =
        parsed.pathname
          .replace(/^\/+/, "")
          .split("/")[0];

      if (id) {
        return id;
      }
    }

    return "";
  } catch {
    const match =
      url.match(
        /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/|live\/)|youtu\.be\/)([^&?#/]+)/
      );

    return match?.[1] || "";
  }
}

function getYouTubeThumbnail(
  url?: string | null
): string {
  const videoId =
    getYouTubeVideoId(url);

  if (!videoId) {
    return "";
  }

  return `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`;
}

// ======================================================
// PROJECT THUMBNAIL
// ======================================================

function getProjectThumbnail(
  project: any
): string {
  const sourceUrl =
    project?.source_url ??
    project?.sourceUrl ??
    project?.youtube_url ??
    project?.youtubeUrl ??
    project?.video_url ??
    project?.videoUrl ??
    "";

  const sourceType = String(
    project?.source_type ??
      project?.sourceType ??
      ""
  ).toLowerCase();

  // YouTube thumbnail
  if (
    sourceType === "youtube" ||
    getYouTubeVideoId(sourceUrl)
  ) {
    const youtubeThumbnail =
      getYouTubeThumbnail(sourceUrl);

    if (youtubeThumbnail) {
      return youtubeThumbnail;
    }
  }

  // Non-YouTube thumbnail
  const existing =
    project?.thumbnail_url ??
    project?.thumbnailUrl ??
    project?.thumbnail ??
    project?.image_url ??
    project?.imageUrl ??
    project?.preview_url ??
    project?.previewUrl ??
    "";

  if (
    typeof existing === "string" &&
    existing.trim()
  ) {
    const thumbnail =
      existing.trim();

    if (
      thumbnail === "thumbnail.jpg" ||
      thumbnail === "/thumbnail.jpg" ||
      thumbnail.endsWith(
        "/thumbnail.jpg"
      )
    ) {
      return "";
    }

    return thumbnail;
  }

  return "";
}

// ======================================================
// NORMALIZE PROJECT
// ======================================================

function normalizeProject(
  rawProject: any
): Project {
  const project =
    rawProject ?? {};

  const thumbnail =
    getProjectThumbnail(project);

  const rawProgress =
    Number(
      project.progress ??
        project.processing_progress ??
        project.processingProgress ??
        0
    );

  const progress =
    Number.isFinite(rawProgress)
      ? Math.min(
          100,
          Math.max(
            0,
            Math.round(rawProgress)
          )
        )
      : 0;

  const rawClipCount =
    Number(
      project.clip_count ??
        project.clipCount ??
        project.total_clips ??
        project.totalClips ??
        project.clips_count ??
        0
    );

  const clipCount =
    Number.isFinite(rawClipCount)
      ? Math.max(
          0,
          Math.round(rawClipCount)
        )
      : 0;

  const duration =
    Number(project.duration);

  return {
    ...project,

    id: project.id,

    name:
      project.name ||
      "Untitled Project",

    status:
      String(
        project.status ??
          "completed"
      ).toLowerCase(),

    source_type:
      project.source_type ??
      project.sourceType ??
      "youtube",

    source_url:
      project.source_url ??
      project.sourceUrl ??
      "",

    thumbnail_url:
      thumbnail,

    thumbnailUrl:
      thumbnail,

    progress,

    clip_count:
      clipCount,

    total_clips:
      clipCount,

    duration:
      Number.isFinite(duration)
        ? duration
        : null,

    current_step:
      project.current_step ??
      project.currentStep ??
      "",
  } as Project;
}

// ======================================================
// NORMALIZE CLIP
// ======================================================

function normalizeClip(
  rawClip: any
): Clip {
  const clip =
    rawClip ?? {};

  const rawScore =
    clip.viral_score ??
    clip.viralScore ??
    clip.score;

  const score =
    Number(rawScore);

  const finalScore =
    Number.isFinite(score)
      ? Math.max(
          0,
          Math.min(
            100,
            Math.round(score)
          )
        )
      : 0;

  const rawStart =
    clip.start_time ??
    clip.startTime ??
    clip.start ??
    0;

  const startTime =
    Number(rawStart);

  const safeStart =
    Number.isFinite(startTime)
      ? Math.max(
          0,
          startTime
        )
      : 0;

  const rawEnd =
    clip.end_time ??
    clip.endTime ??
    clip.end ??
    0;

  const endTime =
    Number(rawEnd);

  const safeEnd =
    Number.isFinite(endTime)
      ? Math.max(
          safeStart,
          endTime
        )
      : safeStart;

  const rawDuration =
    Number(clip.duration);

  const duration =
    Number.isFinite(
      rawDuration
    ) &&
    rawDuration > 0
      ? rawDuration
      : Math.max(
          0,
          safeEnd - safeStart
        );

  const videoUrl =
    clip.video_url ??
    clip.videoUrl ??
    clip.output_url ??
    clip.outputUrl ??
    "";

  const existingThumbnail =
    clip.thumbnail_url ??
    clip.thumbnailUrl ??
    clip.thumbnail ??
    clip.image_url ??
    clip.imageUrl ??
    "";

  const thumbnailUrl =
    typeof existingThumbnail ===
      "string" &&
    existingThumbnail.trim()
      ? existingThumbnail.trim()
      : "";

  const title =
    clip.title ||
    clip.name ||
    "Viral Clip";

  const reason =
    clip.reason ||
    clip.description ||
    "Strong short-form moment.";

  const caption =
    clip.caption ||
    clip.description ||
    "";

  return {
    ...clip,

    id:
      clip.id,

    project_id:
      clip.project_id ??
      clip.projectId,

    user_id:
      clip.user_id ??
      clip.userId,

    title,

    reason,

    caption,

    start_time:
      safeStart,

    end_time:
      safeEnd,

    duration,

    video_url:
      videoUrl,

    thumbnail_url:
      thumbnailUrl,

    viral_score:
      finalScore,

    score:
      finalScore,
  } as Clip;
}

// ======================================================
// AUTH TOKEN
// ======================================================

async function getAccessToken(): Promise<string> {
  const {
    data: { session },
  } =
    await supabase.auth.getSession();

  if (
    !session?.access_token
  ) {
    throw new Error(
      "Not authenticated"
    );
  }

  return session.access_token;
}

// ======================================================
// AUTHENTICATED FETCH
// ======================================================

async function authFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const token =
    await getAccessToken();

  // -----------------------------------------------
  // IMPORTANT DOUBLE /api PROTECTION
  // -----------------------------------------------
  //
  // If somebody accidentally sends:
  //
  // /api/api/projects
  //
  // automatically normalize it to:
  //
  // /api/projects
  //

  let cleanUrl =
    String(url || "").trim();

  cleanUrl =
    cleanUrl.replace(
      /^\/api\/api(?:\/|$)/,
      "/api/"
    );

  // Remove accidental duplicate slashes
  cleanUrl =
    cleanUrl.replace(
      /^\/+/,
      "/"
    );

  if (
    !cleanUrl.startsWith("/api/")
  ) {
    cleanUrl =
      `/api/${cleanUrl.replace(
        /^\/+/,
        ""
      )}`;
  }

  const headers =
    new Headers(
      options.headers
    );

  headers.set(
    "Authorization",
    `Bearer ${token}`
  );

  headers.set(
    "Accept",
    "application/json"
  );

  return fetch(
    cleanUrl,
    {
      ...options,
      headers,
    }
  );
}

// ======================================================
// AUTH / PROFILE
// ======================================================

export async function fetchMe(): Promise<{
  user: User;
  subscription?: Subscription;
} | null> {
  const {
    data: { session },
  } =
    await supabase.auth.getSession();

  if (
    !session?.access_token
  ) {
    return null;
  }

  const response =
    await authFetch(
      "/api/auth/me",
      {
        method: "GET",
      }
    );

  const data =
    await parseJsonResponse(
      response
    );

  if (
    response.status === 401
  ) {
    return null;
  }

  if (!response.ok) {
    throw new Error(
      data?.error ||
        `Request failed with status ${response.status}`
    );
  }

  return data as {
    user: User;
    subscription?: Subscription;
  };
}

// ======================================================
// LOGIN
// ======================================================

export async function loginApi(
  email: string
): Promise<{
  user: User;
}> {
  const res =
    await fetch(
      "/api/auth/login",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Accept:
            "application/json",
        },
        body: JSON.stringify({
          email,
        }),
      }
    );

  const data =
    await parseJsonResponse(
      res
    );

  if (!res.ok) {
    throw new Error(
      data?.error ||
        "Login failed"
    );
  }

  return data as {
    user: User;
  };
}

// ======================================================
// SIGNUP
// ======================================================

export async function signupApi(
  email: string,
  name: string
): Promise<{
  user: User;
}> {
  const res =
    await fetch(
      "/api/auth/signup",
      {
        method: "POST",
        headers: {
          "Content-Type":
            "application/json",
          Accept:
            "application/json",
        },
        body: JSON.stringify({
          email,
          name,
        }),
      }
    );

  const data =
    await parseJsonResponse(
      res
    );

  if (!res.ok) {
    throw new Error(
      data?.error ||
        "Signup failed"
    );
  }

  return data as {
    user: User;
  };
}

// ======================================================
// UPDATE PROFILE
// ======================================================

export async function updateProfileApi(
  name: string,
  avatar?: string
): Promise<{
  user: User;
}> {
  const res =
    await authFetch(
      "/api/auth/profile",
      {
        method: "PUT",
        headers: {
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          name,
          avatar,
        }),
      }
    );

  const data =
    await parseJsonResponse(
      res
    );

  if (!res.ok) {
    throw new Error(
      data?.error ||
        "Failed to update profile"
    );
  }

  return data as {
    user: User;
  };
}

// ======================================================
// PROJECTS
// ======================================================

export async function fetchProjects(): Promise<
  Project[]
> {
  const response =
    await authFetch(
      "/api/projects",
      {
        method: "GET",
      }
    );

  const data =
    await parseJsonResponse(
      response
    );

  if (!response.ok) {
    throw new Error(
      data?.error ||
        "Failed to fetch projects"
    );
  }

  const rawProjects =
    Array.isArray(
      data?.projects
    )
      ? data.projects
      : Array.isArray(data)
      ? data
      : [];

  const normalizedProjects =
    rawProjects.map(
      normalizeProject
    );

  return normalizedProjects;
}

// ======================================================
// PROJECT DETAILS
// ======================================================

export async function fetchProjectDetails(
  projectId: string
): Promise<{
  project: Project;
  clips: Clip[];
}> {
  const response =
    await authFetch(
      `/api/projects/${encodeURIComponent(
        projectId
      )}`,
      {
        method: "GET",
      }
    );

  const data =
    await parseJsonResponse(
      response
    );

  if (!response.ok) {
    throw new Error(
      data?.error ||
        `Failed to fetch project (${response.status})`
    );
  }

  const project =
    normalizeProject(
      data?.project
    );

  const rawClips =
    Array.isArray(
      data?.clips
    )
      ? data.clips
      : [];

  const normalizedClips =
    rawClips.map(
      normalizeClip
    );

  return {
    project,
    clips:
      normalizedClips,
  };
}

// ======================================================
// NOTIFICATIONS
// ======================================================

export async function fetchNotifications(): Promise<Notification[]> {
  const response = await authFetch("/api/notifications", {
    method: "GET",
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(data?.error || "Failed to fetch notifications");
  }

  return Array.isArray(data?.notifications)
    ? (data.notifications as Notification[])
    : [];
}

export async function markNotificationRead(id: string): Promise<void> {
  const response = await authFetch(
    `/api/notifications/${encodeURIComponent(id)}/read`,
    { method: "PATCH" },
  );

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(data?.error || "Failed to mark notification as read");
  }
}

export async function markAllNotificationsRead(): Promise<void> {
  const response = await authFetch("/api/notifications/read-all", {
    method: "PATCH",
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(data?.error || "Failed to mark notifications as read");
  }
}

// ======================================================
// VIDEO PROCESSING
// ======================================================

export async function processVideoApi(
  params: {
    name: string;
    sourceType:
      | "youtube"
      | "podcast";
    sourceUrl: string;
  }
): Promise<{
  project: Project;
  user: User;
}> {
  const {
    data: { session },
  } =
    await supabase.auth.getSession();

  if (!session) {
    throw new Error(
      "Please login first."
    );
  }

  const res =
    await fetch(
      "/api/projects/process",
      {
        method: "POST",

        headers: {
          "Content-Type":
            "application/json",

          Accept:
            "application/json",

          Authorization:
            `Bearer ${session.access_token}`,
        },

        body: JSON.stringify({
          name:
            params.name,

          sourceType:
            params.sourceType,

          sourceUrl:
            params.sourceUrl,
        }),
      }
    );

  const data =
    await parseJsonResponse(
      res
    );

  if (!res.ok) {
    throw new Error(
      data?.error ||
        "Failed to process video"
    );
  }

  const user =
    data?.user as User;

  if (!user) {
    throw new Error(
      "Failed to process video"
    );
  }

  return {
    project:
      normalizeProject(
        data?.project
      ),
    user,
  };
}

export async function createCheckoutSession() {
  const session =
    await supabase.auth.getSession();

  const accessToken =
    session.data.session?.access_token;

  if (!accessToken) {
    throw new Error(
      "Please sign in first.",
    );
  }

  const response =
    await fetch(
      "/api/billing/create-checkout",
      {
        method: "POST",

        headers: {
          Authorization:
            `Bearer ${accessToken}`,

          "Content-Type":
            "application/json",
        },
      },
    );

  const data =
    await response.json();

  if (!response.ok) {
    throw new Error(
      data?.error ||
      "Unable to start checkout.",
    );
  }

  if (!data?.url) {
    throw new Error(
      "Stripe checkout URL was not returned.",
    );
  }

  window.location.href =
    data.url;
}

// ======================================================
// DELETE PROJECT
// ======================================================

export async function deleteProjectApi(
  id: string
): Promise<void> {
  const res =
    await authFetch(
      `/api/projects/${encodeURIComponent(
        id
      )}`,
      {
        method: "DELETE",
      }
    );

  const data =
    await parseJsonResponse(
      res
    );

  if (!res.ok) {
    throw new Error(
      data?.error ||
        "Failed to delete project"
    );
  }
}

// ======================================================
// UPDATE CLIP
// ======================================================

export async function updateClipApi(
  id: string,
  updates: Partial<Clip>
): Promise<{
  clip: Clip;
}> {
  const res =
    await authFetch(
      `/api/clips/${encodeURIComponent(
        id
      )}`,
      {
        method: "PUT",

        headers: {
          "Content-Type":
            "application/json",
        },

        body: JSON.stringify(
          updates
        ),
      }
    );

  const data =
    await parseJsonResponse(
      res
    );

  if (!res.ok) {
    throw new Error(
      data?.error ||
        "Failed to update clip"
    );
  }

  return {
    ...data,

    clip:
      normalizeClip(
        data?.clip
      ),
  };
}

// ======================================================
// EXPORT CLIP
// ======================================================

export async function exportClipApi(
  id: string
): Promise<{
  downloadUrl: string;
  filename: string;
  message: string;
}> {
  const res =
    await authFetch(
      `/api/clips/${encodeURIComponent(
        id
      )}/export`,
      {
        method: "POST",
      }
    );

  const data =
    await parseJsonResponse(
      res
    );

  if (!res.ok) {
    throw new Error(
      data?.error ||
        "Export failed"
    );
  }

  return data as {
    downloadUrl: string;
    filename: string;
    message: string;
  };
}

// ======================================================
// USAGE LOGS
// ======================================================

export async function fetchUsageLogs(): Promise<{
  logs: UsageLog[];
  user: User;
}> {
  const res =
    await authFetch(
      "/api/usage",
      {
        method: "GET",
      }
    );

  const data =
    await parseJsonResponse(
      res
    );

  if (!res.ok) {
    throw new Error(
      data?.error ||
        "Failed to fetch usage logs"
    );
  }

  return data as {
    logs: UsageLog[];
    user: User;
  };
}


// ======================================================
// YOUTUBE SOCIAL CONNECTION
// ======================================================

export interface YouTubeStatus {
  connected: boolean;
  provider: "youtube";
  account?: {
    id: string;
    name: string;
    avatar: string;
  };
}

export async function connectYouTubeApi(): Promise<void> {
  const response = await authFetch("/api/social/youtube/connect", {
    method: "GET",
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      data?.error || "Failed to start YouTube connection."
    );
  }

  if (!data?.url) {
    throw new Error("YouTube authorization URL was not returned.");
  }

  window.location.assign(data.url);
}

export async function fetchYouTubeStatusApi(): Promise<YouTubeStatus> {
  const response = await authFetch("/api/social/youtube/status", {
    method: "GET",
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      data?.error || "Failed to fetch YouTube connection status."
    );
  }

  return data as YouTubeStatus;
}

export async function disconnectYouTubeApi(): Promise<void> {
  const response = await authFetch("/api/social/youtube/disconnect", {
    method: "DELETE",
  });

  const data = await parseJsonResponse(response);

  if (!response.ok) {
    throw new Error(
      data?.error || "Failed to disconnect YouTube account."
    );
  }
}
// ============================================================
// ADD THESE TO src/services/api.js (or api.ts)
// Uses the existing authFetch/parseJsonResponse pattern already
// in the file. Paste near the other "AUTH / PROFILE" functions.
// ============================================================

// ======================================================
// PREFERENCES
// ======================================================

export interface UserPreferences {
  email_notifications: boolean;
  marketing_emails: boolean;
  language: string;
  appearance: "dark" | "light" | "system";
}

export async function fetchPreferencesApi(): Promise<{
  preferences: UserPreferences;
}> {
  const res = await authFetch("/api/auth/preferences", {
    method: "GET",
  });

  const data = await parseJsonResponse(res);

  if (!res.ok) {
    throw new Error(
      data?.error || "Failed to fetch preferences"
    );
  }

  return data as { preferences: UserPreferences };
}

export async function updatePreferencesApi(
  updates: Partial<UserPreferences>
): Promise<{ preferences: UserPreferences }> {
  const res = await authFetch("/api/auth/preferences", {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  const data = await parseJsonResponse(res);

  if (!res.ok) {
    throw new Error(
      data?.error || "Failed to update preferences"
    );
  }

  return data as { preferences: UserPreferences };
}

// ======================================================
// ACCOUNT DATA EXPORT
// ======================================================

export async function exportAccountDataApi(): Promise<Record<string, any>> {
  const res = await authFetch("/api/auth/export", {
    method: "GET",
  });

  const data = await parseJsonResponse(res);

  if (!res.ok) {
    throw new Error(
      data?.error || "Failed to export account data"
    );
  }

  return data as Record<string, any>;
}

// ======================================================
// API KEY
// ======================================================

export async function generateApiKeyApi(): Promise<{
  apiKey: string;
}> {
  const res = await authFetch("/api/auth/api-key", {
    method: "POST",
  });

  const data = await parseJsonResponse(res);

  if (!res.ok) {
    throw new Error(
      data?.error || "Failed to generate API key"
    );
  }

  return data as { apiKey: string };
}

// ======================================================
// DELETE ACCOUNT
// ======================================================

export async function deleteAccountApi(): Promise<void> {
  const res = await authFetch("/api/auth/account", {
    method: "DELETE",
  });

  const data = await parseJsonResponse(res);

  if (!res.ok) {
    throw new Error(
      data?.error || "Failed to delete account"
    );
  }
}
// ======================================================
// STRIPE CHECKOUT
// ======================================================

export async function checkoutStripeApi(
  plan: "pro" | "agency"
): Promise<{
  success: boolean;
  url: string;
}> {
  const res = await authFetch(
    "/api/billing/create-checkout",
    {
      method: "POST",

      headers: {
        "Content-Type": "application/json",
      },

      body: JSON.stringify({
        plan,
      }),
    }
  );

  const data =
    await parseJsonResponse(res);

  if (!res.ok) {
    throw new Error(
      data?.error ||
        "Checkout failed"
    );
  }

  return data as {
    success: boolean;
    url: string;
  };
}