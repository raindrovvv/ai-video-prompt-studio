const fs = require("node:fs/promises");
const path = require("node:path");
const os = require("node:os");
const { spawn } = require("node:child_process");
const { randomUUID } = require("node:crypto");

const SCHEMA_PATH = path.join(os.tmpdir(), "ai-video-prompt-studio-schema.json");
let cachedCodexExecutable;
const FAST_REFINER_OVERRIDES = [
  ["-c", 'model_reasoning_effort="low"'],
  ["-c", "mcp_servers.linear.enabled=false"],
  ["-c", "mcp_servers.omx_state.enabled=false"],
  ["-c", "mcp_servers.omx_memory.enabled=false"],
  ["-c", "mcp_servers.omx_code_intel.enabled=false"],
  ["-c", "mcp_servers.omx_trace.enabled=false"],
  ["-c", "mcp_servers.omx_team_run.enabled=false"],
];

const OUTPUT_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "universalPrompt",
    "klingPrompt",
    "runwayPrompt",
    "veoPrompt",
    "guidanceSummary",
    "notes",
    "handoffChecklist",
  ],
  properties: {
    universalPrompt: { type: "string" },
    klingPrompt: { type: "string" },
    runwayPrompt: { type: "string" },
    veoPrompt: { type: "string" },
    guidanceSummary: { type: "string" },
    notes: {
      type: "array",
      items: { type: "string" },
    },
    handoffChecklist: {
      type: "array",
      items: { type: "string" },
    },
  },
};

async function ensureSchemaFile() {
  await fs.writeFile(SCHEMA_PATH, JSON.stringify(OUTPUT_SCHEMA), "utf8");
  return SCHEMA_PATH;
}

async function pathExists(targetPath) {
  if (!targetPath) {
    return false;
  }

  try {
    await fs.access(targetPath);
    return true;
  } catch (_error) {
    return false;
  }
}

function normalizeCommandError(error, command) {
  if (error && error.code === "EPERM") {
    return new Error(
      `${command} could not start because this environment blocks child-process execution. Run the app from a normal local terminal instead of a restricted agent sandbox.`
    );
  }
  if (error && error.code === "ENOENT") {
    return new Error(
      `${command} was not found. Set CODEX_BIN to your codex executable or make sure codex.exe is on PATH.`
    );
  }
  return error;
}

function runCommand(command, args, { input, timeoutMs = 120000 } = {}) {
  return new Promise((resolve, reject) => {
    let child;

    try {
      child = spawn(command, args, {
        stdio: ["pipe", "pipe", "pipe"],
        windowsHide: true,
      });
    } catch (error) {
      reject(normalizeCommandError(error, command));
      return;
    }

    let stdout = "";
    let stderr = "";
    let settled = false;

    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      child.kill();
      reject(new Error(`${command} timed out after ${timeoutMs}ms.`));
    }, timeoutMs);

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (error) => {
      clearTimeout(timer);
      if (settled) {
        return;
      }
      settled = true;
      reject(normalizeCommandError(error, command));
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (settled) {
        return;
      }
      settled = true;
      if (code === 0) {
        resolve({ stdout, stderr, code });
        return;
      }
      reject(new Error(stderr.trim() || stdout.trim() || `${command} exited with code ${code}.`));
    });

    if (input) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });
}

function dedupe(items) {
  return [...new Set(items.filter(Boolean))];
}

function truncateText(value, maxLength = 600) {
  const text = String(value || "").trim();
  if (!text || text.length <= maxLength) {
    return text;
  }
  return `${text.slice(0, maxLength).trim()}...`;
}

async function findExecutableCandidates() {
  const candidates = [];

  if (process.env.CODEX_BIN) {
    candidates.push(process.env.CODEX_BIN);
  }

  if (process.platform === "win32") {
    const userProfile = process.env.USERPROFILE || "";
    candidates.push(path.join(userProfile, "AppData", "Roaming", "npm", "codex.cmd"));
    candidates.push(path.join(userProfile, "AppData", "Roaming", "npm", "codex.ps1"));

    try {
      const whereResult = await runCommand("where.exe", ["codex"], { timeoutMs: 5000 });
      candidates.push(...whereResult.stdout.split(/\r?\n/).map((line) => line.trim()));
    } catch (_error) {
      // Ignore lookup failures and fall back to explicit candidates.
    }
  } else {
    candidates.push("codex");
    try {
      const whichResult = await runCommand("which", ["codex"], { timeoutMs: 5000 });
      candidates.push(...whichResult.stdout.split(/\r?\n/).map((line) => line.trim()));
    } catch (_error) {
      // Ignore lookup failures and fall back to explicit candidates.
    }
  }

  return dedupe(candidates);
}

async function resolveCodexExecutable() {
  if (cachedCodexExecutable) {
    return cachedCodexExecutable;
  }

  const candidates = await findExecutableCandidates();

  for (const candidate of candidates) {
    if (candidate === "codex") {
      cachedCodexExecutable = candidate;
      return candidate;
    }

    if (await pathExists(candidate)) {
      cachedCodexExecutable = candidate;
      return candidate;
    }
  }

  throw new Error("Codex executable was not found. Set CODEX_BIN and try again.");
}

function buildCommandInvocation(commandPath, args) {
  if (commandPath.toLowerCase().endsWith(".cmd") || commandPath.toLowerCase().endsWith(".bat")) {
    const cmdExe = process.env.ComSpec || "cmd.exe";
    return {
      command: cmdExe,
      args: ["/d", "/s", "/c", commandPath, ...args],
    };
  }

  if (commandPath.toLowerCase().endsWith(".ps1")) {
    return {
      command: "powershell.exe",
      args: ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", commandPath, ...args],
    };
  }

  return {
    command: commandPath,
    args,
  };
}

async function runCodex(args, options) {
  const executable = await resolveCodexExecutable();
  const invocation = buildCommandInvocation(executable, args);
  return runCommand(invocation.command, invocation.args, options);
}

async function getCodexStatus() {
  if (process.env.PROMPT_STUDIO_DISABLE_CODEX === "1") {
    return {
      available: false,
      loggedIn: false,
      message: "Codex integration is disabled by environment flag.",
    };
  }

  try {
    const versionResult = await runCodex(["--version"], { timeoutMs: 10000 });
    let loggedIn = false;
    let message = "Codex CLI is installed, but login status is unknown.";

    try {
      const loginStatus = await runCodex(["login", "status"], { timeoutMs: 10000 });
      const combinedStatus = [loginStatus.stdout, loginStatus.stderr]
        .filter(Boolean)
        .join("\n")
        .trim();

      if (combinedStatus) {
        message = combinedStatus;
      }

      if (/logged in|using chatgpt|chatgpt/i.test(combinedStatus)) {
        loggedIn = true;
      } else if (/logged out|not logged in|no active login/i.test(combinedStatus)) {
        loggedIn = false;
      } else {
        // `codex login status` exited successfully, so keep refinement available
        // unless the output explicitly says the user is logged out.
        loggedIn = true;
      }
    } catch (error) {
      message = error.message || message;
    }

    return {
      available: true,
      loggedIn,
      version: versionResult.stdout.trim(),
      message,
    };
  } catch (error) {
    return {
      available: false,
      loggedIn: false,
      message:
        error.message || "Codex CLI is unavailable.",
    };
  }
}

async function refinePromptBundle(bundle, brief) {
  const schemaPath = await ensureSchemaFile();
  const outputPath = path.join(os.tmpdir(), `ai-video-prompt-studio-${randomUUID()}.json`);
  const imagePath = brief.referenceImagePath;
  const imageExists = imagePath ? await fs.access(imagePath).then(() => true).catch(() => false) : false;
  const compactBrief = {
    generationMode: brief.generationMode,
    outputLanguage: brief.outputLanguage,
    subject: brief.subject,
    currentVisualState: brief.currentVisualState,
    primaryMotion: brief.primaryMotion,
    secondaryMotion: brief.secondaryMotion,
    camera: {
      shotSize: brief.shotSize,
      cameraAngle: brief.cameraAngle,
      cameraMovement: brief.cameraMovement,
      lens: brief.generationMode === "text-to-video" ? brief.lens : "",
    },
    lighting: brief.generationMode === "text-to-video" ? brief.lighting : "",
    look: brief.look,
    pace: brief.pace,
    focusPoints: brief.focusPoints,
    consistency: brief.consistency,
    negativePrompt: brief.negativePrompt,
    durationSeconds: brief.durationSeconds,
    sourceMaterial: truncateText(brief.sourceMaterial, 400),
  };
  const localDrafts = {
    universal: bundle.prompts.universal,
    kling: bundle.prompts.kling,
    runway: bundle.prompts.runway,
    veo: bundle.prompts.veo,
  };

  const promptText = [
    "You are refining AI video prompts for speed-sensitive production use.",
    "Return JSON only.",
    "Keep outputs compact and stronger than the local drafts, not radically different.",
    "For image-to-video, prioritize motion, camera work, timing, focus, and consistency.",
    "For text-to-video, allow fuller scene language.",
    "Use the requested output language.",
    "",
    "Brief:",
    JSON.stringify(compactBrief),
    "",
    "Local drafts:",
    JSON.stringify(localDrafts),
    "",
    imageExists
      ? "Reference image is available."
      : "No attached reference image.",
  ].join("\n");

  const args = [
    "exec",
    "--skip-git-repo-check",
    "--ephemeral",
    "--output-schema",
    schemaPath,
    "--output-last-message",
    outputPath,
    ...FAST_REFINER_OVERRIDES.flat(),
  ];

  if (imageExists) {
    args.push("-i", imagePath);
  }

  args.push("-");

  try {
    await runCodex(args, {
      input: promptText,
      timeoutMs: 60000,
    });

    const raw = await fs.readFile(outputPath, "utf8");
    return {
      ok: true,
      imageAttached: imageExists,
      ...JSON.parse(raw),
    };
  } finally {
    await fs.rm(outputPath, { force: true }).catch(() => {});
  }
}

module.exports = {
  getCodexStatus,
  refinePromptBundle,
};
