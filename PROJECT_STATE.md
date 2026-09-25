# 🚀 Life-OS (인생 Super App) — Project State & Context Transfer Master

> **목적**: 이 문서는 AI 어시스턴트(Antigravity) 세션 및 계정 전환 시에도 컨텍스트 손실 없이 완벽하게 개발을 이어갈 수 있도록 프로젝트의 현황, 아키텍처, 데이터베이스 스키마, 향후 로드맵을 실시간으로 동기화하는 마스터 문서입니다.

---

## 📌 1. 프로젝트 기본 정보
- **프로젝트 명**: Life-OS (인생 Super App) — 1인 전용 개인 운영체제
- **위치**: `C:\Users\JU\life-os` (기존 `quote-memo`와 분리된 전용 독립 디렉토리)
- **최신 퍼블릭 배포 URL**: `https://temporary-zippy-cyclone-k4228c2.vercel.app` (아이폰 Safari 및 PC 어디서든 즉시 접속 및 1초 앱 다운로드 가능)
- **로컬 개발 서버**: `http://localhost:3000` (동일 Wi-Fi 접속: `http://192.168.0.2:3000`)
- **인증 및 클라우드 DB**: Firebase Google OAuth 팝업 로그인 + Cloud Firestore 7대 도메인 실시간 동기화 (`users_essential_info`, `users_financial_logs`, `users_assets`, `users_encrypted_vault`, `users_workout_1rm`, `users_health_metrics`, `users_archived_diaries`, `users_life_photos`)

---

## 🛠️ 2. 기술 스택 & 1인 아이폰 최적화
- **Frontend / Framework**: Next.js 15.2.4 (App Router, Static Export `output: 'export'`), React 19, TypeScript
- **iOS Standalone PWA**:
  - `public/manifest.json` (`display: "standalone"`, 테마 컬러 `#090a0f`)
  - `public/icons/icon-192.svg`, `public/icons/icon-512.svg` 네이티브 앱 아이콘
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

### 1) 로우 데이터 통합 싱크 & 적재 센터 (`DataSyncHub.tsx`)
- **구글 드라이브/시트 탭**:
  - 사용자 보유 2개 시트(주민/계좌/주소 시트, 차량/가족 시트) 원클릭 라이브 싱크
  - 임의의 공유 구글 시트 URL 실시간 데이터 수신
  - 구글 닥스/슬라이드/메모 텍스트 붙여넣기 자동 분류
  - 1초 복사 메모장(`QuickCopy`)으로 실시간 적재
- **카카오톡 텍스트 파서 탭**:
  - 카카오톡 대화방 복사본/내보내기 텍스트 분석
  - 은행 계좌, 배송/방문 주소, 전화번호, 송금/결제 내역 자동 분류 및 적재
- **전체 백업 & 복원 탭**:
  - `life-os-raw-backup-YYYY-MM-DD.json` 1클릭 원본 다운로드
  - 백업 파일 업로드 시 7개 전 도메인 즉시 복원 및 클라우드 동기화

### 2) 아이폰 1인 앱 다운로드 지원 (`IosInstallGuideModal.tsx`)
- 아이폰 Safari에서 접속 후 [공유] → [홈 화면에 추가] 클릭 시 앱스토어 심사나 비용 없이 네이티브 전체화면 앱으로 구동.
- 헤더 및 대시보드에서 1초 설치 안내 모달 상시 제공.

### 3) 3인의 전문 개발자 교차 검수 완료 내역
1. 프론트엔드: `manifest.json` 부재 404 해결, `globals.css` 텍스트 선택 버그 해결, PWA 아이콘 생성.
2. iOS 모바일 & 보안: `apple-touch-icon`, `viewport-fit=cover` 노치/홈바 안전 영역 보정, 원본 백업 파이프라인.
3. 데이터 파이프라인: 구글 시트/닥스 & 카카오톡 로우 데이터 실시간 추출 및 클라우드 적재 센터 완비.
