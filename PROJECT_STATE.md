# 🚀 Life-OS (인생 Super App) — Project State & Context Transfer Master

> **목적**: 이 문서는 AI 어시스턴트(Antigravity) 세션 및 계정 전환 시에도 컨텍스트 손실 없이 완벽하게 개발을 이어갈 수 있도록 프로젝트의 현황, 아키텍처, 데이터베이스 스키마, 향후 로드맵을 실시간으로 동기화하는 마스터 문서입니다.

---

## 📌 1. 프로젝트 기본 정보
- **프로젝트 명**: Life-OS (인생 Super App)
- **위치**: `C:\Users\JU\life-os` (기존 `quote-memo`와 분리된 전용 독립 디렉토리)
- **핵심 철학**: 흩어진 개인 일상 데이터를 단 하나의 뷰로 집약하는 1인 전용 라이프 운영체제. 입력 최소화(복사/파싱 중심 UX) 및 Zero-Knowledge 보안(클라이언트 AES-256 암호화).

---

## 🛠️ 2. 기술 스택 (Tech Stack)
- **Frontend / Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, Lucide React (아이콘)
- **Backend & Database**: Supabase (PostgreSQL), Supabase Auth, Row Level Security (RLS)
- **Mobile Hybrid Engine**: Capacitor (iOS 타겟), Web Push & Local Notifications
- **보안/암호화**: Web Crypto API (AES-256-GCM Zero-Knowledge Client-Side Encryption)

---

## 🗺️ 3. 4단계 로드맵 및 현재 진행 상황 (Roadmap Progress)

| 단계 | 주요 범위 | 진행 상태 |
| :--- | :--- | :---: |
| **Phase 1: 프레임워크 구축 & 핵심 데일리 UI** | Next.js + Tailwind + Supabase Auth 기본 구축, `PROJECT_STATE.md` 수립, 필수 정보 1초 복사 UI, 지독한 일기/루틴 기본 스켈레톤 | **진행 중 (In Progress)** |
| **Phase 2: 자산, 가계부 & 암호 매니저** | LastPass/Google CSV Import 파서, Client AES-256 Vault, SMS 문자 파싱 가계부, 총자산 대시보드 | 대기 (Pending) |
| **Phase 3: 헬스, 1RM & 인생샷 갤러리** | 1RM 자동 계산/그래프, Supabase Storage 기반 갤러리, 과거 일기 대량 이관 타임라인 | 대기 (Pending) |
| **Phase 4: iOS 앱 패키징 & HealthKit** | Capacitor 래핑 및 iOS 빌드, iOS Local Notification (스누즈 연동), HealthKit API 파이프라인 | 대기 (Pending) |

---

## 🗄️ 4. 데이터베이스 스키마 (Supabase / PostgreSQL)

DDL 파일 위치: `supabase/schema.sql`

1. **`essential_info`**: 필수 정보 (계좌, 주소, 차번호, 주민번호 마스킹 등 1초 복사 데이터)
2. **`vault_passwords`**: 비밀번호 매니저 (클라이언트 단에서 AES-256으로 암호화된 `encrypted_password` 저장)
3. **`diaries`**: 지독한 일기 및 과거 아카이브 (`entry_date`, `is_archived_from_past`, `source_type`)
4. **`health_logs`**: 체중, 골격근량, 체지방률, 혈압 기록
5. **`workout_1rm`**: 3대 운동 및 주요 종목 1RM 계산 일지 ($1RM = W \times (1 + r/30)$)
6. **`financial_logs`**: 파싱 기반 가계부 지출/수입 내역

*모든 테이블에는 Row Level Security(RLS)가 적용되어 `auth.uid() = user_id` 조건으로 1인 데이터가 철저히 격리됩니다.*

---

## 📂 5. 디렉토리 구조 (Directory Structure)

```text
C:\Users\JU\life-os\
├── .env.local.example       # Supabase 환경변수 템플릿
├── .env.local               # 로컬 환경변수 (Git 제외)
├── PROJECT_STATE.md         # 프로젝트 상태 및 계정 인계 마스터 문서
├── capacitor.config.ts      # Capacitor 모바일 설정
├── package.json
├── tsconfig.json
├── next.config.ts
├── supabase/
│   └── schema.sql           # PostgreSQL 전체 DDL 및 RLS 정책
└── src/
    ├── app/
    │   ├── layout.tsx       # 모바일 퍼스트 레이아웃 & 폰트
    │   ├── page.tsx         # 메인 대시보드 뷰
    │   ├── auth/            # Supabase 로그인/회원가입
    │   └── globals.css      # Tailwind v4 스타일
    ├── components/
    │   ├── layout/          # 헤더, 하단 탭 내비게이션(BottomNav)
    │   ├── essential-info/  # 필수 정보 1초 Quick-Copy UI
    │   ├── diary/           # 지독한 일기 & 스누즈 알람 스켈레톤
    │   └── routines/        # 일별 루틴 체크리스트 & 스트릭
    └── lib/
        ├── supabase/        # Supabase SSR 클라이언트 (client, server, middleware)
        └── crypto/          # Web Crypto AES-256 유틸리티
```

---

## 🔑 6. 다음 세션 / 계정 작업자를 위한 인계 사항 (Handoff Note)
- **현재 구현 완료 항목**: 
  - 독립 프로젝트 디렉토리 세팅 및 의존성 구성
  - `supabase/schema.sql` 스키마 및 RLS 완성
  - Supabase SSR 클라이언트 헬퍼 구성
  - 모바일 퍼스트 하단 탭바 & Quick-Copy 1초 복사 컴포넌트
  - 지독한 일기 & 루틴 기본 컴포넌트
- **다음 착수 권장 항목**:
  - Supabase 환경변수 연동 및 Auth 로그인/회원가입 플로우 실서버 연결
  - Phase 2: 비밀번호 매니저(Client AES-256 암호화 모듈) 및 SMS 가계부 파서 착수
