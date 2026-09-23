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
| **Phase 1: 프레임워크 구축 & 핵심 데일리 UI** | Next.js + Tailwind + Supabase Auth 기본 구축, `PROJECT_STATE.md` 수립, 필수 정보 1초 복사 UI, 지독한 일기/루틴 기본 스켈레톤 | **완료 (Completed)** |
| **Phase 2: 자산, 가계부 & 암호 매니저** | LastPass/Google CSV Import 파서, Client AES-256 Vault, SMS 문자 파싱 가계부, 총자산 대시보드 | **완료 (Completed)** |
| **Phase 2+ 스프레드시트 싱크 & CRUD** | 구글 시트 2종(사업자/법인/주소/계좌/인증번호) 중복 제거 싱크, 신규 등록 & 기존 항목 수정(Edit) & 삭제 & LocalStorage 영구 보존 | **완료 (Completed)** |
| **Phase 3: 헬스, 1RM & 인생샷 갤러리** | 1RM 자동 계산/그래프, Supabase Storage 기반 갤러리, 과거 일기 대량 이관 타임라인 | 대기 (Pending) |
| **Phase 4: iOS 앱 패키징 & HealthKit** | Capacitor 래핑 및 iOS 빌드, iOS Local Notification (스누즈 연동), HealthKit API 파이프라인 | 대기 (Pending) |

---

## 🗄️ 4. 기본 정보 메모장 싱크 데이터셋 (구글 시트 연동)

두 개의 구글 스프레드시트에서 중복 항목(여러 개 주소/계좌)을 1개씩 선별 정제하여 구축 완료:
1. **사업자등록번호**: `276-88-01467`
2. **법인등록번호**: `110111-7222964`
3. **본사 주소 (단일 대표)**: `경기도 김포시 김포한강8로 410, 1001-343호(구래동, 스타프라자) [10071]`
4. **주거래 법인 계좌 (단일 대표)**: `기업은행 047-116828-01-015 (주식회사 피큐레잇)`
5. **사용 중인 법인카드 (단일 대표)**: `우리은행 마스터 5532-0800-1231-6491 (09/29, CVC 574)`
6. **대표자 성명/직위**: `송석규 대표`
7. **대표 휴대전화**: `010-8871-6102`
8. **대표 이메일**: `leo.song@pikurate.com`
9. **차량 번호 (단일 대표)**: `48보5508`
10. **개인통관고유번호**: `P811151508155`
11. **벤처기업확인서 번호**: `20251022010021` (2025.11.24~2028.11.23)
12. **중소기업확인서 번호**: `0010-2025-356786`
13. **과학기술인등록번호**: `12555772`
14. **지적재산권 출원인 코드**: `1-2020-014440-6`
15. **공식 홈페이지**: `https://www.pikurate.com/`

*모든 항목은 브라우저에서 '수정(Edit)', '추가(Add)', '삭제(Delete)'가 가능하며 `localStorage`에 영구 반영됩니다.*

---

## 🔑 5. 다음 세션 / 계정 작업자를 위한 인계 사항 (Handoff Note)
- **현재 구현 완료 항목**: 
  - 기본 정보 메모장: 구글 시트 싱크 및 원클릭 복사 + 추가/수정/삭제/로컬스토리지 보존
  - 문자 파싱 가계부 (`SmsLedgerParser.tsx`): 카드사 SMS/알림톡 0.1초 파싱
  - 총자산 대시보드 (`AssetDashboard.tsx`): 순자산 실시간 계산 및 포트폴리오 비중
  - 암호 금고 (`PasswordVaultManager.tsx`): Web Crypto AES-256-GCM Zero-Knowledge Vault 및 CSV Import
  - 개발 서버 구동 중: `http://localhost:3000`
- **다음 착수 권장 항목**:
  - Phase 3: 헬스 & 3대 운동 1RM 계산기 ($1RM = W \times (1 + r/30)$) 및 시각화 차트 구축
