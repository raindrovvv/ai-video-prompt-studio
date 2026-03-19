const form = document.querySelector("#brief-form");
const codexStatusText = document.querySelector("#codex-status-text");
const codexStatusDetail = document.querySelector("#codex-status-detail");
const strategySummary = document.querySelector("#strategy-summary");
const warningsList = document.querySelector("#warnings-list");
const checklistList = document.querySelector("#checklist-list");
const refinedNotes = document.querySelector("#refined-notes");
const refinedHandoff = document.querySelector("#refined-handoff");
const refinedSummary = document.querySelector("#refined-summary");
const loadExampleButton = document.querySelector("#load-example-button");
const copyBestPracticesButton = document.querySelector("#copy-best-practices-button");
const codexRefineButton = document.querySelector("#codex-refine-button");
const principlesGrid = document.querySelector("#principles-grid");
const presetRow = document.querySelector("#preset-row");
const presetDescription = document.querySelector("#preset-description");
const presetCurrentLabel = document.querySelector("#preset-current-label");

const PROMPT_FIELDS = ["universal", "kling", "runway", "veo"];
const REFINED_FIELDS = {
  universalPrompt: "#refined-universal-output",
  klingPrompt: "#refined-kling-output",
  runwayPrompt: "#refined-runway-output",
  veoPrompt: "#refined-veo-output",
};

const principles = [
  {
    title: "Image-to-Video",
    body: "기본 이미지가 이미 구도, 조명, 스타일을 상당 부분 결정합니다. 그래서 추가 텍스트는 무엇이 어떻게 움직이는지에 집중하는 편이 더 안정적입니다.",
  },
  {
    title: "Motion First",
    body: "주 피사체 동작과 보조 환경 움직임을 분리하면 광고 컷이 덜 뭉개지고, 모션의 우선순위가 모델에 더 선명하게 전달됩니다.",
  },
  {
    title: "Camera Language",
    body: "샷 크기, 앵글, 무빙을 명시하면 같은 액션이라도 결과 톤이 달라집니다. 보통 한 샷에 하나의 주요 카메라 무브가 가장 안정적입니다.",
  },
  {
    title: "Detail Budget",
    body: "강조 디테일은 1~3개 정도가 좋습니다. 너무 많으면 모델이 무엇을 우선할지 흐려질 수 있습니다.",
  },
];

const presetLibrary = {
  ad: {
    label: "광고형",
    description:
      "제품/푸드/브랜드 컷에 맞게 디테일 강조와 절제된 모션, 클린한 상업 톤을 우선합니다.",
    values: {
      generationMode: "image-to-video",
      shotSize: "medium close-up",
      cameraAngle: "eye level",
      cameraMovement: "slow dolly-in",
      lens: "50mm",
      pace: "clean, restrained, appetizing",
      look: "premium commercial, polished realism, clean premium finish",
      focusPoints: "hero detail, product texture, subtle performance beat",
      consistency: "identity stays consistent, motion stays restrained, hands stay stable",
      negativePrompt: "warped fingers, rubbery motion, overacting, unstable identity",
      durationSeconds: "5",
      sourceMaterial:
        "Optimize for commercial clarity, appetizing detail, restrained motion, and easy copy-paste prompts for major AI video tools.",
    },
  },
  cinematic: {
    label: "시네마틱",
    description:
      "분위기, 공기감, 카메라 문법, 감정 흐름을 조금 더 살려 영화적인 질감을 우선합니다.",
    values: {
      generationMode: "image-to-video",
      shotSize: "medium shot",
      cameraAngle: "slightly low angle",
      cameraMovement: "slow cinematic push-in",
      lens: "35mm",
      pace: "measured, atmospheric, emotionally restrained",
      look: "cinematic realism, rich contrast, atmospheric mood",
      focusPoints: "micro-expression, natural depth, environmental atmosphere",
      consistency: "movement stays realistic, framing stays coherent, subject identity stays locked",
      negativePrompt: "over-sharpened look, chaotic motion, floating limbs, melodramatic acting",
      durationSeconds: "6",
      sourceMaterial:
        "Lean slightly cinematic: camera mood, subtle emotional progression, atmospheric realism, and coherent motion over flashy effects.",
    },
  },
  shortform: {
    label: "SNS 숏폼",
    description:
      "짧고 강한 훅, 빠른 전달력, 모바일 친화적 리듬을 우선합니다. 과한 설명보다 즉시 읽히는 문장이 중요합니다.",
    values: {
      generationMode: "image-to-video",
      shotSize: "tight medium close-up",
      cameraAngle: "eye level",
      cameraMovement: "quick gentle push-in",
      lens: "35mm",
      pace: "snappy, punchy, scroll-stopping",
      look: "high-clarity social ad, crisp realism, mobile-first framing",
      focusPoints: "immediate hook, readable action, tactile detail",
      consistency: "action reads instantly, framing stays clear, subject remains stable",
      negativePrompt: "slow unreadable motion, muddy framing, distorted face, jitter",
      durationSeconds: "4",
      sourceMaterial:
        "Prioritize fast readability, strong opening frame, tactile detail, and short-form social pacing that works on mobile feeds.",
    },
  },
};

function renderPrinciples() {
  principlesGrid.innerHTML = principles
    .map(
      (item, index) => `
        <article class="principle-card" style="animation-delay:${index * 90}ms">
          <h3>${item.title}</h3>
          <p>${item.body}</p>
        </article>
      `
    )
    .join("");
}

function formToObject() {
  const formData = new FormData(form);
  return Object.fromEntries(formData.entries());
}

function saveDraft() {
  localStorage.setItem("ai-video-prompt-studio-brief", JSON.stringify(formToObject()));
}

function restoreDraft() {
  const raw = localStorage.getItem("ai-video-prompt-studio-brief");
  if (!raw) {
    applyPreset("ad", { mergeOnly: true });
    return;
  }

  try {
    const data = JSON.parse(raw);
    for (const [name, value] of Object.entries(data)) {
      const field = form.elements.namedItem(name);
      if (field) {
        field.value = value;
      }
    }
    applyPreset(data.presetName || "ad", { mergeOnly: true, preserveValues: true });
  } catch (_error) {
    localStorage.removeItem("ai-video-prompt-studio-brief");
    applyPreset("ad", { mergeOnly: true });
  }
}

function renderList(container, items, fallback) {
  const values = items && items.length ? items : [fallback];
  container.innerHTML = values.map((item) => `<li>${item}</li>`).join("");
}

function renderBundle(bundle) {
  strategySummary.textContent = bundle.strategy.summary;

  PROMPT_FIELDS.forEach((name) => {
    document.querySelector(`#${name}-output`).textContent = bundle.prompts[name] || "";
    document.querySelector(`#${name}-note`).textContent = bundle.platformNotes[name] || "";
  });

  renderList(warningsList, bundle.warnings, "현재 초안에는 큰 경고가 없습니다.");
  renderList(checklistList, bundle.checklist, "체크리스트가 없습니다.");
}

function renderRefined(refined) {
  refinedSummary.textContent = refined.guidanceSummary || "Codex refinement completed.";

  Object.entries(REFINED_FIELDS).forEach(([key, selector]) => {
    document.querySelector(selector).textContent = refined[key] || "No refined output.";
  });

  renderList(refinedNotes, refined.notes, "Codex refinement notes are empty.");
  renderList(refinedHandoff, refined.handoffChecklist, "No extra handoff checklist was returned.");
}

function resetRefinedSection(message) {
  refinedSummary.textContent = message;
  Object.values(REFINED_FIELDS).forEach((selector) => {
    document.querySelector(selector).textContent = "No Codex refinement yet.";
  });
  renderList(refinedNotes, [], "Codex refinement notes are empty.");
  renderList(refinedHandoff, [], "No extra handoff checklist was returned.");
}

async function postJson(url, payload) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const json = await response.json();
  if (!response.ok) {
    throw new Error(json.error || "Request failed.");
  }
  return json;
}

async function buildLocalPrompts() {
  saveDraft();
  const bundle = await postJson("/api/build", formToObject());
  renderBundle(bundle);
  return bundle;
}

async function checkCodexStatus() {
  try {
    const response = await fetch("/api/health");
    const json = await response.json();
    if (json.codex?.available && json.codex?.loggedIn) {
      codexStatusText.textContent = "Connected";
      codexStatusDetail.textContent = json.codex.message || "Codex CLI is ready.";
      return;
    }

    if (json.codex?.available) {
      codexStatusText.textContent = "CLI detected";
      codexStatusDetail.textContent = json.codex.message || "Log in with Codex to enable refinement.";
      return;
    }

    codexStatusText.textContent = "Unavailable";
    codexStatusDetail.textContent = json.codex?.message || "Codex CLI could not be detected.";
  } catch (error) {
    codexStatusText.textContent = "Unavailable";
    codexStatusDetail.textContent = error.message;
  }
}

async function refineWithCodex() {
  codexRefineButton.disabled = true;
  codexRefineButton.textContent = "Codex 보정 중...";
  refinedSummary.textContent = "빠른 보정 모드로 프롬프트를 정리하고 있습니다.";

  try {
    saveDraft();
    const response = await postJson("/api/refine", formToObject());
    renderBundle(response);
    renderRefined(response.refined);
    codexStatusText.textContent = "Connected";
    codexStatusDetail.textContent = response.codex.message || "Codex refinement completed.";
  } catch (error) {
    refinedSummary.textContent = error.message;
    Object.values(REFINED_FIELDS).forEach((selector) => {
      document.querySelector(selector).textContent = "Refinement failed.";
    });
    renderList(refinedNotes, [], "Codex refinement failed.");
    renderList(refinedHandoff, [], "Retry after checking Codex CLI output.");
  } finally {
    codexRefineButton.disabled = false;
    codexRefineButton.textContent = "Codex로 보정";
  }
}

function setFieldValue(name, value, { overwrite = true } = {}) {
  const field = form.elements.namedItem(name);
  if (!field) {
    return;
  }

  if (!overwrite && String(field.value || "").trim()) {
    return;
  }

  field.value = value;
}

function applyPreset(name, { mergeOnly = false, preserveValues = false } = {}) {
  const preset = presetLibrary[name] || presetLibrary.ad;
  const hiddenPresetField = form.elements.namedItem("presetName");
  if (hiddenPresetField) {
    hiddenPresetField.value = name;
  }

  Object.entries(preset.values).forEach(([fieldName, value]) => {
    const shouldPreserveExisting =
      (mergeOnly && fieldName === "sourceMaterial") ||
      (preserveValues && mergeOnly);

    setFieldValue(fieldName, value, { overwrite: !shouldPreserveExisting });
  });

  presetRow.querySelectorAll("[data-preset]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.preset === name);
  });

  presetDescription.textContent = preset.description;
  presetCurrentLabel.textContent = `현재 프리셋: ${preset.label}`;
}

function loadExample() {
  const example = {
    presetName: "ad",
    generationMode: "image-to-video",
    outputLanguage: "english",
    sourceMaterial:
      "Image-to-video should prioritize motion, camera work, pacing, and consistency. Avoid over-describing lighting or location when the still image already defines them.",
    subject: "young Korean woman holding fried chicken",
    currentVisualState: "in a cozy one-room apartment at night, medium close-up",
    primaryMotion: "She slightly raises the chicken, pauses, and reacts with anticipation",
    secondaryMotion: "A soft phone glow shifts across her cheek while a faint curl of steam drifts upward",
    location: "cozy one-room apartment at night",
    lighting: "warm tungsten practical light mixed with soft phone glow",
    shotSize: "medium close-up",
    cameraAngle: "eye level",
    cameraMovement: "slow dolly-in",
    lens: "50mm",
    pace: "gentle and appetizing",
    look: "premium Korean food commercial, realistic cinematic texture",
    focusPoints: "crispy texture, subtle hand movement, natural facial acting",
    consistency: "motion stays natural and restrained, identity stays consistent",
    negativePrompt: "rubbery motion, oversmiling, unstable fingers",
    durationSeconds: "5",
    referenceImagePath: "",
  };

  for (const [name, value] of Object.entries(example)) {
    const field = form.elements.namedItem(name);
    if (field) {
      field.value = value;
    }
  }

  applyPreset(example.presetName, { mergeOnly: true, preserveValues: true });
  resetRefinedSection("Codex refinement is optional. Use it when you want English polishing, tighter commercial phrasing, or better prompt compression.");
  saveDraft();
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
}

document.addEventListener("click", async (event) => {
  const copyButton = event.target.closest("[data-copy-target]");
  if (copyButton) {
    const target = document.querySelector(`#${copyButton.dataset.copyTarget}`);
    if (!target) {
      return;
    }

    await copyText(target.textContent.trim());
    copyButton.textContent = "복사됨";
    window.setTimeout(() => {
      copyButton.textContent = copyButton.dataset.copyTarget === "refined-summary" ? "요약 복사" : "복사";
    }, 1200);
    return;
  }

  const presetButton = event.target.closest("[data-preset]");
  if (presetButton) {
    applyPreset(presetButton.dataset.preset, { mergeOnly: true });
    saveDraft();
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await buildLocalPrompts();
});

form.addEventListener("input", saveDraft);
loadExampleButton.addEventListener("click", loadExample);
codexRefineButton.addEventListener("click", refineWithCodex);
copyBestPracticesButton.addEventListener("click", async () => {
  await copyText(
    [
      "Image-to-video: prioritize subject state, motion, camera work, pacing, and consistency.",
      "Text-to-video: describe scene, lighting, style, and shot language more fully.",
      "Keep focus details to 1-3 items.",
      "Set duration in tool parameters when possible.",
    ].join("\n")
  );
});

restoreDraft();
resetRefinedSection("Codex refinement is optional. Use it when you want English polishing, tighter commercial phrasing, or better prompt compression.");
renderPrinciples();
checkCodexStatus();
