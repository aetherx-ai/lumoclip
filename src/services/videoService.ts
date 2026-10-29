import ffmpeg from "fluent-ffmpeg";
import ffmpegStatic from "ffmpeg-static";
import path from "path";
import fs from "fs";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const ffprobeStatic = require("ffprobe-static");

// ============================================================
// FFmpeg / FFprobe configuration (single source of truth)
// ============================================================

const ffmpegPath = ffmpegStatic;
const ffprobePath = ffprobeStatic.path; // Safe access

if (ffmpegPath) {
  ffmpeg.setFfmpegPath(ffmpegPath);
  console.log("FFmpeg:", ffmpegPath);
}

if (ffprobePath) {
  ffmpeg.setFfprobePath(ffprobePath);
  console.log("FFprobe:", ffprobePath);
}

// ============================================================
// Types
// ============================================================

export interface VideoMetadata {
  duration: number;
  width?: number;
  height?: number;
  format?: string;
}

export interface ClipResult {
  path: string;
  startTime: number;
  endTime: number;
  duration: number;
}

// ============================================================
// Directory helper
// ============================================================

export function ensureDirectory(directory: string): void {
  if (!fs.existsSync(directory)) {
    fs.mkdirSync(directory, { recursive: true });
  }
}

// ============================================================
// Get video duration
// ============================================================

export async function getVideoDuration(
  inputPath: string,
): Promise<number> {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Video file not found: ${inputPath}`);
  }

  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(
      inputPath,
      (err: Error | null, metadata: any) => {
        if (err) {
          reject(err);
          return;
        }

        const duration = Number(metadata?.format?.duration ?? 0);

        if (!Number.isFinite(duration) || duration <= 0) {
          reject(
            new Error(
              `Could not determine video duration: ${inputPath}`,
            ),
          );
          return;
        }

        resolve(duration);
      },
    );
  });
}

// ============================================================
// Get complete video metadata
// ============================================================

export async function getVideoMetadata(
  inputPath: string,
): Promise<VideoMetadata> {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Video file not found: ${inputPath}`);
  }

  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(
      inputPath,
      (err: Error | null, metadata: any) => {
        if (err) {
          reject(err);
          return;
        }

        const duration = Number(metadata?.format?.duration ?? 0);

        const videoStream =
          metadata?.streams?.find(
            (stream: any) => stream.codec_type === "video",
          );

        resolve({
          duration,
          width: videoStream?.width,
          height: videoStream?.height,
          format: metadata?.format?.format_name,
        });
      },
    );
  });
}

// ============================================================
// Extract audio
// ============================================================

export async function extractAudio(
  inputPath: string,
  outputPath: string,
): Promise<string> {
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Input video not found: ${inputPath}`);
  }

  ensureDirectory(path.dirname(outputPath));

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .noVideo()
      .audioCodec("libmp3lame")
      .audioBitrate("128k")
      .output(outputPath)
      .on("start", (commandLine) => {
        console.log("FFmpeg audio command:");
        console.log(commandLine);
      })
      .on("progress", (progress) => {
        if (progress.percent !== undefined) {
          console.log(
            `Audio progress: ${progress.percent.toFixed(1)}%`,
          );
        }
      })
      .on("end", () => {
        if (!fs.existsSync(outputPath)) {
          reject(
            new Error(
              "Audio extraction finished but output file was not created.",
            ),
          );
          return;
        }

        resolve(outputPath);
      })
      .on("error", (err: Error) => {
        console.error(
          "FFmpeg audio extraction error:",
          err.message,
        );

        reject(err);
      })
      .run();
  });
}

// ============================================================
// Normalize clip timestamps
// ============================================================

export async function normalizeClipTimes(
  inputPath: string,
  startTime: number,
  endTime: number,
): Promise<{
  startTime: number;
  endTime: number;
  duration: number;
}> {
  const videoDuration =
    await getVideoDuration(inputPath);

  let start = Number(startTime);
  let end = Number(endTime);

  if (!Number.isFinite(start)) {
    start = 0;
  }

  if (!Number.isFinite(end)) {
    end = start + 30;
  }

  start = Math.max(0, start);
  end = Math.min(videoDuration, end);

  if (start >= videoDuration) {
    throw new Error(
      `Clip start time ${start}s is beyond video duration ${videoDuration}s`,
    );
  }

  if (end <= start) {
    throw new Error(
      `Invalid clip range: ${start}s -> ${end}s`,
    );
  }

  const duration = end - start;

  return {
    startTime: start,
    endTime: end,
    duration,
  };
}

// ============================================================
// Create normal landscape clip
// ============================================================

export async function createClip(
  inputPath: string,
  outputPath: string,
  startTime: number,
  endTime: number,
): Promise<string> {
  if (!fs.existsSync(inputPath)) {
    throw new Error(
      `Input video not found: ${inputPath}`,
    );
  }

  ensureDirectory(path.dirname(outputPath));

  const normalized =
    await normalizeClipTimes(inputPath, startTime, endTime);

  const start = normalized.startTime;
  const end = normalized.endTime;
  const duration = normalized.duration;

  console.log(
    `🎬 Creating clip: ${start}s -> ${end}s (${duration.toFixed(2)}s)`,
  );

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(start)
      .duration(duration)
      .videoCodec("libx264")
      .audioCodec("aac")
      .audioBitrate("128k")
      .outputOptions([
        "-preset veryfast",
        "-crf 23",
        "-movflags +faststart",
        "-avoid_negative_ts",
        "make_zero",
      ])
      .output(outputPath)
      .on("start", (commandLine) => {
        console.log("FFmpeg clip command:");
        console.log(commandLine);
      })
      .on("progress", (progress) => {
        if (
          progress.percent !== undefined &&
          Number.isFinite(progress.percent)
        ) {
          console.log(
            `Clip progress: ${progress.percent.toFixed(1)}%`,
          );
        }
      })
      .on("end", async () => {
        try {
          if (!fs.existsSync(outputPath)) {
            reject(
              new Error(
                "FFmpeg finished but output clip was not created.",
              ),
            );
            return;
          }

          const actualDuration =
            await getVideoDuration(outputPath);

          console.log(
            `📏 Expected duration: ${duration.toFixed(2)}s`,
          );

          console.log(
            `📏 Actual duration: ${actualDuration.toFixed(2)}s`,
          );

          resolve(outputPath);
        } catch (error) {
          reject(error);
        }
      })
      .on("error", (err: Error) => {
        console.error(
          "❌ FFmpeg clip error:",
          err.message,
        );

        reject(err);
      })
      .run();
  });
}

// ============================================================
// Create vertical 9:16 clip
// ============================================================

export async function createVerticalClip(
  inputPath: string,
  outputPath: string,
  startTime: number,
  endTime: number,
): Promise<string> {
  if (!fs.existsSync(inputPath)) {
    throw new Error(
      `Input video not found: ${inputPath}`,
    );
  }

  ensureDirectory(path.dirname(outputPath));

  const normalized =
    await normalizeClipTimes(inputPath, startTime, endTime);

  const start = normalized.startTime;
  const end = normalized.endTime;
  const duration = normalized.duration;

  console.log(
    `📱 Creating vertical clip: ${start}s -> ${end}s (${duration.toFixed(2)}s)`,
  );

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .setStartTime(start)
      .duration(duration)
      .videoCodec("libx264")
      .audioCodec("aac")
      .audioBitrate("128k")
      .videoFilters([
        "scale=1080:1920:force_original_aspect_ratio=increase",
        "crop=1080:1920",
      ])
      .outputOptions([
        "-preset veryfast",
        "-crf 23",
        "-movflags +faststart",
        "-avoid_negative_ts",
        "make_zero",
      ])
      .output(outputPath)
      .on("start", (commandLine) => {
        console.log(
          "FFmpeg vertical clip command:",
        );
        console.log(commandLine);
      })
      .on("progress", (progress) => {
        if (
          progress.percent !== undefined &&
          Number.isFinite(progress.percent)
        ) {
          console.log(
            `Vertical clip progress: ${progress.percent.toFixed(1)}%`,
          );
        }
      })
      .on("end", async () => {
        try {
          if (!fs.existsSync(outputPath)) {
            reject(
              new Error(
                "FFmpeg finished but vertical output was not created.",
              ),
            );
            return;
          }

          const actualDuration =
            await getVideoDuration(outputPath);

          console.log(
            `📏 Expected duration: ${duration.toFixed(2)}s`,
          );

          console.log(
            `📏 Actual duration: ${actualDuration.toFixed(2)}s`,
          );

          resolve(outputPath);
        } catch (error) {
          reject(error);
        }
      })
      .on("error", (err: Error) => {
        console.error(
          "❌ FFmpeg vertical clip error:",
          err.message,
        );

        reject(err);
      })
      .run();
  });
}

// ============================================================
// Create thumbnail
// ============================================================

export async function createVideoThumbnail(
  inputPath: string,
  outputPath: string,
  time: number = 1,
): Promise<string> {
  if (!fs.existsSync(inputPath)) {
    throw new Error(
      `Input video not found: ${inputPath}`,
    );
  }

  ensureDirectory(path.dirname(outputPath));

  const videoDuration =
    await getVideoDuration(inputPath);

  const safeTime = Math.min(
    Math.max(0, Number(time) || 0),
    Math.max(0, videoDuration - 0.1),
  );

  console.log(
    `Creating thumbnail at ${safeTime.toFixed(2)}s`,
  );

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({
        timestamps: [safeTime],
        filename: path.basename(outputPath),
        folder: path.dirname(outputPath),
        size: "1280x?", // FFmpeg auto-adjusts height to preserve aspect ratio
      })
      .on("end", () => {
        if (!fs.existsSync(outputPath)) {
          reject(
            new Error(
              "Thumbnail was not created.",
            ),
          );
          return;
        }

        console.log(
          `Thumbnail created: ${outputPath}`,
        );

        resolve(outputPath);
      })
      .on("error", (err: Error) => {
        console.error(
          "Thumbnail error:",
          err.message,
        );

        reject(err);
      });
  });
}

// ============================================================
// Project clip path
// ============================================================

export function getClipPath(
  projectId: string,
  clipIndex: number,
): string {
  const directory = path.join(
    "uploads",
    "clips",
    projectId,
  );

  ensureDirectory(directory);

  return path.join(
    directory,
    `clip-${clipIndex + 1}.mp4`,
  );
}

// ============================================================
// Project thumbnail path
// ============================================================

export function getProjectThumbnailPath(
  projectId: string,
): string {
  const directory = path.join(
    "uploads",
    "thumbnails",
    projectId,
  );

  ensureDirectory(directory);

  return path.join(
    directory,
    "thumbnail.jpg",
  );
}

// ============================================================
// Media project paths
// ============================================================

export function getProjectMediaDirectory(
  projectId: string,
): string {
  const directory = path.join("media", projectId);

  ensureDirectory(directory);

  return directory;
}

export function getProjectClipsDirectory(
  projectId: string,
): string {
  const directory = path.join(
    "media",
    projectId,
    "clips",
  );

  ensureDirectory(directory);

  return directory;
}

export function getProjectThumbnailDirectory(
  projectId: string,
): string {
  const directory = path.join(
    "media",
    projectId,
    "thumbnail",
  );

  ensureDirectory(directory);

  return directory;
}