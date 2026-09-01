import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import multer from "multer";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import crypto from "node:crypto";
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
  process.env.GEMINI_GENERATE_RETRIES || 5,
);

const GEMINI_RETRY_BASE_MS = Number(
  process.env.GEMINI_RETRY_BASE_MS || 5000,
);

const GEMINI_RETRY_MAX_MS = Number(
  process.env.GEMINI_RETRY_MAX_MS || 60000,
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

const geminiApiKey = process.env.GEMINI_API_KEY;

if (!supabaseUrl) {
  throw new Error("Missing SUPABASE_URL");
}

if (!supabaseServiceRoleKey) {
  throw new Error(
    "Missing SUPABASE_SERVICE_ROLE_KEY",
  );
}

if (!geminiApiKey) {
  throw new Error("Missing GEMINI_API_KEY");
}

/* =========================================================
   CLIENTS
========================================================= */

const supabase = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
);

const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
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
    return [];
  }

  return transcript
    .filter(
      (segment) =>
        segment.end > clipStart && segment.start < clipEnd,
    )
    .map((segment) => ({
      start: Math.max(segment.start, clipStart) - clipStart,
      end: Math.min(segment.end, clipEnd) - clipStart,
      text: String(segment.text || "").trim(),
    }))
    .filter(
      (segment) =>
        segment.end > segment.start && segment.text.length > 0,
    );
}

// Approximate a per-word duration for a segment by weighting on
// word length, so longer words get slightly more screen time.
function computeWordTimings(
  text: string,
  duration: number,
): { word: string; duration: number }[] {
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

  return words.map((word, index) => ({
    word,
    duration: rawDurations[index] * scale,
  }));
}

// Group timed words into short on-screen lines (like CapCut/
// OpusClip auto-captions), so each highlight event only shows
// a handful of words at a time.
function groupWordsIntoLines(
  words: { word: string; duration: number }[],
): { word: string; duration: number }[][] {
  const MAX_WORDS_PER_LINE = 4;
  const MAX_CHARS_PER_LINE = 18;

  const lines: { word: string; duration: number }[][] = [];
  let current: { word: string; duration: number }[] = [];
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
// libass highlights each word as it's "spoken".
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

  for (const segment of segments) {
    const duration = segment.end - segment.start;
    const words = computeWordTimings(segment.text, duration);

    if (!words.length) {
      continue;
    }

    const lines = groupWordsIntoLines(words);
    let cursor = segment.start;

    for (const line of lines) {
      const lineStart = cursor;

      // Cumulative offset (ms) of each word from the start of this
      // line's Dialogue event — used to time the per-word pop/bounce
      // so it fires exactly when that word becomes "active".
      let offsetMs = 0;

      const lineText = line
        .map((item) => {
          const centiseconds = Math.max(
            1,
            Math.round(item.duration * 100),
          );

          const wordDurationMs = Math.round(
            item.duration * 1000,
          );

          const word = style.uppercase
            ? item.word.toUpperCase()
            : item.word;

          if (!useAnimation) {
            offsetMs += wordDurationMs;
            return `{\\k${centiseconds}}${escapeAssText(word)}`;
          }

          const popDuration = Math.min(
            140,
            Math.max(60, Math.round(wordDurationMs * 0.5)),
          );

          const popStart = offsetMs;
          const popEnd = popStart + popDuration;

          offsetMs += wordDurationMs;

          // Reset scale, then bounce up and settle back down right as
          // the word's karaoke highlight begins — a quick, punchy pop
          // rather than a static color swap.
          return (
            `{\\fscx100\\fscy100` +
            `\\t(${popStart},${popEnd},\\fscx112\\fscy112)` +
            `\\t(${popEnd},${popEnd + popDuration},\\fscx100\\fscy100)` +
            `\\k${centiseconds}}${escapeAssText(word)}`
          );
        })
        .join(" ");

      const lineDuration = line.reduce(
        (sum, item) => sum + item.duration,
        0,
      );

      const lineEnd = lineStart + lineDuration;

      events.push(
        `Dialogue: 0,${formatAssTime(lineStart)},${formatAssTime(
          lineEnd,
        )},Default,,0,0,0,,${lineText}`,
      );

      cursor = lineEnd;
    }
  }

  return header + events.join("\n") + "\n";
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

function isRetryableGeminiError(error: any): boolean {
  const status = getGeminiErrorStatus(error);
  const message = String(
    error?.message || error?.error?.message || error || "",
  ).toLowerCase();

  return (
    status === 429 ||
    status === 500 ||
    status === 502 ||
    status === 503 ||
    status === 504 ||
    message.includes("high demand") ||
    message.includes("temporarily unavailable") ||
    message.includes("unavailable") ||
    message.includes("resource exhausted")
  );
}

async function generateGeminiWithRetry(
  params: Parameters<typeof ai.models.generateContent>[0],
) {
  let lastError: unknown;

  const attempts = Math.max(1, GEMINI_GENERATE_RETRIES);

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      console.log(
        `Gemini generateContent attempt ${attempt}/${attempts}`,
      );

      return await ai.models.generateContent(params);
    } catch (error: any) {
      lastError = error;

      const status = getGeminiErrorStatus(error);

      console.error(
        `Gemini generateContent attempt ${attempt} failed (status ${status ?? "unknown"}):`,
        error?.message || error,
      );

      if (
        !isRetryableGeminiError(error) ||
        attempt >= attempts
      ) {
        throw error;
      }

      const exponentialDelay = Math.min(
        GEMINI_RETRY_BASE_MS *
          Math.pow(2, attempt - 1),
        GEMINI_RETRY_MAX_MS,
      );

      // Small jitter avoids repeatedly hitting the service at the same instant.
      const jitter = Math.floor(
        Math.random() * 1000,
      );

      const delay = Math.min(
        exponentialDelay + jitter,
        GEMINI_RETRY_MAX_MS,
      );

      console.warn(
        `Gemini temporarily unavailable${
          status ? ` (HTTP ${status})` : ""
        }. Retrying in ${delay}ms...`,
      );

      await sleep(delay);
    }
  }

  throw lastError;
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

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
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
        ) => ({
          start: Math.max(
            0,
            Math.min(
              safeDuration,
              s.start,
            ),
          ),

          end: Math.max(
            0,
            Math.min(
              safeDuration,
              s.end,
            ),
          ),

          text: s.text,
        }),
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

          caption: String(
            c?.caption || "",
          ).trim(),
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
    throw new Error(
      "AI could not find any valid viral moments within the video duration.",
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
  console.log(
    "Uploading video to Gemini:",
    videoPath,
  );

  let file =
    await ai.files.upload({
      file: videoPath,
      config: {
        mimeType,
      },
    });

  console.log(
    "Gemini file:",
    file.name,
  );

  /*
     Faster polling:
     The old pipeline waited 4 seconds between every ACTIVE check.
     1.5s keeps the same API flow but removes unnecessary idle time.
  */
  while (
    file.state &&
    file.state.toString() !== "ACTIVE"
  ) {
    const state =
      file.state.toString();

    console.log(
      "Gemini processing state:",
      state,
    );

    if (state === "FAILED") {
      throw new Error(
        "Gemini video processing failed.",
      );
    }

    await sleep(GEMINI_POLL_MS);

    file =
      await ai.files.get({
        name: file.name!,
      });
  }

  console.log(
    "Gemini file ACTIVE — starting analysis.",
  );

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
- Split a sentence into multiple consecutive entries, e.g.
  "Hello everyone welcome back to my channel" becomes:
  {"start":0.00,"end":0.55,"text":"Hello everyone"}
  {"start":0.55,"end":1.10,"text":"welcome back"}
  {"start":1.10,"end":1.85,"text":"to my channel"}
- start/end for each chunk MUST match the moment those exact words are
  actually spoken in the audio — not evenly guessed durations.
- Do not merge separate breaths/pauses into one chunk.
- These chunks are burned onto the video as karaoke-style captions, so
  timing accuracy per chunk matters more than transcript readability.

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
      "text": "spoken words"
    },
    {
      "start": 0.6,
      "end": 1.3,
      "text": "next few words"
    }
  ],
  "clips": [
    {
      "start": 123.5,
      "end": 158.2,
      "title": "Short viral title",
      "reason": "Why this moment is strong",
      "score": 94,
      "caption": "Short social caption"
    }
  ]
}
`;

  const response =
    await generateGeminiWithRetry({
      model: GEMINI_MODEL,
      contents:
        createUserContent([
          createPartFromUri(
            file.uri!,
            file.mimeType!,
          ),
          prompt,
        ]),
      config: {
        responseMimeType: "application/json",
        temperature: 0.2,
      },
    });

  const text =
    response.text || "";

  console.log(
    "Gemini response length:",
    text.length,
  );

  if (!text.trim()) {
    throw new Error(
      "Gemini returned an empty response.",
    );
  }

  const cleanedJson =
    cleanJson(text);

  let parsed: any;

  try {
    parsed =
      JSON.parse(cleanedJson);
  } catch (error) {
    console.error(
      "Gemini JSON parse error:",
      error,
    );
    console.error(
      "Cleaned Gemini response:",
      cleanedJson,
    );
    throw new Error(
      "Gemini returned invalid JSON.",
    );
  }

  return validateAnalysis(
    parsed,
    duration,
    { requireClips: processingMode !== "full_video_caption" },
  );
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
      "======================================",
    );
  },
);