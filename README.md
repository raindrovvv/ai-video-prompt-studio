# AI Video Prompt Studio

로컬에서 실행하는 AI 비디오 프롬프트 제작기입니다. 기본은 규칙 기반 초안 생성이고, 선택적으로 `codex exec`를 호출해 프롬프트를 더 매끈하게 다듬을 수 있습니다.

## 핵심 포인트

- `image-to-video`와 `text-to-video`를 다르게 다룹니다.
- Kling, Runway, Veo용 초안을 각각 따로 보여줍니다.
- OpenAI API를 직접 호출하지 않습니다.
- Codex CLI가 ChatGPT 로그인 상태라면, 그 구독을 그대로 활용해 보정할 수 있습니다.
- Antigravity IDE는 현재 이 프로젝트에서 직접 임베딩하지 않습니다. 안정적인 공개 인터페이스가 확인되지 않으면 수동 복사/붙여넣기 방식이 안전합니다.

## 실행 방법

```bash
cd C:\Users\CHA\Desktop\ai-video-prompt-studio
node server.js
```

브라우저에서 `http://localhost:3020`으로 접속하면 됩니다.

프로젝트 전용으로 실행하려면 아래 PowerShell 스크립트를 쓰는 편이 더 안전합니다.

```powershell
cd C:\Users\CHA\Desktop\ai-video-prompt-studio
.\start.ps1
```

## Codex 보정이 되는 조건

- `codex` CLI가 설치되어 있어야 합니다.
- `codex login status`가 로그인 상태를 보여줘야 합니다.
- 앱은 내부적으로 `codex exec --output-schema ... --output-last-message ...`를 사용합니다.
- `codex`를 찾지 못하면 `CODEX_BIN` 환경변수에 `codex.exe` 또는 `codex.cmd` 절대 경로를 넣어 강제로 지정할 수 있습니다.
- 전역 사용자 환경변수 대신 프로젝트의 `start.ps1`가 현재 터미널 세션에만 `CODEX_BIN`을 넣도록 구성했습니다.
- 일부 샌드박스형 에이전트 환경에서는 Node의 하위 프로세스 실행이 막힐 수 있습니다. 그 경우 일반 Windows PowerShell 또는 터미널에서 앱을 실행하면 됩니다.

## 구조

- `server.js`: 정적 파일 제공 + JSON API
- `lib/prompt-builder.js`: 로컬 규칙 기반 프롬프트 생성
- `lib/codex-refiner.js`: Codex CLI 브리지
- `public/`: 프런트엔드

## 다음 확장 후보

- Codex `app-server` 기반의 실시간 스트리밍 보정
- 프롬프트 버전 저장
- 레퍼런스 이미지 업로드 지원
- Antigravity 쪽 공개 CLI 또는 프로토콜이 확인되면 별도 브리지 추가
