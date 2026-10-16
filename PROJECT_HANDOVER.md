# 🏛️ Life-OS 프로젝트 종합 인계 가이드 (Master Handover Document)

> **문서 버전:** 1.0.0  
> **최종 갱신일:** 2026-10-16  
> **프로젝트 저장소:** `https://github.com/pikurate-ai/life-os.git` (Branch: `master`)  
> **실시간 배포 주소:** [https://pikurate-ai.github.io/life-os/](https://pikurate-ai.github.io/life-os/)  
> **작성 목적:** 다른 PC 환경에서 다른 AI 모델(Claude, GPT, Gemini 등) 또는 개발자가 본 프로젝트를 즉시 인계받아 코드 구조와 기획 의도를 100% 이해하고 연속성 있게 개발/유지보수할 수 있도록 완벽한 정보를 제공합니다.

---

## 📑 목차 (Table of Contents)
1. [프로젝트 비전 및 핵심 기획](#1-프로젝트-비전-및-핵심-기획)
2. [기술 스택 및 인프라 구조](#2-기술-스택-및-인프라-구조)
3. [프로젝트 디렉터리 구조도](#3-프로젝트-디렉터리-구조도)
4. [주요 5대 탭 및 핵심 기능 명세](#4-주요-5대-탭-및-핵심-기능-명세)
5. [데이터베이스 & 클라우드 동기화 아키텍처](#5-데이터베이스--클라우드-동기화-아키텍처)
6. [보안 및 암호화 모델 (Zero-Knowledge AES-256)](#6-보안-및-암호화-모델-zero-knowledge-aes-256)
7. [로컬 개발 환경 셋업 & 빌드/배포 가이드](#7-로컬-개발-환경-셋업--빌드배포-가이드)
8. [모바일(iOS/Android) PWA 최적화 & UX 특이사항](#8-모바일iosandroid-pwa-최적화--ux-특이사항)
9. [향후 로드맵 & 인계 시 주의점](#9-향후-로드맵--인계-시-주의점)

---

## 1. 프로젝트 비전 및 핵심 기획

### 1.1 배경 및 철학
현대인은 개인정보(계좌, 주민번호, 여권 등), 하루 일기, 습관(루틴), 가계부 지출, 자산 현황, 각종 비밀번호, 헬스 운동 기록(턱걸이, 1RM, 체중), 사진 등이 10개 이상의 서로 다른 앱에 쪼개져 있습니다.  
**Life-OS**는 이를 **단 하나의 개인 전용 슈퍼앱(Single View Personal Operating System)**으로 통합하여:
- **원터치 1초 접근성:** 필요할 때 즉시 복사/조회
- **지독한 실행력 강제:** 일기를 쓸 때까지 멈추지 않는 알람/진동 시스템
- **데이터 주권 및 영지식 보안:** 클라우드와 로컬 저장소 동시 보관 + 민감 정보 AES-256 암호화
- **모바일 네이티브 감성:** 모던 블랙 스퀴클 UI, 제로 텍스트 밀림, PWA 홈 화면 바로가기 지원

### 1.2 사용자 페르소나 및 핵심 타깃
- 40대 남성 / 1인 비즈니스맨 / 자기관리 철저한 프리미엄 사용자
- 매일 아침 수영 및 퇴근 후 턱걸이(풀업) 루틴을 수행하며 점진적 과부하 추적
- 결제 문자를 복사해 지출을 기록하고 순자산을 관리
- 가족/금융/업무/운전 관련 고유 번호를 일상에서 신속히 복사해 제출해야 함

---

## 2. 기술 스택 및 인프라 구조

| 레이어 | 기술 스택 | 설명 |
| :--- | :--- | :--- |
| **Framework** | **Next.js 15.2.4** (App Router) | 최신 React 19 호환 및 Static HTML Export (`output: "export"`) |
| **Language** | **TypeScript 5.x** | 전역 엄격 모드 (`strict: true`), 무결점 인터페이스 정의 |
| **Styling** | **Tailwind CSS v4** + Lucide React | 반응형 다크 모드 (`#090a0f`), 모바일 Safe Area 완벽 대응 |
| **Database** | **Google Cloud Firestore** (NoSQL) | 실시간 동기화 (`onSnapshot`), 양방향 병합 머지 엔진 |
| **Authentication** | **Firebase Auth** + Custom Master ID | 구글 팝업/리다이렉트 로그인 및 1초 즉시 이메일 매핑 |
| **Security** | **Web Crypto API (SubtleCrypto)** | 클라이언트 단 AES-GCM 256-bit 영지식(Zero-Knowledge) 암호화 |
| **Hosting & CI/CD** | **GitHub Actions + GitHub Pages** | `master` 브랜치 push 시 자동 빌드 & 무중단 정적 배포 |
| **Mobile PWA** | Web App Manifest + Capacitor Ready | 모던 SVG 엠블럼, Standalone 모드 지원, 진동(Vibration API) 연동 |

---

## 3. 프로젝트 디렉터리 구조도

```
life-os/
├── .github/
│   └── workflows/
│       └── nextjs.yml              # GitHub Pages 자동 배포 CI/CD 파이프라인
├── public/
│   ├── favicon.svg                 # 브라우저 탭 파비콘 (신규 모던 엠블럼)
│   ├── manifest.json               # PWA 설치 메니페스트 (이름, 테마, 아이콘)
│   └── icons/
│       ├── icon-192.svg            # 모바일 홈 바로가기 192x192 SVG
│       └── icon-512.svg            # 고해상도 512x512 SVG (텍스트 제거 & 엠블럼 확대)
├── src/
│   ├── app/
│   │   ├── favicon.ico / icon.svg  # Next.js App Router 자동 파비콘 라우트
│   │   ├── globals.css             # Tailwind v4 기본 스타일 및 폰트 설정
│   │   ├── layout.tsx              # 루트 레이아웃 (메타데이터, 뷰포트, 다크모드)
│   │   └── page.tsx                # 단일 메인 컨트롤러 (탭 전환 및 localStorage 기억)
│   ├── components/
│   │   ├── auth/
│   │   │   └── GoogleAuthModal.tsx # 클라우드 동기화 모달 (계정 연동, Firestore 매핑)
│   │   ├── dashboard/
│   │   │   └── DashboardOverview.tsx # 종합 대시보드 뷰
│   │   ├── diary/
│   │   │   └── RuthlessDiarySkeleton.tsx # 일기장, 지독한 알람, 5점 기분 척도, 루틴 스트릭
│   │   ├── essential-info/
│   │   │   └── QuickCopyManager.tsx # '기억' 탭: 필수 정보 1초 복사 & LRU 상단 승격
│   │   ├── finance/
│   │   │   ├── FinanceHub.tsx      # 가계/자산 서브탭 스위처
│   │   │   ├── SmsLedgerParser.tsx # SMS/알림톡 0.1초 파싱 가계부
│   │   │   └── AssetDashboard.tsx  # 순자산, 총자산 vs 부채, 포트폴리오 차트
│   │   ├── gallery/
│   │   │   └── LifePhotoGallery.tsx # 인생샷 앨범, 폴더별 분류, 모바일/웹 사진 업로드
│   │   ├── health/
│   │   │   ├── HealthHub.tsx       # 헬스 허브 탭 스위처
│   │   │   ├── Workout1RMTracker.tsx # 턱걸이 세트별 기록기 + 3대 운동 1RM 계산기
│   │   │   └── BodyMetricsCard.tsx # 체중 히어로/히스토리 + 애플건강 실제 수치 직접 수정
│   │   ├── layout/
│   │   │   ├── Header.tsx          # 상단 헤더 (타이틀, 싱크 센터, 로그인 상태)
│   │   │   └── BottomNav.tsx       # 하단 5대 탭 네비게이션바 (Safe-area 최적화)
│   │   ├── memo/
│   │   │   └── GeneralMemoManager.tsx # 자유 일반 메모장 (색상 라벨, 고정, LRU 이동)
│   │   └── sync/
│   │       └── DataSyncHub.tsx     # 구글시트/닥스/로컬파일 직접 업로드 & 엑셀 메일 백업
│   └── lib/
│       ├── firebase/
│       │   └── client.ts           # Firebase 초기화, Auth, Firestore CRUD & 실시간 리스너
│       ├── healthkit/
│       │   └── healthKitBridge.ts  # 애플 건강 데이터 인터페이스 & 로컬/클라우드 브릿지
│       ├── notifications/
│       │   └── ruthlessAlarm.ts    # Web Audio 사운드 합성 차임벨 & 햅틱 진동 엔진
│       ├── parser/
│       │   └── kakaoParser.ts      # 카카오톡 대화 텍스트 로우데이터 파서
│       ├── security/
│       │   └── crypto.ts           # Web Crypto AES-GCM 256 암복호화 엔진
│       ├── sync/
│       │   ├── googleDriveSync.ts  # 구글 시트/문서 파싱 및 카테고리 자동 추론 엔진
│       │   └── universalBackup.ts  # UTF-8 BOM Excel CSV 생성 & 메일 전송
│       └── utils.ts                # tailwind-merge 및 clsx 유틸
├── next.config.ts                  # 정적 배포 basePath (`/life-os`) 및 옵션
├── package.json                    # 프로젝트 의존성 및 실행 스크립트
├── tsconfig.json                   # TypeScript 환경설정
└── PROJECT_HANDOVER.md             # 본 인계 문서
```

---

## 4. 주요 5대 탭 및 핵심 기능 명세

### 탭 1: 기억 (`quickcopy`)
- **담당 컴포넌트:** [QuickCopyManager.tsx](file:///C:/Users/JU/life-os/src/components/essential-info/QuickCopyManager.tsx) + [GeneralMemoManager.tsx](file:///C:/Users/JU/life-os/src/components/memo/GeneralMemoManager.tsx)
- **주요 기능:**
  1. **필수 정보 1초 복사:** 주민등록번호, 계좌번호, 운전면허번호, 사업자번호 등을 터치 1번에 클립보드에 복사.
  2. **LRU 최상단 자동 승격:** 어떤 항목이든 클릭/복사하면 해당 카드가 **무조건 0번 인덱스(최상단)**로 즉시 재배치되어 자주 쓰는 정보가 자연스럽게 맨 위에 노출.
  3. **자유 일반 메모장 전환:** 탭 상단 토글로 일반 메모장 진입. 메모 고정(Pin), 6가지 색상 테마, 실시간 검색, 전체 복사 지원.

### 탭 2: 일기 (`diary`)
- **담당 컴포넌트:** [RuthlessDiarySkeleton.tsx](file:///C:/Users/JU/life-os/src/components/diary/RuthlessDiarySkeleton.tsx)
- **주요 기능:**
  1. **지독한 알람 (Ruthless Alarm):** 목표 시간(기본 밤 23:00)까지 일기를 작성하지 않으면 5분 간격으로 Web Audio 사이렌과 진동 패턴이 무한 반복. 일기를 한 줄이라도 저장해야만 해제됨.
  2. **5점 척도 하루 기분:** 1점(매우 힘듦) ~ 5점(최고/성취)의 직관적 5단계 스케일 선택.
  3. **날짜 네비게이션 & 과거 일기 검색:** 이전/다음 일자 이동, 오늘로 원클릭 이동, 과거 일기 전문 검색 타임라인.
  4. **데일리 루틴 & 스트릭:** 연속 실천 일수(Streak) 표시 및 사용자 직접 편집(수정/추가/삭제) 가능.

### 탭 3: 가계/자산 (`finance`)
- **담당 컴포넌트:** [FinanceHub.tsx](file:///C:/Users/JU/life-os/src/components/finance/FinanceHub.tsx) ([SmsLedgerParser.tsx](file:///C:/Users/JU/life-os/src/components/finance/SmsLedgerParser.tsx) + [AssetDashboard.tsx](file:///C:/Users/JU/life-os/src/components/finance/AssetDashboard.tsx))
- **주요 기능:**
  1. **문자 파싱 가계부:** 카드 결제 문자나 카카오톡 알림톡을 붙여넣으면 0.1초 만에 `금액`, `가맹점`, `일시`, `결제수단`을 자동 추출하여 저장.
  2. **순자산 대시보드:** 자산(예금, 주식, 부동산 등)과 부채(대출, 카드대금)를 등록하여 `순자산 = 총자산 - 부채`와 부채비율(%)을 실시간 산출 및 포트폴리오 비중 시각화.

### 탭 4: 암호금고 (`vault`)
- **담당 컴포넌트:** [PasswordVaultManager.tsx](file:///C:/Users/JU/life-os/src/components/vault/PasswordVaultManager.tsx)
- **주요 기능:**
  1. **AES-256 Zero-Knowledge Vault:** 오직 사용자 머릿속의 마스터 비밀번호로만 복호화 가능. 서버 관리자나 DB 탈취자도 절대 평문 확인 불가.
  2. **랜덤 비밀번호 생성기:** 영문 대소문자, 숫자, 특수문자를 조합한 16~32자리 강력 비밀번호 생성.
  3. **구글 크롬/라스트패스 CSV 임포트:** 기존에 쓰던 비밀번호 CSV 일괄 암호화 저장.

### 탭 5: 헬스1RM (`health`)
- **담당 컴포넌트:** [HealthHub.tsx](file:///C:/Users/JU/life-os/src/components/health/HealthHub.tsx) ([Workout1RMTracker.tsx](file:///C:/Users/JU/life-os/src/components/health/Workout1RMTracker.tsx), [BodyMetricsCard.tsx](file:///C:/Users/JU/life-os/src/components/health/BodyMetricsCard.tsx), [LifePhotoGallery.tsx](file:///C:/Users/JU/life-os/src/components/gallery/LifePhotoGallery.tsx))
- **주요 기능:**
  1. **턱걸이(Pull-up) 전용 트래커 (최상단):** 세트별 횟수를 넉넉한 1열 행 구조와 36px 대형 `[-]` `[+]` 터치 버튼으로 기록. 당일 총 반복 횟수(볼륨), 역대 최고 세트 기록, 날짜별 성장 히스토리 타임라인 자동 집계.
  2. **3대 운동 1RM 계산기:** Epley 공식을 적용하여 스쿼트, 벤치프레스, 데드리프트 1RM 산출 및 3대 500 달성 게이지 바 표시.
  3. **신체 체중 히어로 & 히스토리:** 측정 일시(연월일 시분)를 기록하고, 최신 체중과 직전 대비 증감(±kg)을 대형 카드로 표시.
  4. **애플 건강(HealthKit) 실제 수치 직접 수정:** Safari 브라우저의 보안 제약(웹에서 비공개 네이티브 건강 DB 직접 읽기 불가)을 솔직히 안내하고, **[수치 수정]** 버튼을 통해 사용자가 오늘 실제 확인한 수영 칼로리/시간/거리, 총 활동 칼로리, 심박수, 걸음수를 직접 입력하여 영구 저장.
  5. **인생샷 앨범:** 바디프로필, 여행, 가족 등 폴더별 분류, 모바일 카메라 즉시 촬영 및 갤러리 업로드 지원.

### 부가 기능: 데이터 싱크 센터 & 월간 백업
- **담당 컴포넌트:** [DataSyncHub.tsx](file:///C:/Users/JU/life-os/src/components/sync/DataSyncHub.tsx) (상단 헤더의 DB 아이콘 클릭 시 진입)
- **주요 기능:**
  1. **로우 데이터 직접 파일 업로드:** `.xlsx`, `.csv`, `.docx`, `.pdf`, `.txt` 파일을 기기에서 직접 선택해 업로드하면 로우 데이터를 파싱하여 1초 복사 항목으로 자동 등록.
  2. **월 1회 엑셀 백업 & 이메일 발송:** 한글 깨짐이 없는 **UTF-8 BOM CSV 파일**을 생성하여 다운로드하고 `imidoing@naver.com`으로 원클릭 메일 발송 지원.

---

## 5. 데이터베이스 & 클라우드 동기화 아키텍처

### 5.1 Firestore 데이터 모델
- **루트 컬렉션:** `life_os_users`
- **사용자 문서 ID (`docId`):** `getSyncUserId(email)` 함수를 통해 생성
  - 예: `imidoing@naver.com` ➡️ `usr_imidoing_naver_com`
  - 또는 Google OAuth 로그인 시의 `usr_<uid>`
- **문서 필드 구조 (단일 NoSQL Document):**
```json
{
  "updatedAt": "2026-10-16T12:00:00.000Z",
  "essential_info": [ /* 필수 정보 카드 배열 */ ],
  "general_memos": [ /* 자유 메모 배열 */ ],
  "diaries": [ /* 날짜별 일기 객체 배열 */ ],
  "financial_logs": [ /* 파싱된 가계부 거래 내역 */ ],
  "assets": [ /* 자산 및 부채 항목 */ ],
  "vault_entries": [ /* AES-256 암호화된 비밀번호 항목 */ ],
  "workouts": [ /* 3대 운동 1RM 기록 */ ],
  "pullup_records": [ /* 턱걸이 일자별 세트/총횟수 */ ],
  "health_metrics": [ /* 체중 및 신체 지표 히스토리 */ ],
  "healthkit_summary": { /* 애플 건강 데일리 요약 */ },
  "photos": [ /* 인생샷 사진 데이터 (Base64) */ ]
}
```

### 5.2 지능형 오프라인 우선(Offline-First) & 실시간 병합(Merge) 엔진
- [client.ts](file:///C:/Users/JU/life-os/src/lib/firebase/client.ts)의 `mergeItemsById<T>(local, cloud)` 함수:
  - 기기 로컬스토리지에 항상 1차 저장되어 비행기 모드나 오프라인에서도 즉시 구동.
  - 네트워크 연결 및 로그인 시 클라우드 데이터와 ID 기반으로 합집합 병합 후 `updatedAt`이 최신인 데이터를 반영.
  - Firestore의 `onSnapshot` 실시간 리스너를 통해 PC 웹에서 수정한 내용이 모바일 화면에 새로고침 없이 즉각 실시간 반영.

---

## 6. 보안 및 암호화 모델 (Zero-Knowledge AES-256)

- **구현 파일:** [crypto.ts](file:///C:/Users/JU/life-os/src/lib/security/crypto.ts)
- **알고리즘:** AES-GCM (Key Length: 256-bit, IV: 12-byte random per encryption)
- **키 파생(KDF):** PBKDF2 with SHA-256, 100,000 iterations, 16-byte random salt
- **영지식(Zero-Knowledge) 원칙:**
  - 마스터 비밀번호는 서버나 로컬스토리지 어디에도 영구 저장되지 않으며 메모리에서만 일시 유지.
  - 암호화된 `ciphertext`, `iv`, `salt`만 Base64 형태로 Firestore에 보관되므로 제3자나 데이터베이스 관리자도 복호화가 불가능합니다.

---

## 7. 로컬 개발 환경 셋업 & 빌드/배포 가이드

### 7.1 요구 사양
- Node.js 18.17.0 이상 (권장: Node 20.x LTS)
- npm 9.x 이상 또는 yarn

### 7.2 로컬 개발 시작
```bash
# 1. 저장소 클론
git clone https://github.com/pikurate-ai/life-os.git
cd life-os

# 2. 의존성 설치
npm install

# 3. 환경 변수 파일 (.env.local) 설정
# 프로젝트 루트에 .env.local 생성 후 Firebase 프로젝트 설정 기입:
# NEXT_PUBLIC_FIREBASE_API_KEY=...
# NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=...
# NEXT_PUBLIC_FIREBASE_PROJECT_ID=...
# NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=...
# NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=...
# NEXT_PUBLIC_FIREBASE_APP_ID=...

# 4. 개발 서버 구동
npm run dev
# 접속: http://localhost:3000/
```

### 7.3 프로덕션 빌드 및 정적 익스포트
```bash
# 타입 체크 및 빌드
npm run build

# 결과물: out/ 폴더에 완전한 정적 HTML/CSS/JS 번들 생성
```

### 7.4 GitHub Pages 배포 방식
- `.github/workflows/nextjs.yml` 워크플로우에 의해 `master` 브랜치로 `git push`가 일어나면 GitHub Actions가 자동으로 `npm run build`를 수행하고 GitHub Pages로 배포합니다.
- `next.config.ts`에서 `GITHUB_PAGES === "true"` 환경변수를 감지하여 `basePath`를 `/life-os`로 자동 조정합니다.

---

## 8. 모바일(iOS/Android) PWA 최적화 & UX 특이사항

1. **텍스트 밀림 방지 전수 적용:**
   - 모든 버튼과 핵심 뱃지에 `whitespace-nowrap shrink-0` 및 최소 터치 규격(36~40px) 강제.
   - iOS 한글 입력 시 자음/모음 분리나 글자 세로 꺾임 방지를 위해 `break-keep` 스타일 일괄 적용.
2. **홈 화면 바로가기 갱신 방법:**
   - 웹앱 내부 코드는 새로고침이나 앱 재실행 시 즉시 최신 버전이 반영됩니다.
   - 스마트폰 바탕화면의 "아이콘 이미지 그림" 자체는 OS(특히 iOS)의 보안 정책상 캐시되므로, 새 아이콘으로 바꾸려면 **기존 바로가기를 삭제하고 브라우저에서 [공유 ➡️ 홈 화면에 추가]**를 다시 1회 수행해야 합니다.
3. **사용자 계정 영구 기억:**
   - 모바일 환경에서 마지막 로그인한 사용자 이름과 이메일은 `localStorage` (`life_os_last_auth_name`, `life_os_last_auth_email`)에 영구 보존되어 세션 만료 시에도 임의의 이름으로 바뀌지 않습니다.
4. **최근 방문 탭 복원:**
   - 사용자가 마지막으로 열어둔 탭을 기억하여 다음 실행 시 해당 탭이 기본으로 열립니다 (기본값: '기억' 탭).

---

## 9. 향후 로드맵 & 인계 시 주의점

### 9.1 다음 개발자가 유의할 점
- **절대 `Sparkles` 아이콘을 무분별하게 추가하지 마세요:** 사용자가 AI스러운 별표 아이콘을 지양하고 깔끔한 기능 중심 아이콘을 선호합니다.
- **`1인 전용` 뱃지나 불필요한 PWA 설치 유도 배너를 다시 넣지 마세요:** 화면 공간 확보가 최우선입니다.
- **날짜 입력 피커(Date Input) 레이아웃:** iOS Safari의 `<input type="date">`는 기본 130~150px을 차지하므로 한 줄에 버튼들과 함께 배치할 때 flex-wrap 또는 모바일 분리 배치를 유지해야 글자 꺾임이 발생하지 않습니다.
- **애플 건강 데이터:** Web API의 보안 한계를 이해하고, 시뮬레이션 데이터보다는 사용자가 직접 수치를 수정/보존할 수 있는 UI 플로우를 유지해야 합니다.

### 9.2 향후 확장 권장 사항
1. **iOS 네이티브 패키징 (Capacitor):**
   - 현재 코드베이스는 Capacitor 호환 구조로 설계되어 있으므로, `npx cap add ios`를 통해 Xcode 프로젝트를 빌드하면 네이티브 HealthKit API에 직접 권한을 요청하여 자동 동기화 앱으로 App Store 배포가 가능합니다.
2. **Apple Shortcuts(단축어) 웹훅 연동:**
   - 아이폰 단축어 앱에서 오늘 수영 및 피트니스 데이터를 읽어 Life-OS URL Scheme이나 Firebase REST API로 1클릭 전송하는 자동화 스크립트 연동.
3. **오프라인 이미지 압축 최적화:**
   - 인생샷 앨범 업로드 시 Canvas API 기반 1080p 해상도 자동 리사이징 및 WebP 변환을 적용하여 Firestore 용량 최적화.

---
*본 인계 문서는 Life-OS의 모든 소스 코드와 설계 의도를 완벽히 보증합니다.*
