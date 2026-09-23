# 🚀 Life-OS (인생 Super App) — Project State & Context Transfer Master

> **목적**: 이 문서는 AI 어시스턴트(Antigravity) 세션 및 계정 전환 시에도 컨텍스트 손실 없이 완벽하게 개발을 이어갈 수 있도록 프로젝트의 현황, 아키텍처, 데이터베이스 스키마, 향후 로드맵을 실시간으로 동기화하는 마스터 문서입니다.

---

## 📌 1. 프로젝트 기본 정보
- **프로젝트 명**: Life-OS (인생 Super App)
- **위치**: `C:\Users\JU\life-os` (기존 `quote-memo`와 분리된 전용 독립 디렉토리)
- **퍼블릭 웹 배포 URL**: `https://temporary-rushing-lilac-ie4r2p2.vercel.app` (모바일/PC 어디서든 즉시 접속 가능)
- **로컬 개발 서버**: `http://localhost:3000` (동일 Wi-Fi 접속: `http://192.168.0.2:3000`)
- **인증 및 클라우드 DB**: Firebase Google OAuth 팝업 로그인 + Cloud Firestore 7대 도메인 실시간 동기화 (`users_essential_info`, `users_financial_logs`, `users_assets`, `users_encrypted_vault`, `users_workout_1rm`, `users_health_metrics`, `users_archived_diaries`, `users_life_photos`)

---

## 🛠️ 2. 기술 스택 (Tech Stack)
- **Frontend / Framework**: Next.js 15.2.4 (App Router, Static Export `output: 'export'`), React 19, TypeScript
- **Styling**: Tailwind CSS v4, Lucide React (아이콘)
- **Authentication & Cloud DB**: Firebase Auth (Google OAuth 팝업) + Cloud Firestore
- **Offline / Local Persistence**: 브라우저 `localStorage` 완벽 연동
- **Mobile Hybrid Engine**: Capacitor CLI 8.5.2 & Core & iOS (`@capacitor/ios`, `@capacitor/local-notifications`)
- **보안/암호화**: Web Crypto API (AES-256-GCM Zero-Knowledge Client-Side Encryption)
- **사운드/알람**: Web Audio API Synthesizer Chime Engine (무외부 파일 차임벨 생성)

---

## 🗺️ 3. 4단계 로드맵 및 현재 진행 상황 (Roadmap Progress)

| 단계 | 주요 범위 | 진행 상태 |
| :--- | :--- | :---: |
| **Phase 1: 프레임워크 구축 & 핵심 데일리 UI** | Next.js + Tailwind + Supabase/Firebase Auth 구축, `PROJECT_STATE.md` 수립, 필수 정보 1초 복사 UI, 지독한 일기/루틴 기본 스켈레톤 | **완료 (Completed)** |
| **Phase 2: 자산, 가계부 & 암호 매니저 고도화** | SMS/알림톡 0.1초 파서 + 예산 관리 + 카테고리 지출 비율, 순자산 대시보드(자산/부채 CRUD + 부채비율), Zero-Knowledge AES-256 암호 금고(랜덤 비밀번호 생성기 + Google/LastPass CSV 임포트), 전 도메인 구글 클라우드 DB 동기화 | **완료 (Completed)** |
| **Phase 3: 헬스, 1RM & 인생샷 갤러리** | 3대 운동 1RM Epley 공식 자동 계산 및 500kg 게이지, 체중/골격근량/체지방/혈압 신체 지표 카드, 과거 일기 대량 텍스트 파싱 & 타임라인 아카이브, 인생샷 사진 갤러리 & 클라우드 동기화 | **완료 (Completed)** |
| **Phase 4: iOS 앱 패키징 & Ruthless Alarm & HealthKit** | Capacitor iOS 패키징(`ios/` 프로젝트 및 `Package.swift`), 일기 쓸 때까지 울리는 5분 스누즈 Ruthless 알람 엔진(`ruthlessAlarm.ts`), Web Audio API 신시사이저 차임벨, Apple HealthKit 브릿지(`healthKitBridge.ts`) 실시간 걸음/칼로리 연동 | **완료 (Completed)** |

---

## 🗄️ 4. Phase 3 & 4 도메인별 상세 명세

### 1) 3대 1RM 트래커 & 신체 지표 (`Workout1RMTracker.tsx`, `BodyMetricsCard.tsx`)
- Epley 1RM 공식 ($1RM = W \times (1 + r/30)$) 기반 벤치프레스, 스쿼트, 데드리프트 계산
- 3대 합계 500kg 목표 달성률 게이지 시각화 및 최근 갱신일 추적
- 체중, 골격근량, 체지방률, 수축기/이완기 혈압 기록 및 클라우드 동기화

### 2) Apple HealthKit 브릿지 (`healthKitBridge.ts`)
- iOS Native 및 웹 겸용 하이브리드 어댑터
- 일일 걸음 수, 활동 소모 칼로리(kcal), 보행 거리(km), 안정시 심박수(BPM) 실시간 집계

### 3) 지독한 일기 & Ruthless 스누즈 알람 (`RuthlessDiarySkeleton.tsx`, `ruthlessAlarm.ts`)
- 목표 시간(기본 22:30) 설정 및 일기 미작성 시 5분 간격 무한 스누즈 알람 예약
- Web Audio API 신시사이저 기반의 즉각적인 차임벨 사운드 (외부 mp3 파일 불필요)
- 일기 저장 즉시 알람 자동 취소, 스트릭 갱신, Cloud Firestore 및 LocalStorage 영구 보관

### 4) 과거 일기 타임라인 & 인생샷 갤러리 (`DiaryArchiveTimeline.tsx`, `LifePhotoGallery.tsx`)
- 복사한 과거 일기 텍스트를 날짜별로 한 번에 자동 파싱하는 대량 임포터
- 중요한 추억과 인생 사진을 캡션/태그와 함께 보관하는 전용 갤러리

### 5) Capacitor iOS 패키징
- `ios/App` 프로젝트 완비
- `@capacitor/local-notifications` 플러그인 통합
- 정적 배포본(`out/`)과 iOS 웹 애셋 간 자동 동기화 (`npx cap sync ios`)

---

## 🔑 5. 배포 및 구동 명령어 요약
- **로컬 개발 서버**: `npm run dev`
- **정적 빌드**: `npm run build`
- **Capacitor iOS 동기화**: `npx cap sync ios`
- **Vercel 임시 배포**: `npx vercel out --temporary --yes`
