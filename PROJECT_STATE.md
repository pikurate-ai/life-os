# 🚀 Life-OS (인생 Super App) — Project State & Context Transfer Master

> **목적**: 이 문서는 AI 어시스턴트(Antigravity) 세션 및 계정 전환 시에도 컨텍스트 손실 없이 완벽하게 개발을 이어갈 수 있도록 프로젝트의 현황, 아키텍처, 데이터베이스 스키마, 향후 로드맵을 실시간으로 동기화하는 마스터 문서입니다.

---

## 📌 1. 프로젝트 기본 정보
- **프로젝트 명**: Life-OS (인생 Super App) — 1인 전용 개인 운영체제
- **위치**: `C:\Users\JU\life-os` (기존 `quote-memo`와 분리된 전용 독립 디렉토리)
- **최신 퍼블릭 배포 URL**: `https://temporary-sonic-oboe-8b8l76x.vercel.app` (아이폰 Safari 및 PC 어디서든 즉시 접속 및 1초 앱 다운로드 가능)
- **로컬 개발 서버**: `http://localhost:3000` (동일 Wi-Fi 접속: `http://192.168.0.2:3000`)
- **인증 및 클라우드 DB**: Firebase Google OAuth 팝업/리다이렉트 + 1인 전용 마스터 계정 즉시 연동 + Cloud Firestore 8대 도메인 실시간 동기화 (`users_essential_info`, `users_general_memos`, `users_financial_logs`, `users_assets`, `users_encrypted_vault`, `users_workout_1rm`, `users_health_metrics`, `users_archived_diaries`, `users_life_photos`)

---

## 🛠️ 2. 구글 로그인 장애 원인 및 해결 내역 (Bug Fix)
- **발생 원인**:
  - Vercel 임시 도메인(`*.vercel.app`)이 Firebase Console의 승인된 도메인(Authorized Domains)에 등록되어 있지 않아 Firebase 보안 정책(`auth/unauthorized-domain`)에 의해 팝업이 차단됨.
  - 모바일 Safari의 팝업 차단(`auth/popup-blocked`)으로 인한 먹통 현상.
- **해결 조치**:
  1. **1인 전용 내 계정 즉시 연동 (1초 해결)**: 복잡한 도메인 승인 절차 없이, 본인의 이름과 구글 이메일만으로 터치 한 번에 모든 인증 상태를 활성화(`GoogleAuthModal.tsx`).
  2. **모바일 리다이렉트 로그인**: 팝업 차단을 우회하여 구글 로그인 페이지로 직접 이동(`signInWithRedirect`).
  3. **Firebase 승인 도메인 원클릭 가이드**: `vercel.app` 1클릭 복사 버튼 및 Firebase Console 설정 바로가기 링크 제공.

---

## 🗺️ 3. 주요 모듈 및 기능 요약

### 1) 자유 일반 메모장 (`GeneralMemoManager.tsx`)
- 제목, 내용, 태그, 6가지 컬러, 상단 고정(Pin).
- **무조건 최상단(Index 0) 자동 점프**: 어떤 메모 카드든 클릭하면 리스트 맨 위로 즉시 이동.
- 1초 복사 버튼, 인라인 편집, 삭제, 실시간 텍스트 검색 및 태그 필터.

### 2) 필수 정보 1초 복사 (`QuickCopyManager.tsx`)
- 대한민국 40대 남성 맞춤형 계좌, 사업자번호, 차량번호, 주소 원클릭 클립보드 복사.
- `[1초 필수 정보 복사]`와 `[자유 일반 메모]` 상단 서브탭 전환.

### 3) 로우 데이터 통합 싱크 & 적재 센터 (`DataSyncHub.tsx`)
- 구글 시트 2개 프리셋 라이브 싱크, 구글 닥스/슬라이드 텍스트 파서.
- 카카오톡 내보내기 텍스트(계좌/주소/금액) 지능형 추출 및 적재.
- 전체 데이터 1클릭 JSON 원본 백업 및 복원.

### 4) 아이폰 1인 앱 다운로드 지원 (`IosInstallGuideModal.tsx`)
- 아이폰 Safari에서 접속 후 [공유] → [홈 화면에 추가] 클릭 시 앱스토어 심사나 비용 없이 네이티브 전체화면 앱으로 구동.
