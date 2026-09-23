# 🚀 Life-OS (인생 Super App) — Project State & Context Transfer Master

> **목적**: 이 문서는 AI 어시스턴트(Antigravity) 세션 및 계정 전환 시에도 컨텍스트 손실 없이 완벽하게 개발을 이어갈 수 있도록 프로젝트의 현황, 아키텍처, 데이터베이스 스키마, 향후 로드맵을 실시간으로 동기화하는 마스터 문서입니다.

---

## 📌 1. 프로젝트 기본 정보
- **프로젝트 명**: Life-OS (인생 Super App)
- **위치**: `C:\Users\JU\life-os` (기존 `quote-memo`와 분리된 전용 독립 디렉토리)
- **퍼블릭 웹 배포 URL**: `https://temporary-swift-gorge-a16pfrh.vercel.app` (모바일/PC 어디서든 즉시 접속 가능)
- **로컬 개발 서버**: `http://localhost:3000` (또는 `http://localhost:3001` / 동일 Wi-Fi 접속: `http://192.168.0.2:3001`)
- **구글 로그인 연동**: Firebase Google OAuth & Cloud Firestore 완벽 연동 (원클릭 팝업 구글 로그인 + 유저별 실시간 클라우드 DB 동기화)

---

## 🛠️ 2. 기술 스택 (Tech Stack)
- **Frontend / Framework**: Next.js 15 (App Router, Static Export), React 19, TypeScript
- **Styling**: Tailwind CSS v4, Lucide React (아이콘)
- **Authentication & Cloud DB**: Firebase Auth (Google OAuth 팝업) + Cloud Firestore (`users_essential_info`)
- **Offline / Local Persistence**: 브라우저 `localStorage` 완벽 연동
- **Mobile Hybrid Engine**: Capacitor CLI/Core (iOS 타겟), Web Push & Local Notifications
- **보안/암호화**: Web Crypto API (AES-256-GCM Zero-Knowledge Client-Side Encryption)

---

## 🗺️ 3. 4단계 로드맵 및 현재 진행 상황 (Roadmap Progress)

| 단계 | 주요 범위 | 진행 상태 |
| :--- | :--- | :---: |
| **Phase 1: 프레임워크 구축 & 핵심 데일리 UI** | Next.js + Tailwind + Supabase/Firebase Auth 구축, `PROJECT_STATE.md` 수립, 필수 정보 1초 복사 UI, 지독한 일기/루틴 기본 스켈레톤 | **완료 (Completed)** |
| **Phase 2: 자산, 가계부 & 암호 매니저** | LastPass/Google CSV Import 파서, Client AES-256 Vault, SMS 문자 파싱 가계부, 총자산 대시보드 | **완료 (Completed)** |
| **Phase 2.5: 구글 로그인 & 클라우드 DB 연동** | Firebase Google Auth 팝업 로그인, 클라우드 DB 실시간 양방향 동기화, 40대 남성 카테고리 군집화, 토글 메모, 최상단 자동 정렬(LRU), 모바일 퍼블릭 웹 배포 | **완료 (Completed)** |
| **Phase 3: 헬스, 1RM & 인생샷 갤러리** | 1RM 자동 계산/그래프, Cloud Storage 기반 갤러리, 과거 일기 대량 이관 타임라인 | 대기 (Pending) |
| **Phase 4: iOS 앱 패키징 & HealthKit** | Capacitor 래핑 및 iOS 빌드, iOS Local Notification (스누즈 연동), HealthKit API 파이프라인 | 대기 (Pending) |

---

## 🔑 4. 다음 세션 / 계정 작업자를 위한 인계 사항 (Handoff Note)
- **현재 구현 완료 항목**: 
  - **구글 로그인 정상화**: Google OAuth 팝업 로그인 (`signInWithGoogle`) 및 프로필 표시, Cloud Firestore (`users_essential_info`) 실시간 자동 백업
  - **퍼블릭 웹 배포 URL**: `https://temporary-swift-gorge-a16pfrh.vercel.app`
  - **40대 남성 카테고리 & 1초 복사 메모장**: 카테고리 관리(추가/삭제/편집) + 토글 추가 메모 + 최근 클릭 최상단 자동 정렬 + 항목 수정/추가/삭제 + LocalStorage + Cloud DB 이중 보존
  - **Phase 2 기능 완비**: 문자 파싱 가계부(`SmsLedgerParser.tsx`), 순자산 대시보드(`AssetDashboard.tsx`), AES-256 암호화 금고(`PasswordVaultManager.tsx`)
- **다음 착수 권장 항목**:
  - Phase 3: 헬스 트래커 & 3대 운동 1RM 자동 계산기 ($1RM = W \times (1 + r/30)$) 및 시각화 차트 구축
