const http = require("node:http");
const fs = require("node:fs/promises");
const path = require("node:path");

const { normalizeBrief, buildPromptBundle } = require("./lib/prompt-builder");
const { getCodexStatus, refinePromptBundle } = require("./lib/codex-refiner");

const PORT = Number(process.env.PORT || 3020);
const ROOT = __dirname;
const PUBLIC_DIR = path.join(ROOT, "public");

const CONTENT_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": CONTENT_TYPES[".json"],
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;

  for await (const chunk of req) {
    size += chunk.length;
    if (size > 2 * 1024 * 1024) {
      throw new Error("Request body is too large.");
    }
    chunks.push(chunk);
  }

  if (chunks.length === 0) {
    return {};
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function serveStatic(req, res) {
  const requestPath = req.url === "/" ? "/index.html" : req.url;
  const safePath = path.normalize(requestPath).replace(/^(\.\.[/\\])+/, "");
  const filePath = path.join(PUBLIC_DIR, safePath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  try {
    const file = await fs.readFile(filePath);
    const extension = path.extname(filePath).toLowerCase();
    res.writeHead(200, {
      "Content-Type": CONTENT_TYPES[extension] || "application/octet-stream",
      "Cache-Control": "no-store",
    });
    res.end(file);
  } catch (_error) {
    sendText(res, 404, "Not found");
  }
}

async function handleBuild(req, res) {
  try {
    const rawBrief = await readJsonBody(req);
    const brief = normalizeBrief(rawBrief);
    const bundle = buildPromptBundle(brief);
    sendJson(res, 200, bundle);
  } catch (error) {
    sendJson(res, 400, {
      ok: false,
      error: error.message || "Unable to build prompts.",
    });
  }
}

async function handleRefine(req, res) {
  try {
    const rawBrief = await readJsonBody(req);
    const brief = normalizeBrief(rawBrief);
    const bundle = buildPromptBundle(brief);
    const status = await getCodexStatus();

    if (!status.available || !status.loggedIn) {
      sendJson(res, 503, {
        ok: false,
        error: "Codex CLI is not ready. Log in with Codex first.",
        codex: status,
      });
      return;
    }

    const refined = await refinePromptBundle(bundle, brief);
    sendJson(res, 200, {
      ...bundle,
      refined,
      codex: status,
    });
  } catch (error) {
    sendJson(res, 500, {
      ok: false,
      error: error.message || "Unable to refine prompts with Codex.",
    });
  }
}

async function handleHealth(_req, res) {
  try {
    const codex = await getCodexStatus();
    sendJson(res, 200, {
      ok: true,
      app: "ai-video-prompt-studio",
      codex,
    });
  } catch (error) {
    sendJson(res, 200, {
      ok: true,
      app: "ai-video-prompt-studio",
      codex: {
        available: false,
        loggedIn: false,
        message: error.message || "Unable to inspect Codex CLI.",
      },
    });
  }
}

const server = http.createServer(async (req, res) => {
  if (!req.url) {
    sendText(res, 400, "Bad request");
    return;
  }

  if (req.method === "GET" && req.url === "/api/health") {
    await handleHealth(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/build") {
    await handleBuild(req, res);
    return;
  }

  if (req.method === "POST" && req.url === "/api/refine") {
    await handleRefine(req, res);
    return;
  }

  if (req.method === "GET") {
    await serveStatic(req, res);
    return;
  }

  sendText(res, 405, "Method not allowed");
});

server.listen(PORT, () => {
  console.log(`AI Video Prompt Studio is running on http://localhost:${PORT}`);
});
