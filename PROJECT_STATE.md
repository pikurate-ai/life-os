# 🚀 Life-OS (인생 Super App) — Project State & Context Transfer Master

> **목적**: 이 문서는 AI 어시스턴트(Antigravity) 세션 및 계정 전환 시에도 컨텍스트 손실 없이 완벽하게 개발을 이어갈 수 있도록 프로젝트의 현황, 아키텍처, 데이터베이스 스키마, 향후 로드맵을 실시간으로 동기화하는 마스터 문서입니다.

---

## 📌 1. 프로젝트 기본 정보
- **프로젝트 명**: Life-OS (인생 Super App) — 1인 전용 개인 운영체제
- **위치**: `C:\Users\JU\life-os` (기존 `quote-memo`와 분리된 전용 독립 디렉토리)
- **최신 퍼블릭 배포 URL**: `https://temporary-spry-fjord-fgjy0jw.vercel.app` (아이폰 Safari 및 PC 어디서든 즉시 접속 및 1초 앱 다운로드 가능)
- **로컬 개발 서버**: `http://localhost:3000` (동일 Wi-Fi 접속: `http://192.168.0.2:3000`)
- **인증 및 클라우드 DB**: Firebase Google OAuth 팝업 로그인 + Cloud Firestore 8대 도메인 실시간 동기화 (`users_essential_info`, `users_general_memos`, `users_financial_logs`, `users_assets`, `users_encrypted_vault`, `users_workout_1rm`, `users_health_metrics`, `users_archived_diaries`, `users_life_photos`)

---

## 🛠️ 2. 기술 스택 & 1인 아이폰 최적화
- **Frontend / Framework**: Next.js 15.2.4 (App Router, Static Export `output: 'export'`), React 19, TypeScript
- **iOS Standalone PWA**:
  - `public/manifest.json` (`display: "standalone"`, 테마 컬러 `#090a0f`)
  - `public/icons/icon-192.svg`, `public/icons/icon-512.svg` 네이티브 앱 전용 아이콘
  - `appleWebApp` 메타태그 (`apple-touch-icon`, `statusBarStyle: "black-translucent"`)
  - iOS 전용 안전 영역(`pt-safe`, `pb-safe`) 및 Safari 텍스트 선택 버그 해결
  - `IosInstallGuideModal`: 사파리 공유 버튼 → [홈 화면에 추가] 1초 안내 탑재
- **Capacitor iOS 네이티브**:
  - `ios/App` 프로젝트 완비 (`Package.swift`, `@capacitor/local-notifications` 8.3.1)
  - `npx cap sync ios` 동기화 파이프라인
- **데이터 파이프라인 & 싱크 허브**:
  - `googleDriveSync.ts`: 구글 시트 라이브 CSV 페처 (사용자 2개 시트 프리셋 등록) & 닥스/슬라이드 텍스트 파서
  - `kakaoParser.ts`: 카카오톡 내보내기/복사 텍스트 분석기 (계좌, 주소, 금액, 연락처 지능형 추출)
  - `universalBackup.ts`: 7개 도메인 전체 로우 데이터 원클릭 JSON 백업 및 복원
- **보안/암호화**: Web Crypto API (AES-256-GCM Zero-Knowledge Client-Side Encryption)

---

## 🗺️ 3. 주요 모듈 및 기능 요약

### 1) 자유 일반 메모장 (`GeneralMemoManager.tsx`) — NEW!
- **직관적인 빠른 메모 작성**: 상단 빠른 작성 폼(제목, 내용, 태그/카테고리, 6가지 컬러 칩, 상단 고정 핀).
- **무조건 최상단(Index 0) 자동 점프**: 어떤 메모 카드든 터치/클릭하는 순간 맨 위(0번 인덱스)로 즉시 재정렬되어 자주 쓰는 메모가 항상 상단에 노출.
- **클릭 복사 & 관리**: 메모 카드 우상단 1클릭 복사 버튼(`title + content`), 인라인 편집, 삭제, 상단 고정(Pin) 토글.
- **카테고리 필터 & 검색**: 전체/중요/업무/아이디어/할일/일상 필터 및 실시간 텍스트 검색.
- **클라우드 & 로컬 동기화**: `localStorage` (`life_os_general_memos_v1`) 및 Cloud Firestore (`users_general_memos`) 실시간 백업.

### 2) 필수 정보 1초 복사 (`QuickCopyManager.tsx`)
- 대한민국 40대 남성 맞춤형 계좌, 사업자번호, 차량번호, 주소 원클릭 클립보드 복사.
- `[1초 필수 정보 복사]`와 `[자유 일반 메모]` 상단 서브탭으로 직관적 스위칭 지원.

### 3) 로우 데이터 통합 싱크 & 적재 센터 (`DataSyncHub.tsx`)
- 구글 시트 2개 프리셋 라이브 싱크, 구글 닥스/슬라이드 텍스트 파서.
- 카카오톡 내보내기 텍스트(계좌/주소/금액) 지능형 추출 및 적재.
- 전체 데이터 1클릭 JSON 원본 백업 및 복원.

### 4) 지독한 일기 & 스누즈 알람 (`RuthlessDiarySkeleton.tsx`, `ruthlessAlarm.ts`)
- 일기 작성할 때까지 5분 간격 무한 스누즈 알람 및 Web Audio API 신시사이저 차임벨.

### 5) 헬스 1RM & Apple HealthKit (`HealthHub.tsx`, `healthKitBridge.ts`)
- 3대 운동 Epley 공식 1RM 계산기, 체중/골격근/체지방/혈압 기록, HealthKit 일일 걸음/칼로리 실시간 연동.
