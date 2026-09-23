# 🚀 Life-OS (인생 Super App) — Project State & Context Transfer Master

> **목적**: 이 문서는 AI 어시스턴트(Antigravity) 세션 및 계정 전환 시에도 컨텍스트 손실 없이 완벽하게 개발을 이어갈 수 있도록 프로젝트의 현황, 아키텍처, 데이터베이스 스키마, 향후 로드맵을 실시간으로 동기화하는 마스터 문서입니다.

---

## 📌 1. 프로젝트 기본 정보
- **프로젝트 명**: Life-OS (인생 Super App)
- **위치**: `C:\Users\JU\life-os` (기존 `quote-memo`와 분리된 전용 독립 디렉토리)
- **퍼블릭 웹 배포 URL**: `https://temporary-speedy-cerulean-j1mcigk.vercel.app` (모바일/PC 어디서든 즉시 접속 가능)
- **로컬 개발 서버**: `http://localhost:3000` (모바일 동일 Wi-Fi 접속: `http://192.168.0.2:3000`)
- **핵심 철학**: 흩어진 개인 일상 데이터를 단 하나의 뷰로 집약하는 1인 전용 라이프 운영체제. 대한민국 40대 남성 맞춤형 군집화(업무, 금융, 운전, 가족, 건강, 일상) 및 클릭 1초 복사/최상단 자동 정렬.

---

## 🛠️ 2. 기술 스택 (Tech Stack)
- **Frontend / Framework**: Next.js 15 (App Router), React 19, TypeScript
- **Styling**: Tailwind CSS v4, Lucide React (아이콘)
- **Backend & Database**: Supabase (PostgreSQL), Supabase Auth (구글 OAuth 연동 지원), Row Level Security (RLS)
- **Data Persistence**: 브라우저 `localStorage` 완벽 동기화 + Supabase Cloud 연동
- **Mobile Hybrid Engine**: Capacitor CLI/Core (iOS 타겟), Web Push & Local Notifications
- **보안/암호화**: Web Crypto API (AES-256-GCM Zero-Knowledge Client-Side Encryption)

---

## 🗺️ 3. 4단계 로드맵 및 현재 진행 상황 (Roadmap Progress)

| 단계 | 주요 범위 | 진행 상태 |
| :--- | :--- | :---: |
| **Phase 1: 프레임워크 구축 & 핵심 데일리 UI** | Next.js + Tailwind + Supabase Auth 기본 구축, `PROJECT_STATE.md` 수립, 필수 정보 1초 복사 UI, 지독한 일기/루틴 기본 스켈레톤 | **완료 (Completed)** |
| **Phase 2: 자산, 가계부 & 암호 매니저** | LastPass/Google CSV Import 파서, Client AES-256 Vault, SMS 문자 파싱 가계부, 총자산 대시보드 | **완료 (Completed)** |
| **Phase 2.5: 40대 남성 맞춤형 고도화 & 웹 게시** | 구글 로그인 연동, 40대 남성 카테고리 군집화, 카테고리 추가/삭제/편집, 토글형 추가 메모, 최근 클릭 최상단 자동 정렬(LRU), Vercel 웹 배포 오픈 | **완료 (Completed)** |
| **Phase 3: 헬스, 1RM & 인생샷 갤러리** | 1RM 자동 계산/그래프, Supabase Storage 기반 갤러리, 과거 일기 대량 이관 타임라인 | 대기 (Pending) |
| **Phase 4: iOS 앱 패키징 & HealthKit** | Capacitor 래핑 및 iOS 빌드, iOS Local Notification (스누즈 연동), HealthKit API 파이프라인 | 대기 (Pending) |

---

## 🗄️ 4. 40대 남성 맞춤형 기본 정보 카테고리 체계
1. **💼 업무/사업 (business)**:
   - 사업자등록번호: `276-88-01467`
   - 법인등록번호: `110111-7222964`
   - 본사 사업자 주소: `경기도 김포시 김포한강8로 410, 1001-343호(구래동, 스타프라자) [10071]`
   - 벤처기업확인서 / 중소기업확인서 번호
   - 지적재산권 출원인코드 (`1-2020-014440-6`) & 과학기술인등록번호 (`12555772`)
2. **💳 금융/자산 (finance)**:
   - 주거래 법인 계좌 (기업은행 `047-116828-01-015`)
   - 법인카드 (우리 마스터 `5532-0800-1231-6491`)
   - 개인통관고유부호 (`P811151508155`)
3. **🚗 차량/운전 (vehicle)**:
   - 대표 차량번호 (`48보5508`) / 업무용 차량번호 (`161하1268`)
4. **🏠 부동산/가족 (family)**:
   - 대표자 성명/직위, 대표 비상 연락처 및 공식 이메일
5. **🏥 건강/의료 (health)**:
   - 정기 건강검진 및 실손보험 증권
6. **📝 일상/기타 (daily)**:
   - 사무실 Wi-Fi 및 게스트 비번 등

*특징: 카드를 클릭(복사)하면 **가장 최근에 클릭한 항목이 무조건 최상단(TOP 1)**으로 이동하며, 메모가 있는 항목은 '추가 메모 보기' 클릭 시 펼쳐집니다.*

---

## 🔑 5. 다음 세션 / 계정 작업자를 위한 인계 사항 (Handoff Note)
- **현재 구현 완료 항목**: 
  - Vercel 퍼블릭 웹 배포 완료: `https://temporary-speedy-cerulean-j1mcigk.vercel.app`
  - 상단 헤더: 구글 로그인 연동 버튼 & 프로필 배지
  - 기본 정보 메모장: 40대 남성 군집화 카테고리 필터 + 카테고리 관리(추가/삭제/편집) + 토글 추가 메모 + 최근 클릭 최상단 자동 정렬 + 항목 수정/추가/삭제 + 로컬스토리지 영구 보존
  - 문자 파싱 가계부 & 총자산 대시보드 (`FinanceHub.tsx`)
  - AES-256 비밀번호 보관함 (`PasswordVaultManager.tsx`)
- **다음 착수 권장 항목**:
  - Phase 3: 헬스 트래커 & 3대 운동 1RM 자동 계산기 ($1RM = W \times (1 + r/30)$) 시각화
