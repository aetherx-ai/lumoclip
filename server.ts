import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
import { execFile, spawn } from "node:child_process";
import { createClient } from "@supabase/supabase-js";
import {
  GoogleGenAI,
  createUserContent,
  createPartFromUri,
} from "@google/genai";
import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
// @ts-ignore
import ffprobeStatic from "ffprobe-static";
import { google } from "googleapis";


dotenv.config();

/* =========================================================
   CONFIG
========================================================= */

const app = express();

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// SEO: robots.txt
app.get("/robots.txt", (_req, res) => {
  res.status(200)
    .set("Cache-Control", "public, max-age=3600")
    .type("text/plain; charset=utf-8")
    .send(`User-agent: *
Allow: /

Sitemap: https://lumo-clip.com/sitemap.xml`);
});


const PORT = Number(process.env.PORT || 3000);

const GEMINI_MODEL =
  process.env.GEMINI_MODEL || "gemini-3.6-flash";

// Backend-enforced billing rules.
// Do not trust frontend values or environment overrides for these limits.

const VIDEO_COST = 10;

const DAILY_CREDIT_LIMIT = 150;

const MAX_CLIPS = Number(
  process.env.MAX_CLIPS || 10,
);

const MAX_VIDEO_DURATION = Number(
  process.env.MAX_VIDEO_DURATION || 3600,
);

const MAX_UPLOAD_MB = Number(
  process.env.MAX_UPLOAD_MB || 500,
);

/* =========================================================
   SPEED OPTIMIZATION
   Tuned for the current LumoClip MVP / Windows + modest CPU.
========================================================= */
const YOUTUBE_MAX_HEIGHT = Number(
  process.env.YOUTUBE_MAX_HEIGHT || 480,
);

const YOUTUBE_CONCURRENT_FRAGMENTS = Number(
  process.env.YOUTUBE_CONCURRENT_FRAGMENTS || 4,
);

const YOUTUBE_RETRIES = Number(
  process.env.YOUTUBE_RETRIES || 3,
);

// Production YouTube extractor settings.
// Keep secrets in hosting-provider environment variables, never in Git.
const YTDLP_PATH_ENV =
  process.env.YTDLP_PATH?.trim() || "";

const YTDLP_JS_RUNTIME =
  process.env.YTDLP_JS_RUNTIME?.trim() || "node";

const YOUTUBE_COOKIES_PATH_ENV =
  process.env.YOUTUBE_COOKIES_PATH?.trim() || "";

const YOUTUBE_AUTO_UPDATE =
  process.env.YOUTUBE_AUTO_UPDATE === "true";

// Accept both names so existing Render variables keep working.
// YTDLP_POT_PROVIDER_URL is the canonical deployment variable.
const YOUTUBE_POT_PROVIDER_URL =
  process.env.YTDLP_POT_PROVIDER_URL?.trim() ||
  process.env.YOUTUBE_POT_PROVIDER_URL?.trim() ||
  "";

const YTDLP_PLUGIN_DIR_ENV =
  process.env.YTDLP_PLUGIN_DIR?.trim() ||
  "";

const YTDLP_VERBOSE =
  process.env.YTDLP_VERBOSE === "true";


const GEMINI_POLL_MS = Number(
  process.env.GEMINI_POLL_MS || 1500,
);

// Retry transient Gemini serving failures such as 429/5xx.
// The uploaded Gemini file is reused; only generateContent() is retried.
const GEMINI_GENERATE_RETRIES = Number(
  process.env.GEMINI_GENERATE_RETRIES || 3,
);

const GEMINI_RETRY_BASE_MS = Number(
  process.env.GEMINI_RETRY_BASE_MS || 3000,
);

const GEMINI_RETRY_MAX_MS = Number(
  process.env.GEMINI_RETRY_MAX_MS || 60000,
);

// Hard limit for one Gemini generateContent request. This prevents a stuck
// provider request from hanging a Render worker indefinitely.
const GEMINI_REQUEST_TIMEOUT_MS = Number(
  process.env.GEMINI_REQUEST_TIMEOUT_MS || 120000,
);

// If the primary model exhausts its retries on a transient error
// (429/5xx/"high demand"), fall back to these models in order before
// giving up entirely. Comma-separated, e.g. "gemini-2.5-flash,gemini-2.0-flash".
// Ordered strongest-first so a quota-exhausted primary model degrades
// as gracefully as possible. flash-lite is the weakest fallback, so it
// goes last rather than first.
const GEMINI_FALLBACK_MODELS = (
  process.env.GEMINI_FALLBACK_MODELS ||
  "gemini-2.5-flash,gemini-2.0-flash,gemini-3.1-flash-lite"
)
  .split(",")
  .map((m) => m.trim())
  .filter(Boolean);

// Retry policy is deliberately different by failure class:
// - Daily/model quota exhaustion (429 + quota) => never retry that model.
// - Rate limiting (429 without daily quota exhaustion) => honor Retry-After when present.
// - 503/504 => short exponential retry, then move to the next model.
// - 4xx auth/bad-request/etc. => fail immediately; switching models will not fix it.
const GEMINI_RATE_LIMIT_MAX_WAIT_MS = Number(
  process.env.GEMINI_RATE_LIMIT_MAX_WAIT_MS || 30000,
);

const GEMINI_TRANSIENT_MAX_ATTEMPTS = Math.max(
  1,
  Number(process.env.GEMINI_TRANSIENT_MAX_ATTEMPTS || GEMINI_GENERATE_RETRIES),
);

// =========================================================
// FFMPEG SPEED CONFIG
// =========================================================
// Render-friendly defaults:
// - 2 clips can encode in parallel on a 2+ vCPU instance.
// - Each encoder gets a limited number of threads to avoid
//   oversubscribing the CPU when clips run concurrently.
// Override with Render environment variables if needed.
const CPU_COUNT = Math.max(1, os.cpus().length);

const CLIP_CONCURRENCY = Math.max(
  1,
  Math.min(
    Number(process.env.CLIP_CONCURRENCY || 2),
    4,
  ),
);

const FFMPEG_THREADS_PER_CLIP = Math.max(
  1,
  Math.min(
    Number(
      process.env.FFMPEG_THREADS_PER_CLIP ||
        (CPU_COUNT >= 4 ? 2 : 1),
    ),
    4,
  ),
);

const FFMPEG_PRESET =
  process.env.FFMPEG_PRESET?.trim() || "ultrafast";

const FFMPEG_CRF =
  process.env.FFMPEG_CRF?.trim() || "27";

// Hard timeout for FFmpeg operations so a corrupt/stalled input cannot
// occupy a Render worker forever.
const FFMPEG_TIMEOUT_MS = Number(
  process.env.FFMPEG_TIMEOUT_MS || 15 * 60 * 1000,
);

/* =========================================================
   SELF-HOSTED YOUTUBE WORKER

   Render never contacts YouTube directly. A trusted PC worker
   polls for queued YouTube jobs, downloads the video locally,
   then uploads the resulting file to Render.

   This worker does not bypass CAPTCHAs, PO tokens, bot checks,
   or other access controls. It only downloads content that
   yt-dlp can legitimately access from the worker machine.
========================================================= */
const LUMO_WORKER_TOKEN =
  process.env.LUMO_WORKER_TOKEN?.trim() || "";

const WORKER_ENABLED = Boolean(LUMO_WORKER_TOKEN);



/* =========================================================
   YOUTUBE SOCIAL CONNECT
========================================================= */

const FRONTEND_URL =
  process.env.FRONTEND_URL ||
  "http://localhost:5173";

const YOUTUBE_CLIENT_ID =
  process.env.YOUTUBE_CLIENT_ID ||
  process.env.GOOGLE_CLIENT_ID ||
  "";

const YOUTUBE_CLIENT_SECRET =
  process.env.YOUTUBE_CLIENT_SECRET ||
  process.env.GOOGLE_CLIENT_SECRET ||
  "";

const YOUTUBE_REDIRECT_URI =
  process.env.YOUTUBE_REDIRECT_URI ||
  "http://localhost:3000/api/social/youtube/callback";

const SOCIAL_TOKEN_ENCRYPTION_KEY =
  process.env.SOCIAL_TOKEN_ENCRYPTION_KEY ||
  "";

const YOUTUBE_SCOPES = [
  "https://www.googleapis.com/auth/youtube.upload",
  "https://www.googleapis.com/auth/youtube.readonly",
];

if (!YOUTUBE_CLIENT_ID) {
  console.warn(
    "YouTube social connect disabled: missing YOUTUBE_CLIENT_ID / GOOGLE_CLIENT_ID",
  );
}

if (!YOUTUBE_CLIENT_SECRET) {
  console.warn(
    "YouTube social connect disabled: missing YOUTUBE_CLIENT_SECRET / GOOGLE_CLIENT_SECRET",
  );
}

if (
  SOCIAL_TOKEN_ENCRYPTION_KEY &&
  !/^[0-9a-fA-F]{64}$/.test(
    SOCIAL_TOKEN_ENCRYPTION_KEY,
  )
) {
  throw new Error(
    "SOCIAL_TOKEN_ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes).",
  );
}

const socialTokenKey = SOCIAL_TOKEN_ENCRYPTION_KEY
  ? Buffer.from(
      SOCIAL_TOKEN_ENCRYPTION_KEY,
      "hex",
    )
  : null;

function getYouTubeOAuthClient() {
  if (!YOUTUBE_CLIENT_ID || !YOUTUBE_CLIENT_SECRET) {
    throw new Error(
      "YouTube OAuth is not configured. Add YOUTUBE_CLIENT_ID and YOUTUBE_CLIENT_SECRET.",
    );
  }

  return new google.auth.OAuth2(
    YOUTUBE_CLIENT_ID,
    YOUTUBE_CLIENT_SECRET,
    YOUTUBE_REDIRECT_URI,
  );
}

function encryptSocialToken(value: string): string {
  if (!socialTokenKey) {
    throw new Error(
      "SOCIAL_TOKEN_ENCRYPTION_KEY is required for social account tokens.",
    );
  }

  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    socialTokenKey,
    iv,
  );

  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  const tag = cipher.getAuthTag();

  return [
    iv.toString("hex"),
    tag.toString("hex"),
    encrypted.toString("hex"),
  ].join(".");
}

function decryptSocialToken(value: string): string {
  if (!socialTokenKey) {
    throw new Error(
      "SOCIAL_TOKEN_ENCRYPTION_KEY is required for social account tokens.",
    );
  }

  const [ivHex, tagHex, encryptedHex] =
    value.split(".");

  if (!ivHex || !tagHex || !encryptedHex) {
    throw new Error(
      "Invalid encrypted social token.",
    );
  }

  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    socialTokenKey,
    Buffer.from(ivHex, "hex"),
  );

  decipher.setAuthTag(
    Buffer.from(tagHex, "hex"),
  );

  const decrypted = Buffer.concat([
    decipher.update(
      Buffer.from(encryptedHex, "hex"),
    ),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

function createYouTubeOAuthState(
  userId: string,
): string {
  const secret =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error(
      "Missing state signing secret.",
    );
  }

  const payload = {
    userId,
    nonce: crypto.randomBytes(16).toString("hex"),
    exp: Date.now() + 10 * 60 * 1000,
  };

  const encoded = Buffer.from(
    JSON.stringify(payload),
  ).toString("base64url");

  const signature = crypto
    .createHmac("sha256", secret)
    .update(encoded)
    .digest("base64url");

  return `${encoded}.${signature}`;
}

function verifyYouTubeOAuthState(
  state: string,
): { userId: string; nonce: string; exp: number } {
  const secret =
    process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!secret) {
    throw new Error(
      "Missing state signing secret.",
    );
  }

  const [encoded, signature] =
    state.split(".");

  if (!encoded || !signature) {
    throw new Error(
      "Invalid OAuth state.",
    );
  }

  const expected = crypto
    .createHmac("sha256", secret)
    .update(encoded)
    .digest("base64url");

  if (
    signature.length !== expected.length ||
    !crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected),
    )
  ) {
    throw new Error(
      "Invalid OAuth state signature.",
    );
  }

  const payload = JSON.parse(
    Buffer.from(encoded, "base64url").toString(
      "utf8",
    ),
  );

  if (
    !payload?.userId ||
    !payload?.nonce ||
    !Number.isFinite(payload?.exp) ||
    payload.exp < Date.now()
  ) {
    throw new Error(
      "OAuth state expired or invalid.",
    );
  }

  return {
    userId: String(payload.userId),
    nonce: String(payload.nonce),
    exp: Number(payload.exp),
  };
}

async function getYouTubeConnection(
  userId: string,
) {
  const { data, error } =
    await supabase
      .from("social_connections")
      .select(
        "id, user_id, provider, account_id, account_name, account_avatar, access_token, refresh_token, token_expires_at, scopes, metadata, created_at, updated_at",
      )
      .eq("user_id", userId)
      .eq("provider", "youtube")
      .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

async function getYouTubeClientForUser(
  userId: string,
) {
  const connection =
    await getYouTubeConnection(userId);

  if (!connection) {
    const error: any = new Error(
      "YouTube account is not connected.",
    );
    error.statusCode = 404;
    throw error;
  }

  if (!connection.refresh_token) {
    throw new Error(
      "YouTube connection is missing a refresh token. Please reconnect YouTube.",
    );
  }

  const oauth2Client =
    getYouTubeOAuthClient();

  oauth2Client.setCredentials({
    access_token: connection.access_token
      ? decryptSocialToken(
          connection.access_token,
        )
      : undefined,
    refresh_token: decryptSocialToken(
      connection.refresh_token,
    ),
    expiry_date: connection.token_expires_at
      ? new Date(
          connection.token_expires_at,
        ).getTime()
      : undefined,
  });

  oauth2Client.on(
    "tokens",
    async (tokens) => {
      try {
        const update: Record<
          string,
          unknown
        > = {};

        if (tokens.access_token) {
          update.access_token =
            encryptSocialToken(
              tokens.access_token,
            );
        }

        if (tokens.refresh_token) {
          update.refresh_token =
            encryptSocialToken(
              tokens.refresh_token,
            );
        }

        if (tokens.expiry_date) {
          update.token_expires_at =
            new Date(
              tokens.expiry_date,
            ).toISOString();
        }

        if (Object.keys(update).length) {
          await supabase
            .from("social_connections")
            .update(update)
            .eq("id", connection.id);
        }
      } catch (error) {
        console.error(
          "Failed to persist refreshed YouTube token:",
          error,
        );
      }
    },
  );

  return {
    oauth2Client,
    connection,
  };
}

async function uploadClipToYouTube(
  userId: string,
  clipId: string,
  options: {
    title: string;
    description: string;
    tags: string[];
    privacyStatus: "private" | "public" | "unlisted";
  },
) {
  const { data: clip, error: clipError } =
    await supabase
      .from("clips")
      .select(
        "id, user_id, project_id, title, video_url, caption, viral_score",
      )
      .eq("id", clipId)
      .eq("user_id", userId)
      .single();

  if (clipError || !clip) {
    const error: any = new Error(
      "Clip not found.",
    );
    error.statusCode = 404;
    throw error;
  }

  const videoUrl = String(
    clip.video_url || "",
  );

  const marker = "/clips/";
  const markerIndex =
    videoUrl.indexOf(marker);

  if (markerIndex === -1) {
    throw new Error(
      "Clip video file path is invalid.",
    );
  }

  const filename = videoUrl
    .slice(markerIndex + marker.length)
    .split("?")[0]
    .split("#")[0];

  const cleanFilename =
    path.basename(
      decodeURIComponent(filename),
    );

  const clipPath = path.resolve(
    mediaDir,
    safeSegment(clip.project_id),
    "clips",
    cleanFilename,
  );

  const allowedRoot =
    path.resolve(
      mediaDir,
      safeSegment(clip.project_id),
      "clips",
    ) + path.sep;

  if (
    !clipPath.startsWith(allowedRoot) ||
    !fs.existsSync(clipPath) ||
    !fs.statSync(clipPath).isFile()
  ) {
    throw new Error(
      "Clip video file is not available on the server.",
    );
  }

  const { oauth2Client } =
    await getYouTubeClientForUser(
      userId,
    );

  const youtube = google.youtube({
    version: "v3",
    auth: oauth2Client,
  });

  const response =
    await youtube.videos.insert({
      part: [
        "snippet",
        "status",
      ],
      requestBody: {
        snippet: {
          title: options.title.slice(
            0,
            100,
          ),
          description: options.description.slice(
            0,
            5000,
          ),
          tags: options.tags
            .filter(Boolean)
            .map((tag) =>
              tag.trim().replace(/^#/, ""),
            )
            .filter(Boolean)
            .slice(0, 500),
          categoryId: "22",
        },
        status: {
          privacyStatus:
            options.privacyStatus,
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        body: fs.createReadStream(
          clipPath,
        ),
      },
    });

  const youtubeVideoId =
    response.data.id || "";

  if (!youtubeVideoId) {
    throw new Error(
      "YouTube upload completed without a video ID.",
    );
  }

  return {
    youtubeVideoId,
    url: `https://www.youtube.com/watch?v=${youtubeVideoId}`,
    clip,
  };
}

/* =========================================================
   ENV
========================================================= */

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

// Supports multiple free-tier Gemini API keys so per-project daily quota
// exhaustion on one key doesn't stall the whole service. Set GEMINI_API_KEYS
// as a comma-separated list (each key from a separate Google Cloud project
// has its own independent free-tier quota). GEMINI_API_KEY still works for
// a single key.
const GEMINI_API_KEYS: string[] = (
  process.env.GEMINI_API_KEYS ||
  process.env.GEMINI_API_KEY ||
  ""
)
  .split(",")
  .map((k) => k.trim())
  .filter(Boolean);

if (!supabaseUrl) {
  throw new Error("Missing SUPABASE_URL");
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY",
  );
}

if (GEMINI_API_KEYS.length === 0) {
  throw new Error("Missing GEMINI_API_KEY (or GEMINI_API_KEYS)");
}

/* =========================================================
   CLIENTS
========================================================= */

const supabase = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
);

// One GoogleGenAI client per configured API key. geminiKeyIndex points at
// the key currently in use; it only moves forward (never wraps mid-process)
// once a key's daily quota is confirmed exhausted, so later calls in this
// process skip straight past keys we already know are dead.
const geminiClients = GEMINI_API_KEYS.map(
  (apiKey) => new GoogleGenAI({ apiKey }),
);

let geminiKeyIndex = 0;

function getGeminiClient() {
  return geminiClients[geminiKeyIndex];
}

// Advances to the next configured Gemini API key. Returns false if there
// are no more keys left to try.
function rotateGeminiKey(): boolean {
  if (geminiKeyIndex >= geminiClients.length - 1) {
    return false;
  }

  geminiKeyIndex++;

  console.warn(
    `Gemini API key rotated -> now using key #${geminiKeyIndex + 1}/${geminiClients.length}`,
  );

  return true;
}

// Kept for readability at call sites that still reference `ai` directly.
const ai = new Proxy({} as ReturnType<typeof getGeminiClient>, {
  get(_target, prop) {
    return (getGeminiClient() as any)[prop];
  },
});

interface ProcessingConfig {
  mode: ProcessingMode;
  captionStyle: SubtitleStyle;
}

// The in-memory value makes the mode available to the worker during the
// current server lifetime. If the optional database columns are present,
// they are also used so a worker job can survive a restart.
const processingConfigs = new Map<string, ProcessingConfig>();

async function rememberProcessingConfig(
  projectId: string,
  config: ProcessingConfig,
): Promise<void> {
  processingConfigs.set(projectId, config);

  const { error } = await supabase
    .from("projects")
    .update({
      processing_mode: config.mode,
      caption_style: config.captionStyle,
    })
    .eq("id", projectId);

  if (error) {
    // These columns are optional for backward compatibility with the current
    // schema. The in-memory config remains the fallback.
    console.warn(
      "Project processing config was not persisted; using in-memory config:",
      error.message,
    );
  }
}

async function getProcessingConfig(
  projectId: string,
): Promise<ProcessingConfig> {
  const inMemory = processingConfigs.get(projectId);

  const { data, error } = await supabase
    .from("projects")
    .select("processing_mode, caption_style")
    .eq("id", projectId)
    .maybeSingle();

  if (!error && data?.processing_mode) {
    return {
      mode: normalizeProcessingMode(data.processing_mode),
      captionStyle: normalizeCaptionStyle(data.caption_style),
    };
  }

  return (
    inMemory || {
      mode: "clips",
      captionStyle: normalizeCaptionStyle(undefined),
    }
  );
}

/* =========================================================
   DIRECTORIES
========================================================= */

const mediaDir = path.join(
  process.cwd(),
  "media",
);

const tempDir = path.join(
  process.cwd(),
  "tmp",
);

const outputDir = path.join(
  process.cwd(),
  "generated",
);

for (const dir of [
  mediaDir,
  tempDir,
  outputDir,
]) {
  fs.mkdirSync(dir, {
    recursive: true,
  });
}

const youtubeCookiesPath = YOUTUBE_COOKIES_PATH_ENV
  ? path.resolve(YOUTUBE_COOKIES_PATH_ENV)
  : path.join(tempDir, "youtube-cookies.txt");

// The cookies file is NEVER committed to the repository.
// For production, prefer YOUTUBE_COOKIES_B64 or a secret-mounted
// YOUTUBE_COOKIES_PATH.
if (process.env.YOUTUBE_COOKIES_B64) {
  try {
    const decodedCookies = Buffer.from(
      process.env.YOUTUBE_COOKIES_B64.replace(/\s+/g, ""),
      "base64",
    );

    if (!decodedCookies.length) {
      throw new Error("Decoded cookie file is empty.");
    }

    fs.writeFileSync(
      youtubeCookiesPath,
      decodedCookies,
      { mode: 0o600 },
    );
  } catch (error) {
    console.error(
      "Failed to create YouTube cookies file:",
      error,
    );
  }
}

const youtubeCookiesAvailable =
  fs.existsSync(youtubeCookiesPath) &&
  fs.statSync(youtubeCookiesPath).isFile() &&
  fs.statSync(youtubeCookiesPath).size > 20;

console.log(
  "YouTube cookies:",
  youtubeCookiesAvailable
    ? "configured"
    : "not configured (public-client fallback mode)",
);


/* =========================================================
   FFMPEG
========================================================= */

const packagedFfmpegPath =
  typeof ffmpegStatic === "string" &&
  fs.existsSync(ffmpegStatic)
    ? ffmpegStatic
    : undefined;

const packagedFfprobePath =
  typeof ffprobeStatic?.path === "string" &&
  fs.existsSync(ffprobeStatic.path)
    ? ffprobeStatic.path
    : undefined;

const ffmpegPath =
  process.env.FFMPEG_PATH &&
  fs.existsSync(process.env.FFMPEG_PATH)
    ? process.env.FFMPEG_PATH
    : packagedFfmpegPath || "ffmpeg";

const ffprobePath =
  process.env.FFPROBE_PATH &&
  fs.existsSync(process.env.FFPROBE_PATH)
    ? process.env.FFPROBE_PATH
    : packagedFfprobePath || "ffprobe";

if (ffmpegPath !== "ffmpeg") {
  ffmpeg.setFfmpegPath(ffmpegPath);
}

if (ffprobePath !== "ffprobe") {
  ffmpeg.setFfprobePath(ffprobePath);
}

console.log("======================================");
console.log("FFmpeg:", ffmpegPath);
console.log("FFprobe:", ffprobePath);
console.log("======================================");
/* =========================================================
   FONT
========================================================= */

const fontCandidates = [
  process.env.FFMPEG_FONT_PATH?.trim(),
  process.platform === "win32"
    ? "C:\\Windows\\Fonts\\arial.ttf"
    : "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
  "/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf",
].filter(Boolean) as string[];

const fontPath =
  fontCandidates.find((candidate) => fs.existsSync(candidate)) ||
  fontCandidates[fontCandidates.length - 1];

if (fs.existsSync(fontPath)) {
  console.log("FFmpeg font:", fontPath);
} else {
  console.warn("FFmpeg font not found:", fontPath);
}

/* =========================================================
   CAPTIONS (AI Auto Caption — word-by-word karaoke highlight)

   Burned directly into each generated clip using FFmpeg's
   `subtitles` filter (libass) + an ASS file generated on the
   fly from the Gemini transcript segments that fall inside
   the clip's time range.

   No new Gemini call, no new DB columns: word-level timing is
   *approximated* from each segment's text length, which is
   good enough for a stylish, readable highlight effect.
========================================================= */

const CAPTIONS_ENABLED =
  process.env.CAPTIONS_ENABLED !== "false";

type ProcessingMode = "clips" | "full_video_caption";

interface SubtitleStyle {
  enabled: boolean;
  font: string;
  textColor: string;      // base ("not yet spoken") color, hex
  highlightColor: string; // active-word color, hex
  position: "bottom" | "center" | "top";
  fontSize: number;
  uppercase: boolean;
  box: boolean;            // opaque caption "card" background behind text
  boxColor: string;        // hex, only used when box is true
  animation: "pop" | "none"; // per-word bounce as it's highlighted
}

const ALLOWED_CAPTION_FONTS = new Set([
  "Arial",
  "Inter",
  "Poppins",
  "Montserrat",
  "Impact",
  "Liberation Sans",
  "DejaVu Sans",
]);

function normalizeHexColor(value: unknown, fallback: string): string {
  const candidate = String(value || "").trim();
  return /^#[0-9a-fA-F]{6}$/.test(candidate)
    ? candidate.toUpperCase()
    : fallback;
}

function normalizeCaptionStyle(value: unknown): SubtitleStyle {
  let raw: any = value;

  if (typeof value === "string") {
    try {
      raw = JSON.parse(value);
    } catch {
      raw = {};
    }
  }

  const requestedFont = String(raw?.font || "").trim();
  const requestedPosition = String(raw?.position || "bottom");

  return {
    enabled: raw?.enabled === false ? false : true,
    font: ALLOWED_CAPTION_FONTS.has(requestedFont)
      ? requestedFont
      : DEFAULT_SUBTITLE_STYLE.font,
    textColor: normalizeHexColor(
      raw?.textColor,
      DEFAULT_SUBTITLE_STYLE.textColor,
    ),
    highlightColor: normalizeHexColor(
      raw?.highlightColor,
      DEFAULT_SUBTITLE_STYLE.highlightColor,
    ),
    position: ["top", "center", "bottom"].includes(requestedPosition)
      ? (requestedPosition as SubtitleStyle["position"])
      : DEFAULT_SUBTITLE_STYLE.position,
    fontSize: DEFAULT_SUBTITLE_STYLE.fontSize,
    uppercase: raw?.uppercase === false ? false : true,
    box: raw?.box === false ? false : true,
    boxColor: normalizeHexColor(
      raw?.boxColor,
      DEFAULT_SUBTITLE_STYLE.boxColor,
    ),
    animation: raw?.animation === "none" ? "none" : "pop",
  };
}

function normalizeProcessingMode(value: unknown): ProcessingMode {
  return value === "full_video_caption"
    ? "full_video_caption"
    : "clips";
}

function getProcessingConfigFromRequest(
  styleValue: unknown,
  modeValue?: unknown,
): ProcessingConfig {
  let rawStyle: any = styleValue;

  if (typeof styleValue === "string") {
    try {
      rawStyle = JSON.parse(styleValue);
    } catch {
      rawStyle = {};
    }
  }

  return {
    mode: normalizeProcessingMode(modeValue || rawStyle?.mode),
    captionStyle: normalizeCaptionStyle(rawStyle),
  };
}

const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  enabled: true,
  font: process.env.CAPTION_FONT?.trim() || "Liberation Sans",
  textColor: "#FFFFFF",
  highlightColor: "#39FF14",
  position: "bottom",
  fontSize: 58,
  uppercase: true,
  box: true,
  boxColor: "#000000",
  animation: "pop",
};

interface ClipRelativeSegment {
  start: number;
  end: number;
  text: string;
  words?: TranscriptWord[];
}

function hexToAssColor(hex: string): string {
  const clean = (hex || "").replace("#", "").trim();

  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    return "&H00FFFFFF&";
  }

  const r = clean.slice(0, 2);
  const g = clean.slice(2, 4);
  const b = clean.slice(4, 6);

  // ASS colors are &H00BBGGRR&
  return `&H00${b}${g}${r}&`.toUpperCase();
}

// Same as hexToAssColor but with an explicit alpha channel. ASS alpha is
// inverted: 00 = fully opaque, FF = fully transparent.
function hexToAssColorWithAlpha(
  hex: string,
  alphaHex: string,
): string {
  const clean = (hex || "").replace("#", "").trim();

  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    return `&H${alphaHex}000000&`;
  }

  const r = clean.slice(0, 2);
  const g = clean.slice(2, 4);
  const b = clean.slice(4, 6);

  return `&H${alphaHex}${b}${g}${r}&`.toUpperCase();
}

function escapeAssText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/\r?\n/g, " ")
    .trim();
}

function formatAssTime(totalSeconds: number): string {
  const safe = Math.max(0, totalSeconds);
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = Math.floor(safe % 60);
  const centiseconds = Math.round(
    (safe - Math.floor(safe)) * 100,
  );

  return `${hours}:${String(minutes).padStart(2, "0")}:${String(
    seconds,
  ).padStart(2, "0")}.${String(centiseconds).padStart(2, "0")}`;
}

// Escape a filesystem path so it can be embedded inside an
// ffmpeg `subtitles=...` filter argument (colons and backslashes
// are filter-syntax special characters).
function escapeFfmpegFilterPath(filePath: string): string {
  return filePath
    .replace(/\\/g, "/")
    .replace(/:/g, "\\:")
    .replace(/'/g, "\\'");
}

// Extract the transcript segments that overlap a clip's time
// range and shift them so 0 = the start of the clip.
function getClipRelativeSegments(
  transcript: TranscriptSegment[],
  clipStart: number,
  clipEnd: number,
): ClipRelativeSegment[] {
  if (!Array.isArray(transcript) || !transcript.length) {
    console.warn(
      `Captions: transcript is empty — clip ${clipStart}s-${clipEnd}s will have no burned-in captions.`,
    );
    return [];
  }

  const overlapping = transcript.filter(
    (segment) =>
      segment.end > clipStart && segment.start < clipEnd,
  );

  if (!overlapping.length) {
    const transcriptStart = transcript[0]?.start ?? 0;
    const transcriptEnd =
      transcript[transcript.length - 1]?.end ?? 0;

    console.warn(
      `Captions: no transcript overlap for clip ${clipStart}s-${clipEnd}s ` +
        `(transcript only covers ${transcriptStart}s-${transcriptEnd}s). ` +
        `This clip will have no burned-in captions.`,
    );

    return [];
  }

  return overlapping
    .map((segment) => {
      const shiftedWords = Array.isArray(segment.words)
        ? segment.words
            .filter(
              (w) => w.end > clipStart && w.start < clipEnd,
            )
            .map((w) => ({
              word: w.word,
              start: Math.max(w.start, clipStart) - clipStart,
              end: Math.min(w.end, clipEnd) - clipStart,
            }))
            .filter((w) => w.end > w.start)
        : undefined;

      return {
        start: Math.max(segment.start, clipStart) - clipStart,
        end: Math.min(segment.end, clipEnd) - clipStart,
        text: String(segment.text || "").trim(),
        words:
          shiftedWords && shiftedWords.length
            ? shiftedWords
            : undefined,
      };
    })
    .filter(
      (segment) =>
        segment.end > segment.start && segment.text.length > 0,
    );
}

interface TimedWordItem {
  word: string;
  start: number;
  end: number;
}

// Fallback ONLY: used when Gemini didn't return real per-word
// timestamps for a segment. Approximates a per-word duration by
// weighting on word length, so longer words get slightly more
// screen time. Real word timestamps (from segment.words) are always
// preferred when available — this is a best-effort guess, not a
// replacement for actual timing.
function synthesizeWordTimings(
  text: string,
  segStart: number,
  segEnd: number,
): TimedWordItem[] {
  const duration = segEnd - segStart;

  const words = text
    .split(/\s+/)
    .map((word) => word.trim())
    .filter(Boolean);

  if (!words.length || duration <= 0) {
    return [];
  }

  const MIN_WORD_DURATION = 0.12;

  const weights = words.map((word) =>
    Math.max(1, word.length),
  );

  const totalWeight = weights.reduce(
    (sum, weight) => sum + weight,
    0,
  );

  const rawDurations = weights.map((weight) =>
    Math.max(
      MIN_WORD_DURATION,
      (weight / totalWeight) * duration,
    ),
  );

  const rawTotal = rawDurations.reduce(
    (sum, value) => sum + value,
    0,
  );

  const scale = rawTotal > 0 ? duration / rawTotal : 1;

  let cursor = segStart;

  return words.map((word, index) => {
    const wordDuration = rawDurations[index] * scale;
    const start = cursor;
    const end = start + wordDuration;
    cursor = end;

    return { word, start, end };
  });
}

// Prefer Gemini's real per-word timestamps; only fall back to the
// length-based guess when the segment has no usable word-level data.
function getTimedWordsForSegment(
  segment: ClipRelativeSegment,
): TimedWordItem[] {
  if (Array.isArray(segment.words) && segment.words.length) {
    return segment.words
      .map((w) => ({
        word: w.word,
        start: w.start,
        end: w.end,
      }))
      .filter((w) => w.end > w.start)
      .sort((a, b) => a.start - b.start);
  }

  return synthesizeWordTimings(
    segment.text,
    segment.start,
    segment.end,
  );
}

// Group timed words into short on-screen lines (like CapCut/
// OpusClip auto-captions), so each highlight event only shows
// a handful of words at a time.
function groupWordsIntoLines(
  words: TimedWordItem[],
): TimedWordItem[][] {
  const MAX_WORDS_PER_LINE = 4;
  const MAX_CHARS_PER_LINE = 18;

  const lines: TimedWordItem[][] = [];
  let current: TimedWordItem[] = [];
  let currentChars = 0;

  for (const item of words) {
    const wouldOverflow =
      current.length > 0 &&
      (current.length >= MAX_WORDS_PER_LINE ||
        currentChars + item.word.length > MAX_CHARS_PER_LINE);

    if (wouldOverflow) {
      lines.push(current);
      current = [];
      currentChars = 0;
    }

    current.push(item);
    currentChars += item.word.length + 1;
  }

  if (current.length) {
    lines.push(current);
  }

  return lines;
}

// Build a full .ass subtitle document with karaoke (\k) tags so
// libass highlights each word as it's "spoken". When real per-word
// timestamps are available (segment.words), silent gaps between
// words are preserved as invisible \k holds so the highlight lands
// on the exact moment each word is actually spoken instead of
// drifting across a phrase.
function buildKaraokeAss(
  segments: ClipRelativeSegment[],
  style: SubtitleStyle,
  videoWidth = 540,
  videoHeight = 960,
): string {
  const alignment =
    style.position === "top"
      ? 8
      : style.position === "center"
      ? 5
      : 2;

  const marginV =
    style.position === "bottom"
      ? 190
      : style.position === "top"
      ? 90
      : 0;

  // In ASS karaoke, SecondaryColour = "not yet highlighted" text
  // and PrimaryColour = the color a word becomes once its \k
  // timer fires — so PrimaryColour holds our highlight color.
  const primary = hexToAssColor(style.highlightColor);
  const secondary = hexToAssColor(style.textColor);

  const useBox = style.box !== false;
  const useAnimation = style.animation !== "none";

  // BorderStyle 3 = opaque background box behind the text (the
  // "caption card" look). BorderStyle 1 = classic outlined text only,
  // no card — a cleaner, more minimal look for styles that want it.
  const borderStyle = useBox ? 3 : 1;
  const outlineValue = useBox ? 14 : 4;
  const shadowValue = useBox ? 0 : 1;

  const boxColorAss = useBox
    ? hexToAssColorWithAlpha(style.boxColor, "50")
    : "&H00000000&";

  const header = `[Script Info]
ScriptType: v4.00+
PlayResX: ${videoWidth}
PlayResY: ${videoHeight}
ScaledBorderAndShadow: yes
WrapStyle: 2

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,${style.font},${style.fontSize},${primary},${secondary},${boxColorAss},&H00000000&,-1,0,0,0,100,100,0.5,0,${borderStyle},${outlineValue},${shadowValue},${alignment},26,26,${marginV},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
`;

  const events: string[] = [];

  let segmentsWithRealWords = 0;
  let segmentsUsingFallback = 0;
  let segmentsSkippedEmpty = 0;

  for (const segment of segments) {
    const hasRealWords =
      Array.isArray(segment.words) && segment.words.length > 0;

    const words = getTimedWordsForSegment(segment);

    if (!words.length) {
      segmentsSkippedEmpty += 1;
      continue;
    }

    if (hasRealWords) {
      segmentsWithRealWords += 1;
    } else {
      segmentsUsingFallback += 1;
    }

    const lines = groupWordsIntoLines(words);

    for (const line of lines) {
      const lineStart = line[0].start;
      const lineEnd = Math.max(
        lineStart + 0.05,
        line[line.length - 1].end,
      );

      // Cumulative offset (ms) from the start of this line's
      // Dialogue event, including any silent gaps between words —
      // used both for the \k hold durations and to time the
      // per-word pop/bounce so it fires exactly when that word
      // becomes "active".
      let cursorMs = 0;

      const lineText = line
        .map((item, index) => {
          const prevEnd =
            index === 0 ? lineStart : line[index - 1].end;

          const gapMs = Math.max(
            0,
            Math.round((item.start - prevEnd) * 1000),
          );

          // A gap between words is rendered as an invisible \k hold
          // (no text) so the next word's highlight still lands on
          // the moment it's actually spoken, instead of firing early.
          let gapTag = "";

          if (gapMs > 0) {
            const gapCentiseconds = Math.max(
              1,
              Math.round(gapMs / 10),
            );

            gapTag = `{\\k${gapCentiseconds}}`;
            cursorMs += gapMs;
          }

          const wordDurationMs = Math.max(
            10,
            Math.round((item.end - item.start) * 1000),
          );

          const centiseconds = Math.max(
            1,
            Math.round(wordDurationMs / 10),
          );

          const word = style.uppercase
            ? item.word.toUpperCase()
            : item.word;

          if (!useAnimation) {
            cursorMs += wordDurationMs;
            return `${gapTag}{\\k${centiseconds}}${escapeAssText(word)}`;
          }

          const popDuration = Math.min(
            140,
            Math.max(60, Math.round(wordDurationMs * 0.5)),
          );

          const popStart = cursorMs;
          const popEnd = popStart + popDuration;

          cursorMs += wordDurationMs;

          // Reset scale, then bounce up and settle back down right as
          // the word's karaoke highlight begins — a quick, punchy pop
          // rather than a static color swap.
          return (
            `${gapTag}` +
            `{\\fscx100\\fscy100` +
            `\\t(${popStart},${popEnd},\\fscx112\\fscy112)` +
            `\\t(${popEnd},${popEnd + popDuration},\\fscx100\\fscy100)` +
            `\\k${centiseconds}}${escapeAssText(word)}`
          );
        })
        .join(" ");

      events.push(
        `Dialogue: 0,${formatAssTime(lineStart)},${formatAssTime(
          lineEnd,
        )},Default,,0,0,0,,${lineText}`,
      );
    }
  }

  console.log(
    `Captions: built ${events.length} dialogue event(s) from ${segments.length} segment(s) ` +
      `(${segmentsWithRealWords} with real Gemini word-timestamps, ` +
      `${segmentsUsingFallback} using length-based fallback, ` +
      `${segmentsSkippedEmpty} skipped/empty).`,
  );

  if (segments.length > 0 && segmentsWithRealWords === 0) {
    console.warn(
      "Captions: Gemini did NOT return per-word timestamps for any segment in this burn — " +
        "falling back to length-based approximation for all of them. This is the most " +
        "common cause of captions feeling out of sync; the model isn't complying with the " +
        "word-level timing instruction in the prompt.",
    );
  }

  if (segments.length > 0 && events.length === 0) {
    console.error(
      "Captions: 0 dialogue events were produced even though " +
        `${segments.length} transcript segment(s) were available — the output video will ` +
        "encode 'successfully' but show NO burned-in captions at all. Check the segment text/word data logged above.",
    );
  }

  return header + events.join("\n") + "\n";
}

/* =========================================================
   WORD-LEVEL CAPTION TIMING (self-hosted Whisper, no API cost)

   PERSISTENT PER-VIDEO WORKER

   The Whisper model is loaded ONCE per transcription job, not once
   per 30-second window. The worker also loads the extracted WAV once
   and then processes all windows sequentially.

   Architecture:
     Express process
       -> extract one 16kHz mono WAV
       -> spawn ONE isolated Whisper worker
       -> worker loads model ONCE
       -> worker loads WAV ONCE
       -> worker transcribes all windows
       -> worker writes one JSON result
       -> worker exits and releases memory

   This keeps the safety benefit of process isolation while removing
   the very expensive model-load/process-start cycle that previously
   happened for every window.

   Gemini remains the fallback for timing if the isolated Whisper
   worker fails or hits its hard timeout.
========================================================= */

const WHISPER_CAPTIONS_ENABLED =
  process.env.WHISPER_CAPTIONS_ENABLED !== "false";

const WHISPER_MODEL =
  process.env.WHISPER_MODEL?.trim() || "Xenova/whisper-tiny";

const WHISPER_DTYPE =
  process.env.WHISPER_DTYPE?.trim() || "q8";

const WHISPER_WINDOW_STEP_S = Math.max(
  5,
  Number(process.env.WHISPER_WINDOW_STEP_S || 30),
);

const WHISPER_WINDOW_OVERLAP_S = Math.min(
  Math.max(
    0,
    Number(process.env.WHISPER_WINDOW_OVERLAP_S || 2),
  ),
  WHISPER_WINDOW_STEP_S - 1,
);

const WHISPER_CACHE_DIR =
  process.env.WHISPER_CACHE_DIR?.trim() ||
  path.join(process.cwd(), ".whisper-cache");

/*
 * Hard ceiling for actual inference of ONE window.
 *
 * Model loading happens only once now, so this timeout is no longer
 * repeatedly consumed by model initialization.
 */
const WHISPER_TIMEOUT_MS = Number(
  process.env.WHISPER_TIMEOUT_MS || 75 * 1000,
);

/*
 * Hard ceiling for the complete persistent worker job.
 *
 * A 168s video has 6 windows by default. Eight minutes gives enough
 * room for CPU inference while still preventing a stuck worker from
 * hanging a Render request forever.
 */
const WHISPER_TOTAL_TIMEOUT_MS = Number(
  process.env.WHISPER_TOTAL_TIMEOUT_MS || 8 * 60 * 1000,
);

/*
 * Backward-compatible environment variable name. This is now the
 * heap cap for the single persistent per-video worker.
 */
const WHISPER_CHILD_MAX_OLD_SPACE_MB = Number(
  process.env.WHISPER_CHILD_MAX_OLD_SPACE_MB || 320,
);

try {
  fs.mkdirSync(WHISPER_CACHE_DIR, {
    recursive: true,
  });
} catch {
  // best effort
}

/*
 * Standalone worker code.

 * stdout is reserved for the completion marker.
 * stderr carries progress/error logs.
 * The final transcript is written to outPath so the parent never
 * needs to buffer a potentially large word array.
 */
const WHISPER_WORKER_SCRIPT = `
const fs = require("fs");

function withTimeout(promise, timeoutMs, label) {
  let timer;

  return Promise.race([
    promise,
    new Promise((_, reject) => {
      timer = setTimeout(() => {
        reject(
          new Error(
            label +
              " timed out after " +
              timeoutMs +
              "ms.",
          ),
        );
      }, timeoutMs);

      if (timer.unref) timer.unref();
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer);
  });
}

async function main() {
  const [
    ,
    audioPath,
    durationStr,
    modelName,
    dtype,
    cacheDir,
    outPath,
    windowStepStr,
    overlapStr,
    windowTimeoutStr,
  ] = process.argv;

  const duration = Number(durationStr);
  const windowStepS = Number(windowStepStr);
  const overlapS = Number(overlapStr);
  const windowTimeoutMs = Number(windowTimeoutStr);

  if (
    !audioPath ||
    !outPath ||
    !Number.isFinite(duration) ||
    duration <= 0 ||
    !Number.isFinite(windowStepS) ||
    windowStepS <= 0 ||
    !Number.isFinite(overlapS) ||
    overlapS < 0 ||
    !Number.isFinite(windowTimeoutMs) ||
    windowTimeoutMs <= 0
  ) {
    throw new Error(
      "Invalid Whisper worker arguments.",
    );
  }

  const { pipeline, env } =
    await import("@huggingface/transformers");

  env.cacheDir = cacheDir;

  /*
   * Keep ONNX memory predictable on constrained Render instances.
   * One WASM thread is intentionally used even on hosts reporting
   * many CPUs; multiple WASM arenas can multiply memory pressure.
   */
  try {
    env.backends.onnx.wasm.numThreads = 1;
    env.backends.onnx.wasm.proxy = false;
  } catch {
    // best effort
  }

  console.error(
    "Whisper worker: loading audio once..."
  );

  const wavefileModule =
    await import("wavefile");

  const WaveFile =
    wavefileModule.WaveFile ||
    (
      wavefileModule.default &&
      wavefileModule.default.WaveFile
    );

  if (!WaveFile) {
    throw new Error(
      "WaveFile constructor is unavailable.",
    );
  }

  const buffer =
    fs.readFileSync(audioPath);

  const wav =
    new WaveFile(buffer);

  wav.toBitDepth("32f");
  wav.toSampleRate(16000);

  let audioData =
    wav.getSamples();

  if (Array.isArray(audioData)) {
    if (audioData.length > 1) {
      const SCALING_FACTOR =
        Math.sqrt(2);

      const sampleCount =
        Math.min(
          audioData[0].length,
          audioData[1].length,
        );

      for (
        let i = 0;
        i < sampleCount;
        i++
      ) {
        audioData[0][i] =
          (
            SCALING_FACTOR *
            (
              audioData[0][i] +
              audioData[1][i]
            )
          ) / 2;
      }
    }

    audioData =
      audioData[0];
  }

  if (
    !audioData ||
    !audioData.length
  ) {
    throw new Error(
      "Whisper audio contains no samples.",
    );
  }

  console.error(
    "Whisper worker: loading model ONCE " +
      "(model=" +
      modelName +
      ", dtype=" +
      dtype +
      ")..."
  );

  const transcriber =
    await pipeline(
      "automatic-speech-recognition",
      modelName,
      { dtype },
    );

  console.error(
    "Whisper worker: model ready. " +
      "Starting sequential window transcription."
  );

  const SAMPLE_RATE =
    16000;

  // IMPORTANT: overlap is created by shifting the next window start
  // backwards. Never extend an inference slice beyond windowStepS.
  // Example with 30s window / 2s overlap: 0-30, 28-58, 56-86...
  const strideS = Math.max(
    1,
    windowStepS - overlapS,
  );

  const windowCount =
    Math.max(
      1,
      Math.ceil(
        Math.max(
          0,
          duration - windowStepS,
        ) / strideS,
      ) + 1,
    );

  const allWords = [];

  for (
    let i = 0;
    i < windowCount;
    i++
  ) {
    const windowStartS =
      i * strideS;

    const windowEndS =
      Math.min(
        duration,
        windowStartS +
          windowStepS,
      );

    // Drop the leading overlap on every window after the first.
    const keepBeforeS =
      i === 0
        ? 0
        : overlapS;

    const startSample =
      Math.max(
        0,
        Math.round(
          windowStartS *
            SAMPLE_RATE,
        ),
      );

    const endSample =
      Math.min(
        audioData.length,
        Math.round(
          windowEndS *
            SAMPLE_RATE,
        ),
      );

    const slice =
      audioData.subarray
        ? audioData.subarray(
            startSample,
            endSample,
          )
        : audioData.slice(
            startSample,
            endSample,
          );

    if (!slice.length) {
      continue;
    }

    console.error(
      "Whisper worker: window " +
        (i + 1) +
        "/" +
        windowCount +
        " " +
        windowStartS.toFixed(1) +
        "s-" +
        windowEndS.toFixed(1) +
        "s..."
    );

    const startedAt =
      Date.now();

    const output =
      await withTimeout(
        transcriber(
          slice,
          {
            return_timestamps:
              "word",
          },
        ),
        windowTimeoutMs,
        "Whisper window " +
          (i + 1) +
          "/" +
          windowCount,
      );

    const chunks =
      Array.isArray(
        output &&
          output.chunks,
      )
        ? output.chunks
        : [];

    let kept =
      0;

    for (const c of chunks) {
      const word =
        String(
          (c && c.text) ||
            "",
        ).trim();

      const ts =
        Array.isArray(
          c &&
            c.timestamp,
        )
          ? c.timestamp
          : [null, null];

      const relStart =
        Number(ts[0]);

      const relEnd =
        Number.isFinite(
          Number(ts[1]),
        )
          ? Number(ts[1])
          : relStart + 0.3;

      if (
        !word.length ||
        !Number.isFinite(
          relStart,
        ) ||
        !Number.isFinite(
          relEnd,
        ) ||
        relEnd <= relStart ||
        relStart >=
          keepBeforeS
      ) {
        continue;
      }

      const start =
        windowStartS +
        relStart;

      const end =
        windowStartS +
        relEnd;

      if (
        !Number.isFinite(start) ||
        !Number.isFinite(end) ||
        end <= start ||
        start < 0 ||
        start >= duration
      ) {
        continue;
      }

      allWords.push({
        word,
        start: Math.max(
          0,
          Math.min(
            duration,
            start,
          ),
        ),
        end: Math.max(
          0,
          Math.min(
            duration,
            end,
          ),
        ),
      });

      kept++;
    }

    console.error(
      "Whisper worker: window " +
        (i + 1) +
        "/" +
        windowCount +
        " done (" +
        chunks.length +
        " token(s), " +
        kept +
        " kept, " +
        (Date.now() -
          startedAt) +
        "ms)."
    );
  }

  const cleanedWords =
    allWords
      .filter(
        (w) =>
          w.word.length > 0 &&
          Number.isFinite(
            w.start,
          ) &&
          Number.isFinite(
            w.end,
          ) &&
          w.end > w.start &&
          w.start >= 0 &&
          w.start < duration,
      )
      .map((w) => ({
        word: w.word,
        start: Math.max(
          0,
          Math.min(
            duration,
            w.start,
          ),
        ),
        end: Math.max(
          0,
          Math.min(
            duration,
            w.end,
          ),
        ),
      }));

  fs.writeFileSync(
    outPath,
    JSON.stringify({
      words: cleanedWords,
    }),
  );

  console.error(
    "Whisper worker: completed " +
      windowCount +
      " window(s), wrote " +
      cleanedWords.length +
      " word(s)."
  );

  process.stdout.write(
    "WHISPER_WORKER_DONE\\\\n",
  );
}

main().catch((error) => {
  console.error(
    "Whisper worker: FAILED —",
    error &&
      error.message
      ? error.message
      : error,
  );

  process.exit(1);
});
`;

// Extract one reusable 16kHz mono WAV for the complete worker job.
async function extractAudioForWhisper(
  videoPath: string,
): Promise<string> {
  const outPath =
    path.join(
      tempDir,
      `${generateId()}-whisper.wav`,
    );

  await new Promise<void>(
    (resolve, reject) => {
      let settled =
        false;

      let timer:
        | NodeJS.Timeout
        | undefined;

      const cleanupOutput =
        () => {
          try {
            fs.unlinkSync(
              outPath,
            );
          } catch {}
        };

      const fail =
        (error: Error) => {
          if (settled) return;

          settled = true;

          if (timer) {
            clearTimeout(
              timer,
            );
          }

          cleanupOutput();
          reject(error);
        };

      const command =
        ffmpeg(videoPath)
          .noVideo()
          .audioChannels(1)
          .audioFrequency(
            16000,
          )
          .format("wav")
          .on(
            "error",
            (error) => {
              fail(error);
            },
          )
          .on(
            "end",
            () => {
              if (settled) return;

              settled = true;

              if (timer) {
                clearTimeout(
                  timer,
                );
              }

              resolve();
            },
          )
          .save(outPath);

      timer =
        setTimeout(
          () => {
            try {
              command.kill(
                "SIGKILL",
              );
            } catch {}

            fail(
              new Error(
                `Whisper audio extraction timed out after ${FFMPEG_TIMEOUT_MS}ms.`,
              ),
            );
          },
          Math.max(
            1000,
            FFMPEG_TIMEOUT_MS,
          ),
        );

      timer.unref?.();
    },
  );

  return outPath;
}

/*
 * ONE isolated worker for the whole video.
 *
 * This is the key optimization: the function is called exactly once
 * per video, regardless of how many Whisper windows are required.
 */
function runPersistentWhisperWorker(
  audioPath: string,
  duration: number,
  windowCount: number,
): Promise<
  TranscriptWord[] | null
> {
  const outPath =
    path.join(
      tempDir,
      `${generateId()}-whisper-out.json`,
    );

  return new Promise(
    (resolve) => {
      let settled =
        false;

      let timer:
        | NodeJS.Timeout
        | undefined;

      let stderrBuffer =
        "";

      const cleanup =
        () => {
          if (timer) {
            clearTimeout(
              timer,
            );
          }

          try {
            fs.unlinkSync(
              outPath,
            );
          } catch {}
        };

      const finish =
        (
          words:
            | TranscriptWord[]
            | null,
        ) => {
          if (settled) return;

          settled = true;
          cleanup();
          resolve(words);
        };

      console.log(
        `Whisper: starting ONE persistent worker for ${windowCount} window(s) ` +
          `(model=${WHISPER_MODEL}, dtype=${WHISPER_DTYPE}, ` +
          `window=${WHISPER_WINDOW_STEP_S}s, overlap=${WHISPER_WINDOW_OVERLAP_S}s (shifted-start), ` +
          `per-window timeout=${WHISPER_TIMEOUT_MS}ms, ` +
          `total timeout=${WHISPER_TOTAL_TIMEOUT_MS}ms)...`,
      );

      const child =
        spawn(
          process.execPath,
          [
            `--max-old-space-size=${WHISPER_CHILD_MAX_OLD_SPACE_MB}`,
            "-e",
            WHISPER_WORKER_SCRIPT,
            "--",
            audioPath,
            String(duration),
            WHISPER_MODEL,
            WHISPER_DTYPE,
            WHISPER_CACHE_DIR,
            outPath,
            String(
              WHISPER_WINDOW_STEP_S,
            ),
            String(
              WHISPER_WINDOW_OVERLAP_S,
            ),
            String(
              WHISPER_TIMEOUT_MS,
            ),
          ],
          {
            cwd:
              process.cwd(),
            stdio: [
              "ignore",
              "pipe",
              "pipe",
            ],
          },
        );

      child.stdout.on(
        "data",
        (chunk) => {
          const text =
            String(chunk);

          if (
            text.includes(
              "WHISPER_WORKER_DONE",
            )
          ) {
            console.log(
              "Whisper: persistent worker reported completion.",
            );
          }
        },
      );

      child.stderr.on(
        "data",
        (chunk) => {
          const text =
            String(chunk);

          stderrBuffer =
            (
              stderrBuffer +
              text
            ).slice(-30000);

          const lines =
            text
              .trim()
              .split("\\n")
              .filter(Boolean);

          for (
            const line of
              lines.slice(-8)
          ) {
            console.log(
              "Whisper (worker):",
              line,
            );
          }
        },
      );

      child.once(
        "error",
        (error) => {
          console.error(
            "Whisper: failed to spawn persistent worker — falling back.",
            error instanceof Error
              ? error.message
              : error,
          );

          finish(null);
        },
      );

      child.once(
        "close",
        (code, signal) => {
          if (settled) return;

          if (code !== 0) {
            console.error(
              "Whisper: persistent worker exited unsuccessfully " +
                `(code=${code ?? "null"}, signal=${signal ?? "none"}) — falling back.`,
            );

            if (
              stderrBuffer.trim()
            ) {
              console.error(
                "Whisper worker tail:",
                stderrBuffer
                  .trim()
                  .split("\\n")
                  .slice(-12)
                  .join("\\n"),
              );
            }

            finish(null);
            return;
          }

          try {
            const raw =
              fs.readFileSync(
                outPath,
                "utf8",
              );

            const parsed =
              JSON.parse(raw);

            const words =
              Array.isArray(
                parsed?.words,
              )
                ? parsed.words
                : null;

            if (
              !words ||
              !words.length
            ) {
              console.warn(
                "Whisper: persistent worker returned no usable words — falling back.",
              );

              finish(null);
              return;
            }

            console.log(
              `Whisper: persistent worker completed successfully with ${words.length} word(s).`,
            );

            finish(words);
          } catch (error) {
            console.error(
              "Whisper: could not read persistent worker output — falling back.",
              error,
            );

            finish(null);
          }
        },
      );

      timer =
        setTimeout(
          () => {
            if (settled) return;

            console.error(
              `Whisper: persistent worker exceeded hard total timeout of ${WHISPER_TOTAL_TIMEOUT_MS}ms — killing worker and falling back to Gemini timing.`,
            );

            try {
              child.kill(
                "SIGKILL",
              );
            } catch {}

            finish(null);
          },
          Math.max(
            1000,
            WHISPER_TOTAL_TIMEOUT_MS,
          ),
        );

      timer.unref?.();
    },
  );
}

function enforceMonotonicWordTimings(
  words: TranscriptWord[],
): TranscriptWord[] {
  const sorted =
    [...words].sort(
      (a, b) =>
        a.start - b.start,
    );

  const MIN_WORD_DURATION =
    0.05;

  const result:
    TranscriptWord[] = [];

  let cursor = 0;

  for (
    const w of sorted
  ) {
    const start =
      Math.max(
        w.start,
        cursor,
      );

    const end =
      Math.max(
        w.end,
        start +
          MIN_WORD_DURATION,
      );

    result.push({
      word: w.word,
      start,
      end,
    });

    cursor = end;
  }

  return result;
}

function chunkWhisperWordsIntoSegments(
  words: TranscriptWord[],
): TranscriptSegment[] {
  const WORDS_PER_CHUNK =
    3;

  const segments:
    TranscriptSegment[] = [];

  for (
    let i = 0;
    i < words.length;
    i += WORDS_PER_CHUNK
  ) {
    const chunk =
      words.slice(
        i,
        i +
          WORDS_PER_CHUNK,
      );

    if (!chunk.length) {
      continue;
    }

    segments.push({
      start:
        chunk[0].start,
      end:
        chunk[
          chunk.length - 1
        ].end,
      text: chunk
        .map(
          (w) => w.word,
        )
        .join(" ")
        .trim(),
      words: chunk,
    });
  }

  return segments;
}

async function transcribeWithWhisper(
  videoPath: string,
  duration: number,
): Promise<
  TranscriptSegment[] | null
> {
  if (
    !WHISPER_CAPTIONS_ENABLED
  ) {
    return null;
  }

  let audioPath =
    "";

  try {
    console.log(
      "Whisper: extracting audio for local transcription...",
    );

    audioPath =
      await extractAudioForWhisper(
        videoPath,
      );

    const whisperStrideS = Math.max(
      1,
      WHISPER_WINDOW_STEP_S -
        WHISPER_WINDOW_OVERLAP_S,
    );

    const windowCount =
      Math.max(
        1,
        Math.ceil(
          Math.max(
            0,
            duration -
              WHISPER_WINDOW_STEP_S,
          ) / whisperStrideS,
        ) + 1,
      );

    const allWords =
      await runPersistentWhisperWorker(
        audioPath,
        duration,
        windowCount,
      );

    if (
      !allWords ||
      !allWords.length
    ) {
      console.warn(
        "Whisper: no usable words came back — falling back to Gemini's own transcript timing.",
      );

      return null;
    }

    const orderedWords =
      enforceMonotonicWordTimings(
        allWords,
      );

    const segments =
      chunkWhisperWordsIntoSegments(
        orderedWords,
      );

    console.log(
      `Whisper: produced ${orderedWords.length} word-level timestamp(s) ` +
        `across ${segments.length} caption segment(s).`,
    );

    return segments;
  } catch (error) {
    console.error(
      "Whisper: local transcription failed — falling back to " +
        "Gemini's own transcript timing:",
      error instanceof Error
        ? error.message
        : error,
    );

    return null;
  } finally {
    if (audioPath) {
      try {
        fs.unlinkSync(
          audioPath,
        );
      } catch {
        // best effort
      }
    }
  }
}

/* =========================================================
   MULTER
========================================================= */

const upload = multer({
  dest: tempDir,

  limits: {
    fileSize:
      MAX_UPLOAD_MB * 1024 * 1024,
  },

  fileFilter: (
    _req,
    file,
    cb,
  ) => {
    const allowed = [
      "video/mp4",
      "video/quicktime",
      "video/webm",
      "video/x-msvideo",
      "video/mpeg",
    ];

    if (!allowed.includes(file.mimetype)) {
      return cb(
        new Error(
          "Only MP4, MOV, WEBM, AVI and MPEG videos are supported.",
        ),
      );
    }

    cb(null, true);
  },
});

/* =========================================================
   HELPERS
========================================================= */

function sleep(ms: number) {
  return new Promise<void>((resolve) =>
    setTimeout(resolve, ms),
  );
}

function getGeminiErrorStatus(error: any): number | undefined {
  const candidates = [
    error?.status,
    error?.code,
    error?.error?.status,
    error?.error?.code,
  ];

  for (const candidate of candidates) {
    const numeric = Number(candidate);
    if (Number.isFinite(numeric)) {
      return numeric;
    }
  }

  return undefined;
}

function getGeminiErrorMessage(error: any): string {
  return String(
    error?.message ||
      error?.error?.message ||
      error?.error?.details?.[0]?.message ||
      error ||
      "",
  );
}

function isGeminiQuotaExceeded(error: any): boolean {
  const status = getGeminiErrorStatus(error);
  const message = getGeminiErrorMessage(error).toLowerCase();

  return (
    status === 429 &&
    (message.includes("quota") ||
      message.includes("free tier") ||
      message.includes("rate limit") ||
      message.includes("limit: 0") ||
      message.includes("generate_content_free_tier_requests") ||
      message.includes("resource exhausted"))
  );
}

function getGeminiRetryAfterMs(error: any): number | undefined {
  const candidates = [
    error?.retryAfterMs,
    error?.retryAfter,
    error?.headers?.["retry-after"],
    error?.response?.headers?.["retry-after"],
  ];

  for (const candidate of candidates) {
    if (candidate == null) continue;

    const numeric = Number(candidate);
    if (Number.isFinite(numeric)) {
      // HTTP Retry-After may be seconds, while our internal retryAfterMs is ms.
      return Math.max(0, Math.min(GEMINI_RATE_LIMIT_MAX_WAIT_MS,
        numeric < 1000 ? numeric * 1000 : numeric));
    }

    const match = String(candidate).match(/(\d+(?:\.\d+)?)\s*s/i);
    if (match) {
      return Math.max(0, Math.min(GEMINI_RATE_LIMIT_MAX_WAIT_MS, Number(match[1]) * 1000));
    }
  }

  // Gemini commonly includes retryDelay in the serialized error body.
  const message = getGeminiErrorMessage(error);
  const retryMatch = message.match(/retry(?: in|after)[^0-9]*(\d+(?:\.\d+)?)\s*s/i);
  if (retryMatch) {
    return Math.max(0, Math.min(GEMINI_RATE_LIMIT_MAX_WAIT_MS, Number(retryMatch[1]) * 1000));
  }

  return undefined;
}

function isGeminiRetryableForNextAttempt(error: any): boolean {
  const status = getGeminiErrorStatus(error);
  const message = getGeminiErrorMessage(error).toLowerCase();

  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    message.includes("high demand") ||
    message.includes("temporarily unavailable") ||
    message.includes("resource exhausted")
  );
}

async function withGeminiTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  const safeTimeout = Math.max(1000, timeoutMs);

  return await Promise.race([
    operation,
    new Promise<T>((_, reject) => {
      const timer = setTimeout(() => {
        const error: any = new Error(
          `${label} timed out after ${safeTimeout}ms.`,
        );
        error.code = "GEMINI_REQUEST_TIMEOUT";
        error.status = 504;
        reject(error);
      }, safeTimeout);

      // Do not keep Node alive just because the timeout is pending.
      timer.unref?.();
    }),
  ]);
}

async function generateGeminiWithRetry(
  params: Parameters<typeof ai.models.generateContent>[0],
) {
  const primaryModel = String((params as any).model || "").trim();

  const modelsToTry = [
    primaryModel,
    ...GEMINI_FALLBACK_MODELS,
  ]
    .map((m) => String(m || "").trim())
    .filter(Boolean)
    .filter((model, index, list) => list.indexOf(model) === index);

  let lastError: unknown;

  for (let modelIndex = 0; modelIndex < modelsToTry.length; modelIndex++) {
    const model = modelsToTry[modelIndex];
    const isFallback = modelIndex > 0;
    const attempts = Math.max(1, GEMINI_TRANSIENT_MAX_ATTEMPTS);

    // Try this model against every remaining configured Gemini API key
    // before giving up on it and moving to the next fallback model.
    // geminiKeyIndex only ever advances, so once a key is confirmed
    // quota-exhausted this loop naturally skips it for every future model
    // and every future job in this process.
    keyLoop: for (
      let keyPass = 0;
      keyPass < geminiClients.length;
      keyPass++
    ) {
      for (let attempt = 1; attempt <= attempts; attempt++) {
        try {
          console.log(
            `Gemini generateContent${isFallback ? " [fallback]" : ""} model=${model} key=#${geminiKeyIndex + 1}/${geminiClients.length} attempt ${attempt}/${attempts}`,
          );

          const response = await withGeminiTimeout(
            getGeminiClient().models.generateContent({
              ...params,
              model,
            } as any),
            GEMINI_REQUEST_TIMEOUT_MS,
            `Gemini ${model}`,
          );

          console.log(
            `Gemini model=${model} succeeded on attempt ${attempt} (key #${geminiKeyIndex + 1}).`,
          );
          return response;
        } catch (error: any) {
          lastError = error;

          const status = getGeminiErrorStatus(error);
          const message = getGeminiErrorMessage(error);
          const quotaExceeded = isGeminiQuotaExceeded(error);
          const retryable = isGeminiRetryableForNextAttempt(error);

          console.error(
            `Gemini generateContent model=${model} key=#${geminiKeyIndex + 1} attempt ${attempt} failed (status ${status ?? "unknown"})${quotaExceeded ? " [QUOTA EXCEEDED]" : ""}:`,
            message,
          );

          // A daily/free-tier/model quota does not recover during this job.
          // Never burn another request against the same exhausted key. Try
          // the next configured API key on the same model before falling
          // back to a weaker model.
          if (quotaExceeded) {
            const rotated = rotateGeminiKey();

            if (rotated) {
              console.warn(
                `Gemini model=${model} quota exhausted on key #${geminiKeyIndex}. Retrying same model on key #${geminiKeyIndex + 1}.`,
              );
              continue keyLoop;
            }

            console.warn(
              `Gemini model=${model} quota exhausted on all configured API keys. Switching to the next fallback model.`,
            );
            break keyLoop;
          }

          // Auth, invalid model, malformed request, etc. should not be retried.
          if (!retryable) {
            console.warn(
              `Gemini model=${model} returned a non-retryable error. Stopping Gemini retries.`,
            );
            throw error;
          }

          if (attempt >= attempts) {
            console.warn(
              `Gemini model=${model} exhausted after ${attempts} transient attempt(s).${
                modelIndex < modelsToTry.length - 1
                  ? " Moving to the next fallback model."
                  : " No Gemini models remain."
              }`,
            );
            break keyLoop;
          }

          let delay = getGeminiRetryAfterMs(error);

          if (delay == null) {
            const exponentialDelay = Math.min(
              GEMINI_RETRY_BASE_MS * Math.pow(2, attempt - 1),
              GEMINI_RETRY_MAX_MS,
            );
            const jitter = Math.floor(Math.random() * 1000);
            delay = Math.min(
              exponentialDelay + jitter,
              GEMINI_RETRY_MAX_MS,
            );
          }

          // Do not wait minutes on a rate-limit signal. The next model gets a
          // chance quickly after the current model's transient failure.
          delay = Math.max(250, Math.min(delay, GEMINI_RATE_LIMIT_MAX_WAIT_MS));

          console.warn(
            `Gemini model=${model} temporarily unavailable${
              status ? ` (HTTP ${status})` : ""
            }. Retrying in ${delay}ms...`,
          );

          await sleep(delay);
        }
      }
    }
  }

  throw lastError || new Error("All configured Gemini models failed.");
}

function generateId() {
  return crypto.randomUUID();
}

function isYouTubeUrl(value: string) {
  try {
    const u = new URL(value);

    const hostname = u.hostname
      .toLowerCase()
      .replace(/^www\./, "");

    return (
      hostname === "youtube.com" ||
      hostname.endsWith(".youtube.com") ||
      hostname === "youtu.be"
    );
  } catch {
    return false;
  }
}

function safeSegment(value: string) {
  return value.replace(
    /[^a-zA-Z0-9._-]/g,
    "_",
  );
}

function extensionForMime(
  mime: string,
) {
  if (mime === "video/quicktime") {
    return "mov";
  }

  if (mime === "video/webm") {
    return "webm";
  }

  if (mime === "video/x-msvideo") {
    return "avi";
  }

  if (mime === "video/mpeg") {
    return "mpeg";
  }

  return "mp4";
}

function publicMediaUrl(
  projectId: string,
  filename: string,
) {
  const encodedProject =
    encodeURIComponent(projectId);

  const parts = filename
    .split("/")
    .map(encodeURIComponent);

  if (parts[0] === "clips") {
    return `/api/media/${encodedProject}/clips/${parts
      .slice(1)
      .join("/")}`;
  }

  return `/api/media/${encodedProject}/source/${parts.join(
    "/",
  )}`;
}

/* =========================================================
   AUTH
========================================================= */

async function getAuthenticatedUser(
  req: express.Request,
) {
  const header =
    req.headers.authorization;

  if (
    !header ||
    !header.startsWith("Bearer ")
  ) {
    throw new Error("UNAUTHORIZED");
  }

  const token = header
    .slice(7)
    .trim();

  if (!token) {
    throw new Error("UNAUTHORIZED");
  }

  const {
    data,
    error,
  } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    throw new Error("UNAUTHORIZED");
  }

  return data.user;
}

/* =========================================================
   PROFILE
========================================================= */

function isNewDhakaDay(
  lastResetAt: string | null,
): boolean {
  if (!lastResetAt) return true;

  const now = new Date();

  const todayDhaka = new Intl.DateTimeFormat(
    "en-CA",
    {
      timeZone: "Asia/Dhaka",
    },
  ).format(now);

  const lastResetDhaka =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: "Asia/Dhaka",
      },
    ).format(new Date(lastResetAt));

  return todayDhaka !== lastResetDhaka;
}

async function getProfile(
  userId: string,
) {
  const {
    data: authData,
    error: authError,
  } =
    await supabase.auth.admin.getUserById(
      userId,
    );

  if (
    authError ||
    !authData?.user
  ) {
    throw new Error(
      "Authenticated user not found.",
    );
  }

  const authUser =
    authData.user;

  const avatar =
    authUser.user_metadata
      ?.avatar_url ||
    authUser.user_metadata
      ?.picture ||
    null;

  const name =
    authUser.user_metadata
      ?.full_name ||
    authUser.user_metadata
      ?.name ||
    authUser.email?.split("@")[0] ||
    "User";

  const {
    data: profile,
    error: profileError,
  } =
    await supabase
      .from("profiles")
      .select(
        "id, name, email, avatar, credits, plan, daily_credits, last_credit_reset_at",
      )
      .eq("id", userId)
      .single();

  if (
    profileError ||
    !profile
  ) {
    throw new Error(
      "User profile not found.",
    );
  }

  /* =====================================================
     DAILY CREDIT RESET
  ===================================================== */

  // Daily processing allowance is fixed by backend policy.
  const dailyLimit = DAILY_CREDIT_LIMIT;

  if (
    isNewDhakaDay(
      profile.last_credit_reset_at,
    )
  ) {
    const {
      data: resetProfile,
      error: resetError,
    } =
      await supabase
        .from("profiles")
        .update({
          credits: dailyLimit,
          daily_credits: dailyLimit,
          last_credit_reset_at:
            new Date().toISOString(),
        })
        .eq("id", userId)
        .select(
          "id, name, email, avatar, credits, plan, daily_credits, last_credit_reset_at",
        )
        .single();

    if (resetError) {
      throw resetError;
    }

    if (resetProfile) {
      return resetProfile;
    }
  }

  // Automatically sync Google/Supabase Auth avatar
  if (
    avatar &&
    avatar !== profile.avatar
  ) {
    const {
      data: updatedProfile,
      error,
    } =
      await supabase
        .from("profiles")
        .update({
          avatar,
          name,
        })
        .eq("id", userId)
        .select(
          "id, name, email, avatar, credits, plan, daily_credits, last_credit_reset_at",
        )
        .single();

    if (
      !error &&
      updatedProfile
    ) {
      return updatedProfile;
    }

    console.error(
      "Avatar sync failed:",
      error,
    );
  }

  return profile;
}
/* =========================================================
   NOTIFICATIONS
========================================================= */

async function createNotification({
  userId,
  type,
  title,
  message,
  projectId,
  metadata,
}: {
  userId: string;
  type: string;
  title: string;
  message: string;
  projectId?: string;
  metadata?: Record<string, unknown>;
}) {
  try {
    const { error } = await supabase
      .from("notifications")
      .insert({
        user_id: userId,
        type,
        title,
        message,
        project_id: projectId || null,
        metadata: metadata || {},
        read: false,
      });

    if (error) {
      console.error("Notification insert failed:", error);
    }
  } catch (error) {
    // Notifications must never break video processing.
    console.error("Notification creation failed:", error);
  }
}

/* =========================================================
   PROJECT UPDATES
========================================================= */

async function updateProject(
  projectId: string,
  progress: number,
  currentStep: string,
  status?: string,
  totalClips?: number,
) {
  const update: Record<
    string,
    unknown
  > = {
    progress,
    current_step: currentStep,
  };

  if (status !== undefined) {
    update.status = status;
  }

  if (totalClips !== undefined) {
    update.total_clips =
      totalClips;
  }

  const {
    error,
  } = await supabase
    .from("projects")
    .update(update)
    .eq("id", projectId);

  if (error) {
    console.error(
      "Project update failed:",
      error,
    );

    throw error;
  }
}

async function updateProjectMedia(
  projectId: string,
  sourceMediaUrl: string,
  duration: number,
  originalSourceUrl?: string,
  thumbnailUrl?: string
) {
  const payload: Record<string, unknown> = {
    source_media_url: sourceMediaUrl,
    duration,
  };

  if (originalSourceUrl) {
    payload.original_source_url =
      originalSourceUrl;
  }

  if (thumbnailUrl) {
    payload.thumbnail_url =
      thumbnailUrl;
  }

  const { error } = await supabase
    .from("projects")
    .update(payload)
    .eq("id", projectId);

  if (error) {
    throw error;
  }
}
/* =========================================================
   VIDEO DURATION
========================================================= */

function getVideoDuration(
  filePath: string,
): Promise<number> {
  return new Promise(
    (resolve, reject) => {
      ffmpeg.ffprobe(
        filePath,
        (
          error,
          metadata,
        ) => {
          if (error) {
            return reject(error);
          }

          const duration =
            Number(
              metadata.format
                ?.duration || 0,
            );

          resolve(duration);
        },
      );
    },
  );
}

function createVideoThumbnail(
  inputPath: string,
  outputPath: string,
  seekSeconds = 1
): Promise<void> {
  return new Promise((resolve, reject) => {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });

    ffmpeg(inputPath)
      .inputOptions([
        "-ss",
        String(Math.max(0, seekSeconds)),
      ])
      .outputOptions([
        "-frames:v",
        "1",
        "-q:v",
        "2",
      ])
      .output(outputPath)
      .on("start", (commandLine) => {
        console.log("Creating thumbnail:");
        console.log(commandLine);
      })
      .on("end", () => {
        if (!fs.existsSync(outputPath)) {
          return reject(
            new Error("Thumbnail was not created.")
          );
        }

        const stats = fs.statSync(outputPath);

        if (stats.size <= 0) {
          return reject(
            new Error("Generated thumbnail is empty.")
          );
        }

        console.log(
          `Thumbnail created: ${outputPath}`
        );

        resolve();
      })
      .on("error", (error) => {
        console.error(
          "Thumbnail generation failed:",
          error
        );

        reject(error);
      })
      .run();
  });
}

/* =========================================================
   TYPES
========================================================= */

interface TranscriptWord {
  word: string;
  start: number;
  end: number;
}

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  words?: TranscriptWord[];
}

interface ViralClip {
  start: number;
  end: number;
  title: string;
  reason: string;
  score: number;
  caption: string;
}

interface GeminiAnalysis {
  transcript: TranscriptSegment[];
  clips: ViralClip[];
  /** True when transcript timing already came from local Whisper fallback. */
  captionTimingReady?: boolean;
}

/* =========================================================
JSON CLEANER
========================================================= */

function cleanJson(text: string): string {
  let cleaned = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  // Extract the JSON object if Gemini added extra text.
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");

  if (
    firstBrace !== -1 &&
    lastBrace !== -1 &&
    lastBrace > firstBrace
  ) {
    cleaned = cleaned.slice(
      firstBrace,
      lastBrace + 1,
    );
  }

  /*
   * Gemini sometimes returns timestamps like:
   *
   * 1:32.0
   * 2:13.0
   * 4:05.0
   *
   * These are NOT valid JSON numbers.
   *
   * Convert them to seconds before JSON.parse().
   *
   * 1:32.0 -> 92.0
   * 2:13.0 -> 133.0
   * 4:05.0 -> 245.0
   */
  cleaned = cleaned.replace(
    /("(?:start|end)"\s*:\s*)(\d+):(\d+(?:\.\d+)?)/g,
    (_match, prefix, minutes, seconds) => {
      const totalSeconds =
        Number(minutes) * 60 +
        Number(seconds);

      return `${prefix}${totalSeconds.toFixed(3)}`;
    },
  );

  return cleaned.trim();
}
/* =========================================================
VALIDATE GEMINI RESULT
========================================================= */

// Gemini is asked to always return a per-clip social caption, but it
// isn't guaranteed to comply — this makes sure ClipCard / the YouTube
// publish modal always has something usable instead of silently
// rendering no caption at all.
function buildFallbackCaption(
  caption: string,
  title: string,
  reason: string,
): string {
  if (caption) {
    return caption;
  }

  const base = title || "Check this out";
  const extra = reason
    ? ` — ${reason}`
    : "";

  const combined = `${base}${extra}`.trim();

  // Keep it social-media sized even when "reason" is long.
  return combined.length > 220
    ? `${combined.slice(0, 217).trim()}...`
    : combined;
}

function buildFallbackClipsFromTranscript(
  transcript: TranscriptSegment[],
  duration: number,
  maxClips: number,
): ViralClip[] {
  if (!transcript.length || maxClips <= 0) return [];

  const safeDuration = Math.max(1, Number(duration) || 1);
  const targetMin = 12;
  const targetMax = 45;
  const candidates: ViralClip[] = [];

  // Prefer transcript windows with enough speech to make a useful short.
  // This is a deterministic recovery path only; Gemini remains the primary
  // source of viral ranking/title/reason when it returns valid clips.
  for (let i = 0; i < transcript.length; i++) {
    const first = transcript[i];
    let start = Math.max(0, first.start - 1.5);
    let end = first.end;
    let text = first.text;

    for (let j = i + 1; j < transcript.length && end - start < targetMin; j++) {
      const next = transcript[j];
      if (next.start - end > 2.5) break;
      end = next.end;
      text += ` ${next.text}`;
    }

    if (end - start < targetMin) continue;

    end = Math.min(safeDuration, Math.max(end, start + targetMin));
    if (end - start > targetMax) end = start + targetMax;
    if (end > safeDuration) {
      end = safeDuration;
      start = Math.max(0, end - targetMax);
    }

    const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
    const speechScore = Math.min(100, 45 + wordCount * 2);

    candidates.push({
      start,
      end,
      title: "AI Selected Highlight",
      reason: "Automatic recovery clip created from the transcript after AI clip selection returned no valid timestamps.",
      score: speechScore,
      caption: buildFallbackCaption(
        text.trim(),
        "AI Selected Highlight",
        "",
      ),
    });
  }

  // If the transcript is sparse, create a few safe windows from the video
  // rather than failing the whole project with zero clips.
  if (!candidates.length && safeDuration >= 3) {
    const window = Math.min(30, Math.max(3, safeDuration));
    const count = Math.min(maxClips, Math.max(1, Math.floor(safeDuration / window) || 1));

    for (let i = 0; i < count; i++) {
      const start = Math.min(
        Math.max(0, safeDuration - window),
        i * Math.max(1, (safeDuration - window) / Math.max(1, count - 1)),
      );
      const end = Math.min(safeDuration, start + window);
      if (end - start >= 3) {
        candidates.push({
          start,
          end,
          title: "AI Highlight",
          reason: "Automatic recovery clip created because AI returned no usable clip timestamps.",
          score: Math.max(35, 70 - i * 5),
          caption: "AI Highlight",
        });
      }
    }
  }

  const selected: ViralClip[] = [];
  for (const clip of candidates) {
    const overlaps = selected.some(
      (existing) =>
        Math.min(existing.end, clip.end) -
          Math.max(existing.start, clip.start) >
        Math.min(existing.end - existing.start, clip.end - clip.start) * 0.65,
    );

    if (!overlaps) selected.push(clip);
    if (selected.length >= maxClips) break;
  }

  return selected;
}

function validateAnalysis(
  raw: any,
  duration: number,
  options: { requireClips?: boolean } = {},
): GeminiAnalysis {
  const safeDuration = Number(duration);

  if (
    !Number.isFinite(safeDuration) ||
    safeDuration <= 0
  ) {
    throw new Error(
      "Invalid video duration.",
    );
  }

  /* -------------------------------------------------------
   TRANSCRIPT
  ------------------------------------------------------- */

  const rawTranscript =
    Array.isArray(raw?.transcript)
      ? raw.transcript
      : [];

  const normalizeWords = (
    rawWords: any,
    segStart: number,
    segEnd: number,
  ): TranscriptWord[] | undefined => {
    if (!Array.isArray(rawWords) || !rawWords.length) {
      return undefined;
    }

    const words = rawWords
      .map((w: any) => {
        const start = Number(w?.start);
        const end = Number(w?.end);

        return {
          word: String(w?.word ?? "").trim(),
          start,
          end,
        };
      })
      .filter(
        (w: TranscriptWord) =>
          w.word.length > 0 &&
          Number.isFinite(w.start) &&
          Number.isFinite(w.end) &&
          w.end > w.start &&
          w.start >= 0 &&
          w.start < safeDuration,
      )
      .map((w: TranscriptWord) => ({
        word: w.word,
        start: Math.max(segStart, Math.min(safeDuration, w.start)),
        end: Math.max(segStart, Math.min(safeDuration, w.end)),
      }))
      .filter((w: TranscriptWord) => w.end > w.start)
      // keep words sorted and inside the parent segment so a bad
      // per-word timestamp can't push the karaoke highlight outside
      // of its own chunk
      .sort((a: TranscriptWord, b: TranscriptWord) => a.start - b.start)
      .map((w: TranscriptWord) => ({
        word: w.word,
        start: Math.max(segStart, w.start),
        end: Math.min(segEnd, Math.max(w.end, w.start + 0.01)),
      }));

    return words.length ? words : undefined;
  };

  const transcript: TranscriptSegment[] =
    rawTranscript
      .map((s: any) => {
        const start = Number(s?.start);
        const end = Number(s?.end);

        return {
          start,
          end,
          text: String(
            s?.text ?? "",
          ).trim(),
          words: s?.words,
        };
      })
      .filter(
        (s: TranscriptSegment) =>
          Number.isFinite(s.start) &&
          Number.isFinite(s.end) &&
          s.start >= 0 &&
          s.start < safeDuration &&
          s.end > s.start &&
          s.end <= safeDuration &&
          s.text.length > 0,
      )
      .map(
        (
          s: TranscriptSegment,
        ) => {
          const start = Math.max(
            0,
            Math.min(
              safeDuration,
              s.start,
            ),
          );

          const end = Math.max(
            0,
            Math.min(
              safeDuration,
              s.end,
            ),
          );

          return {
            start,
            end,
            text: s.text,
            words: normalizeWords(s.words, start, end),
          };
        },
      );

  /* -------------------------------------------------------
   CLIPS
  ------------------------------------------------------- */

  const rawClips =
    Array.isArray(raw?.clips)
      ? raw.clips
      : [];

  const clips: ViralClip[] =
    rawClips
      .map((c: any) => {
        const start = Number(c?.start);
        const end = Number(c?.end);

        const score = Number(
          c?.score ?? 0,
        );

        return {
          start,
          end,

          title: String(
            c?.title ||
              "Viral Clip",
          ).trim(),

          reason: String(
            c?.reason ||
              "Strong short-form moment.",
          ).trim(),

          score: Number.isFinite(score)
            ? Math.max(
                0,
                Math.min(
                  100,
                  score,
                ),
              )
            : 0,

          caption: buildFallbackCaption(
            String(c?.caption || "").trim(),
            String(c?.title || "").trim(),
            String(c?.reason || "").trim(),
          ),
        };
      })
      .filter(
        (c: ViralClip) =>
          Number.isFinite(c.start) &&
          Number.isFinite(c.end) &&
          c.start >= 0 &&
          c.start < safeDuration &&
          c.end > c.start &&
          c.end <= safeDuration &&
          c.title.length > 0,
      )
      .map(
        (c: ViralClip) => ({
          ...c,

          start: Math.max(
            0,
            Math.min(
              safeDuration - 0.1,
              c.start,
            ),
          ),

          end: Math.max(
            0,
            Math.min(
              safeDuration,
              c.end,
            ),
          ),
        }),
      )
      .filter(
        (c: ViralClip) =>
          c.end > c.start &&
          c.end - c.start >= 3,
      )
      .sort(
        (
          a: ViralClip,
          b: ViralClip,
        ) =>
          b.score - a.score,
      )
      .slice(
        0,
        MAX_CLIPS,
      );

  console.log(
    `Gemini validation: ${transcript.length} transcript segments, ${clips.length} valid clips`,
  );

  if (!clips.length && options.requireClips !== false) {
    const recoveredClips = buildFallbackClipsFromTranscript(
      transcript,
      safeDuration,
      MAX_CLIPS,
    );

    if (recoveredClips.length) {
      console.warn(
        `Gemini returned 0 valid clips. Recovered ${recoveredClips.length} safe transcript-based clip(s).`,
      );
      return {
        transcript,
        clips: recoveredClips,
      };
    }

    throw new Error(
      "AI could not find any valid viral moments and automatic clip recovery also failed.",
    );
  }

  return {
    transcript,
    clips,
  };
}
/* =========================================================
   GEMINI LOCAL VIDEO ANALYSIS
========================================================= */

async function analyzeLocalVideo(
  videoPath: string,
  mimeType: string,
  duration: number,
  processingMode: ProcessingMode = "clips",
): Promise<GeminiAnalysis> {
  let lastGeminiError: unknown;

  try {
    console.log("Uploading video to Gemini:", videoPath);

    let file = await ai.files.upload({
      file: videoPath,
      config: { mimeType },
    });

    console.log("Gemini file:", file.name);

    while (file.state && file.state.toString() !== "ACTIVE") {
      const state = file.state.toString();
      console.log("Gemini processing state:", state);

      if (state === "FAILED") {
        throw new Error("Gemini video processing failed.");
      }

      await sleep(GEMINI_POLL_MS);
      file = await ai.files.get({ name: file.name! });
    }

    console.log("Gemini file ACTIVE — starting analysis.");

  const prompt = `
You are LumoClip's professional AI video editor.

Return ONLY valid JSON. No markdown, no code fences, no commentary.

VIDEO DURATION:
${duration.toFixed(2)} seconds

TASK:
Analyze the entire video and return:
1. A timestamped transcript, broken into VERY SHORT chunks.
2. Up to ${MAX_CLIPS} high-retention short-form clips.

TRANSCRIPT GRANULARITY (critical — used to sync on-screen captions):
- Each transcript entry must cover ONLY 2 to 4 spoken words, never a full sentence.
- Split a sentence into multiple consecutive entries.
- Every transcript entry MUST also include a "words" array with ONE
  object per spoken word, each with its OWN start/end time — this is
  what drives the karaoke word-by-word highlight, so per-word timing
  matters more than chunk timing. Example for the sentence
  "Hello everyone welcome back to my channel":
  {"start":0.00,"end":0.55,"text":"Hello everyone","words":[
    {"word":"Hello","start":0.00,"end":0.28},
    {"word":"everyone","start":0.28,"end":0.55}
  ]}
  {"start":0.55,"end":1.10,"text":"welcome back","words":[
    {"word":"welcome","start":0.55,"end":0.85},
    {"word":"back","start":0.85,"end":1.10}
  ]}
  {"start":1.10,"end":1.85,"text":"to my channel","words":[
    {"word":"to","start":1.10,"end":1.25},
    {"word":"my","start":1.25,"end":1.45},
    {"word":"channel","start":1.45,"end":1.85}
  ]}
- Both the chunk start/end AND every word's start/end MUST match the
  moment those exact words are actually spoken in the audio — never
  evenly guessed or split by word length.
- Do not merge separate breaths/pauses into one chunk.
- Do not skip any spoken portion of the video — the transcript must
  cover the audio continuously from 0 to the end, with no gaps,
  otherwise clips in the untranscribed portion will show no captions
  at all.

PROCESSING MODE:
${processingMode === "full_video_caption"
  ? "Full-video caption mode: the transcript is required; clips may be an empty array because no clips will be generated."
  : "Clip mode: return high-retention clips as usual."}

TARGET:
TikTok, Instagram Reels, YouTube Shorts, Facebook Reels.

Prioritize:
- strong hooks
- surprising statements
- useful insights
- emotional or funny moments
- stories
- controversial or memorable statements
- standalone moments
- high-retention moments

Avoid:
- greetings
- long introductions
- ads
- dead air
- repeated information
- contextless fragments

CLIP LENGTH:
Normally 20–60 seconds.

TIMESTAMP RULES:
- start/end MUST be JSON numbers.
- timestamps are seconds only.
- never use MM:SS.
- never invent timestamps.
- start >= 0.
- end > start.
- end <= ${duration.toFixed(2)}.

EXACT JSON SHAPE:
{
  "transcript": [
    {
      "start": 0.0,
      "end": 0.6,
      "text": "spoken words",
      "words": [
        {"word": "spoken", "start": 0.0, "end": 0.3},
        {"word": "words", "start": 0.3, "end": 0.6}
      ]
    },
    {
      "start": 0.6,
      "end": 1.3,
      "text": "next few words",
      "words": [
        {"word": "next", "start": 0.6, "end": 0.85},
        {"word": "few", "start": 0.85, "end": 1.05},
        {"word": "words", "start": 1.05, "end": 1.3}
      ]
    }
  ],
  "clips": [
    {
      "start": 123.5,
      "end": 158.2,
      "title": "Short viral title",
      "reason": "Why this moment is strong",
      "score": 94,
      "caption": "Short social caption — REQUIRED, never leave this empty, always write a real caption for the clip"
    }
  ]
}

IMPORTANT: every object in "clips" MUST include a non-empty "caption"
string written specifically for that clip's content. Never omit it
and never return an empty string for it.
`;

    const response = await generateGeminiWithRetry({
      model: GEMINI_MODEL,
      contents: createUserContent([
        createPartFromUri(file.uri!, file.mimeType!),
        prompt,
      ]),
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

    const text = response.text || "";
    console.log("Gemini response length:", text.length);

    if (!text.trim()) {
      throw new Error("Gemini returned an empty response.");
    }

    const cleanedJson = cleanJson(text);
    let parsed: any;

    try {
      parsed = JSON.parse(cleanedJson);
    } catch (error) {
      console.error("Gemini JSON parse error:", error);
      console.error("Cleaned Gemini response:", cleanedJson);
      throw new Error("Gemini returned invalid JSON.");
    }

    return validateAnalysis(
      parsed,
      duration,
      { requireClips: processingMode !== "full_video_caption" },
    );
  } catch (error) {
    lastGeminiError = error;

    console.error(
      "Gemini analysis unavailable after all configured fallbacks:",
      getGeminiErrorMessage(error),
    );

    // Critical production fallback: Gemini failure must NOT fail the whole
    // project when local Whisper can still produce real word timings.
    try {
      console.warn(
        "Starting local Whisper fallback because Gemini analysis failed.",
      );

      const whisperTranscript = await transcribeWithWhisper(
        videoPath,
        duration,
      );

      if (whisperTranscript && whisperTranscript.length) {
        const fallbackClips =
          processingMode === "full_video_caption"
            ? []
            : buildFallbackClipsFromTranscript(
                whisperTranscript,
                duration,
                MAX_CLIPS,
              );

        if (processingMode !== "full_video_caption" && !fallbackClips.length) {
          throw new Error(
            "Whisper produced a transcript, but no safe recovery clips could be created.",
          );
        }

        console.warn(
          `Whisper fallback succeeded: ${whisperTranscript.length} transcript segment(s), ${fallbackClips.length} recovery clip(s).`,
        );

        return {
          transcript: whisperTranscript,
          clips: fallbackClips,
          captionTimingReady: true,
        };
      }

      throw new Error("Whisper fallback returned no usable transcript.");
    } catch (whisperError) {
      console.error(
        "Whisper fallback also failed:",
        getGeminiErrorMessage(whisperError),
      );

      const geminiMessage = getGeminiErrorMessage(lastGeminiError);
      const whisperMessage = getGeminiErrorMessage(whisperError);

      throw new Error(
        `AI analysis failed. Gemini: ${geminiMessage}. Local Whisper fallback: ${whisperMessage}`,
      );
    }
  }
}

/* =========================================================
   YOUTUBE DOWNLOAD

   Render intentionally does NOT download YouTube URLs.
   YouTube jobs are handled by the self-hosted PC worker.
========================================================= */

async function downloadYouTubeVideo(
  _url: string,
  _outputPath: string,
) {
  throw new Error(
    "Direct YouTube downloading is disabled on the Render server. Use the LumoClip PC worker.",
  );
}

/* =========================================================
   CREATE SHORT CLIP
========================================================= */

function createClip(
  inputPath: string,
  outputPath: string,
  start: number,
  duration: number,
  captionOptions?: {
    transcript?: TranscriptSegment[];
    style?: SubtitleStyle;
  },
): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // ---------------------------------------------------------
      // Validate input
      // ---------------------------------------------------------

      const absoluteInputPath = path.resolve(inputPath);
      const absoluteOutputPath = path.resolve(outputPath);

      if (!fs.existsSync(absoluteInputPath)) {
        return reject(
          new Error(
            `FFmpeg input file does not exist: ${absoluteInputPath}`,
          ),
        );
      }

      const inputStat = fs.statSync(absoluteInputPath);

      if (!inputStat.isFile() || inputStat.size <= 0) {
        return reject(
          new Error(
            `FFmpeg input file is empty or invalid: ${absoluteInputPath}`,
          ),
        );
      }

      // ---------------------------------------------------------
      // Make sure output directory exists
      // ---------------------------------------------------------

      const outputDirectory = path.dirname(
        absoluteOutputPath,
      );

      fs.mkdirSync(outputDirectory, {
        recursive: true,
      });

      if (!fs.existsSync(outputDirectory)) {
        return reject(
          new Error(
            `FFmpeg output directory does not exist: ${outputDirectory}`,
          ),
        );
      }

      // ---------------------------------------------------------
      // Remove old output
      // ---------------------------------------------------------

      try {
        if (fs.existsSync(absoluteOutputPath)) {
          fs.unlinkSync(absoluteOutputPath);
        }
      } catch (error) {
        console.warn(
          "Could not remove existing FFmpeg output:",
          error,
        );
      }

      // ---------------------------------------------------------
      // Sanitize timestamps
      // ---------------------------------------------------------

      const safeStart = Math.max(
        0,
        Number(start) || 0,
      );

      const safeDuration = Math.max(
        0.1,
        Number(duration) || 0,
      );

      console.log(
        "========== CREATE CLIP ==========",
      );

      console.log(
        "Input:",
        absoluteInputPath,
      );

      console.log(
        "Output:",
        absoluteOutputPath,
      );

      console.log(
        "Start:",
        safeStart,
      );

      console.log(
        "Duration:",
        safeDuration,
      );

      console.log(
        "=================================",
      );

      console.log(
        `FFmpeg speed mode: preset=${FFMPEG_PRESET}, threads=${FFMPEG_THREADS_PER_CLIP}, concurrency=${CLIP_CONCURRENCY}`,
      );

      // ---------------------------------------------------------
      // Video filters
      // ---------------------------------------------------------

      const videoFilters: any[] = [
        {
          filter: "scale",
          options: {
            w: 540,
            h: 960,
            force_original_aspect_ratio:
              "decrease",
          },
        },
        {
          filter: "pad",
          options: {
            w: 540,
            h: 960,
            x: "(ow-iw)/2",
            y: "(oh-ih)/2",
            color: "black",
          },
        },
      ];

      // ---------------------------------------------------------
      // AI Captions — word-by-word karaoke highlight
      //
      // Builds a temporary .ass subtitle file from the transcript
      // segments that fall inside this clip, then burns it in via
      // the `subtitles` (libass) filter.
      // ---------------------------------------------------------

      let assFilePath = "";

      const transcript = captionOptions?.transcript;
      const style =
        captionOptions?.style || DEFAULT_SUBTITLE_STYLE;

      if (
        CAPTIONS_ENABLED &&
        style.enabled !== false &&
        Array.isArray(transcript) &&
        transcript.length
      ) {
        try {
          const relativeSegments =
            getClipRelativeSegments(
              transcript,
              safeStart,
              safeStart + safeDuration,
            );

          if (relativeSegments.length) {
            const assContent = buildKaraokeAss(
              relativeSegments,
              style,
            );

            assFilePath = path.join(
              tempDir,
              `${generateId()}.ass`,
            );

            fs.writeFileSync(
              assFilePath,
              assContent,
              "utf8",
            );

            videoFilters.push(
              `subtitles=${escapeFfmpegFilterPath(
                assFilePath,
              )}`,
            );

            console.log(
              `Captions: burning ${relativeSegments.length} segment(s) via ${assFilePath}`,
            );
          } else {
            console.log(
              "Captions: no transcript overlap for this clip, skipping.",
            );
          }
        } catch (captionError) {
          // Captions must never break clip generation.
          console.error(
            "Caption generation failed, continuing without captions:",
            captionError,
          );
          assFilePath = "";
        }
      } else if (style.enabled === false) {
        console.log(
          "Captions: disabled for this project, skipping.",
        );
      }

      // ---------------------------------------------------------
      // FFmpeg command
      // ---------------------------------------------------------

      let nextLoggedPercent = 5;

      const cleanupAssFile = () => {
        if (assFilePath) {
          try {
            fs.unlinkSync(assFilePath);
          } catch {
            // best-effort cleanup only
          }
        }
      };

      const command = ffmpeg(
        absoluteInputPath,
      )
        // -------------------------------------------------------
        // FAST INPUT SEEK
        // -------------------------------------------------------

        .inputOptions([
          "-ss",
          String(safeStart),
        ])

        // -------------------------------------------------------
        // Output settings
        // -------------------------------------------------------

        .outputOptions([
          "-y",

          "-t",
          String(safeDuration),

          "-map",
          "0:v:0",

          "-map",
          "0:a:0?",

          // Video encoder
          "-c:v",
          "libx264",

          // Faster encoding
          "-preset",
          FFMPEG_PRESET,

          // Faster encode / smaller output
          "-crf",
          FFMPEG_CRF,

          // Let FFmpeg use the available CPU threads.
          "-threads",
          String(FFMPEG_THREADS_PER_CLIP),

          "-pix_fmt",
          "yuv420p",

          // 24fps is sufficient for social clips and reduces CPU work.
          "-r",
          "24",

          // Audio
          "-c:a",
          "aac",

          "-b:a",
          "96k",

          "-ac",
          "2",

          // Web playback
          "-movflags",
          "+faststart",
        ])

        // -------------------------------------------------------
        // Video filters
        // -------------------------------------------------------

        .videoFilters(
          videoFilters,
        )

        // -------------------------------------------------------
        // Command logging
        // -------------------------------------------------------

        .on(
          "start",
          (commandLine) => {
            console.log(
              "========== FFMPEG COMMAND ==========",
            );

            console.log(
              commandLine,
            );

            console.log(
              "====================================",
            );
          },
        )

        // -------------------------------------------------------
        // Progress
        // -------------------------------------------------------

        .on(
          "progress",
          (progress) => {
            // Render logs do not need a line for every tiny progress
            // change. Logging every 5% keeps the worker much quieter.
            if (
              typeof progress.percent === "number" &&
              Number.isFinite(progress.percent)
            ) {
              const percent = Math.min(
                100,
                Math.max(0, progress.percent),
              );

              if (
                percent >= nextLoggedPercent ||
                percent >= 99.9
              ) {
                console.log(
                  `FFmpeg clip progress: ${percent.toFixed(0)}%`,
                );

                nextLoggedPercent =
                  Math.floor(percent / 5) * 5 + 5;
              }
            }
          },
        )

        // -------------------------------------------------------
        // Finished
        // -------------------------------------------------------

        .on(
          "end",
          () => {
            console.log(
              "FFmpeg clip finished:",
              absoluteOutputPath,
            );

            cleanupAssFile();

            if (
              !fs.existsSync(
                absoluteOutputPath,
              )
            ) {
              return reject(
                new Error(
                  `FFmpeg completed but output file was not created: ${absoluteOutputPath}`,
                ),
              );
            }

            const stat =
              fs.statSync(
                absoluteOutputPath,
              );

            if (
              !stat.isFile() ||
              stat.size <= 0
            ) {
              return reject(
                new Error(
                  `FFmpeg created an empty output file: ${absoluteOutputPath}`,
                ),
              );
            }

            console.log(
              `Clip created successfully: ${(
                stat.size /
                1024 /
                1024
              ).toFixed(2)} MB`,
            );

            resolve();
          },
        )

        // -------------------------------------------------------
        // Error
        // -------------------------------------------------------

        .on(
          "error",
          (error, stdout, stderr) => {
            console.error(
              "========== FFMPEG ERROR ==========",
            );

            console.error(
              "Error:",
              error,
            );

            console.error(
              "STDOUT:",
              stdout,
            );

            console.error(
              "STDERR:",
              stderr,
            );

            console.error(
              "Input:",
              absoluteInputPath,
            );

            console.error(
              "Output:",
              absoluteOutputPath,
            );

            console.error(
              "==================================",
            );

            cleanupAssFile();

            reject(error);
          },
        );

      // ---------------------------------------------------------
      // Save output
      // ---------------------------------------------------------

      command.save(
        absoluteOutputPath,
      );
    } catch (error) {
      reject(error);
    }
  });
}

/* =========================================================
   CREATE FULL CAPTIONED VIDEO
========================================================= */

function createFullCaptionedVideo(
  inputPath: string,
  outputPath: string,
  duration: number,
  transcript: TranscriptSegment[],
  style: SubtitleStyle,
): Promise<void> {
  return new Promise((resolve, reject) => {
    let assFilePath = "";
    let settled = false;

    const finish = (error?: Error) => {
      if (settled) return;
      settled = true;

      if (assFilePath) {
        try {
          fs.unlinkSync(assFilePath);
        } catch {
          // Best-effort cleanup.
        }
      }

      if (error) {
        reject(error);
      } else {
        resolve();
      }
    };

    try {
      const absoluteInputPath = path.resolve(inputPath);
      const absoluteOutputPath = path.resolve(outputPath);
      const safeDuration = Number(duration);

      if (!fs.existsSync(absoluteInputPath)) {
        return finish(new Error("Full caption input video was not found."));
      }

      if (!Number.isFinite(safeDuration) || safeDuration <= 0) {
        return finish(new Error("Invalid full caption video duration."));
      }

      fs.mkdirSync(path.dirname(absoluteOutputPath), { recursive: true });

      const relativeSegments = getClipRelativeSegments(
        transcript,
        0,
        safeDuration,
      );

      if (!relativeSegments.length) {
        return finish(new Error("No transcript is available for full-video captions."));
      }

      const assContent = buildKaraokeAss(
        relativeSegments,
        style,
      );

      assFilePath = path.join(tempDir, `${generateId()}-full.ass`);
      fs.writeFileSync(assFilePath, assContent, "utf8");

      const subtitleFilter = `subtitles=${escapeFfmpegFilterPath(assFilePath)}`;

      const command = ffmpeg(absoluteInputPath)
        .outputOptions([
          "-y",
          "-map",
          "0:v:0",
          "-map",
          "0:a:0?",
          "-c:v",
          "libx264",
          "-preset",
          FFMPEG_PRESET,
          "-crf",
          FFMPEG_CRF,
          "-threads",
          String(FFMPEG_THREADS_PER_CLIP),
          "-pix_fmt",
          "yuv420p",
          "-c:a",
          "aac",
          "-b:a",
          "128k",
          "-movflags",
          "+faststart",
        ])
        .videoFilters([subtitleFilter])
        .on("start", () => {
          console.log("Full-video AI caption encoding started.");
        })
        .on("progress", (progress) => {
          if (
            typeof progress.percent === "number" &&
            Number.isFinite(progress.percent)
          ) {
            console.log(
              `Full-video caption progress: ${Math.min(100, Math.max(0, progress.percent)).toFixed(0)}%`,
            );
          }
        })
        .on("end", () => {
          if (
            !fs.existsSync(absoluteOutputPath) ||
            !fs.statSync(absoluteOutputPath).isFile() ||
            fs.statSync(absoluteOutputPath).size <= 0
          ) {
            return finish(new Error("Full caption video was not created."));
          }

          console.log("Full-video AI caption encoding completed.");
          return finish();
        })
        .on("error", (error) => {
          console.error("Full-video caption FFmpeg failed:", error.message);
          return finish(error);
        });

      command.save(absoluteOutputPath);
    } catch (error) {
      finish(error instanceof Error ? error : new Error("Full caption encoding failed."));
    }
  });
}

/* =========================================================
   SAVE TRANSCRIPT
========================================================= */

async function saveTranscript(
  projectId: string,
  transcript: TranscriptSegment[],
) {
  const payload: Record<
    string,
    unknown
  > = {
    transcript,
    transcript_segments:
      transcript,
  };

  const {
    error,
  } = await supabase
    .from("projects")
    .update(payload)
    .eq("id", projectId);

  if (error) {
    console.warn(
      "Transcript save failed:",
      error.message,
    );
  }
}

/* =========================================================
   PROCESS VIDEO
========================================================= */

async function processVideo(
  projectId: string,
  userId: string,
  localVideoPath: string,
  mimeType: string,
  originalSourceUrl?: string,
  processingMode: ProcessingMode = "clips",
  captionStyle: SubtitleStyle = DEFAULT_SUBTITLE_STYLE,
) {
  const mode = normalizeProcessingMode(processingMode);
  const safeCaptionStyle = normalizeCaptionStyle(captionStyle);
  try {
    await updateProject(
      projectId,
      10,
      "Reading video",
    );

    const duration =
      await getVideoDuration(
        localVideoPath,
      );

    console.log(
      "Video duration:",
      duration,
    );

    if (
      !duration ||
      duration <= 0 ||
      duration >
        MAX_VIDEO_DURATION
    ) {
      throw new Error(
        `Video duration must be between 1 second and ${MAX_VIDEO_DURATION} seconds.`,
      );
    }

    await updateProject(
      projectId,
      20,
      "Preparing source video",
    );

    const extension =
      extensionForMime(
        mimeType,
      );

    const projectDir =
      path.join(
        mediaDir,
        safeSegment(
          projectId,
        ),
      );

    fs.mkdirSync(
      projectDir,
      {
        recursive: true,
      },
    );

    const sourceName =
      `source.${extension}`;

    const sourcePath =
      path.join(
        projectDir,
        sourceName,
      );

    if (
      path.resolve(
        localVideoPath,
      ) !==
      path.resolve(
        sourcePath,
      )
    ) {
      fs.copyFileSync(
        localVideoPath,
        sourcePath,
      );

      try {
        fs.unlinkSync(
          localVideoPath,
        );
      } catch {}
    }

    const sourceMediaUrl = publicMediaUrl(
      projectId,
      sourceName,
    );

    await updateProjectMedia(
      projectId,
      sourceMediaUrl,
      duration,
      originalSourceUrl,
    );

    await updateProject(
      projectId,
      35,
      "AI is analyzing your video",
    );

    const analysis =
      await analyzeLocalVideo(
        sourcePath,
        mimeType,
        duration,
        mode,
      );

    // Enforce the server-side clip limit even if Gemini returns more.
    // Keep the highest-scoring clips so generation stays bounded.
    if (Array.isArray(analysis.clips)) {
      analysis.clips = analysis.clips
        .sort(
          (a, b) =>
            Number(b?.score || 0) -
            Number(a?.score || 0),
        )
        .slice(0, MAX_CLIPS);
    }

    // ---------------------------------------------------------
    // Caption timing: prefer real per-word timestamps from a local
    // Whisper pass over Gemini's own (approximate, video-based)
    // transcript timing. Gemini's clips/captions text are untouched
    // either way — only the timing used for burned-in captions
    // changes here.
    // ---------------------------------------------------------

    await updateProject(
      projectId,
      42,
      "Transcribing audio for accurate caption sync",
    );

    if (analysis.captionTimingReady) {
      console.log(
        "Local Whisper fallback already supplied caption timing — skipping duplicate Whisper pass.",
      );
    } else {
      const whisperTranscript = await transcribeWithWhisper(
        sourcePath,
        duration,
      );

      if (whisperTranscript && whisperTranscript.length) {
        console.log(
          `Using local Whisper transcript for caption timing ` +
            `(${whisperTranscript.length} segment(s)) instead of Gemini's estimate.`,
        );

        analysis.transcript = whisperTranscript;
      } else {
        console.log(
          "Whisper transcript unavailable — using Gemini's own transcript timing for captions.",
        );
      }
    }

    await saveTranscript(
      projectId,
      analysis.transcript,
    );

    if (mode === "full_video_caption") {
      const fullCaptionFilename = "full-captioned.mp4";
      const fullCaptionPath = path.join(
        projectDir,
        fullCaptionFilename,
      );

      await updateProject(
        projectId,
        55,
        "Burning AI captions on the full video",
        "processing",
        0,
      );

      await createFullCaptionedVideo(
        sourcePath,
        fullCaptionPath,
        duration,
        analysis.transcript,
        safeCaptionStyle,
      );

      const fullVideoUrl = publicMediaUrl(
        projectId,
        fullCaptionFilename,
      );

      const optionalCompletionUpdate = await supabase
        .from("projects")
        .update({
          full_video_url: fullVideoUrl,
          processing_mode: mode,
          caption_style: safeCaptionStyle,
          progress: 100,
          current_step: "Full-video AI captions are ready",
          status: "completed",
          total_clips: 0,
        })
        .eq("id", projectId);

      let fullVideoUpdateError = optionalCompletionUpdate.error;

      if (fullVideoUpdateError) {
        // Backward-compatible fallback when the optional metadata columns
        // have not been added to the current projects table yet.
        console.warn(
          "Optional full-video metadata columns are unavailable; saving completion status only:",
          fullVideoUpdateError.message,
        );

        const fallbackCompletionUpdate = await supabase
          .from("projects")
          .update({
            progress: 100,
            current_step: "Full-video AI captions are ready",
            status: "completed",
            total_clips: 0,
          })
          .eq("id", projectId);

        fullVideoUpdateError = fallbackCompletionUpdate.error;
      }

      if (fullVideoUpdateError) {
        throw fullVideoUpdateError;
      }

      await createNotification({
        userId,
        type: "project_completed",
        title: "Your full captioned video is ready",
        message: "LumoClip added AI captions to your complete video.",
        projectId,
        metadata: {
          mode,
          fullVideoUrl,
          generated: 0,
        },
      });

      console.log(`Project ${projectId} completed with full-video captions.`);
      return;
    }

    await updateProject(
      projectId,
      50,
      `AI found ${analysis.clips.length} clips`,
      "processing",
      analysis.clips.length,
    );

    const projectClipDir =
      path.join(
        projectDir,
        "clips",
      );

    fs.mkdirSync(
      projectClipDir,
      {
        recursive: true,
      },
    );

    let generated = 0;

    /*
       Generate clips in parallel batches.

       Speed-optimized default: up to 2 clips encode at once.
       CLIP_CONCURRENCY remains configurable for smaller/larger
       Render instances.
    */
    const processOneClip = async (
      clip: ViralClip,
      i: number,
    ) => {
      const start =
        Math.max(
          0,
          Math.min(
            duration - 0.1,
            clip.start,
          ),
        );

      const end =
        Math.max(
          start + 0.1,
          Math.min(
            duration,
            clip.end,
          ),
        );

      const MIN_CLIP_DURATION = 15;
      const MAX_CLIP_DURATION = 60;
      const TARGET_CLIP_DURATION = 45;

      const rawDuration =
        end - start;

      if (
        !Number.isFinite(rawDuration) ||
        rawDuration <= 0
      ) {
        console.warn(
          `Skipping invalid clip ${i + 1}: ${rawDuration}s`,
        );
        return null;
      }

      let clipDuration =
        Math.min(
          rawDuration,
          MAX_CLIP_DURATION,
        );

      if (
        clipDuration <
        MIN_CLIP_DURATION
      ) {
        const desiredEnd =
          Math.min(
            duration,
            start +
              TARGET_CLIP_DURATION,
          );

        const extendedDuration =
          desiredEnd - start;

        if (
          Number.isFinite(
            extendedDuration,
          ) &&
          extendedDuration >=
            MIN_CLIP_DURATION
        ) {
          clipDuration =
            Math.min(
              extendedDuration,
              MAX_CLIP_DURATION,
            );
        } else {
          console.warn(
            `Skipping clip ${i + 1}: cannot reach minimum ${MIN_CLIP_DURATION}s from start ${start}s`,
          );
          return null;
        }
      }

      const actualEnd =
        Math.min(
          duration,
          start + clipDuration,
        );

      const finalDuration =
        actualEnd - start;

      if (
        !Number.isFinite(
          finalDuration,
        ) ||
        finalDuration <
          MIN_CLIP_DURATION ||
        finalDuration >
          MAX_CLIP_DURATION
      ) {
        console.warn(
          `Skipping invalid final clip ${i + 1}: ${finalDuration}s`,
        );
        return null;
      }

      const filename =
        `${generateId()}.mp4`;

      const outputPath =
        path.join(
          projectClipDir,
          filename,
        );

      console.log(
        `Creating clip ${
          i + 1
        }/${analysis.clips.length}: ${start}s -> ${actualEnd}s (${finalDuration}s)`,
      );

      await createClip(
        sourcePath,
        outputPath,
        start,
        finalDuration,
        {
          transcript: analysis.transcript,
          style: safeCaptionStyle,
        },
      );

      if (
        !fs.existsSync(
          outputPath,
        ) ||
        fs.statSync(
          outputPath,
        ).size <= 0
      ) {
        throw new Error(
          `Generated clip ${
            i + 1
          } is empty.`,
        );
      }

      const videoUrl =
        publicMediaUrl(
          projectId,
          `clips/${filename}`,
        );

      const {
        data: clipRecord,
        error: clipError,
      } =
        await supabase
          .from("clips")
          .insert({
            project_id:
              projectId,
            user_id:
              userId,
            title:
              clip.title,
            start_time:
              start,
            end_time:
              actualEnd,
            duration:
              finalDuration,
            video_url:
              videoUrl,
            viral_score:
              clip.score,
            caption:
              clip.caption,
            reason:
              clip.reason,
          })
          .select()
          .single();

      if (clipError) {
        console.error(
          "Clip DB error:",
          clipError,
        );
        throw clipError;
      }

      return clipRecord;
    };

    /*
       Run a maximum of CLIP_CONCURRENCY clips at once.
       Default is 2 for faster processing; set CLIP_CONCURRENCY=1
       if the Render instance has only one vCPU.
    */
    const concurrency =
      Math.max(
        1,
        Math.min(
          CLIP_CONCURRENCY,
          analysis.clips.length,
        ),
      );

    for (
      let batchStart = 0;
      batchStart <
      analysis.clips.length;
      batchStart += concurrency
    ) {
      const batch =
        analysis.clips.slice(
          batchStart,
          batchStart +
            concurrency,
        );

      const results =
        await Promise.all(
          batch.map(
            (clip, batchIndex) =>
              processOneClip(
                clip,
                batchStart +
                  batchIndex,
              ),
          ),
        );

      const successful =
        results.filter(Boolean)
          .length;

      generated +=
        successful;

      const progress =
        55 +
        Math.round(
          (generated /
            analysis.clips.length) *
            40,
        );

      await updateProject(
        projectId,
        Math.min(
          95,
          progress,
        ),
        `Generated clip ${generated} of ${analysis.clips.length}`,
      );

      console.log(
        `Batch complete: ${generated}/${analysis.clips.length} clips generated.`,
      );
    }

    if (
      generated === 0
    ) {
      throw new Error(
        "No valid clips were generated.",
      );
    }

    await updateProject(
      projectId,
      100,
      `Processing complete — ${generated} clips generated`,
      "completed",
      generated,
    );

    await createNotification({
      userId,
      type: "project_completed",
      title: "Your clips are ready",
      message: `LumoClip generated ${generated} ${generated === 1 ? "clip" : "clips"} from your project.`,
      projectId,
      metadata: { generated },
    });

    console.log(
      `Project ${projectId} completed with ${generated} clips.`,
    );
  } catch (error) {
    console.error(
      `Project ${projectId} processing failed:`,
      error,
    );

    const failureMessage =
      error instanceof Error
        ? error.message
        : "Processing failed";

    await updateProject(
      projectId,
      0,
      failureMessage,
      "failed",
    );

    await createNotification({
      userId,
      type: "project_failed",
      title: "Project processing failed",
      message: failureMessage,
      projectId,
    });

    throw error;
  }
}

/* =========================================================
   CREDIT REFUND
========================================================= */

async function refundCreditsDirect(
  userId: string,
) {
  const {
    data,
    error,
  } = await supabase.rpc(
    "refund_video_credits",
    {
      p_user_id: userId,
      p_cost: VIDEO_COST,
      p_daily_limit: DAILY_CREDIT_LIMIT,
    },
  );

  if (error) {
    throw error;
  }

  return data;
}

async function refundCredits(
  userId: string,
  projectId: string,
) {
  try {
    const data =
      await refundCreditsDirect(
        userId,
      );

    const refundedCredits =
      Number(
        data?.refunded ?? VIDEO_COST,
      );

    await supabase
      .from("usage_logs")
      .insert({
        user_id: userId,
        action:
          `Refund: failed project ${projectId}`,
        credits_used:
          -refundedCredits,
      });

    await createNotification({
      userId,
      type: "credits_refunded",
      title: "Credits refunded",
      message:
        `${refundedCredits} credits were returned because the project could not be completed.`,
      projectId,
      metadata: {
        credits: refundedCredits,
        reason: "processing_failed",
      },
    });

    console.log(
      `Refunded ${refundedCredits} credits for project ${projectId}.`,
    );

    return refundedCredits;
  } catch (error) {
    console.error(
      `Credit refund failed for project ${projectId}:`,
      error,
    );

    return 0;
  }
}

/* =========================================================
   CREATE PROJECT + CHARGE
========================================================= */

async function createProjectAndCharge(
  userId: string,
  name: string,
  sourceType: string,
  sourceUrl: string,
) {
  // Get profile only for the response/UI metadata.
  // Credit enforcement is performed atomically in Supabase.
  const profile =
    await getProfile(userId);

  // =========================================================
  // ATOMIC CREDIT CHARGE
  // 10 credits / video
  // 150 credits / Dhaka day
  // concurrency-safe
  // =========================================================

  const {
    data: chargeResult,
    error: chargeError,
  } = await supabase.rpc(
    "charge_video_credits",
    {
      p_user_id: userId,
      p_cost: VIDEO_COST,
      p_daily_limit: DAILY_CREDIT_LIMIT,
    },
  );

  if (chargeError) {
    console.error(
      "Credit charge failed:",
      chargeError,
    );

    const message = String(
      chargeError.message || "",
    );

    if (
      message.includes(
        "INSUFFICIENT_CREDITS",
      )
    ) {
      const error: any =
        new Error(
          `You need ${VIDEO_COST} credits.`,
        );

      error.statusCode = 402;
      error.credits = 0;

      throw error;
    }

    throw new Error(
      "Failed to charge credits.",
    );
  }

  const newCredits =
    Number(
      chargeResult?.credits ?? 0,
    );

  // =========================================================
  // CREATE PROJECT
  // =========================================================

  const {
    data: project,
    error: projectError,
  } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      name,
      status: "processing",
      source_type: sourceType,
      source_media_url: "",
      source_url:
        sourceType === "youtube"
          ? sourceUrl
          : "",
      duration: 0,
      progress: 5,
      current_step:
        sourceType === "youtube"
          ? "Preparing YouTube video"
          : "Video uploaded",
      transcript: [],
      transcript_segments: [],
    })
    .select()
    .single();

  // =========================================================
  // PROJECT CREATION FAILURE -> REFUND
  // =========================================================

  if (
    projectError ||
    !project
  ) {
    console.error(
      "Project creation failed:",
      projectError,
    );

    try {
      await refundCreditsDirect(
        userId,
      );
    } catch (refundError) {
      console.error(
        "Automatic project-creation refund failed:",
        refundError,
      );
    }

    throw new Error(
      projectError?.message ||
        "Failed to create project.",
    );
  }

  // =========================================================
  // USAGE LOG
  // =========================================================

  const {
    error: usageError,
  } = await supabase
    .from("usage_logs")
    .insert({
      user_id: userId,
      action:
        `${
          sourceType === "youtube"
            ? "YouTube"
            : "Project"
        } Repurpose: ${name}`,
      credits_used: VIDEO_COST,
    });

  if (usageError) {
    // Do not refund: the project exists and processing has been charged.
    console.error(
      "Usage log failed:",
      usageError,
    );
  }

  // =========================================================
  // NOTIFICATION
  // Notification failure must not turn a successful charge/project
  // creation into an endpoint failure.
  // =========================================================

  try {
    await createNotification({
      userId,
      type: "project_started",
      title:
        "Project processing started",
      message:
        `LumoClip is turning “${name}” into high-performing short clips.`,
      projectId: project.id,
      metadata: {
        sourceType,
        creditsCharged:
          VIDEO_COST,
      },
    });
  } catch (notificationError) {
    console.error(
      "Project-start notification failed:",
      notificationError,
    );
  }

  return {
    profile,
    project,
    newCredits,
    creditsCharged: VIDEO_COST,
    dailyLimit: DAILY_CREDIT_LIMIT,
  };
}

/* =========================================================
   HEALTH
========================================================= */

app.get(
  "/api/health",
  (_req, res) => {
    res.json({
      ok: true,

      service:
        "LumoClip Real AI Processing Server",

      youtube: true,

      gemini: true,

      geminiModel:
        GEMINI_MODEL,

      ffmpeg: true,

      ffmpegPath,

      ffprobePath,
      youtubeDownloader: "self-hosted-worker",
      workerConfigured: WORKER_ENABLED,
      captionsEnabled: CAPTIONS_ENABLED,
    });
  },
);

/* =========================================================
   AUTH ME
========================================================= */

app.get(
  "/api/auth/me",
  async (
    req,
    res,
  ) => {
    try {
      const user =
        await getAuthenticatedUser(
          req,
        );

      const profile =
        await getProfile(
          user.id,
        );

      const {
        data: subscription,
      } =
        await supabase
          .from(
            "subscriptions",
          )
          .select("*")
          .eq(
            "user_id",
            user.id,
          )
          .maybeSingle();

      res.json({
        user: profile,

        subscription:
          subscription || {
            id: "",

            user_id:
              user.id,

            plan:
              profile.plan ||
              "free",

            status:
              "active",
          },
      });
    } catch (error: any) {
      if (
        error?.message ===
        "UNAUTHORIZED"
      ) {
        return res
          .status(401)
          .json({
            error:
              "Unauthorized.",
          });
      }

      res
        .status(500)
        .json({
          error:
            error?.message ||
            "Failed to fetch user.",
        });
    }
  },
);

/* =========================================================
   PREFERENCES
========================================================= */

app.get("/api/auth/preferences", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);

    const { data, error } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("id", user.id)
      .single();

    if (error) throw error;

    return res.json({
      preferences: data?.preferences || {
        email_notifications: true,
        marketing_emails: false,
        language: "English",
        appearance: "dark",
      },
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return res.status(401).json({ error: "Unauthorized." });
    }

    return res.status(500).json({
      error: error?.message || "Failed to fetch preferences.",
    });
  }
});

app.patch("/api/auth/preferences", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);

    const allowedKeys = [
      "email_notifications",
      "marketing_emails",
      "language",
      "appearance",
    ];

    const updates = req.body || {};
    const sanitized: Record<string, any> = {};

    for (const key of allowedKeys) {
      if (key in updates) sanitized[key] = updates[key];
    }

    if (Object.keys(sanitized).length === 0) {
      return res.status(400).json({
        error: "No valid preference fields provided.",
      });
    }

    const { data: current, error: fetchError } = await supabase
      .from("profiles")
      .select("preferences")
      .eq("id", user.id)
      .single();

    if (fetchError) throw fetchError;

    const merged = {
      ...(current?.preferences || {}),
      ...sanitized,
    };

    const { data, error } = await supabase
      .from("profiles")
      .update({ preferences: merged })
      .eq("id", user.id)
      .select("preferences")
      .single();

    if (error) throw error;

    return res.json({ preferences: data.preferences });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return res.status(401).json({ error: "Unauthorized." });
    }

    return res.status(500).json({
      error: error?.message || "Failed to update preferences.",
    });
  }
});

/* =========================================================
   ACCOUNT DATA EXPORT
========================================================= */

app.get("/api/auth/export", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);

    const [profileRes, projectsRes, usageRes, notificationsRes] =
      await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("projects").select("*").eq("user_id", user.id),
        supabase.from("usage_logs").select("*").eq("user_id", user.id),
        supabase.from("notifications").select("*").eq("user_id", user.id),
      ]);

    if (profileRes.error) throw profileRes.error;

    const projectIds = (projectsRes.data || []).map((p: any) => p.id);

    let clips: any[] = [];

    if (projectIds.length > 0) {
      const { data: clipsData, error: clipsError } = await supabase
        .from("clips")
        .select("*")
        .in("project_id", projectIds);

      if (clipsError) throw clipsError;

      clips = clipsData || [];
    }

    return res.json({
      exported_at: new Date().toISOString(),
      profile: profileRes.data,
      projects: projectsRes.data || [],
      clips,
      usage_logs: usageRes.data || [],
      notifications: notificationsRes.data || [],
    });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return res.status(401).json({ error: "Unauthorized." });
    }

    return res.status(500).json({
      error: error?.message || "Failed to export account data.",
    });
  }
});

/* =========================================================
   API KEY
========================================================= */

app.post("/api/auth/api-key", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);

    // Shown to the user once — only the hash is stored.
    const rawKey = `lc_${crypto.randomBytes(24).toString("hex")}`;
    const keyHash = crypto
      .createHash("sha256")
      .update(rawKey)
      .digest("hex");
    const keyPrefix = rawKey.slice(0, 10);

    const { error } = await supabase.from("api_keys").insert({
      user_id: user.id,
      key_hash: keyHash,
      key_prefix: keyPrefix,
    });

    if (error) throw error;

    return res.json({ apiKey: rawKey });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return res.status(401).json({ error: "Unauthorized." });
    }

    return res.status(500).json({
      error: error?.message || "Failed to generate API key.",
    });
  }
});

/* =========================================================
   DELETE ACCOUNT
========================================================= */

app.delete("/api/auth/account", async (req, res) => {
  try {
    const user = await getAuthenticatedUser(req);
    const userId = user.id;

    const { data: projects } = await supabase
      .from("projects")
      .select("id")
      .eq("user_id", userId);

    const projectIds = (projects || []).map((p: any) => p.id);

    if (projectIds.length > 0) {
      await supabase.from("clips").delete().in("project_id", projectIds);
    }

    await supabase.from("api_keys").delete().eq("user_id", userId);
    await supabase.from("usage_logs").delete().eq("user_id", userId);
    await supabase.from("notifications").delete().eq("user_id", userId);
    await supabase.from("social_connections").delete().eq("user_id", userId);
    await supabase.from("subscriptions").delete().eq("user_id", userId);
    await supabase.from("projects").delete().eq("user_id", userId);
    await supabase.from("profiles").delete().eq("id", userId);

    const { error: authError } =
      await supabase.auth.admin.deleteUser(userId);

    if (authError) {
      console.error("Failed to delete auth user:", authError);

      return res.status(500).json({
        error:
          "Account data deleted but auth cleanup failed. Contact support.",
      });
    }

    // Best-effort cleanup of any locally stored media for this user's
    // projects; failures here should never block account deletion.
    for (const projectId of projectIds) {
      try {
        fs.rmSync(
          path.join(mediaDir, safeSegment(projectId)),
          { recursive: true, force: true },
        );
      } catch {}
    }

    return res.json({ success: true });
  } catch (error: any) {
    if (error?.message === "UNAUTHORIZED") {
      return res.status(401).json({ error: "Unauthorized." });
    }

    return res.status(500).json({
      error: error?.message || "Failed to delete account.",
    });
  }
});

/* =========================================================
   USAGE
========================================================= */

app.get(
  "/api/usage",
  async (
    req,
    res,
  ) => {
    try {
      const user =
        await getAuthenticatedUser(
          req,
        );

      const {
        data: logs,
        error,
      } =
        await supabase
          .from(
            "usage_logs",
          )
          .select(
            "id, action, credits_used, created_at",
          )
          .eq(
            "user_id",
            user.id,
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            },
          );

      if (error) {
        throw error;
      }

      const usage =
        logs || [];

      const creditsUsed =
        usage.reduce(
          (
            sum,
            item,
          ) =>
            sum +
            Number(
              item.credits_used ||
                0,
            ),
          0,
        );

      res.json({
        usage,

        logs: usage,

        creditsUsed,

        totalCreditsUsed:
          creditsUsed,
      });
    } catch (error: any) {
      if (
        error?.message ===
        "UNAUTHORIZED"
      ) {
        return res
          .status(401)
          .json({
            error:
              "Unauthorized.",
          });
      }

      res
        .status(500)
        .json({
          error:
            "Failed to fetch usage.",
        });
    }
  },
);

/* =========================================================
   NOTIFICATIONS API
========================================================= */

app.get(
  "/api/notifications",
  async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);

      const { data, error } = await supabase
        .from("notifications")
        .select("id, user_id, type, title, message, read, project_id, metadata, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;

      return res.json({ notifications: data || [] });
    } catch (error: any) {
      if (error?.message === "UNAUTHORIZED") {
        return res.status(401).json({ error: "Unauthorized." });
      }

      return res.status(500).json({
        error: error?.message || "Failed to fetch notifications.",
      });
    }
  },
);

app.patch(
  "/api/notifications/:notificationId/read",
  async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("id", req.params.notificationId)
        .eq("user_id", user.id);

      if (error) throw error;

      return res.json({ success: true });
    } catch (error: any) {
      if (error?.message === "UNAUTHORIZED") {
        return res.status(401).json({ error: "Unauthorized." });
      }

      return res.status(500).json({
        error: error?.message || "Failed to mark notification as read.",
      });
    }
  },
);

app.patch(
  "/api/notifications/read-all",
  async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);

      const { error } = await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      if (error) throw error;

      return res.json({ success: true });
    } catch (error: any) {
      if (error?.message === "UNAUTHORIZED") {
        return res.status(401).json({ error: "Unauthorized." });
      }

      return res.status(500).json({
        error: error?.message || "Failed to mark notifications as read.",
      });
    }
  },
);

/* =========================================================
   PROJECT LIST
========================================================= */

app.get(
  "/api/projects",
  async (
    req,
    res,
  ) => {
    try {
      const user =
        await getAuthenticatedUser(
          req,
        );

      const {
        data,
        error,
      } =
        await supabase
          .from(
            "projects",
          )
          .select("*")
          .eq(
            "user_id",
            user.id,
          )
          .order(
            "created_at",
            {
              ascending:
                false,
            },
          );

      if (error) {
        throw error;
      }

      const projects = (data || []).map((project: any) => {
        const fullVideoPath = path.join(
          mediaDir,
          safeSegment(project.id),
          "full-captioned.mp4",
        );

        return {
          ...project,
          full_video_url:
            project.full_video_url ||
            (fs.existsSync(fullVideoPath)
              ? publicMediaUrl(project.id, "full-captioned.mp4")
              : null),
        };
      });

      res.json({ projects });
    } catch (error: any) {
      if (
        error?.message ===
        "UNAUTHORIZED"
      ) {
        return res
          .status(401)
          .json({
            error:
              "Unauthorized.",
          });
      }

      res
        .status(500)
        .json({
          error:
            "Failed to fetch projects.",
        });
    }
  },
);

/* =========================================================
   UPLOAD VIDEO
========================================================= */

app.post(
  "/api/projects/upload",
  upload.single("video"),
  async (
    req,
    res,
  ) => {
    let projectId =
      "";

    let tempPath =
      "";

    let authenticatedUserId =
      "";

    let creditsCharged =
      false;

    try {
      const user =
        await getAuthenticatedUser(
          req,
        );

      authenticatedUserId =
        user.id;

      if (!req.file) {
        return res
          .status(400)
          .json({
            error:
              "Please upload a video.",
          });
      }

      tempPath =
        req.file.path;

      const projectName =
        typeof req.body
          .name ===
          "string" &&
        req.body.name.trim()
          ? req.body.name.trim()
          : req.file
              .originalname ||
            "LumoClip Project";

      const requestedConfig = getProcessingConfigFromRequest(
        req.body?.captionStyle,
        req.body?.mode,
      );

      const {
        profile,
        project,
        newCredits,
      } =
        await createProjectAndCharge(
          user.id,
          projectName,
          "upload",
          "",
        );

      projectId =
        project.id;

      creditsCharged =
        true;

      await rememberProcessingConfig(
        projectId,
        requestedConfig,
      );

      const extension =
        extensionForMime(
          req.file.mimetype,
        );

      const projectDir =
        path.join(
          mediaDir,
          safeSegment(
            projectId,
          ),
        );

      fs.mkdirSync(
        projectDir,
        {
          recursive:
            true,
        },
      );

      const sourceName =
        `source.${extension}`;

      const sourcePath =
        path.join(
          projectDir,
          sourceName,
        );

      fs.copyFileSync(
        tempPath,
        sourcePath,
      );

      try {
        fs.unlinkSync(
          tempPath,
        );

        tempPath =
          "";
      } catch {}

      const sourceMediaUrl =
        publicMediaUrl(
          projectId,
          sourceName,
        );

      await supabase
        .from("projects")
        .update({
          source_media_url:
            sourceMediaUrl,

          current_step:
            "Video uploaded",
        })
        .eq(
          "id",
          projectId,
        );

      void processVideo(
        projectId,
        user.id,
        sourcePath,
        req.file.mimetype,
        undefined,
        requestedConfig.mode,
        requestedConfig.captionStyle,
      ).catch(
        async (
          error,
        ) => {
          console.error(
            "Upload background processing failed:",
            error,
          );

          await refundCredits(
            user.id,
            projectId,
          );
        },
      );

      res.json({
        success:
          true,

        project: {
          ...project,

          source_media_url:
            sourceMediaUrl,

          progress: 5,

          current_step:
            "Video uploaded",
        },

        clips: [],

        user: {
          id:
            profile.id,

          name:
            profile.name,

          email:
            profile.email,

          credits:
            newCredits,

          plan:
            profile.plan,
        },

        message:
          "Video processing started.",
      });
    } catch (error: any) {
      console.error(
        "Upload endpoint failed:",
        error,
      );

      if (tempPath) {
        try {
          if (
            fs.existsSync(
              tempPath,
            )
          ) {
            fs.unlinkSync(
              tempPath,
            );
          }
        } catch {}
      }

      if (projectId) {
        try {
          await updateProject(
            projectId,
            0,
            error?.message ||
              "Upload failed.",
            "failed",
          );
        } catch (updateError) {
          console.error(
            "Failed to mark upload project as failed:",
            updateError,
          );
        }

        if (
          creditsCharged &&
          authenticatedUserId
        ) {
          await refundCredits(
            authenticatedUserId,
            projectId,
          );
        }
      }

      if (
        error?.message ===
        "UNAUTHORIZED"
      ) {
        return res
          .status(401)
          .json({
            error:
              "Unauthorized.",
          });
      }

      res
        .status(
          error?.statusCode ||
            500,
        )
        .json({
          error:
            error?.message ||
            "Upload failed.",

          credits:
            error?.credits,
        });
    }
  },
);

/* =========================================================
   YOUTUBE PROCESS / QUEUE

   The public API only creates a queued job. It does not contact
   YouTube. The trusted PC worker claims the job and uploads the
   downloaded file back to /api/worker/projects/:projectId/upload.
========================================================= */

app.post(
  "/api/projects/process",
  async (req, res) => {
    let projectId = "";
    let authenticatedUserId = "";
    let creditsCharged = false;

    try {
      const user = await getAuthenticatedUser(req);
      authenticatedUserId = user.id;

      const sourceUrl =
        typeof req.body?.sourceUrl === "string"
          ? req.body.sourceUrl.trim()
          : "";

      if (!sourceUrl || !isYouTubeUrl(sourceUrl)) {
        return res.status(400).json({
          error: "Please provide a valid YouTube URL.",
        });
      }

      const projectName =
        typeof req.body?.name === "string" && req.body.name.trim()
          ? req.body.name.trim()
          : "YouTube Project";

      const requestedConfig = getProcessingConfigFromRequest(
        req.body?.captionStyle,
        req.body?.mode,
      );

      const { profile, project, newCredits } =
        await createProjectAndCharge(
          user.id,
          projectName,
          "youtube",
          sourceUrl,
        );

      projectId = project.id;
      creditsCharged = true;

      await rememberProcessingConfig(
        projectId,
        requestedConfig,
      );

      const waitingMessage = WORKER_ENABLED
        ? "Waiting for LumoClip worker"
        : "Worker is not configured. Please start/configure the LumoClip PC worker.";

      await updateProject(projectId, 5, waitingMessage, "processing");

      return res.json({
        success: true,
        project: {
          ...project,
          status: "processing",
          progress: 5,
          current_step: waitingMessage,
        },
        clips: [],
        user: {
          id: user.id,
          name: profile.name,
          email: profile.email,
          credits: newCredits,
          plan: profile.plan,
        },
        worker: {
          enabled: WORKER_ENABLED,
        },
        processing: {
          mode: requestedConfig.mode,
          captionStyle: requestedConfig.captionStyle,
        },
        message: WORKER_ENABLED
          ? "YouTube job queued. Your LumoClip PC worker will download the video."
          : "YouTube job queued, but the PC worker is not configured on the server.",
      });
    } catch (error: any) {
      console.error("YouTube queue endpoint failed:", error);

      if (projectId) {
        try {
          await updateProject(
            projectId,
            0,
            error?.message || "YouTube job could not be queued.",
            "failed",
          );
        } catch (updateError) {
          console.error("Failed to mark YouTube job as failed:", updateError);
        }

        if (creditsCharged && authenticatedUserId) {
          await refundCredits(authenticatedUserId, projectId);
        }
      }

      if (error?.message === "UNAUTHORIZED") {
        return res.status(401).json({ error: "Unauthorized." });
      }

      return res.status(error?.statusCode || 500).json({
        error: error?.message || "YouTube processing failed.",
        credits: error?.credits,
      });
    }
  },
);

/* =========================================================
   WORKER AUTH
========================================================= */

function requireWorkerToken(req: express.Request, res: express.Response): boolean {
  if (!LUMO_WORKER_TOKEN) {
    res.status(503).json({
      error: "LumoClip worker is not configured on this server.",
    });
    return false;
  }

  const supplied =
    typeof req.headers["x-lumo-worker-token"] === "string"
      ? req.headers["x-lumo-worker-token"].trim()
      : "";

  if (!supplied || supplied.length !== LUMO_WORKER_TOKEN.length) {
    res.status(401).json({ error: "Invalid worker token." });
    return false;
  }

  const suppliedBuffer = Buffer.from(supplied, "utf8");
  const expectedBuffer = Buffer.from(LUMO_WORKER_TOKEN, "utf8");

  if (!crypto.timingSafeEqual(suppliedBuffer, expectedBuffer)) {
    res.status(401).json({ error: "Invalid worker token." });
    return false;
  }

  return true;
}

/* =========================================================
   WORKER CLAIM
========================================================= */

app.post("/api/worker/claim", async (req, res) => {
  if (!requireWorkerToken(req, res)) return;

  try {
    const { data: queuedProject, error: selectError } =
      await supabase
        .from("projects")
        .select("id, user_id, name, source_type, source_url, status")
        .eq("source_type", "youtube")
        .eq("status", "processing")
        .eq("current_step", "Waiting for LumoClip worker")
        .not("source_url", "is", null)
        .order("created_at", { ascending: true })
        .limit(1)
        .maybeSingle();

    if (selectError) throw selectError;

    if (!queuedProject) {
      return res.json({ success: true, job: null });
    }

    const { data: claimed, error: claimError } =
      await supabase
        .from("projects")
        .update({
          status: "worker_downloading",
          progress: 8,
          current_step: "Worker is downloading YouTube video",
        })
        .eq("id", queuedProject.id)
        .eq("status", "processing")
        .eq("current_step", "Waiting for LumoClip worker")
        .select("id, user_id, name, source_type, source_url, status")
        .maybeSingle();

    if (claimError) throw claimError;

    if (!claimed) {
      return res.status(409).json({
        error: "Job was claimed by another worker. Try again.",
      });
    }

    return res.json({ success: true, job: claimed });
  } catch (error: any) {
    console.error("Worker claim failed:", error);
    return res.status(500).json({
      error: error?.message || "Failed to claim worker job.",
    });
  }
});

/* =========================================================
   WORKER VIDEO UPLOAD
========================================================= */

app.post(
  "/api/worker/projects/:projectId/upload",
  upload.single("video"),
  async (req, res) => {
    if (!requireWorkerToken(req, res)) return;

    let tempPath = "";
    const projectId = req.params.projectId;

    try {
      if (!req.file) {
        return res.status(400).json({ error: "Worker did not upload a video file." });
      }

      tempPath = req.file.path;

      const { data: project, error: projectError } =
        await supabase
          .from("projects")
          .select("id, user_id, source_type, source_url, status")
          .eq("id", projectId)
          .eq("source_type", "youtube")
          .eq("status", "worker_downloading")
          .eq("current_step", "Worker is downloading YouTube video")
          .maybeSingle();

      if (projectError) throw projectError;
      if (!project) {
        return res.status(404).json({
          error: "Worker job not found or is no longer accepting uploads.",
        });
      }

      const projectDir = path.join(mediaDir, safeSegment(projectId));
      fs.mkdirSync(projectDir, { recursive: true });

      const sourcePath = path.join(projectDir, "source.mp4");
      fs.copyFileSync(tempPath, sourcePath);

      try {
        fs.unlinkSync(tempPath);
        tempPath = "";
      } catch {}

      const sourceMediaUrl = publicMediaUrl(projectId, "source.mp4");
      const processingConfig = await getProcessingConfig(projectId);

      const { error: updateError } = await supabase
        .from("projects")
        .update({
          source_media_url: sourceMediaUrl,
          progress: 10,
          current_step: "YouTube video downloaded",
          status: "processing",
        })
        .eq("id", projectId);

      if (updateError) throw updateError;

      void processVideo(
        projectId,
        project.user_id,
        sourcePath,
        "video/mp4",
        project.source_url || undefined,
        processingConfig.mode,
        processingConfig.captionStyle,
      ).catch(async (error) => {
        console.error(`Worker-upload processing failed for project ${projectId}:`, error);
        await refundCredits(project.user_id, projectId);
      });

      return res.json({
        success: true,
        projectId,
        mode: processingConfig.mode,
        message: processingConfig.mode === "full_video_caption"
          ? "Video received. Full-video AI caption processing started."
          : "Video received. AI processing started.",
      });
    } catch (error: any) {
      console.error(`Worker upload failed for ${projectId}:`, error);

      if (tempPath) {
        try {
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        } catch {}
      }

      try {
        const { data: project } = await supabase
          .from("projects")
          .select("id, user_id")
          .eq("id", projectId)
          .maybeSingle();

        if (project) {
          await updateProject(
            projectId,
            0,
            error?.message || "Worker upload failed.",
            "failed",
          );
          await refundCredits(project.user_id, projectId);
        }
      } catch (cleanupError) {
        console.error("Worker failure cleanup failed:", cleanupError);
      }

      return res.status(500).json({
        error: error?.message || "Worker upload failed.",
      });
    }
  },
);

/* =========================================================
   WORKER FAIL
========================================================= */

app.post("/api/worker/projects/:projectId/fail", async (req, res) => {
  if (!requireWorkerToken(req, res)) return;

  const projectId = req.params.projectId;
  const reason =
    typeof req.body?.error === "string" && req.body.error.trim()
      ? req.body.error.trim().slice(0, 1000)
      : "YouTube worker could not download the video.";

  try {
    const { data: project, error } = await supabase
      .from("projects")
      .select("id, user_id, status")
      .eq("id", projectId)
      .eq("source_type", "youtube")
      .eq("status", "worker_downloading")
      .eq("current_step", "Worker is downloading YouTube video")
      .maybeSingle();

    if (error) throw error;
    if (!project) {
      return res.status(404).json({ error: "Worker job not found." });
    }

    await updateProject(projectId, 0, reason, "failed");
    await refundCredits(project.user_id, projectId);

    return res.json({
      success: true,
      message: "Worker job marked as failed and credits refunded.",
    });
  } catch (error: any) {
    console.error("Worker fail endpoint failed:", error);
    return res.status(500).json({
      error: error?.message || "Failed to mark worker job as failed.",
    });
  }
});

/* =========================================================
   YOUTUBE SOCIAL CONNECT ROUTES
========================================================= */

app.get(
  "/api/social/youtube/connect",
  async (req, res) => {
    try {
      const user =
        await getAuthenticatedUser(req);

      const oauth2Client =
        getYouTubeOAuthClient();

      const state =
        createYouTubeOAuthState(
          user.id,
        );

      const authorizationUrl =
        oauth2Client.generateAuthUrl({
          access_type: "offline",
          prompt: "consent",
          include_granted_scopes: true,
          scope: YOUTUBE_SCOPES,
          state,
        });

      return res.json({
        success: true,
        url: authorizationUrl,
      });
    } catch (error: any) {
      if (
        error?.message ===
        "UNAUTHORIZED"
      ) {
        return res.status(401).json({
          error: "Unauthorized.",
        });
      }

      console.error(
        "YouTube connect failed:",
        error,
      );

      return res.status(500).json({
        error:
          error?.message ||
          "Failed to start YouTube connection.",
      });
    }
  },
);

app.get(
  "/api/social/youtube/callback",
  async (req, res) => {
    try {
      const code =
        typeof req.query.code ===
        "string"
          ? req.query.code
          : "";

      const state =
        typeof req.query.state ===
        "string"
          ? req.query.state
          : "";

      const oauthError =
        typeof req.query.error ===
        "string"
          ? req.query.error
          : "";

      if (oauthError) {
        return res.redirect(
          `${FRONTEND_URL}/settings?youtube=error&reason=${encodeURIComponent(
            oauthError,
          )}`,
        );
      }

      if (!code || !state) {
        return res.redirect(
          `${FRONTEND_URL}/settings?youtube=error&reason=missing_callback_data`,
        );
      }

      const { userId } =
        verifyYouTubeOAuthState(state);

      const oauth2Client =
        getYouTubeOAuthClient();

      const { tokens } =
        await oauth2Client.getToken(
          code,
        );

      if (!tokens.access_token) {
        throw new Error(
          "Google did not return an access token.",
        );
      }

      if (!tokens.refresh_token) {
        throw new Error(
          "Google did not return a refresh token. Reconnect with consent enabled.",
        );
      }

      oauth2Client.setCredentials(
        tokens,
      );

      const youtube = google.youtube({
        version: "v3",
        auth: oauth2Client,
      });

      const channelResponse =
        await youtube.channels.list({
          part: [
            "snippet",
            "contentDetails",
          ],
          mine: true,
        });

      const channel =
        channelResponse.data.items?.[0];

      if (!channel?.id) {
        throw new Error(
          "No YouTube channel was found for this Google account.",
        );
      }

      const accountName =
        channel.snippet?.title ||
        "YouTube Channel";

      const accountAvatar =
        channel.snippet?.thumbnails?.default
          ?.url ||
        channel.snippet?.thumbnails?.high
          ?.url ||
        "";

      const payload = {
        user_id: userId,
        provider: "youtube",
        account_id: channel.id,
        account_name: accountName,
        account_avatar: accountAvatar,
        access_token:
          encryptSocialToken(
            tokens.access_token,
          ),
        refresh_token:
          encryptSocialToken(
            tokens.refresh_token,
          ),
        token_expires_at:
          tokens.expiry_date
            ? new Date(
                tokens.expiry_date,
              ).toISOString()
            : null,
        scopes:
          tokens.scope
            ? tokens.scope.split(" ")
            : YOUTUBE_SCOPES,
        metadata: {
          channelId: channel.id,
          channelTitle: accountName,
          customUrl:
            channel.snippet?.customUrl ||
            null,
        },
      };

      const { error: upsertError } =
        await supabase
          .from("social_connections")
          .upsert(payload, {
            onConflict:
              "user_id,provider",
          });

      if (upsertError) {
        throw upsertError;
      }

      return res.redirect(
        `${FRONTEND_URL}/settings?youtube=connected`,
      );
    } catch (error: any) {
      console.error(
        "YouTube OAuth callback failed:",
        error,
      );

      return res.redirect(
        `${FRONTEND_URL}/settings?youtube=error&reason=${encodeURIComponent(
          error?.message ||
            "oauth_failed",
        )}`,
      );
    }
  },
);

app.get(
  "/api/social/youtube/status",
  async (req, res) => {
    try {
      const user =
        await getAuthenticatedUser(req);

      const connection =
        await getYouTubeConnection(
          user.id,
        );

      if (!connection) {
        return res.json({
          connected: false,
          provider: "youtube",
        });
      }

      return res.json({
        connected: true,
        provider: "youtube",
        account: {
          id: connection.account_id,
          name: connection.account_name,
          avatar:
            connection.account_avatar ||
            "",
        },
      });
    } catch (error: any) {
      if (
        error?.message ===
        "UNAUTHORIZED"
      ) {
        return res.status(401).json({
          error: "Unauthorized.",
        });
      }

      return res.status(500).json({
        error:
          error?.message ||
          "Failed to fetch YouTube status.",
      });
    }
  },
);

app.delete(
  "/api/social/youtube/disconnect",
  async (req, res) => {
    try {
      const user =
        await getAuthenticatedUser(req);

      const connection =
        await getYouTubeConnection(
          user.id,
        );

      if (!connection) {
        return res.json({
          success: true,
          connected: false,
        });
      }

      try {
        if (connection.access_token) {
          const oauth2Client =
            getYouTubeOAuthClient();

          await oauth2Client.revokeToken(
            decryptSocialToken(
              connection.access_token,
            ),
          );
        }
      } catch (revokeError) {
        console.warn(
          "YouTube token revoke failed; deleting local connection anyway:",
          revokeError,
        );
      }

      const { error } =
        await supabase
          .from("social_connections")
          .delete()
          .eq("user_id", user.id)
          .eq("provider", "youtube");

      if (error) {
        throw error;
      }

      return res.json({
        success: true,
        connected: false,
      });
    } catch (error: any) {
      if (
        error?.message ===
        "UNAUTHORIZED"
      ) {
        return res.status(401).json({
          error: "Unauthorized.",
        });
      }

      return res.status(500).json({
        error:
          error?.message ||
          "Failed to disconnect YouTube.",
      });
    }
  },
);

app.post(
  "/api/social/youtube/upload",
  async (req, res) => {
    try {
      const user =
        await getAuthenticatedUser(req);

      const clipId =
        typeof req.body.clipId ===
        "string"
          ? req.body.clipId.trim()
          : "";

      if (!clipId) {
        return res.status(400).json({
          error: "clipId is required.",
        });
      }

      const title =
        typeof req.body.title ===
        "string" &&
        req.body.title.trim()
          ? req.body.title.trim()
          : "LumoClip Short";

      const description =
        typeof req.body.description ===
        "string"
          ? req.body.description.trim()
          : "";

      const tags =
        Array.isArray(req.body.tags)
          ? req.body.tags
              .filter(
                (tag: unknown) =>
                  typeof tag ===
                  "string",
              )
              .map((tag: string) =>
                tag.trim(),
              )
              .filter(Boolean)
          : [];

      const allowedPrivacy = [
        "private",
        "public",
        "unlisted",
      ] as const;

      const privacyStatus =
        allowedPrivacy.includes(
          req.body.privacyStatus,
        )
          ? req.body.privacyStatus
          : "private";

      const result =
        await uploadClipToYouTube(
          user.id,
          clipId,
          {
            title,
            description,
            tags,
            privacyStatus,
          },
        );

      return res.json({
        success: true,
        provider: "youtube",
        videoId:
          result.youtubeVideoId,
        url: result.url,
        message:
          "Clip uploaded to YouTube successfully.",
      });
    } catch (error: any) {
      if (
        error?.message ===
        "UNAUTHORIZED"
      ) {
        return res.status(401).json({
          error: "Unauthorized.",
        });
      }

      console.error(
        "YouTube clip upload failed:",
        error,
      );

      return res
        .status(error?.statusCode || 500)
        .json({
          error:
            error?.message ||
            "Failed to upload clip to YouTube.",
        });
    }
  },
);

/* =========================================================
   YOUTUBE FULL PROJECT VIDEO UPLOAD
========================================================= */

app.post(
  "/api/social/youtube/upload-project",
  async (req, res) => {
    try {
      const user = await getAuthenticatedUser(req);

      const projectId =
        typeof req.body?.projectId === "string"
          ? req.body.projectId.trim()
          : "";

      if (!projectId) {
        return res.status(400).json({
          error: "projectId is required.",
        });
      }

      const title =
        typeof req.body?.title === "string" && req.body.title.trim()
          ? req.body.title.trim()
          : "LumoClip Captioned Video";

      const description =
        typeof req.body?.description === "string"
          ? req.body.description.trim()
          : "";

      const tags =
        Array.isArray(req.body?.tags)
          ? req.body.tags
              .filter((tag: unknown) => typeof tag === "string")
              .map((tag: string) => tag.trim())
              .filter(Boolean)
          : [];

      const allowedPrivacy = [
        "private",
        "public",
        "unlisted",
      ] as const;

      const privacyStatus = allowedPrivacy.includes(req.body?.privacyStatus)
        ? req.body.privacyStatus
        : "private";

      const { data: project, error: projectError } = await supabase
        .from("projects")
        .select("id, user_id, processing_mode, full_video_url, duration")
        .eq("id", projectId)
        .eq("user_id", user.id)
        .single();

      if (projectError || !project) {
        const error: any = new Error("Project not found.");
        error.statusCode = 404;
        throw error;
      }

      const fullVideoUrl = String(project.full_video_url || "");

      if (!fullVideoUrl) {
        throw new Error("Full captioned video is not ready yet.");
      }

      if (project.processing_mode !== "full_video_caption") {
        throw new Error("This project does not contain a full captioned video.");
      }

      // Full captioned videos are always written to the project media folder
      // using this fixed server-side filename. Do not trust a client path.
      const fullVideoPath = path.resolve(
        mediaDir,
        safeSegment(project.id),
        "full-captioned.mp4",
      );

      const allowedRoot =
        path.resolve(mediaDir, safeSegment(project.id)) + path.sep;

      if (
        !fullVideoPath.startsWith(allowedRoot) ||
        !fs.existsSync(fullVideoPath) ||
        !fs.statSync(fullVideoPath).isFile()
      ) {
        throw new Error("Full captioned video file is not available on the server.");
      }

      const { oauth2Client } = await getYouTubeClientForUser(user.id);

      const youtube = google.youtube({
        version: "v3",
        auth: oauth2Client,
      });

      const response = await youtube.videos.insert({
        part: ["snippet", "status"],
        requestBody: {
          snippet: {
            title: title.slice(0, 100),
            description: description.slice(0, 5000),
            tags: tags
              .map((tag: string) => tag.replace(/^#/, "").trim())
              .filter(Boolean)
              .slice(0, 500),
            categoryId: "22",
          },
          status: {
            privacyStatus,
            selfDeclaredMadeForKids: false,
          },
        },
        media: {
          body: fs.createReadStream(fullVideoPath),
        },
      });

      const youtubeVideoId = response.data.id || "";

      if (!youtubeVideoId) {
        throw new Error("YouTube upload completed without a video ID.");
      }

      return res.json({
        success: true,
        provider: "youtube",
        videoId: youtubeVideoId,
        url: `https://www.youtube.com/watch?v=${youtubeVideoId}`,
        message: "Full captioned video uploaded to YouTube successfully.",
      });
    } catch (error: any) {
      if (error?.message === "UNAUTHORIZED") {
        return res.status(401).json({ error: "Unauthorized." });
      }

      console.error("YouTube full project upload failed:", error);

      return res.status(error?.statusCode || 500).json({
        error:
          error?.message ||
          "Failed to upload full captioned video to YouTube.",
      });
    }
  },
);

/* =========================================================
   GET PROJECT
========================================================= */

app.get(
  "/api/projects/:projectId",
  async (
    req,
    res,
  ) => {
    try {
      const user =
        await getAuthenticatedUser(
          req,
        );

      const {
        data: project,
        error,
      } =
        await supabase
          .from(
            "projects",
          )
          .select("*")
          .eq(
            "id",
            req.params
              .projectId,
          )
          .eq(
            "user_id",
            user.id,
          )
          .single();

      if (
        error ||
        !project
      ) {
        return res
          .status(404)
          .json({
            error:
              "Project not found.",
          });
      }

      const {
        data: clips,
        error:
          clipsError,
      } =
        await supabase
          .from("clips")
          .select("*")
          .eq(
            "project_id",
            project.id,
          )
          .order(
            "viral_score",
            {
              ascending:
                false,
            },
          );

      if (clipsError) {
        console.error(
          "Clip query failed:",
          clipsError,
        );
      }

      const fullVideoPath = path.join(
        mediaDir,
        safeSegment(project.id),
        "full-captioned.mp4",
      );

      const projectWithFullVideo = {
        ...project,
        full_video_url:
          project.full_video_url ||
          (fs.existsSync(fullVideoPath)
            ? publicMediaUrl(project.id, "full-captioned.mp4")
            : null),
      };

      res.json({
        project: projectWithFullVideo,
        clips: clips || [],
      });
    } catch (error: any) {
      if (
        error?.message ===
        "UNAUTHORIZED"
      ) {
        return res
          .status(401)
          .json({
            error:
              "Unauthorized.",
          });
      }

      res
        .status(500)
        .json({
          error:
            "Failed to get project.",
        });
    }
  },
);

/* =========================================================
   MEDIA
========================================================= */

function sendProjectMedia(
  req: express.Request,
  res: express.Response,
  subdir: string,
) {
  try {
    const projectId =
      safeSegment(
        req.params.projectId,
      );

    const filename =
      safeSegment(
        req.params.filename,
      );

    const projectDir =
      path.join(
        mediaDir,
        projectId,
        subdir,
      );

    const filePath =
      path.resolve(
        projectDir,
        filename,
      );

    const root =
      path.resolve(
        projectDir,
      ) + path.sep;

    if (
      !filePath.startsWith(
        root,
      ) ||
      !fs.existsSync(
        filePath,
      ) ||
      !fs.statSync(
        filePath,
      ).isFile()
    ) {
      return res
        .status(404)
        .end();
    }

    return res.sendFile(
      filePath,
    );
  } catch {
    return res
      .status(404)
      .end();
  }
}

app.get(
  "/api/media/:projectId/source/:filename",
  (req, res) =>
    sendProjectMedia(
      req,
      res,
      "",
    ),
);

app.get(
  "/api/media/:projectId/clips/:filename",
  (req, res) =>
    sendProjectMedia(
      req,
      res,
      "clips",
    ),
);

/* =========================================================
   DELETE PROJECT
========================================================= */

app.delete(
  "/api/projects/:projectId",
  async (
    req,
    res,
  ) => {
    try {
      const user =
        await getAuthenticatedUser(
          req,
        );

      const projectId =
        req.params
          .projectId;

      const {
        data: project,
      } =
        await supabase
          .from(
            "projects",
          )
          .select("id")
          .eq(
            "id",
            projectId,
          )
          .eq(
            "user_id",
            user.id,
          )
          .maybeSingle();

      if (!project) {
        return res
          .status(404)
          .json({
            error:
              "Project not found.",
          });
      }

      await supabase
        .from("clips")
        .delete()
        .eq(
          "project_id",
          projectId,
        );

      await supabase
        .from("projects")
        .delete()
        .eq(
          "id",
          projectId,
        )
        .eq(
          "user_id",
          user.id,
        );

      const projectDir =
        path.join(
          mediaDir,
          safeSegment(
            projectId,
          ),
        );

      try {
        fs.rmSync(
          projectDir,
          {
            recursive:
              true,
            force: true,
          },
        );
      } catch {}

      res.json({
        success:
          true,
      });
    } catch (error: any) {
      if (
        error?.message ===
        "UNAUTHORIZED"
      ) {
        return res
          .status(401)
          .json({
            error:
              "Unauthorized.",
          });
      }

      res
        .status(500)
        .json({
          error:
            "Failed to delete project.",
        });
    }
  },
);

/* =========================================================
   SITEMAP
========================================================= */

app.get("/sitemap.xml", (_req, res) => {
  console.log("✅ Sitemap requested: /sitemap.xml");

  const lastmod = new Date().toISOString().split("T")[0];

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://lumo-clip.com/</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>

  <url>
    <loc>https://lumo-clip.com/ai-video-clipper</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>

  <url>
    <loc>https://lumo-clip.com/long-video-to-shorts</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>

  <url>
    <loc>https://lumo-clip.com/ai-shorts-generator</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>

  <url>
    <loc>https://lumo-clip.com/youtube-to-shorts</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>
</urlset>`;

  res.status(200);
  res.set("Content-Type", "application/xml; charset=utf-8");
  res.send(sitemap);
});


/* =========================================================
   ROBOTS.TXT
========================================================= */

app.get("/robots.txt", (_req, res) => {
  console.log("✅ robots.txt requested");

  const robots = `User-agent: *
Allow: /

Sitemap: https://lumo-clip.com/sitemap.xml
`;

  res.status(200);
  res.set("Content-Type", "text/plain; charset=utf-8");
  res.send(robots);
});


/* =========================================================
   STATIC FRONTEND
========================================================= */

const clientDistDir = path.join(
  process.cwd(),
  "dist",
);

app.use(
  express.static(clientDistDir),
);


/* =========================================================
   REACT ROUTER SPA FALLBACK
========================================================= */

app.get("*", (req, res, next) => {
  // Never send index.html for API routes
  if (req.path.startsWith("/api/")) {
    return next();
  }

  // Never send index.html for sitemap
  if (req.path === "/sitemap.xml") {
    return next();
  }

  // Never send index.html for robots
  if (req.path === "/robots.txt") {
    return next();
  }

  const indexPath = path.join(
    clientDistDir,
    "index.html",
  );

  if (!fs.existsSync(indexPath)) {
    return res
      .status(500)
      .send(
        "Frontend build not found. Run npm run build first.",
      );
  }

  return res.sendFile(indexPath);
});


/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
  (
    error: any,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    console.error(
      "Express error:",
      error,
    );

    if (
      error instanceof
      multer.MulterError
    ) {
      if (
        error.code ===
        "LIMIT_FILE_SIZE"
      ) {
        return res
          .status(413)
          .json({
            error:
              `Video file is too large. Maximum size is ${MAX_UPLOAD_MB}MB.`,
          });
      }

      return res
        .status(400)
        .json({
          error:
            error.message,
        });
    }

    return res
      .status(400)
      .json({
        error:
          error?.message ||
          "Server error.",
      });
  },
);


/* =========================================================
   PROCESS ERROR HANDLERS
========================================================= */

process.on(
  "uncaughtException",
  (error) => {
    console.error(
      "🔥 UNCAUGHT EXCEPTION:",
      error,
    );
  },
);

process.on(
  "unhandledRejection",
  (reason) => {
    console.error(
      "🔥 UNHANDLED REJECTION:",
      reason,
    );
  },
);


/* =========================================================
   PERIODIC TEMP-FILE CLEANUP
========================================================= */

const TEMP_CLEANUP_INTERVAL_MS = Number(
  process.env.TEMP_CLEANUP_INTERVAL_MS || 30 * 60 * 1000,
);
const TEMP_FILE_MAX_AGE_MS = Number(
  process.env.TEMP_FILE_MAX_AGE_MS || 2 * 60 * 60 * 1000,
);

function cleanupOldFiles(dir: string, maxAgeMs: number) {
  try {
    if (!fs.existsSync(dir)) return;
    const now = Date.now();
    for (const name of fs.readdirSync(dir)) {
      const target = path.join(dir, name);
      try {
        const stat = fs.statSync(target);
        if (stat.isFile() && now - stat.mtimeMs > maxAgeMs) {
          fs.unlinkSync(target);
        }
      } catch {}
    }
  } catch (error) {
    console.warn("Temp cleanup failed:", error instanceof Error ? error.message : error);
  }
}

const cleanupTimer = setInterval(() => {
  cleanupOldFiles(tempDir, TEMP_FILE_MAX_AGE_MS);
}, TEMP_CLEANUP_INTERVAL_MS);
cleanupTimer.unref?.();

/* =========================================================
   START SERVER
========================================================= */




/* =========================================================
   LISTEN
========================================================= */

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      "======================================",
    );

        console.log(
      `🚀 LumoClip AI Server: http://localhost:${PORT}`,
    );
    console.log(
      `🗺️ Sitemap: ${FRONTEND_URL.replace(/\/$/, "")}/sitemap.xml`,
    );
    console.log(
      `Gemini model: ${GEMINI_MODEL}`,
    );

    console.log(
      `Gemini API keys configured: ${geminiClients.length}`,
    );

    console.log(
      `Gemini fallback models: ${
        GEMINI_FALLBACK_MODELS.length
          ? GEMINI_FALLBACK_MODELS.join(", ")
          : "none"
      }`,
      `Gemini smart retry: attempts=${GEMINI_TRANSIENT_MAX_ATTEMPTS}, base=${GEMINI_RETRY_BASE_MS}ms, max=${GEMINI_RETRY_MAX_MS}ms, rate-limit-max=${GEMINI_RATE_LIMIT_MAX_WAIT_MS}ms, timeout=${GEMINI_REQUEST_TIMEOUT_MS}ms`,
    );

    console.log(
      `Video cost: ${VIDEO_COST} credits`,
    );

    console.log(
      `Daily credit limit: ${DAILY_CREDIT_LIMIT} credits`,
    );

    console.log(
      "Real upload processing: ENABLED",
    );

    console.log(
      "YouTube PC worker processing: ENABLED",
    );

    console.log(
      "PO-token provider:",
      YOUTUBE_POT_PROVIDER_URL
        ? "CONFIGURED"
        : "NOT CONFIGURED",
    );

    console.log(
      "FFmpeg: ENABLED",
    );

    console.log(
      `AI Captions: ${CAPTIONS_ENABLED ? "ENABLED" : "DISABLED"}`,
    );

    console.log(
      `Speed mode: YouTube ${YOUTUBE_MAX_HEIGHT}p, ${YOUTUBE_CONCURRENT_FRAGMENTS} download fragments, ${CLIP_CONCURRENCY} parallel clips`,
    );
    console.log(
      `FFmpeg tuning: preset=${FFMPEG_PRESET}, crf=${FFMPEG_CRF}, threads/clip=${FFMPEG_THREADS_PER_CLIP}, detected CPUs=${CPU_COUNT}`,
    );
    console.log(
      `Whisper tuning: model=${WHISPER_MODEL}, dtype=${WHISPER_DTYPE}, window=${WHISPER_WINDOW_STEP_S}s, overlap=${WHISPER_WINDOW_OVERLAP_S}s, timeout=${WHISPER_TIMEOUT_MS}ms`,
    );
    console.log(
      `Hard timeouts: Gemini=${GEMINI_REQUEST_TIMEOUT_MS}ms, FFmpeg=${FFMPEG_TIMEOUT_MS}ms`,
    );

    console.log(
      "======================================",
    );
  },
);