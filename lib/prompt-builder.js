function clean(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanMultiline(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .join("\n");
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

  if (brief.dialogueEnabled && brief.dialogueScript) {
    parts.push(labeled("Dialogue intent", brief.dialogueVoice || "spoken dialogue is present"));
  }

  if (brief.bgmRestricted) {
    parts.push(sentence("Audio should avoid background music and keep only voice plus environmental sound effects if needed."));
  }

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

  if (brief.dialogueEnabled && brief.dialogueScript) {
    parts.push(sentence(`Native audio dialogue is present. Speaker delivery: ${brief.dialogueVoice || "natural spoken delivery"}`));
    parts.push(labeled("Dialogue", brief.dialogueScript.replace(/\n+/g, " | ")));
  }

  if (brief.bgmRestricted) {
    parts.push(sentence("No background music. Keep voice and environmental sound only."));
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

  if (brief.dialogueEnabled && brief.dialogueScript) {
    parts.push(sentence("Dialogue should be handled in Runway Lip Sync or audio workflow rather than packed into the main visual prompt."));
  }

  if (brief.bgmRestricted) {
    parts.push(sentence("Do not generate background music. Keep only dialogue and natural sound effects."));
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

  if (brief.dialogueEnabled && brief.dialogueScript) {
    parts.push(labeled("Audio", `${brief.dialogueLanguage || "spoken"} dialogue is required`));
    parts.push(labeled("Voice", brief.dialogueVoice));
    parts.push(sentence(`Dialogue: ${brief.dialogueScript.replace(/\n+/g, " ")}`));
  }

  if (brief.bgmRestricted) {
    parts.push(sentence("No background music. Voice and environmental sound only."));
  }

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

  if (brief.dialogueEnabled && brief.dialogueScript && brief.dialogueScript.length > 280) {
    warnings.push("Long dialogue often works better when split into multiple short clips instead of one generation.");
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

  if (brief.dialogueEnabled) {
    items.push("If dialogue is important, keep a single short exchange per shot instead of stuffing a full scene into one clip.");
  }

  if (brief.bgmRestricted) {
    items.push("If BGM is restricted, keep prompts explicit that only voice and environmental sound effects should remain.");
  }

  return items;
}

function buildDialogueHandling(brief) {
  if (!brief.dialogueEnabled) {
    return {
      enabled: false,
      script: "",
      bestPractice: "",
      platformHandling: {
        veo: "",
        runway: "",
        kling: "",
      },
    };
  }

  return {
    enabled: true,
    script: brief.dialogueScript,
    bestPractice:
      "대사는 한 컷에 한 비트 정도로 짧게 자르는 편이 안정적입니다. 길면 여러 컷으로 나누는 게 좋습니다.",
    platformHandling: {
      veo:
        "Veo는 오디오/대사를 프롬프트에 직접 넣는 쪽을 우선 반영합니다. 대사는 별도 문장으로 분리해서 쓰는 편이 좋습니다.",
      runway:
        "Runway는 메인 비주얼 프롬프트보다 Lip Sync 또는 오디오 워크플로로 대사를 넘기는 쪽이 더 안정적입니다. 여기서는 시각 프롬프트와 대사 스크립트를 분리해 안내합니다.",
      kling:
        "Kling Video 3 Omni는 native audio 방향을 전제로 대사를 직접 포함하도록 구성합니다. 화자 구분과 말투를 짧게 붙이는 편이 유리합니다.",
    },
  };
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
    bgmRestricted:
      rawBrief.bgmRestricted === true ||
      rawBrief.bgmRestricted === "true" ||
      rawBrief.bgmRestricted === "on",
    dialogueEnabled:
      rawBrief.dialogueEnabled === true ||
      rawBrief.dialogueEnabled === "true" ||
      rawBrief.dialogueEnabled === "on",
    dialogueLanguage: clean(rawBrief.dialogueLanguage) || "korean",
    dialogueVoice: clean(rawBrief.dialogueVoice),
    dialogueScript: cleanMultiline(rawBrief.dialogueScript),
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
    dialogue: buildDialogueHandling(brief),
    platformNotes: buildPlatformNotes(brief),
    checklist: buildChecklist(brief),
    warnings: buildWarnings(brief),
    metadata: {
      durationSeconds: brief.durationSeconds,
      generationMode: brief.generationMode,
      outputLanguage: brief.outputLanguage,
      bgmRestricted: brief.bgmRestricted,
      dialogueEnabled: brief.dialogueEnabled,
      selectedPlatforms: brief.selectedPlatforms,
    },
  };
}

module.exports = {
  normalizeBrief,
  buildPromptBundle,
};
