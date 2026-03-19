# AI Video Prompt Studio

로컬에서 실행하는 AI 비디오 프롬프트 제작기입니다.  
규칙 기반으로 Kling / Runway / Veo 프롬프트 초안을 빠르게 만들고, 필요할 때만 Codex CLI로 문장을 가볍게 보정합니다.

## What It Does

- `image-to-video`와 `text-to-video`를 다르게 다룹니다.
- Kling, Runway, Veo용 프롬프트를 각각 따로 생성합니다.
- `광고형 / 시네마틱 / SNS 숏폼` 프리셋을 제공합니다.
- OpenAI API를 직접 붙이지 않고, 로컬 Codex CLI를 선택적으로 사용합니다.
- Codex 보정은 이 프로젝트 안에서만 빠른 설정으로 돌도록 구성했습니다.

## Best For

- AI 영상 툴에 넣을 프롬프트를 더 체계적으로 쓰고 싶은 경우
- 이미지 기반 영상 프롬프트를 만들 때 motion / camera / pacing 중심으로 정리하고 싶은 경우
- API 과금 없이 이미 사용 중인 Codex / ChatGPT 로그인 기반 보정을 활용하고 싶은 경우

## Quick Start

```powershell
cd D:\Project\ai-video-prompt-studio
.\start.ps1
```

브라우저에서 `http://localhost:3020`으로 접속하면 됩니다.

## Recommended Workflow

1. 프리셋을 고릅니다.
2. 브리프를 채웁니다.
3. `로컬 초안 생성`으로 기본 프롬프트를 확인합니다.
4. 필요하면 `Codex로 보정`으로 더 매끈한 문장으로 다듬습니다.

## Presets

### 광고형

- 제품 / 푸드 / 브랜드 컷용
- 디테일 강조, 절제된 모션, 상업 광고 톤 중심

### 시네마틱

- 공기감, 무드, 감정 흐름을 조금 더 살린 영화적 톤
- 카메라 언어와 분위기 표현 비중이 더 큼

### SNS 숏폼

- 짧고 강한 훅, 빠른 전달력, 모바일 친화적 리듬 중심
- 즉시 읽히는 문장과 짧은 길이의 컷에 유리

## Codex Refinement

이 프로젝트는 Codex를 "항상 쓰는 구조"가 아니라 "필요할 때만 빠르게 보정하는 구조"로 설계했습니다.

- `codex exec` 호출에만 낮은 추론 설정을 적용합니다.
- 이 보정 호출에서만 불필요한 MCP 서버를 꺼서 시작 비용을 줄입니다.
- Codex에는 전체 컨텍스트 대신 축약된 브리프와 로컬 초안만 전달합니다.
- 전역 Codex 앱 설정을 수정하지 않습니다.

### Requirements

- `codex` CLI가 설치되어 있어야 합니다.
- `codex login status`가 로그인 상태를 보여줘야 합니다.
- Windows에서는 보통 `codex.cmd` 경로를 사용하는 편이 안정적입니다.

### Project-Only Launch

`start.ps1`는 현재 터미널 세션 안에서만 `CODEX_BIN`을 잡고 서버를 실행합니다.  
즉, 프로젝트 실행 편의를 위해 경로를 보정하지만, Codex 앱 자체 설정을 수정하지는 않습니다.

## Project Structure

- `server.js`  
  정적 파일 제공 + JSON API

- `start.ps1`  
  프로젝트 전용 실행 스크립트

- `lib/prompt-builder.js`  
  규칙 기반 프롬프트 생성 로직

- `lib/codex-refiner.js`  
  Codex CLI 브리지와 빠른 보정 설정

- `public/index.html`  
  메인 UI

- `public/app.js`  
  프리셋, 상태, 결과 렌더링 로직

- `public/styles.css`  
  UI 스타일

## Notes

- 레퍼런스 이미지 경로는 로컬 절대경로 기준입니다.
- 브라우저 `localStorage`에 최근 브리프가 저장됩니다.
- 일부 제한된 샌드박스 환경에서는 Node 하위 프로세스 실행이 막힐 수 있습니다. 그런 경우 일반 Windows PowerShell에서 실행하면 됩니다.

## Roadmap Ideas

- `빠른 보정 / 정밀 보정` 2단 모드
- `9:16 / 1:1 / 16:9` 비율 프리셋
- 프롬프트 버전 저장
- 레퍼런스 이미지 업로드 지원
- Codex `app-server` 기반의 더 실시간적인 보정 흐름
