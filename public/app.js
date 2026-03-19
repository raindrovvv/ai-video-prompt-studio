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
const viewTabs = [...document.querySelectorAll("[data-view-tab]")];
const viewPanels = [...document.querySelectorAll("[data-view-panel]")];
const codexProgressCard = document.querySelector("#codex-progress-card");
const codexProgressTitle = document.querySelector("#codex-progress-title");
const codexProgressText = document.querySelector("#codex-progress-text");
const codexProgressFill = document.querySelector("#codex-progress-fill");
const dialoguePanel = document.querySelector("#dialogue-panel");
const dialogueResults = document.querySelector("#dialogue-results");
const dialogueScriptPreview = document.querySelector("#dialogue-script-preview");
const veoDialogueNote = document.querySelector("#veo-dialogue-note");
const runwayDialogueNote = document.querySelector("#runway-dialogue-note");
const klingDialogueNote = document.querySelector("#kling-dialogue-note");
const dialogueBestPracticeNote = document.querySelector("#dialogue-best-practice-note");
const selectionHelperTargets = {
  shotSize: document.querySelector("#shotSize-helper"),
  cameraAngle: document.querySelector("#cameraAngle-helper"),
  cameraMovement: document.querySelector("#cameraMovement-helper"),
  lens: document.querySelector("#lens-helper"),
};

const PROMPT_FIELDS = ["universal", "kling", "runway", "veo"];
const REFINED_FIELDS = {
  universalPrompt: "#refined-universal-output",
  klingPrompt: "#refined-kling-output",
  runwayPrompt: "#refined-runway-output",
  veoPrompt: "#refined-veo-output",
};
let codexProgressTimer;

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

const selectionGuide = {
  shotSize: {
    "tight close-up": {
      reflectedAs: "피사체를 아주 가까이 붙여 디테일 위주로 보이게 합니다.",
      benefit: "감정 변화나 텍스처를 강하게 강조할 수 있습니다.",
      whenToUse: "뷰티, 음식 클로즈업, 표정 한 포인트를 확실히 잡고 싶을 때 좋습니다.",
    },
    "close-up": {
      reflectedAs: "얼굴이나 핵심 오브젝트가 프레임을 크게 차지하도록 반영됩니다.",
      benefit: "시선 분산이 적고 핵심 정보 전달이 빠릅니다.",
      whenToUse: "제품 디테일, 인물 리액션, 감정 전달이 중요할 때 추천합니다.",
    },
    "tight medium close-up": {
      reflectedAs: "얼굴과 손동작이 잘 읽히는 타이트한 상반신 샷으로 반영됩니다.",
      benefit: "표정과 제스처를 동시에 챙기기 좋습니다.",
      whenToUse: "SNS 숏폼, 푸드 리액션, 손동작이 중요한 컷에 잘 맞습니다.",
    },
    "medium close-up": {
      reflectedAs: "인물 또는 제품을 안정적으로 가까이 담는 표준 광고 샷으로 반영됩니다.",
      benefit: "디테일과 공간감을 균형 있게 가져갈 수 있습니다.",
      whenToUse: "광고형 기본값으로 가장 무난하고 실패 확률이 낮습니다.",
    },
    "medium shot": {
      reflectedAs: "상반신에서 허리 정도까지 보이는 더 넉넉한 프레이밍으로 반영됩니다.",
      benefit: "동작과 환경 맥락을 함께 보여주기 좋습니다.",
      whenToUse: "시네마틱 톤, 제스처가 큰 장면, 공간감을 살리고 싶을 때 좋습니다.",
    },
    "medium wide shot": {
      reflectedAs: "피사체와 주변 공간을 함께 읽히는 중간 거리 샷으로 반영됩니다.",
      benefit: "인물과 배경 관계를 같이 전달할 수 있습니다.",
      whenToUse: "장소감이나 동선이 중요한 컷에서 유리합니다.",
    },
    "wide shot": {
      reflectedAs: "피사체보다 장면 전체를 보여주는 넓은 샷으로 반영됩니다.",
      benefit: "배경 분위기와 스케일감을 살리기 좋습니다.",
      whenToUse: "오프닝 컷, 공간 소개, text-to-video에서 장면 구축이 필요할 때 적합합니다.",
    },
  },
  cameraAngle: {
    "eye level": {
      reflectedAs: "관찰자가 자연스럽게 바라보는 높이의 중립적 시점으로 들어갑니다.",
      benefit: "가장 안정적이고 위화감이 적습니다.",
      whenToUse: "광고, 인터뷰형, 일반적인 인물/제품 컷의 기본값으로 좋습니다.",
    },
    "slightly low angle": {
      reflectedAs: "조금 아래에서 올려다보는 시점으로 반영됩니다.",
      benefit: "피사체를 조금 더 존재감 있게 보이게 합니다.",
      whenToUse: "시네마틱 톤이나 주인공감을 조금 강화하고 싶을 때 좋습니다.",
    },
    "low angle": {
      reflectedAs: "아래에서 강하게 올려다보는 시점으로 반영됩니다.",
      benefit: "강한 인상과 힘 있는 이미지를 만들 수 있습니다.",
      whenToUse: "영웅적, 패션, 강한 브랜드 무드가 필요할 때 쓰면 좋습니다.",
    },
    "slightly high angle": {
      reflectedAs: "조금 위에서 내려다보는 시점으로 들어갑니다.",
      benefit: "상황을 더 부드럽고 가볍게 보이게 할 수 있습니다.",
      whenToUse: "귀여운 톤, 음식 상차림, 소품이 함께 보이는 장면에서 유리합니다.",
    },
    "high angle": {
      reflectedAs: "위에서 내려다보는 구도가 더 강하게 반영됩니다.",
      benefit: "배치와 구성, 테이블 위 오브젝트를 한눈에 보여주기 좋습니다.",
      whenToUse: "푸드, 제품 레이아웃, 장면 배치를 설명하고 싶을 때 좋습니다.",
    },
    "overhead/top-down": {
      reflectedAs: "정상부에서 수직에 가깝게 내려다보는 샷으로 반영됩니다.",
      benefit: "정리된 배치와 그래픽한 느낌을 만들기 쉽습니다.",
      whenToUse: "레시피, 언박싱, 테이블탑 제품 컷에 특히 잘 맞습니다.",
    },
  },
  cameraMovement: {
    "locked-off static": {
      reflectedAs: "카메라가 거의 움직이지 않는 고정 샷으로 반영됩니다.",
      benefit: "가장 안정적이고 피사체 움직임에 집중하기 좋습니다.",
      whenToUse: "모션 오류를 줄이고 싶거나 제품 디테일 자체를 강조할 때 좋습니다.",
    },
    "quick gentle push-in": {
      reflectedAs: "짧고 부드럽게 다가가는 무브로 반영됩니다.",
      benefit: "숏폼에서 훅을 빠르게 만들기 좋습니다.",
      whenToUse: "SNS 숏폼, 4초 안팎의 짧은 컷, 초반 집중이 중요할 때 추천합니다.",
    },
    "slow dolly-in": {
      reflectedAs: "천천히 앞으로 들어가는 전형적인 집중 무브로 반영됩니다.",
      benefit: "광고와 시네마틱 둘 다에서 안정적으로 먹힙니다.",
      whenToUse: "가장 범용적이라 기본값으로 쓰기 좋습니다.",
    },
    "slow dolly-out": {
      reflectedAs: "천천히 뒤로 빠지는 무브로 반영됩니다.",
      benefit: "여운이나 공간 확장을 표현하기 좋습니다.",
      whenToUse: "장면 마무리, 감정 잔상, 공간 공개 컷에서 유용합니다.",
    },
    "slow cinematic push-in": {
      reflectedAs: "조금 더 영화적인 리듬의 느린 접근 샷으로 들어갑니다.",
      benefit: "무드와 감정선을 자연스럽게 키울 수 있습니다.",
      whenToUse: "시네마틱 프리셋, 감정 축적, 분위기 강조 컷에 잘 맞습니다.",
    },
    "slow pan": {
      reflectedAs: "좌우로 천천히 훑는 카메라 움직임으로 반영됩니다.",
      benefit: "배경이나 공간 정보를 자연스럽게 보여줄 수 있습니다.",
      whenToUse: "장소 소개, 제품 라인업, 장면 분위기 설명에 좋습니다.",
    },
    "slow tilt up": {
      reflectedAs: "아래에서 위 또는 위에서 아래로 천천히 기울이는 무브로 반영됩니다.",
      benefit: "위계감이나 디테일 공개 순서를 만들기 쉽습니다.",
      whenToUse: "전신 공개, 제품 실루엣 드러내기, 건물/오브젝트 상승감을 줄 때 좋습니다.",
    },
    "handheld subtle drift": {
      reflectedAs: "미세한 핸드헬드 감성이 섞인 유기적 움직임으로 반영됩니다.",
      benefit: "너무 딱딱하지 않은 현장감과 생동감을 줍니다.",
      whenToUse: "다큐 느낌, 라이프스타일 컷, 자연스러운 현장 감성을 원할 때 적합합니다.",
    },
  },
  lens: {
    "24mm": {
      reflectedAs: "넓은 화각 느낌이 프롬프트에 보조 정보로 들어갑니다.",
      benefit: "공간감을 크게 느끼게 할 수 있습니다.",
      whenToUse: "장면 전체, 공간 소개, dynamic한 왜곡감이 조금 필요할 때 좋습니다.",
    },
    "35mm": {
      reflectedAs: "조금 넓고 자연스러운 시네마틱 화각으로 반영됩니다.",
      benefit: "공간과 피사체를 같이 살리기 좋습니다.",
      whenToUse: "시네마틱, 라이프스타일, 숏폼에서 범용성이 높습니다.",
    },
    "50mm": {
      reflectedAs: "가장 표준적인 인물/제품 화각 느낌으로 반영됩니다.",
      benefit: "왜곡이 적고 안정적으로 예쁘게 나옵니다.",
      whenToUse: "광고형 기본값으로 가장 무난합니다.",
    },
    "85mm": {
      reflectedAs: "더 압축된 인물 중심 화각 느낌으로 반영됩니다.",
      benefit: "배경 분리와 고급스러운 인물 클로즈업 무드가 잘 납니다.",
      whenToUse: "뷰티, 패션, 감정 클로즈업에 잘 맞습니다.",
    },
    "100mm macro": {
      reflectedAs: "초근접 디테일용 매크로 느낌이 보조 정보로 들어갑니다.",
      benefit: "재질, 표면, 텍스처를 극적으로 보여주기 좋습니다.",
      whenToUse: "음식 질감, 제품 표면, 디테일 컷에 유용합니다.",
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

function renderSelectionHelpers() {
  Object.entries(selectionHelperTargets).forEach(([fieldName, target]) => {
    if (!target) {
      return;
    }

    const field = form.elements.namedItem(fieldName);
    const selectedValue = String(field?.value || "").trim();
    const guide = selectionGuide[fieldName]?.[selectedValue];

    if (!guide) {
      target.innerHTML = "";
      return;
    }

    target.innerHTML = `
      <strong>프롬프트 반영:</strong> ${guide.reflectedAs}<br />
      <strong>좋은 점:</strong> ${guide.benefit}<br />
      <strong>추천 상황:</strong> ${guide.whenToUse}
    `;
  });
}

function updateDialogueVisibility() {
  const enabled = Boolean(form.elements.namedItem("dialogueEnabled")?.checked);
  dialoguePanel.classList.toggle("is-hidden", !enabled);
}

function renderDialogueHandling(bundle) {
  const dialogue = bundle.dialogue;
  const enabled = Boolean(dialogue?.enabled);
  dialogueResults.classList.toggle("is-hidden", !enabled);

  if (!enabled) {
    dialogueScriptPreview.textContent = "대사 토글을 켜면 여기에 스크립트가 표시됩니다.";
    veoDialogueNote.textContent = "";
    runwayDialogueNote.textContent = "";
    klingDialogueNote.textContent = "";
    dialogueBestPracticeNote.textContent = "";
    return;
  }

  dialogueScriptPreview.textContent = dialogue.script || "대사 스크립트가 비어 있습니다.";
  veoDialogueNote.textContent = dialogue.platformHandling.veo;
  runwayDialogueNote.textContent = dialogue.platformHandling.runway;
  klingDialogueNote.textContent = dialogue.platformHandling.kling;
  dialogueBestPracticeNote.textContent = dialogue.bestPractice;
}

function switchResultView(viewName) {
  viewTabs.forEach((button) => {
    const isActive = button.dataset.viewTab === viewName;
    button.classList.toggle("is-active", isActive);
    button.setAttribute("aria-selected", String(isActive));
  });

  viewPanels.forEach((panel) => {
    panel.classList.toggle("is-hidden", panel.dataset.viewPanel !== viewName);
  });
}

function setCodexProgress(percent, title, text) {
  codexProgressCard.classList.remove("is-hidden");
  codexProgressFill.style.width = `${percent}%`;
  codexProgressTitle.textContent = title;
  codexProgressText.textContent = text;
}

function startCodexProgress() {
  const stages = [
    {
      limit: 22,
      title: "Codex가 브리프를 읽고 있습니다.",
      text: "입력한 장면 정보와 현재 로컬 초안을 빠르게 정리하는 중입니다.",
    },
    {
      limit: 48,
      title: "모션과 카메라 문법을 다듬는 중입니다.",
      text: "image-to-video 기준으로 움직임, 포커스, 일관성을 우선 정리하고 있습니다.",
    },
    {
      limit: 72,
      title: "플랫폼별 문장을 압축하고 있습니다.",
      text: "Kling / Runway / Veo에 맞게 문장 길이와 톤을 정리하는 단계입니다.",
    },
    {
      limit: 90,
      title: "최종 문장을 마무리하고 있습니다.",
      text: "결과 카드에 넣을 요약과 체크 포인트를 묶는 중입니다.",
    },
  ];

  let progress = 10;
  let stageIndex = 0;
  switchResultView("codex");
  setCodexProgress(progress, stages[0].title, stages[0].text);

  window.clearInterval(codexProgressTimer);
  codexProgressTimer = window.setInterval(() => {
    const currentStage = stages[stageIndex];
    progress = Math.min(currentStage.limit, progress + (progress < 40 ? 7 : 4));
    setCodexProgress(progress, currentStage.title, currentStage.text);

    if (progress >= currentStage.limit && stageIndex < stages.length - 1) {
      stageIndex += 1;
      const nextStage = stages[stageIndex];
      setCodexProgress(progress, nextStage.title, nextStage.text);
    }
  }, 650);
}

function finishCodexProgress(success = true) {
  window.clearInterval(codexProgressTimer);
  codexProgressTimer = null;

  if (success) {
    setCodexProgress(
      100,
      "Codex 보정이 완료되었습니다.",
      "결과 카드에 플랫폼별 보정 프롬프트를 반영했습니다."
    );
    window.setTimeout(() => {
      codexProgressCard.classList.add("is-hidden");
    }, 1200);
    return;
  }

  setCodexProgress(
    100,
    "Codex 보정 중 문제가 발생했습니다.",
    "아래 오류 메시지를 확인한 뒤 다시 시도해 주세요."
  );
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
    updateDialogueVisibility();
    return;
  }

  try {
    const data = JSON.parse(raw);
    for (const [name, value] of Object.entries(data)) {
      const field = form.elements.namedItem(name);
      if (field) {
        if (field.type === "checkbox") {
          field.checked = value === true || value === "true" || value === "on";
        } else {
          field.value = value;
        }
      }
    }
    applyPreset(data.presetName || "ad", { mergeOnly: true, preserveValues: true });
    updateDialogueVisibility();
  } catch (_error) {
    localStorage.removeItem("ai-video-prompt-studio-brief");
    applyPreset("ad", { mergeOnly: true });
    updateDialogueVisibility();
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
  renderDialogueHandling(bundle);
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
  startCodexProgress();

  try {
    saveDraft();
    const response = await postJson("/api/refine", formToObject());
    renderBundle(response);
    renderRefined(response.refined);
    codexStatusText.textContent = "Connected";
    codexStatusDetail.textContent = response.codex.message || "Codex refinement completed.";
    switchResultView("codex");
    finishCodexProgress(true);
  } catch (error) {
    refinedSummary.textContent = error.message;
    Object.values(REFINED_FIELDS).forEach((selector) => {
      document.querySelector(selector).textContent = "Refinement failed.";
    });
    renderList(refinedNotes, [], "Codex refinement failed.");
    renderList(refinedHandoff, [], "Retry after checking Codex CLI output.");
    finishCodexProgress(false);
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
  renderSelectionHelpers();
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
    bgmRestricted: false,
    dialogueEnabled: false,
    dialogueLanguage: "korean",
    dialogueVoice: "dry AI voice, restrained delivery",
    dialogueScript: "",
  };

  for (const [name, value] of Object.entries(example)) {
    const field = form.elements.namedItem(name);
    if (field) {
      if (field.type === "checkbox") {
        field.checked = Boolean(value);
      } else {
        field.value = value;
      }
    }
  }

  applyPreset(example.presetName, { mergeOnly: true, preserveValues: true });
  updateDialogueVisibility();
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
    return;
  }

  const viewTab = event.target.closest("[data-view-tab]");
  if (viewTab) {
    switchResultView(viewTab.dataset.viewTab);
  }
});

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  await buildLocalPrompts();
});

form.addEventListener("input", () => {
  saveDraft();
  renderSelectionHelpers();
  updateDialogueVisibility();
});
form.addEventListener("change", renderSelectionHelpers);
form.addEventListener("change", updateDialogueVisibility);
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
renderSelectionHelpers();
updateDialogueVisibility();
switchResultView("local");
checkCodexStatus();
