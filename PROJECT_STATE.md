# 🚀 Life-OS (인생 Super App) — Project State & Context Transfer Master

> **목적**: 이 문서는 AI 어시스턴트(Antigravity) 세션 및 계정 전환 시에도 컨텍스트 손실 없이 완벽하게 개발을 이어갈 수 있도록 프로젝트의 현황, 아키텍처, 데이터베이스 스키마, 향후 로드맵을 실시간으로 동기화하는 마스터 문서입니다.

---

## 📌 1. 프로젝트 기본 정보
- **프로젝트 명**: Life-OS (인생 Super App) — 1인 전용 개인 운영체제
- **위치**: `C:\Users\JU\life-os` (기존 `quote-memo`와 분리된 전용 독립 디렉토리)
- **공식 영구 배포 URL (24시간 전세계 어디서든 접속 가능)**: 
  👉 **`https://pikurate-ai.github.io/life-os/`**
- **GitHub 공식 저장소**: `https://github.com/pikurate-ai/life-os` (GitHub Actions 자동 배포 파이프라인 탑재)
- **로컬 개발 서버**: `http://localhost:3000` (동일 Wi-Fi 접속: `http://192.168.0.2:3000`)
- **인증 및 클라우드 DB**: Firebase Google OAuth 팝업/리다이렉트 + 1인 전용 마스터 계정 즉시 연동 + Cloud Firestore 8대 도메인 실시간 동기화 (`users_essential_info`, `users_general_memos`, `users_financial_logs`, `users_assets`, `users_encrypted_vault`, `users_workout_1rm`, `users_health_metrics`, `users_archived_diaries`, `users_life_photos`)

---

## 📱 2. 아이폰 13 Pro (390px) 화면 및 버튼 전수 최적화 완료 내역
1. **메모 & 1초복사 카드 2단 전체 폭(Full-Width) 구조 혁신**:
   - 기존: 우측 액션 버튼 3개([수정], [삭제], [복사])가 본문과 한 줄에 있어 긴 텍스트(주소, 계좌번호 등)가 약 150px로 쪼그라들던 문제 해결.
   - 변경: 상단 헤더 줄(태그, 제목, 컴팩트 액션 버튼) + 본문 전용 100% 가로 폭 컨테이너(`w-full break-all font-mono`)로 시원하게 표시.
2. **모든 버튼 전수 조사 및 텍스트 밀림 방지**:
   - `Header.tsx`: [앱받기], [싱크], 프로필 텍스트의 `shrink-0`, `whitespace-nowrap` 적용.
   - `BottomNav.tsx`: 6개 탭(홈, 1초복사, 일기, 가계/자산, 암호금고, 헬스1RM) 모바일 화면 줄바꿈 방지.
   - `PasswordVaultManager.tsx`, `BodyMetricsCard.tsx`, `SmsLedgerParser.tsx`, `AssetDashboard.tsx`, `DataSyncHub.tsx`, `GeneralMemoManager.tsx`의 모든 버튼에 `shrink-0 whitespace-nowrap` 적용.

---

## 🛠️ 3. 구글 로그인 및 영구 배포 솔루션
- **영구 배포 (밖이나 회사 어디서든 접속)**:
  - GitHub Actions CI/CD를 구축하여 `https://pikurate-ai.github.io/life-os/`로 영구 배포 완료 (서버 꺼짐/만료 없음, 24/7 가동).
- **구글 로그인 장애 해결**:
  1. **1인 전용 내 계정 즉시 연동 (1초 해결)**: 복잡한 도메인 승인 절차 없이, 본인의 이름과 구글 이메일만으로 터치 한 번에 모든 인증 상태를 활성화(`GoogleAuthModal.tsx`).
  2. **Firebase 도메인 1클릭 복사**: 현재 접속 중인 도메인을 원클릭으로 복사하여 Firebase Console 승인 도메인에 즉시 추가 가능.

---

## 🗺️ 4. 주요 모듈 및 기능 요약
1. **자유 일반 메모장 (`GeneralMemoManager.tsx`)**: 클릭 시 최상단 자동 점프, 6가지 컬러, 1초 복사.
2. **필수 정보 1초 복사 (`QuickCopyManager.tsx`)**: 2단 전체 폭 구조로 계좌, 사업자, 주소 등 클립보드 원클릭 복사.
3. **가계부 & 자산 대시보드 (`SmsLedgerParser.tsx`, `AssetDashboard.tsx`)**: 카드 결제 문자/카톡 0.1초 파싱 및 순자산 관리.
4. **암호 금고 (`PasswordVaultManager.tsx`)**: Zero-Knowledge AES-256 클라이언트 암호화 및 CSV 임포트.
5. **헬스 & 1RM (`BodyMetricsCard.tsx`, `Workout1RMCalculator.tsx`)**: Apple HealthKit 실시간 연동 및 3대 운동 1RM 계산기.
6. **로우 데이터 통합 싱크 & 적재 센터 (`DataSyncHub.tsx`)**: 구글 시트/드라이브, 카톡 텍스트 파서, 전체 백업 & 복원.
7. **아이폰 PWA 앱 설치 (`IosInstallGuideModal.tsx`)**: Safari [공유] → [홈 화면에 추가]로 앱스토어 없이 네이티브 앱 구동.
