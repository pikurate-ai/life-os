# 🚀 Life-OS (인생 Super App) — Project State & Context Transfer Master

> **목적**: 이 문서는 AI 어시스턴트(Antigravity) 세션 및 계정 전환 시에도 컨텍스트 손실 없이 완벽하게 개발을 이어갈 수 있도록 프로젝트의 현황, 아키텍처, 데이터베이스 스키마, 향후 로드맵을 실시간으로 동기화하는 마스터 문서입니다.

---

## 📌 1. 프로젝트 기본 정보
- **프로젝트 명**: Life-OS (인생 Super App)
- **위치**: `C:\Users\JU\life-os` (기존 `quote-memo`와 분리된 전용 독립 디렉토리)
- **퍼블릭 웹 배포 URL**: `https://temporary-instant-juniper-urh3p4l.vercel.app` (모바일/PC 어디서든 즉시 접속 가능)
- **로컬 개발 서버**: `http://localhost:3000` (동일 Wi-Fi 접속: `http://192.168.0.2:3000`)
- **인증 및 클라우드 DB**: Firebase Google OAuth 팝업 로그인 + Cloud Firestore 3대 도메인 실시간 동기화 (`users_essential_info`, `users_financial_logs`, `users_assets`, `users_encrypted_vault`)

---

## 🛠️ 2. 기술 스택 (Tech Stack)
- **Frontend / Framework**: Next.js 15 (App Router, Static Export), React 19, TypeScript
- **Styling**: Tailwind CSS v4, Lucide React (아이콘)
- **Authentication & Cloud DB**: Firebase Auth (Google OAuth 팝업) + Cloud Firestore
- **Offline / Local Persistence**: 브라우저 `localStorage` 완벽 연동
- **Mobile Hybrid Engine**: Capacitor CLI/Core (iOS 타겟), Web Push & Local Notifications
- **보안/암호화**: Web Crypto API (AES-256-GCM Zero-Knowledge Client-Side Encryption)

---

## 🗺️ 3. 4단계 로드맵 및 현재 진행 상황 (Roadmap Progress)

| 단계 | 주요 범위 | 진행 상태 |
| :--- | :--- | :---: |
| **Phase 1: 프레임워크 구축 & 핵심 데일리 UI** | Next.js + Tailwind + Supabase/Firebase Auth 구축, `PROJECT_STATE.md` 수립, 필수 정보 1초 복사 UI, 지독한 일기/루틴 기본 스켈레톤 | **완료 (Completed)** |
| **Phase 2: 자산, 가계부 & 암호 매니저 고도화** | SMS/알림톡 0.1초 파서 + 예산 관리 + 카테고리 지출 비율, 순자산 대시보드(자산/부채 CRUD + 부채비율), Zero-Knowledge AES-256 암호 금고(랜덤 비밀번호 생성기 + Google/LastPass CSV 임포트), 전 도메인 구글 클라우드 DB 동기화 | **완료 (Completed)** |
| **Phase 3: 헬스, 1RM & 인생샷 갤러리** | 1RM 자동 계산/그래프 ($1RM = W \times (1 + r/30)$), Cloud Storage 기반 갤러리, 과거 일기 대량 이관 타임라인 | 대기 (Pending) |
| **Phase 4: iOS 앱 패키징 & HealthKit** | Capacitor 래핑 및 iOS 빌드, iOS Local Notification (스누즈 연동), HealthKit API 파이프라인 | 대기 (Pending) |

---

## 🗄️ 4. Phase 2 도메인별 고도화 상세 명세

### 1) 가계부 (`SmsLedgerParser.tsx`)
- 카드사(신한, 현대, 국민, 삼성, 토스, 카카오뱅크 등) SMS 및 카톡 알림 0.1초 정규식 자동 추출
- 월간 목표 예산 설정 및 실시간 예산 소진율 프로그레스 바
- 식비/카페/교통/쇼핑/정기결제 등 카테고리별 지출 비율 바 시각화
- 수동 지출 등록 모달 및 삭제 기능
- 로그인 시 구글 클라우드 DB(`users_financial_logs`) 및 LocalStorage 실시간 동기화

### 2) 총자산 대시보드 (`AssetDashboard.tsx`)
- 순자산 = 총자산 - 총부채 자동 산출 및 부채비율(%) 표시
- 자산 포트폴리오 비중 인터랙티브 컬러 바
- 자산 및 부채 항목 무제한 추가(Add), 즉시 수정(Edit), 삭제(Delete)
- 로그인 시 구글 클라우드 DB(`users_assets`) 및 LocalStorage 실시간 동기화

### 3) 암호화 Vault 매니저 (`PasswordVaultManager.tsx`)
- Zero-Knowledge 원칙: 비밀번호는 브라우저 내부에서만 Web Crypto AES-256-GCM으로 암호화
- 클라우드 DB(`users_encrypted_vault`)에는 암호문, IV, Salt만 안전하게 저장 (서버조차 비밀번호 복호화 불가)
- 16자리 강력한 랜덤 비밀번호 자동 생성기 (`Wand2` 버튼)
- Google Chrome / LastPass 비밀번호 내보내기 CSV 파일 원클릭 업로드 및 일괄 암호화

---

## 🔑 5. 다음 세션 / 계정 작업자를 위한 인계 사항 (Handoff Note)
- **현재 구현 완료 항목**: 
  - Phase 1 & Phase 2 전 기능 구현 및 고도화 완료
  - Vercel 퍼블릭 최신 배포: `https://temporary-instant-juniper-urh3p4l.vercel.app`
  - 구글 로그인 및 클라우드 DB 연동 완료
- **다음 착수 권장 항목**:
  - Phase 3: 헬스 트래커 & 3대 운동 1RM 계산기 ($1RM = W \times (1 + r/30)$) 시각화 및 운동 일지
