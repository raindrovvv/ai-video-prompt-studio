function clean(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

function clampNumber(value, fallback, min, max) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, numeric));
}

function sentence(text) {
  const value = clean(text);
  if (!value) {
    return "";
  }
  return /[.!?]$/.test(value) ? value : `${value}.`;
}

function labeled(label, value) {
  const text = clean(value);
  if (!text) {
    return "";
  }
  return `${label}: ${text}.`;
}

function joinPhrase(parts, separator = ", ") {
  return parts.map(clean).filter(Boolean).join(separator);
}

function uniqueList(items) {
  return [...new Set(items.map(clean).filter(Boolean))];
}

function formatCamera(brief) {
  const parts = [];
  const shot = clean(brief.shotSize);
  const angle = clean(brief.cameraAngle);
  const movement = clean(brief.cameraMovement);
  const lens = clean(brief.lens);

  if (shot) {
    parts.push(shot);
  }
  if (angle) {
    parts.push(angle);
  }
  if (movement) {
    parts.push(movement);
  }
  if (lens && brief.generationMode === "text-to-video") {
    parts.push(`${lens} lens`);
  }

  return parts.join(", ");
}

function summarizeStrategy(brief) {
  if (brief.generationMode === "image-to-video") {
    return {
      label: "motion-first",
      summary:
        "Image-to-video mode keeps composition and lighting lightweight and pushes motion, camera language, pacing, and subject consistency to the front.",
    };
  }

  return {
    label: "scene-first",
    summary:
      "Text-to-video mode expands the environment more fully, then layers camera, lighting, style, and detail on top.",
    };
}

function buildLead(brief) {
  if (brief.generationMode === "image-to-video") {
    return sentence(joinPhrase([brief.subject, brief.currentVisualState], ", "));
  }

  const subjectPart = clean(brief.subject);
  const locationPart = clean(brief.location)
    ? `${subjectPart ? `${subjectPart} in ` : ""}${clean(brief.location)}`
    : subjectPart;
  return sentence(joinPhrase([locationPart, brief.currentVisualState], ", "));
}

function buildUniversalPrompt(brief) {
  const parts = [
    buildLead(brief),
    sentence(brief.primaryMotion),
    sentence(brief.secondaryMotion),
    labeled("Camera", formatCamera(brief)),
  ];

  if (brief.generationMode === "text-to-video") {
    parts.push(labeled("Lighting", brief.lighting));
    parts.push(labeled("Look", brief.look));
  } else {
    parts.push(labeled("Timing", brief.pace));
    parts.push(labeled("Look", brief.look));
  }

  parts.push(labeled("Focus", brief.focusPoints));
  parts.push(labeled("Keep", brief.consistency));
  parts.push(labeled("Avoid", brief.negativePrompt));

  return parts.filter(Boolean).join(" ");
}

function buildKlingPrompt(brief) {
  const parts = [
    buildLead(brief),
    sentence(brief.primaryMotion),
    sentence(brief.secondaryMotion),
    labeled("Camera", joinPhrase([brief.cameraMovement, brief.shotSize, brief.cameraAngle], ", ")),
    labeled("Motion", brief.pace),
    labeled("Focus", brief.focusPoints),
    labeled("Keep", brief.consistency),
  ];

  if (brief.generationMode === "text-to-video") {
    parts.push(labeled("Lighting", brief.lighting));
  }

  return parts.filter(Boolean).join(" ");
}

function buildRunwayPrompt(brief) {
  const parts = [
    buildLead(brief),
    sentence(brief.primaryMotion),
    sentence(brief.secondaryMotion),
    labeled("Camera", formatCamera(brief)),
    labeled("Temporal progression", brief.pace),
    labeled("Focus", brief.focusPoints),
    labeled("Keep", brief.consistency),
    labeled("Avoid", brief.negativePrompt),
  ];

  if (brief.generationMode === "text-to-video") {
    parts.push(labeled("Lighting", brief.lighting));
    parts.push(labeled("Look", brief.look));
  }

  return parts.filter(Boolean).join(" ");
}

function buildVeoPrompt(brief) {
  const parts = [
    buildLead(brief),
    sentence(brief.primaryMotion),
    sentence(brief.secondaryMotion),
    labeled("Camera", formatCamera(brief)),
    labeled("Look", brief.look),
    labeled("Lighting", brief.lighting),
    labeled("Pacing", brief.pace),
    labeled("Focus", brief.focusPoints),
    labeled("Keep", brief.consistency),
  ];

  return parts.filter(Boolean).join(" ");
}

function buildWarnings(brief) {
  const warnings = [];

  if (!brief.subject) {
    warnings.push("Add a clear subject. All three video tools behave better when the subject is explicit.");
  }

  if (!brief.primaryMotion) {
    warnings.push("Add a primary motion or action. Motion is the strongest lever in image-to-video workflows.");
  }

  if (brief.generationMode === "image-to-video" && (brief.location || brief.lighting)) {
    warnings.push("Image-to-video usually needs less location and lighting repetition because the input image already anchors those choices.");
  }

  if (brief.focusPoints.split(",").filter(Boolean).length > 3) {
    warnings.push("Try keeping the focus list to one to three details so the model has a clearer priority stack.");
  }

  return warnings;
}

function buildChecklist(brief) {
  const items = [
    `Set duration in the video tool UI to ${brief.durationSeconds} seconds when possible instead of only mentioning it in text.`,
    "Keep the main motion natural and physically plausible.",
    "Use only one dominant camera move unless you intentionally want a more stylized shot.",
    "If the source is a still image, treat composition and existing lighting as anchors instead of re-describing them too aggressively.",
  ];

  if (brief.referenceImagePath) {
    items.push("Because a reference image path is provided, Codex refinement can optionally reason as an image-to-video brief if the file exists.");
  }

  return items;
}

function buildPlatformNotes(brief) {
  return {
    universal:
      brief.generationMode === "image-to-video"
        ? "Balanced prompt that leans motion-first without over-describing the static image."
        : "Balanced prompt that preserves full scene description for text-to-video generation.",
    kling:
      "Kling version compresses toward subject, movement, and camera language so the model gets to the shot behavior faster.",
    runway:
      "Runway version emphasizes motion, camera work, and temporal progression, which tend to matter most in image-to-video prompting.",
    veo:
      "Veo version keeps a slightly more cinematic sentence rhythm while staying explicit about the shot and performance beats.",
  };
}

function normalizeBrief(rawBrief = {}) {
  const platforms = Array.isArray(rawBrief.selectedPlatforms)
    ? rawBrief.selectedPlatforms
    : ["universal", "kling", "runway", "veo"];

  return {
    title: clean(rawBrief.title),
    sourceMaterial: clean(rawBrief.sourceMaterial),
    generationMode:
      clean(rawBrief.generationMode) === "text-to-video"
        ? "text-to-video"
        : "image-to-video",
    outputLanguage: clean(rawBrief.outputLanguage) || "english",
    subject: clean(rawBrief.subject),
    currentVisualState: clean(rawBrief.currentVisualState),
    location: clean(rawBrief.location),
    primaryMotion: clean(rawBrief.primaryMotion),
    secondaryMotion: clean(rawBrief.secondaryMotion),
    shotSize: clean(rawBrief.shotSize),
    cameraAngle: clean(rawBrief.cameraAngle),
    cameraMovement: clean(rawBrief.cameraMovement),
    lens: clean(rawBrief.lens),
    lighting: clean(rawBrief.lighting),
    look: clean(rawBrief.look),
    pace: clean(rawBrief.pace),
    focusPoints: clean(rawBrief.focusPoints),
    consistency: clean(rawBrief.consistency),
    negativePrompt: clean(rawBrief.negativePrompt),
    referenceImagePath: clean(rawBrief.referenceImagePath),
    durationSeconds: clampNumber(rawBrief.durationSeconds, 5, 3, 12),
    selectedPlatforms: uniqueList(platforms),
  };
}

function buildPromptBundle(brief) {
  const strategy = summarizeStrategy(brief);
  const prompts = {
    universal: buildUniversalPrompt(brief),
    kling: buildKlingPrompt(brief),
    runway: buildRunwayPrompt(brief),
    veo: buildVeoPrompt(brief),
  };

  return {
    ok: true,
    brief,
    strategy,
    prompts,
    platformNotes: buildPlatformNotes(brief),
    checklist: buildChecklist(brief),
    warnings: buildWarnings(brief),
    metadata: {
      durationSeconds: brief.durationSeconds,
      generationMode: brief.generationMode,
      outputLanguage: brief.outputLanguage,
      selectedPlatforms: brief.selectedPlatforms,
    },
  };
}

module.exports = {
  normalizeBrief,
  buildPromptBundle,
};
