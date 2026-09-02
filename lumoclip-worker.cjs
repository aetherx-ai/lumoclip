/*
  ============================================================
  LumoClip PC Worker
  Windows PC Worker
  ============================================================

  Requirements:
    npm install youtube-dl-exec ffmpeg-static ffprobe-static

  Environment:

    LUMOCLIP_API_URL=https://lumo-clip.com
    LUMO_WORKER_TOKEN=YOUR_SECRET

    WORKER_POLL_MS=5000
    WORKER_MAX_HEIGHT=480

  Optional:

    FFMPEG_PATH=C:\path\to\ffmpeg.exe
    WORKER_DOWNLOAD_DIR=C:\path\to\downloads

  ============================================================
*/

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const https = require("node:https");
const { URL } = require("node:url");

const youtubedl = require("youtube-dl-exec");
const ffmpegStatic = require("ffmpeg-static");
const ffprobeStatic = require("ffprobe-static");

// ============================================================
// CONFIG
// ============================================================

const API_URL = (
  process.env.LUMOCLIP_API_URL || "https://lumo-clip.com"
).trim().replace(/\/+$/, "");

const WORKER_TOKEN = (
  process.env.LUMO_WORKER_TOKEN || ""
).trim();

const POLL_MS = Math.max(
  2000,
  Number(process.env.WORKER_POLL_MS || 5000)
);

const MAX_HEIGHT = Math.max(
  144,
  Math.min(
    1080,
    Number(process.env.WORKER_MAX_HEIGHT || 480)
  )
);

const DOWNLOAD_DIR = path.resolve(
  process.env.WORKER_DOWNLOAD_DIR ||
    "./lumoclip-worker-downloads"
);

// ============================================================
// NETWORK CONFIG
// ============================================================

const API_TIMEOUT_MS = 30000;
const UPLOAD_TIMEOUT_MS = 15 * 60 * 1000;

const API_RETRIES = 5;
const UPLOAD_RETRIES = 3;

const RETRY_BASE_MS = 2000;
const RETRY_MAX_MS = 15000;

// ============================================================
// FFMPEG PATH
// ============================================================

const FFMPEG_PATH =
  process.env.FFMPEG_PATH ||
  ffmpegStatic ||
  null;

const FFPROBE_PATH =
  ffprobeStatic?.path ||
  null;

// ============================================================
// VALIDATION
// ============================================================

function validateConfig() {
  console.log("");
  console.log("========================================");
  console.log("        LumoClip Worker Config");
  console.log("========================================");

  console.log(`API URL: ${API_URL}`);
  console.log(
    `Worker token: ${WORKER_TOKEN ? "configured" : "MISSING"}`
  );
  console.log(`Poll interval: ${POLL_MS}ms`);
  console.log(`Max height: ${MAX_HEIGHT}p`);
  console.log(`Download directory: ${DOWNLOAD_DIR}`);
  console.log(`FFmpeg: ${FFMPEG_PATH || "MISSING"}`);
  console.log(`FFprobe: ${FFPROBE_PATH || "not available"}`);

  console.log("========================================");
  console.log("");

  if (!WORKER_TOKEN) {
    console.error(
      "[worker] ERROR: LUMO_WORKER_TOKEN is missing."
    );

    process.exit(1);
  }

  if (!FFMPEG_PATH) {
    console.error(
      "[worker] ERROR: FFmpeg executable was not found."
    );

    console.error(
      "[worker] Install ffmpeg-static or set FFMPEG_PATH."
    );

    process.exit(1);
  }

  if (!fs.existsSync(FFMPEG_PATH)) {
    console.error(
      `[worker] ERROR: FFmpeg does not exist: ${FFMPEG_PATH}`
    );

    process.exit(1);
  }

  if (FFPROBE_PATH && !fs.existsSync(FFPROBE_PATH)) {
    console.warn(
      `[worker] WARNING: FFprobe path does not exist: ${FFPROBE_PATH}`
    );
  }

  try {
    const parsed = new URL(API_URL);

    if (
      parsed.protocol !== "http:" &&
      parsed.protocol !== "https:"
    ) {
      throw new Error(
        "LUMOCLIP_API_URL must use http:// or https://"
      );
    }
  } catch (error) {
    console.error(
      `[worker] ERROR: Invalid API URL: ${API_URL}`
    );

    console.error(
      `[worker] ${getErrorMessage(error)}`
    );

    process.exit(1);
  }

  fs.mkdirSync(DOWNLOAD_DIR, {
    recursive: true,
  });
}

// ============================================================
// HELPERS
// ============================================================

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function retryDelay(attempt) {
  return Math.min(
    RETRY_BASE_MS * Math.pow(2, attempt - 1),
    RETRY_MAX_MS
  );
}

function getErrorMessage(error) {
  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

function getDetailedNetworkError(error) {
  const message = getErrorMessage(error);

  const code =
    error?.code ||
    error?.cause?.code ||
    "";

  const causeMessage =
    error?.cause?.message ||
    "";

  const details = [];

  if (code) {
    details.push(`code=${code}`);
  }

  if (causeMessage && causeMessage !== message) {
    details.push(`cause=${causeMessage}`);
  }

  if (details.length > 0) {
    return `${message} (${details.join(", ")})`;
  }

  return message;
}

function isRetryableError(error) {
  const message = (
    getErrorMessage(error) +
    " " +
    (error?.code || "") +
    " " +
    (error?.cause?.code || "")
  ).toLowerCase();

  const patterns = [
    "fetch failed",
    "network",
    "socket",
    "econnreset",
    "econnrefused",
    "etimedout",
    "timeout",
    "aborted",
    "enotfound",
    "eai_again",
    "ehostunreach",
    "enetunreach",
    "epipe",
    "502",
    "503",
    "504",
    "429",
  ];

  return patterns.some((pattern) =>
    message.includes(pattern)
  );
}

// ============================================================
// API URL HELPERS
// ============================================================

function makeApiUrl(route) {
  try {
    return new URL(route, API_URL);
  } catch (error) {
    throw new Error(
      `Invalid API route "${route}" against "${API_URL}": ${getErrorMessage(
        error
      )}`
    );
  }
}

// ============================================================
// API JSON REQUEST
// ============================================================

async function apiJson(
  method,
  route,
  body,
  options = {}
) {
  const {
    retries = API_RETRIES,
    timeoutMs = API_TIMEOUT_MS,
  } = options;

  const url = makeApiUrl(route);

  let lastError;

  for (
    let attempt = 1;
    attempt <= retries;
    attempt++
  ) {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
    }, timeoutMs);

    try {
      console.log(
        `[worker] API ${method} ${url.href} (attempt ${attempt}/${retries})`
      );

      const response = await fetch(url, {
        method,

        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
          "User-Agent": "LumoClip-PC-Worker/1.0",
          "x-lumo-worker-token": WORKER_TOKEN,
        },

        body:
          body === undefined
            ? undefined
            : JSON.stringify(body),

        signal: controller.signal,
      });

      const text = await response.text();

      let data = null;

      try {
        data = text
          ? JSON.parse(text)
          : null;
      } catch {
        data = {
          error:
            text ||
            `HTTP ${response.status}`,
        };
      }

      if (!response.ok) {
        const error = new Error(
          data?.error ||
            data?.message ||
            `HTTP ${response.status}`
        );

        error.status = response.status;

        /*
          HTTP errors such as 401/403 should not be
          reported as "fetch failed".
        */

        throw error;
      }

      return data;
    } catch (error) {
      lastError = error;

      const message =
        getDetailedNetworkError(error);

      console.error(
        `[worker] API request failed: ${message}`
      );

      /*
        Helpful diagnostics for network errors.
      */

      if (
        error?.name === "AbortError"
      ) {
        console.error(
          `[worker] API request timed out after ${timeoutMs}ms.`
        );
      }

      if (
        error?.cause?.code === "ENOTFOUND"
      ) {
        console.error(
          `[worker] DNS lookup failed for ${url.hostname}.`
        );

        console.error(
          `[worker] Check your internet connection and API domain.`
        );
      }

      if (
        error?.cause?.code === "ECONNREFUSED"
      ) {
        console.error(
          `[worker] Connection refused by ${url.hostname}.`
        );

        console.error(
          `[worker] Check whether the Render service is running.`
        );
      }

      if (
        error?.cause?.code === "ETIMEDOUT"
      ) {
        console.error(
          `[worker] Connection timed out while reaching ${url.hostname}.`
        );
      }

      /*
        Don't retry authentication/configuration errors.
      */

      if (
        error?.status === 401 ||
        error?.status === 403 ||
        error?.status === 400
      ) {
        throw error;
      }

      if (
        attempt >= retries ||
        !isRetryableError(error)
      ) {
        throw error;
      }

      const delay = retryDelay(attempt);

      console.log(
        `[worker] Retrying in ${delay}ms...`
      );

      await sleep(delay);
    } finally {
      clearTimeout(timeout);
    }
  }

  throw lastError;
}

// ============================================================
// API CONNECTION TEST
// ============================================================

async function testApiConnection() {
  console.log("");
  console.log("========================================");
  console.log("        Testing LumoClip API");
  console.log("========================================");

  console.log(
    `[worker] API endpoint: ${API_URL}`
  );

  try {
    const result = await apiJson(
      "POST",
      "/api/worker/claim",
      undefined,
      {
        retries: 1,
        timeoutMs: 15000,
      }
    );

    console.log("");
    console.log(
      "[worker] API CONNECTION: OK"
    );

    if (result?.job) {
      console.log(
        `[worker] Existing job detected: ${result.job.id}`
      );
    } else {
      console.log(
        "[worker] No queued job currently."
      );
    }

    console.log(
      "========================================"
    );
    console.log("");

    return true;
  } catch (error) {
    console.error("");
    console.error(
      "========================================"
    );
    console.error(
      "[worker] API CONNECTION: FAILED"
    );
    console.error(
      "========================================"
    );

    console.error(
      `[worker] URL: ${API_URL}`
    );

    console.error(
      `[worker] Error: ${getDetailedNetworkError(error)}`
    );

    if (error?.status === 401) {
      console.error(
        "[worker] Server is reachable, but WORKER TOKEN is invalid."
      );
    } else if (error?.status === 503) {
      console.error(
        "[worker] Server is reachable, but LUMO_WORKER_TOKEN is not configured on Render."
      );
    } else if (error?.status) {
      console.error(
        `[worker] Server returned HTTP ${error.status}.`
      );
    } else {
      console.error(
        "[worker] The PC could not receive an HTTP response."
      );

      console.error(
        "[worker] Check DNS, internet, domain, Render service and firewall."
      );
    }

    console.error(
      "========================================"
    );
    console.error("");

    return false;
  }
}

// ============================================================
// UPLOAD
// ============================================================

function uploadFileOnce(
  route,
  filePath
) {
  return new Promise((resolve, reject) => {
    let url;

    try {
      url = makeApiUrl(route);
    } catch (error) {
      reject(error);
      return;
    }

    if (!fs.existsSync(filePath)) {
      reject(
        new Error(
          `Upload file does not exist: ${filePath}`
        )
      );

      return;
    }

    const stat = fs.statSync(filePath);

    const boundary =
      "----LumoClipWorkerBoundary" +
      Date.now().toString(16);

    const fileName = path
      .basename(filePath)
      .replace(/"/g, "");

    const preamble = Buffer.from(
      `--${boundary}\r\n` +
        `Content-Disposition: form-data; name="video"; filename="${fileName}"\r\n` +
        `Content-Type: video/mp4\r\n\r\n`,
      "utf8"
    );

    const ending = Buffer.from(
      `\r\n--${boundary}--\r\n`,
      "utf8"
    );

    const headers = {
      "Content-Type":
        `multipart/form-data; boundary=${boundary}`,

      "Content-Length":
        preamble.length +
        stat.size +
        ending.length,

      "x-lumo-worker-token":
        WORKER_TOKEN,

      Accept: "application/json",

      "User-Agent":
        "LumoClip-PC-Worker/1.0",
    };

    const client =
      url.protocol === "https:"
        ? https
        : http;

    let finished = false;

    const fail = (error) => {
      if (finished) return;

      finished = true;

      reject(error);
    };

    const succeed = (data) => {
      if (finished) return;

      finished = true;

      resolve(data);
    };

    const req = client.request(
      url,
      {
        method: "POST",
        headers,
        timeout: UPLOAD_TIMEOUT_MS,
      },

      (res) => {
        let text = "";

        res.setEncoding("utf8");

        res.on("data", (chunk) => {
          text += chunk;
        });

        res.on("end", () => {
          let data;

          try {
            data = text
              ? JSON.parse(text)
              : null;
          } catch {
            data = {
              error:
                text ||
                `HTTP ${res.statusCode}`,
            };
          }

          if (
            res.statusCode >= 200 &&
            res.statusCode < 300
          ) {
            succeed(data);
          } else {
            const error = new Error(
              data?.error ||
                `Upload failed: HTTP ${res.statusCode}`
            );

            error.status =
              res.statusCode;

            fail(error);
          }
        });
      }
    );

    req.on("timeout", () => {
      req.destroy(
        new Error(
          "Upload request timed out."
        )
      );
    });

    req.on("error", (error) => {
      fail(error);
    });

    req.write(preamble);

    const stream =
      fs.createReadStream(filePath);

    stream.on("error", (error) => {
      fail(error);
    });

    stream.on("end", () => {
      if (!finished) {
        req.end(ending);
      }
    });

    stream.pipe(req, {
      end: false,
    });
  });
}

async function uploadFile(
  route,
  filePath
) {
  let lastError;

  for (
    let attempt = 1;
    attempt <= UPLOAD_RETRIES;
    attempt++
  ) {
    try {
      console.log(
        `[worker] Upload attempt ${attempt}/${UPLOAD_RETRIES}`
      );

      return await uploadFileOnce(
        route,
        filePath
      );
    } catch (error) {
      lastError = error;

      const message =
        getDetailedNetworkError(error);

      console.error(
        `[worker] Upload failed: ${message}`
      );

      if (
        error?.status === 401 ||
        error?.status === 403 ||
        error?.status === 400
      ) {
        throw error;
      }

      if (
        attempt >= UPLOAD_RETRIES ||
        !isRetryableError(error)
      ) {
        throw error;
      }

      const delay =
        retryDelay(attempt);

      console.log(
        `[worker] Retrying upload in ${delay}ms...`
      );

      await sleep(delay);
    }
  }

  throw lastError;
}

// ============================================================
// DOWNLOAD PROGRESS
// ============================================================

function showDownloadProgress(line) {
  const text = String(line);

  const match = text.match(
    /\[download\]\s+(\d+(?:\.\d+)?)%.*?at\s+([^\s]+).*?ETA\s+([^\s]+)/i
  );

  if (match) {
    const percent = match[1];
    const speed = match[2];
    const eta = match[3];

    process.stdout.write(
      `\r[worker] Download ${percent}% | ${speed} | ETA ${eta}       `
    );

    return;
  }

  if (
    text.includes("[Merger]") ||
    text.includes("has already been downloaded") ||
    text.includes("[ExtractAudio]") ||
    text.includes("[ffmpeg]")
  ) {
    console.log(
      `\n[worker] ${text.trim()}`
    );
  }
}

// ============================================================
// DOWNLOAD VIDEO
// ============================================================

async function downloadVideo(
  sourceUrl,
  outputPath
) {
  const bundled =
    process.platform === "win32"
      ? path.join(
          process.cwd(),
          "node_modules",
          "youtube-dl-exec",
          "bin",
          "yt-dlp.exe"
        )
      : path.join(
          process.cwd(),
          "node_modules",
          "youtube-dl-exec",
          "bin",
          "yt-dlp"
        );

  if (!fs.existsSync(bundled)) {
    throw new Error(
      `yt-dlp executable not found: ${bundled}`
    );
  }

  const yt =
    youtubedl.create(bundled);

  const format =
    `best[height<=${MAX_HEIGHT}][ext=mp4]` +
    `/bv*[height<=${MAX_HEIGHT}][ext=mp4]+ba[ext=m4a]` +
    `/best[height<=${MAX_HEIGHT}]` +
    `/b[height<=${MAX_HEIGHT}][ext=mp4]` +
    `/b`;

  const options = {
    output: outputPath,

    format,

    noPlaylist: true,

    forceOverwrites: true,

    mergeOutputFormat: "mp4",

    retries: 5,

    fragmentRetries: 10,

    extractorRetries: 5,

    socketTimeout: 60,

    forceIpv4: true,

    concurrentFragments: 2,

    restrictFilenames: true,

    newline: true,

    progress: true,

    downloaderArgs: {
      http: [
        "timeout=60",
      ],
    },

    ffmpegLocation:
      FFMPEG_PATH,
  };

  console.log("");
  console.log(
    `[worker] Downloading: ${sourceUrl}`
  );

  console.log(
    `[worker] Target quality: <= ${MAX_HEIGHT}p`
  );

  console.log(
    `[worker] yt-dlp: ${bundled}`
  );

  console.log(
    `[worker] FFmpeg: ${FFMPEG_PATH}`
  );

  if (FFPROBE_PATH) {
    console.log(
      `[worker] FFprobe: ${FFPROBE_PATH}`
    );
  }

  console.log(
    `[worker] Download directory: ${DOWNLOAD_DIR}`
  );

  try {
    const subprocess = yt(
      sourceUrl,
      options
    );

    if (subprocess.stdout) {
      let buffer = "";

      subprocess.stdout.on(
        "data",
        (chunk) => {
          buffer += chunk.toString();

          const lines =
            buffer.split(/\r?\n/);

          buffer =
            lines.pop() || "";

          for (const line of lines) {
            if (line.trim()) {
              showDownloadProgress(line);
            }
          }
        }
      );
    }

    if (subprocess.stderr) {
      subprocess.stderr.on(
        "data",
        (chunk) => {
          const text =
            chunk.toString();

          const lines =
            text.split(/\r?\n/);

          for (const line of lines) {
            if (line.trim()) {
              showDownloadProgress(line);
            }
          }
        }
      );
    }

    await subprocess;

    console.log(
      "\n[worker] yt-dlp process completed."
    );
  } catch (error) {
    console.error(
      "\n[worker] yt-dlp download error:"
    );

    console.error(
      getErrorMessage(error)
    );

    throw error;
  }

  if (!fs.existsSync(outputPath)) {
    throw new Error(
      "yt-dlp finished but no final output file was created."
    );
  }

  const stat =
    fs.statSync(outputPath);

  if (
    !stat.isFile() ||
    stat.size < 100 * 1024
  ) {
    throw new Error(
      `Downloaded file is invalid or too small: ${stat.size} bytes`
    );
  }

  console.log(
    `[worker] Download complete: ${(stat.size / 1024 / 1024).toFixed(
      2
    )} MB`
  );
}

// ============================================================
// HANDLE JOB
// ============================================================

async function handleJob(job) {
  const projectId = job.id;

  const sourceUrl = String(
    job.source_url || ""
  ).trim();

  if (!sourceUrl) {
    throw new Error(
      "Worker job has no source URL."
    );
  }

  const outputPath =
    path.join(
      DOWNLOAD_DIR,
      `${projectId}.mp4`
    );

  try {
    // --------------------------------------------------------
    // REMOVE PREVIOUS FINAL FILE
    // --------------------------------------------------------

    if (fs.existsSync(outputPath)) {
      fs.unlinkSync(outputPath);
    }

    // --------------------------------------------------------
    // DOWNLOAD
    // --------------------------------------------------------

    await downloadVideo(
      sourceUrl,
      outputPath
    );

    // --------------------------------------------------------
    // UPLOAD
    // --------------------------------------------------------

    console.log(
      `[worker] Uploading project ${projectId}...`
    );

    await uploadFile(
      `/api/worker/projects/${encodeURIComponent(
        projectId
      )}/upload`,
      outputPath
    );

    console.log(
      `[worker] Project ${projectId} sent to Render successfully.`
    );
  } catch (error) {
    const message =
      getDetailedNetworkError(error);

    console.error(
      `[worker] Job ${projectId} failed: ${message}`
    );

    // --------------------------------------------------------
    // REPORT FAILURE
    // --------------------------------------------------------

    try {
      await apiJson(
        "POST",

        `/api/worker/projects/${encodeURIComponent(
          projectId
        )}/fail`,

        {
          error:
            message.slice(0, 1000),
        },

        {
          retries: 3,
          timeoutMs: 30000,
        }
      );

      console.log(
        `[worker] Failure reported for ${projectId}.`
      );
    } catch (failError) {
      console.error(
        "[worker] Failed to report failure:",
        getDetailedNetworkError(
          failError
        )
      );
    }
  } finally {
    // --------------------------------------------------------
    // CLEANUP
    // --------------------------------------------------------

    try {
      if (fs.existsSync(outputPath)) {
        fs.unlinkSync(outputPath);

        console.log(
          `[worker] Cleaned up ${outputPath}`
        );
      }

      const files =
        fs.readdirSync(
          DOWNLOAD_DIR
        );

      for (const file of files) {
        if (
          file.startsWith(
            `${projectId}.`
          )
        ) {
          const tempPath =
            path.join(
              DOWNLOAD_DIR,
              file
            );

          try {
            fs.unlinkSync(
              tempPath
            );

            console.log(
              `[worker] Cleaned temp file: ${file}`
            );
          } catch {
            // Ignore individual cleanup errors.
          }
        }
      }
    } catch (cleanupError) {
      console.error(
        "[worker] Cleanup failed:",
        getErrorMessage(
          cleanupError
        )
      );
    }
  }
}

// ============================================================
// MAIN LOOP
// ============================================================

async function main() {
  validateConfig();

  console.log("");
  console.log(
    "========================================"
  );

  console.log(
    "        LumoClip PC Worker"
  );

  console.log(
    "========================================"
  );

  console.log(
    `API: ${API_URL}`
  );

  console.log(
    `Max height: ${MAX_HEIGHT}p`
  );

  console.log(
    `Poll interval: ${POLL_MS}ms`
  );

  console.log(
    `API timeout: ${API_TIMEOUT_MS}ms`
  );

  console.log(
    `API retries: ${API_RETRIES}`
  );

  console.log(
    `Download directory: ${DOWNLOAD_DIR}`
  );

  console.log(
    `FFmpeg: ${FFMPEG_PATH}`
  );

  if (FFPROBE_PATH) {
    console.log(
      `FFprobe: ${FFPROBE_PATH}`
    );
  }

  console.log(
    "========================================"
  );

  // ==========================================================
  // STARTUP API TEST
  // ==========================================================

  const connected =
    await testApiConnection();

  if (!connected) {
    console.error(
      "[worker] Startup API test failed."
    );

    console.error(
      "[worker] Worker will continue retrying instead of exiting."
    );
  }

  // ==========================================================
  // POLLING LOOP
  // ==========================================================

  while (true) {
    try {
      const result =
        await apiJson(
          "POST",
          "/api/worker/claim"
        );

      if (result?.job) {
        console.log(
          `\n[worker] Job claimed: ${result.job.id}`
        );

        await handleJob(
          result.job
        );
      } else {
        console.log(
          `[worker] No job. Next poll in ${POLL_MS}ms...`
        );
      }
    } catch (error) {
      console.error(
        "[worker] Poll error:",
        getDetailedNetworkError(error)
      );

      if (error?.status === 401) {
        console.error(
          "[worker] ERROR: Worker token is invalid."
        );
      }

      if (error?.status === 503) {
        console.error(
          "[worker] ERROR: Worker token is not configured on the server."
        );
      }

      console.log(
        `[worker] Continuing. Next poll in ${POLL_MS}ms...`
      );
    }

    await sleep(POLL_MS);
  }
}

// ============================================================
// START
// ============================================================

main().catch((error) => {
  console.error(
    "[worker] Fatal error:",
    getDetailedNetworkError(error)
  );

  process.exit(1);
});