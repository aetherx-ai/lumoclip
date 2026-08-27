/*
  LumoClip PC Worker
  Run on your Windows PC.

  Requirements:
    npm install youtube-dl-exec

  Environment:
    LUMOCLIP_API_URL=https://lumo-clip.com
    LUMO_WORKER_TOKEN=YOUR_SECRET
    WORKER_POLL_MS=5000
    WORKER_MAX_HEIGHT=480
*/

const fs = require("node:fs");
const path = require("node:path");
const http = require("node:http");
const https = require("node:https");
const { URL } = require("node:url");
const youtubedl = require("youtube-dl-exec");

const API_URL = (
  process.env.LUMOCLIP_API_URL || "https://lumo-clip.com"
).replace(/\/$/, "");

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

if (!WORKER_TOKEN) {
  console.error(
    "ERROR: LUMO_WORKER_TOKEN is missing."
  );
  process.exit(1);
}

fs.mkdirSync(DOWNLOAD_DIR, {
  recursive: true,
});

function sleep(ms) {
  return new Promise((resolve) =>
    setTimeout(resolve, ms)
  );
}

async function apiJson(
  method,
  route,
  body
) {
  const url = new URL(route, API_URL);

  const response = await fetch(url, {
    method,

    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      "x-lumo-worker-token":
        WORKER_TOKEN,
    },

    body:
      body === undefined
        ? undefined
        : JSON.stringify(body),
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
    throw new Error(
      data?.error ||
        data?.message ||
        `HTTP ${response.status}`
    );
  }

  return data;
}

function uploadFile(
  route,
  filePath
) {
  return new Promise(
    (resolve, reject) => {
      const url = new URL(
        route,
        API_URL
      );

      const stat =
        fs.statSync(filePath);

      const boundary =
        "LUMOCLIP_BOUNDARY";

      const fileName =
        path
          .basename(filePath)
          .replace(/"/g, "");

      const preamble =
        Buffer.from(
          `--${boundary}\r\n` +
          `Content-Disposition: form-data; name="video"; filename="${fileName}"\r\n` +
          `Content-Type: video/mp4\r\n\r\n`,
          "utf8"
        );

      const ending =
        Buffer.from(
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

        Accept:
          "application/json",
      };

      const client =
        url.protocol === "https:"
          ? https
          : http;

      const req =
        client.request(
          url,
          {
            method: "POST",
            headers,
          },
          (res) => {
            let text = "";

            res.setEncoding(
              "utf8"
            );

            res.on(
              "data",
              (chunk) => {
                text += chunk;
              }
            );

            res.on(
              "end",
              () => {
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
                  resolve(data);
                } else {
                  reject(
                    new Error(
                      data?.error ||
                        `Upload failed: HTTP ${res.statusCode}`
                    )
                  );
                }
              }
            );
          }
        );

      req.on(
        "error",
        reject
      );

      req.write(preamble);

      const stream =
        fs.createReadStream(
          filePath
        );

      stream.on(
        "error",
        reject
      );

      stream.on(
        "end",
        () => {
          req.end(ending);
        }
      );

      stream.pipe(req, {
        end: false,
      });
    }
  );
}

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
    youtubedl.create(
      bundled
    );

  const format =
    `bv*[height<=${MAX_HEIGHT}][ext=mp4]+ba[ext=m4a]` +
    `/b[height<=${MAX_HEIGHT}][ext=mp4]` +
    `/b[height<=${MAX_HEIGHT}]` +
    `/b`;

  const options = {
    output: outputPath,

    format,

    noPlaylist: true,

    forceOverwrites: true,

    noPart: true,

    noContinue: true,

    mergeOutputFormat: "mp4",

    ...(process.env.FFMPEG_PATH
      ? {
          ffmpegLocation:
            process.env.FFMPEG_PATH,
        }
      : {}),

    retries: 3,

    fragmentRetries: 5,

    extractorRetries: 3,

    socketTimeout: 45,

    forceIpv4: true,

    concurrentFragments: 2,

    restrictFilenames: true,
  };

  console.log(
    `[worker] Downloading: ${sourceUrl}`
  );

  await yt(
    sourceUrl,
    options
  );

  if (
    !fs.existsSync(outputPath)
  ) {
    throw new Error(
      "yt-dlp finished but no output file was created."
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
    `[worker] Download complete: ${(stat.size / 1024 / 1024).toFixed(2)} MB`
  );
}

async function handleJob(job) {
  const projectId =
    job.id;

  const sourceUrl =
    String(
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
    if (
      fs.existsSync(outputPath)
    ) {
      fs.unlinkSync(
        outputPath
      );
    }

    await downloadVideo(
      sourceUrl,
      outputPath
    );

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
      `[worker] Project ${projectId} sent to Render.`
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : String(error);

    console.error(
      `[worker] Job ${projectId} failed:`,
      message
    );

    try {
      await apiJson(
        "POST",
        `/api/worker/projects/${encodeURIComponent(
          projectId
        )}/fail`,
        {
          error:
            message.slice(
              0,
              1000
            ),
        }
      );
    } catch (
      failError
    ) {
      console.error(
        "[worker] Failed to report failure:",
        failError
      );
    }
  } finally {
    try {
      if (
        fs.existsSync(
          outputPath
        )
      ) {
        fs.unlinkSync(
          outputPath
        );
      }
    } catch {}
  }
}

async function main() {
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
    "========================================"
  );

  while (true) {
    try {
      const result =
        await apiJson(
          "POST",
          "/api/worker/claim"
        );

      if (
        result?.job
      ) {
        await handleJob(
          result.job
        );
      }
    } catch (error) {
      console.error(
        "[worker] Poll error:",
        error instanceof Error
          ? error.message
          : error
      );
    }

    await sleep(
      POLL_MS
    );
  }
}

main().catch(
  (error) => {
    console.error(
      "[worker] Fatal error:",
      error
    );

    process.exit(1);
  }
);