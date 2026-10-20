# Life OS v2 종합 개발 인계

기준일: **2026-10-21 / Asia·Seoul**. 대상 작업 폴더: `E:\코덱스 프로젝트\라이프 오에스`.

이 문서는 현재 로컬 소스, 제품 의도, 설계 결정, 검증 근거와 미완료 작업을 함께 인계합니다. **검증된 구현 소스 `078ebcc`을 기능 브랜치에 push했고, 별도 공개 테스트는 정적 `d0db06e`로 갱신했습니다.** 상용 판매 준비·실제 iPhone 검증·기기 간 클라우드 동기화 완료를 선언하는 문서가 아닙니다.

처음 인계받았다면 [바로 시작하기](HANDOVER_START_HERE.md) → 이 문서 → [날짜별 작업 스냅샷](docs/HANDOVER_SNAPSHOT_2026-10-18.md)을 읽으세요. 오래된 문서와 충돌할 때 현재 코드와 이 날짜의 검증 범위를 우선합니다. 인증값, 실제 일기·금융·가족 정보, 금고 비밀번호는 인계 문서에 복제하지 않았습니다.

## 1. 지금 가장 중요한 상태

2026-10-20–21 개발을 재개했습니다. [최신 검증 기록](docs/QA_2026-10-21.md)에 사진·목표·빠른 기록·백업·작은 화면·규칙 검사 결과를 추가했습니다. Git/공개 배포의 최종 커밋과 남은 선택은 [현재 상태](PROJECT_STATE.md)를 우선합니다.

| 구분             | 확인된 상태                                                                                                          |
| ---------------- | -------------------------------------------------------------------------------------------------------------------- |
| 개발 브랜치      | `codex/life-os-v2`                                                                                                   |
| 검증된 구현 커밋 | `078ebccffb32d4f8a84d41923c65ee584f1a900b` — 후속 검증 문서 커밋과 구분                                              |
| 최신 기능        | 사용성·입력·백업·모달·규칙 검사 개선을 커밋하고 원격 기능 브랜치에 반영                                              |
| 원격 소스        | [pikurate-ai/life-os](https://github.com/pikurate-ai/life-os), `codex/life-os-v2`의 구현 기준 `078ebcc`              |
| 검토 PR          | [초안 PR #1](https://github.com/pikurate-ai/life-os/pull/1). 최신 로컬 변경 반영 여부를 확인하고 갱신할 것           |
| 기존 서비스      | [life-os](https://pikurate-ai.github.io/life-os/). 최신 v2 변경의 운영 배포가 확인된 주소가 아님                     |
| 공개 테스트      | [life-os-preview](https://pikurate-ai.github.io/life-os-preview/), 소스 `078ebcc` / 정적 `d0db06e`. 클라우드 OFF     |
| 최신 로컬 검사   | 포맷·타입·59개 자동 테스트·추가 CSV/일기/암호화 검사 통과. 별도 규칙 통합 9개 통과                                   |
| 포맷 검사        | 기존 5개 서식 오류 정리 후 통과                                                                                      |
| 최신 전체 빌드   | 일반·iPhone 테스트 정적 빌드 통과, 소스 CI와 공개 Pages/HTTPS 확인                                                   |
| 실제 계정·동기화 | CLI 관리자 로그인 성공. 현재 계정의 프로젝트 목록 0개/기존 프로젝트 조회 실패. 앱 사용자 OAuth·두 기기 검증은 미완료 |
| 사용성 평가      | 합성 시나리오 1–6 일부와 후속 7–10 주요 흐름 검사. 실제 사람 10명 평가가 아님                                        |

**다른 PC에서는 master가 아닌 `codex/life-os-v2` 브랜치를 받으세요.** 검증된 구현 커밋은 `078ebcc`이며 이후에는 검증 문서 갱신 커밋이 있을 수 있습니다. 로컬 추가 변경이 있는지 Git 상태도 확인하세요. `.env.local`·개인 백업·원본 CSV·인증 토큰은 소스와 분리하고 사용자 데이터는 별도 앱 백업으로 옮깁니다.

## 2. 제품의 목적과 사용자 맥락

Life OS는 일상을 기록하고 다시 꺼내 보며, 다음 행동을 작게 이어가는 개인 운영 도구입니다. 일·공부·독서·운동·가족·재정·일기·디지털 계정을 한곳에서 관리합니다. 기능 수보다 **빠른 기록, 쉬운 재검색, 안정적인 보존, 부담 없는 지속**이 우선입니다.

주 사용자는 AI 및 스타트업 경험이 있는 두 자녀의 아버지입니다. AI·클라우드 학습과 자격 취득, 장기적인 해외 취업 준비, 수영·턱걸이·달리기, 재정 재정비, 가족의 기억을 함께 관리하려 합니다. 신앙과 성찰도 본인이 원하는 방식으로 남길 수 있어야 합니다. 세부 가족 식별 정보·법적/금융 상황을 데모나 공개 소스에 넣지 않습니다.

핵심 흐름은 **오늘 확인 → 바로 기록 → 필요할 때 검색 → 다음 행동 확인**입니다. 작은 기록을 격려하되 강제 반복 알람이나 죄책감을 유도하지 않습니다. 실제 기록 없이 스트릭·건강 수치·진척도를 만들어내지 않습니다.

사용자는 상용 유료 앱에 준하는 디자인·안정성·계정 관리와 PC/모바일 동기화를 원합니다. 기존 상용 앱의 익숙한 탐색·편집 관례를 참고하되 브랜드·화면 자산을 그대로 복제하지 않습니다. 세부 목적은 [제품 기획](docs/PRODUCT_BRIEF.md)에 있습니다.

### 유지해야 할 설계 결정

- 첫 화면은 오늘의 할 일·루틴·최근 기록을 연결하는 대시보드입니다.
- 기존 5개 영역을 오늘·목표·읽기·사진·설정으로 확장했습니다. 사진은 운동에서 독립했습니다.
- 가짜 Apple Health 연결·이메일 문자열을 인증으로 취급하는 경로·강제 일기 알람은 새 앱에 연결하지 않습니다.
- 스트릭은 실제 날짜별 기록에서 계산합니다. 사용자가 수치를 직접 조작하는 기능을 복원하지 않습니다.
- 외부 계정의 자동 수집과 파일 가져오기는 구분합니다. 연결되지 않은 서비스를 연결 완료로 표시하지 않습니다.
- 기록이 없으면 빈 상태와 다음 행동을 보여줍니다. 실제 기록으로 오인할 예시를 섞지 않습니다.

## 3. 기술 스택과 실행

| 항목           | 현재 기준                                                                            |
| -------------- | ------------------------------------------------------------------------------------ |
| 런타임         | **Node.js 24**, npm / `package-lock.json` 사용                                       |
| 앱             | Next.js **15.5.28**, App Router, React 19, TypeScript strict                         |
| 스타일         | Tailwind CSS 4 의존성, 공유 CSS 토큰·CSS Modules·Lucide 아이콘                       |
| 출력           | Next static export → `out/`, API 서버 없이 정적 호스팅                               |
| 계정/원격 저장 | Firebase JS SDK 12 계열, Google OAuth, Firestore                                     |
| 오프라인 저장  | LocalStorage 공간별 캐시·지속 전송 큐, service worker 앱 셸                          |
| 금고           | Web Crypto, AES-GCM 256, PBKDF2 SHA-256 600,000회                                    |
| 품질 도구      | TypeScript, Node test runner, 별도 CJS 암호화/가져오기 검사, Prettier                |
| 규칙 검사      | firebase-tools 15.34.0, rules-unit-testing 5.0.2, Java 21 전용 emulator에서 9개 통과 |
| 과거 의존성    | Capacitor/Supabase 파일·패키지가 남아 있음. 현재 v2 인증/저장은 Firebase 모듈 사용   |

정확한 설치 버전은 lockfile을 따릅니다. 원래 인계에 있던 Next 15.2.4·PBKDF2 10만 회·단일 사용자 문서 구조는 현재 v2 사양이 아닙니다.

```sh
npm ci
npm run dev
# 기본 로컬 앱: http://localhost:3000/
# 레이아웃 리뷰: http://localhost:3000/review
```

```sh
npm run format:check
npm run typecheck
npm test
# 개발 서버를 종료한 다음 실행
npm run build
npm run preview
```

개발 서버와 빌드는 Next 출력 디렉터리를 공유하므로 동시에 실행하지 않습니다. `npm run preview`/현재 `npm start`는 `scripts/serve.cjs`로 정적 산출물을 서비스합니다. `next start`는 static export에 맞지 않습니다. 프로세스가 떠 있다고 최신 소스 빌드가 검증된 것은 아닙니다.

Pages 경로는 빌드 시 결정됩니다. `GITHUB_PAGES=true`는 `/life-os`, `npm run build:iphone`은 `/life-os-preview`를 사용합니다. 로컬 일반 개발은 `/`가 기준입니다. 정적 앱에서는 Firebase 설정 변경 후 재빌드가 필요합니다.

## 4. 코드 지도와 책임

```text
src/app/
  page.tsx                    앱 진입
  layout.tsx                  메타데이터·전역 레이아웃
  globals.css                 디자인 토큰·공통 UI·모바일 대응
  review/page.tsx, review.css  모바일/웹 선택 리뷰 화면
src/components/life-os/
  LifeOS.tsx                  Provider·작업 공간·탐색·검색·빠른 기록
  TodayView.tsx               오늘·할 일·루틴·주간 요약
  DiaryView.tsx               일기·기분·가져오기
  MemoryView.tsx              자주 꺼낼 정보·메모
  HealthView.tsx              운동·체중·기록 편집
  FinanceView.tsx             거래·자산·문자 초안
  LibraryView.tsx             읽을 링크·태그
  GalleryView.tsx             압축 사진·설명
  GoalsView.tsx               목표·단계·진행
  VaultView.tsx               잠금·암호화·CSV·비밀번호 생성
  SettingsView.tsx            계정·동기화·백업·이전
  ui.tsx                     공유 버튼·모달·필드·배지 등
  domain.module.css           여러 도메인의 공통 레이아웃
  domain-utils.tsx            도메인 공통 도우미
  health-diary-vault.css      해당 세 도메인의 세부 UI
src/lib/life-os/
  types.ts                    기록·페이지·로컬 날짜 계약
  records.ts                  검증·결정적 병합·백업·승인 버전
  store.tsx                   로컬 저장·계정·원격 전송·리스너
  firebase.ts                 named Firebase app·설정 검사
  storage.ts                  운영/preview 저장 키 분리
  demo.ts                     현재 날짜 기준의 가상 기록
  editing.ts                  편집 시 이전 메타데이터 보존
  search.ts                   전체 검색·민감 정보 처리
  imports.ts                  CSV·일기 파일 파싱
  legacy.ts, legacy-photo.ts  명시적 구버전 변환·사진 압축
  backup.ts                   v1/v2 백업 검사·변경분 보존 [신규]
  vault-crypto.ts              키 파생·인증 암호화·난수
  vault-model.ts               금고 내용·키 연결·검증
  scroll-lock.ts               중첩 UI 스크롤 잠금 [신규]
scripts/
  build-config.cjs             경로·테스트 빌드 공통 계약
  build-iphone.cjs             클라우드 OFF 별도 테스트 빌드
  generate-icons.cjs           SVG/PNG 아이콘 생성
  serve.cjs                   정적 산출물 서버
  test-health-vault.cjs        도메인·암호화 추가 검사
public/                       manifest·service worker·설치 아이콘
tests/                        자동 테스트·합성 fixture
.github/workflows/            PR 품질 검사·master Pages 배포
firestore.rules               UID별 접근·필드·삭제 규칙
firestore.indexes.json        범용 큰 data 색인 제외 설정
firebase.rules-test.json      격리된 규칙 에뮬레이터 설정 [신규]
docs/                         기획·아키텍처·디자인·QA·배포
```

앱 진입은 `src/app/page.tsx` → `LifeOS.tsx` → `LifeProvider` → 계정 범위에 keyed된 `WorkspaceShell`입니다. 화면은 `useLife`를 사용하며 각자 Firebase를 초기화하거나 별도의 도메인 LocalStorage를 만들지 않습니다. 계정 전환 시 화면의 모달·초안도 재생성하여 이전 계정 내용이 남지 않게 합니다.

과거 `src/components/auth`, `diary`, `health`, `finance`, `src/lib/firebase/client.ts`, Supabase·iOS 코드는 역사적 자료입니다. 새 기능의 기준은 `src/components/life-os/`와 `src/lib/life-os/`입니다. 루트의 `sheet1.csv`, `sheet2.csv`는 현재 UI 작업과 무관한 과거 원본으로, 열거나 예시·백업에 포함하지 않습니다.

## 5. 화면별 구현과 최근 개선

| 공간          | 동작과 목적                                        | 현재 로컬의 최근 개선                                                             |
| ------------- | -------------------------------------------------- | --------------------------------------------------------------------------------- |
| 오늘          | 날짜별 할 일·루틴·일기·주간 운동·목표·자료 요약    | 선택 날짜의 일기로 이동, 운동 분·초 요약, 루틴 삭제 확인, 입력 오류 표시          |
| 기억과 메모   | 생활·가족·업무·공부 정보, 고정·검색·복사·민감 표시 | 전체 본문 읽기, 긴 URL 처리, 가림 유지, 저장 후 필터 복구                         |
| 하루 일기     | 날짜·기분 1–5·본문·감사, 검색·파일 가져오기        | 선택한 과거 날짜 전달, 새 일기/기존 일기 구분, 짧은 회고 안내, 중복 가져오기 안내 |
| 건강과 운동   | 수영·달리기·턱걸이·선택적 근력·매일 체중           | 분·초 입력, 거리 단위 명시, 종목 변경 시 거리 초기화, 저장한 기록 노출            |
| 가계와 자산   | 월 수입·지출·자산·부채·순자산, 문자에서 거래 초안  | 기존 사용자 분류 보존, 0원 자산 허용, 저장한 월/필터로 이동                       |
| 나중에 읽기   | URL·메모·태그·읽음·즐겨찾기                        | 잘못된 URL 거부, 저장 후 검색 해제, 모바일 검색 폭 수정, 원문 새 탭               |
| 소중한 순간   | 날짜·분류·설명의 압축 사진                         | 같은 파일 재선택, 옛 링크 사진 설명 편집, 용량을 늘리지 않는 수정 허용            |
| 목표와 성장   | 분류·기한·단계·완료 상태                           | 재개 시 단계 보존, 동일 이름 단계의 완료 중복 방지                                |
| 암호금고      | 마스터 암호·생성·복사·CSV·자동 잠금                | 가져오기 중 중복 동작 차단, 암호화 중 입력 잠금, 잠금 시 평문 초안 참조 정리      |
| 설정과 데이터 | 실제 계정·저장/동기화 상태·백업·이전               | v1/v2 파일 미리보기, 대상 공간 표시, 변경분 비파괴 보존, 미리보기 승인 토큰       |

모든 새 폼은 초안 변경 후 닫을 때 버리기 확인을 적용하는 방향으로 정리했습니다. X·취소·Escape·배경 클릭이 같은 닫기 계약을 사용합니다. 확인 UI는 같은 모달에 표시하여 초안을 보존합니다. 신규 변경의 실기기 검증은 아직 남아 있습니다.

### 운동 단위

달리기 거리 `km`, 수영 거리 `m`, 저장 시간 `분`, 턱걸이 세트 `반복 횟수 배열`, 근력 하중과 체중 `kg`입니다. 최신 UI의 분/초는 `분 + 초/60`으로 저장합니다. 달리기 페이스는 시간/거리에서 계산합니다. 거리 숫자만으로 종목을 바꾸면 의미가 달라지므로 종목 변경 시 입력값을 재확인합니다.

### 사진 범위

선택한 사진을 작은 JPEG 사본으로 압축합니다. 단일 사본 최대 약 120KB, 현재 갤러리 총량 2MB 제한을 사용합니다. 실제 코드를 변경할 때 상수와 저장 용량을 함께 검토하세요. 원본 앨범·iCloud 동기화가 아니며 HEIC는 변환한 JPEG/PNG가 필요할 수 있습니다. 향후 원본 보관은 인증된 Object Storage와 업로드·삭제·보관 정책으로 분리해야 합니다.

## 6. 데이터 모델·캐시·동기화 계약

```ts
interface LifeRecord {
  id: string;
  type: RecordKind;
  title: string;
  body: string;
  date: string; // 사용자의 로컬 날짜 YYYY-MM-DD
  updatedAt: string; // 밀리초를 포함한 UTC ISO 문자열
  deletedAt?: string;
  data: Record<string, string | number | boolean | string[] | number[] | null>;
}
```

| 종류        | 대표 data 필드                                                         |
| ----------- | ---------------------------------------------------------------------- |
| task        | completed, category, time                                              |
| routine     | completedDates, icon, target                                           |
| memory      | category, pinned, 민감 표시 관련 메타데이터                            |
| diary       | mood, gratitude, 가져오기 출처 메타데이터                              |
| workout     | activity, distance, duration, sets, exercise, load, reps               |
| weight      | kg, 가져온 부가 수치                                                   |
| transaction | direction: income/expense, amount, category                            |
| asset       | direction: asset/liability, amount, category                           |
| bookmark    | url, tags, read, favorite                                              |
| photo       | image, category, bytes 또는 보존된 이전 링크                           |
| goal        | category, steps, completedSteps, targetDate, status                    |
| vault       | role, version, iv, ciphertext, config의 salt/iterations, entry의 keyId |

`data`는 자유로운 중첩 JSON 저장소가 아닙니다. `validateRecord`의 종류별 계약·용량 제한을 통과해야 합니다. 새 레코드 ID는 안전한 UUID, 구버전 변환 ID는 결정적 ID입니다. 편집은 `preserveRecordData`를 사용해 출처·가져온 부가 정보를 유지합니다. 금액은 KRW 정수입니다. 날짜는 `localDate()`를 사용하며 UTC 날짜를 잘라 로컬 날짜로 쓰지 않습니다.

현재 한 레코드 최대 **650,000바이트**, 백업 최대 **25MiB**, 공간 최대 **10,000개**입니다. 브라우저의 실제 LocalStorage quota는 별도입니다. 미래 24시간을 넘는 갱신 시각 등 오염된 데이터는 거부합니다. 자세한 경계 검증은 `records.ts`가 기준입니다.

### 작업 공간과 저장 위치

- `demo`: 가상 체험 기록.
- `guest`: 로그인 전 이 기기의 개인 기록.
- `uid:<Firebase UID>`: 인증 계정별 기록.
- 일반 캐시 키: `life-os:v2:workspace:${encodeURIComponent(scope)}`.
- 테스트 빌드: `life-os:preview:${encodeURIComponent(basePath)}:v2:...` 이름 공간.
- 리뷰 보기 선택은 별도 `life-os:layout-review:view` 키이며 사용자 기록이 아닙니다.

캐시 envelope는 version·scope·records·pending·acknowledged를 가집니다. 다른 공간의 캐시를 해당 키에 복사해도 scope 검사로 거부합니다. demo/guest 기록을 로그인 계정에 자동 합치지 않습니다. 로그인/로그아웃은 브라우저 디스크의 기존 계정 캐시 삭제와 같은 의미가 아닙니다.

### 저장부터 클라우드 승인까지

1. 새 기록을 검증하고 단조 증가하는 갱신 시각을 만듭니다.
2. 현재 공간의 디스크 상태를 다시 읽어 다른 탭의 변경과 병합합니다.
3. 기록과 pending 큐를 **먼저 지속 저장**합니다. quota/security 실패 시 성공 표시를 하지 않습니다.
4. 로그인·온라인 상태면 Firestore `users/{uid}/records/{id}` 트랜잭션으로 전송합니다.
5. 서버와 버전을 비교해 더 오래된 오프라인 수정이 새 기록을 덮지 않게 합니다.
6. 정확히 승인된 버전만 큐에서 제거하고 승인 버전을 저장합니다. 캐시 snapshot만으로 클라우드 성공을 표시하지 않습니다.
7. `onSnapshot`과 브라우저 storage 이벤트로 원격/다른 탭을 병합하고, 재연결 시 대기분을 재시도합니다.
8. 비동기 결과마다 현재 UID와 scope를 확인합니다. 전환 중에는 이전 공간 목록을 노출하지 않습니다.

충돌 해결은 **레코드 단위의 결정적 Last Write Wins**입니다. 같은 시각에는 삭제 우선과 결정적 비교를 사용합니다. 필드별 공동 편집·무손실 이력·CRDT가 아닙니다. 시계 오차와 동시 수정에 대한 실기기 통합 검증이 필요합니다. 삭제는 내용을 지운 tombstone으로 전달하며 자동으로 지우거나 옛 백업으로 되살리지 않습니다.

## 7. 계정·보안·금고

### 실제 로그인 전제

새 Firebase 앱 이름은 `life-os-v2`입니다. 다음 6개 빌드 환경 값이 모두 유효해야 실제 로그인/클라우드 경로를 켭니다. 값 자체는 이 문서에 기록하지 않습니다.

```text
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

웹 설정은 관리자 서비스 계정 키가 아닙니다. 접근 통제는 Firebase Auth와 Firestore 규칙이 담당합니다. 환경 값의 존재만으로 Google 공급자·허용 도메인·운영 규칙이 설정되었다고 보지 않습니다. 과거 하드코딩 fallback과 이메일 문자열 로그인은 재사용하지 않습니다.

Firebase CLI 관리자 Google 로그인은 완료했습니다. 다만 현재 계정의 프로젝트 목록이 0개이고 기존 프로젝트 조회도 실패했습니다. 기존 프로젝트 접근 계정으로 연결할지 별도 v2 프로젝트로 이전할지 사용자 선택을 기다립니다. 앱 사용자 로그인·운영 관리 권한이 모두 검증된 상태는 아닙니다. OAuth URL의 상태값·코드·CLI 토큰을 문서에 복사하지 않습니다.

### 금고 암호화

마스터 암호로 PBKDF2 SHA-256 **600,000회**, 랜덤 16바이트 salt를 사용해 AES-GCM 256 키를 파생합니다. 암호화마다 랜덤 12바이트 IV와 `life-os-vault-v2` 인증 추가 데이터를 사용합니다. 서비스명·계정·URL·비밀번호 등 금고 메타데이터와 자격 증명은 암호화하고, 바깥 레코드에는 일반 제목과 필요한 암호문/연결 필드만 둡니다.

마스터 암호와 복호화 객체는 지속 저장하거나 로그에 남기지 않습니다. 화면 해제·백그라운드 전환·유휴 잠금 경로와 평문 초안 정리가 있습니다. 기본 새 마스터 입력은 12자 이상입니다. 마스터 암호 분실 복구는 구현되어 있지 않습니다. CSV는 브라우저에서 파싱하고 암호화하여 저장합니다. 다른 서비스의 실제 비밀번호를 바꾸는 기능은 아닙니다.

금고 외 일반 일기·금융·사진은 브라우저 캐시에 평문으로 저장됩니다. 일반 기록 전체가 종단간 암호화되었다고 안내하면 안 됩니다. 금고 전용 보안 감사, 계정 삭제, 캐시 제거 UI, XSS 방어 검토·운영 모니터링은 상용 출시 작업으로 남습니다.

### Firestore 규칙 전환

제공 규칙은 v2 UID별 경로만 허용하고 클라이언트 hard delete를 막습니다. 기존 프로젝트의 v1 컬렉션 접근은 허용하지 않습니다. **기존 운영 프로젝트에 그대로 배포하면 v1 사용이 중단될 수 있습니다.** 원래 규칙·데이터를 백업하고 별도 v2 테스트 프로젝트 또는 검증된 전환 계획을 먼저 준비하세요. 규칙 소스 존재는 운영 배포나 공격/권한 테스트 통과를 의미하지 않습니다.

## 8. 기존 데이터·외부 자료·백업

### 지원되는 가져오기

| 원본                                             | 현재 방식                                                     | 미구현 범위                             |
| ------------------------------------------------ | ------------------------------------------------------------- | --------------------------------------- |
| Google Docs의 예전 일기                          | 사용자가 내보낸 지원 TXT/Markdown/JSON, 날짜별 분리·중복 검사 | Google 계정 OAuth로 문서 일괄 자동 수집 |
| LastPass/Google Password Manager/Excel 관리 암호 | 내보낸 CSV, 미리보기·검사 후 금고 암호화                      | 서비스 직접 접속, XLSX 바이너리 해석    |
| 예전 Life OS                                     | 같은 브라우저의 명시적 이전 기록 가져오기 또는 v1 전체 JSON   | 다른 origin의 LocalStorage 자동 읽기    |
| 사진                                             | 사용자가 선택한 파일·지원하는 이전 이미지/링크                | iPhone/iCloud 앨범 자동 동기화          |
| 은행·Apple Health                                | 직접 기록/지원되는 수동 자료                                  | 은행/HealthKit 자동 연동                |

브라우저 LocalStorage는 **origin 단위**입니다. `localhost`, `127.0.0.1`, GitHub Pages는 각각 다른 저장소입니다. 같은 GitHub Pages origin 아래 경로는 저장소를 공유하므로 preview namespace로 구분합니다. 기기·프로필·Safari와 홈 화면 앱의 저장 공간 차이도 고려하고 이동 전 JSON 백업을 확보하세요.

### v2 전체 백업

```ts
{
  format: 'life-os',
  version: 2,
  exportedAt: 'UTC ISO timestamp',
  workspace: 'demo' | 'guest' | 'account',
  records: [] // 삭제 tombstone과 금고 암호문 포함
}
```

UID·이메일 식별자를 전체 백업 envelope에 담지 않습니다. 일반 기록은 백업에서도 평문이므로 안전한 곳에 보관합니다. 금고는 암호문을 보존하며 원래 마스터 암호가 필요합니다. 파일 전체를 검증한 뒤 병합합니다.

### 최신 v1/v2 미리보기와 안전한 적용

새 `backup.ts`는 정확한 v1 `app:'Life-OS', version:'1.0.0', exportedAt, data`와 v2만 받습니다. v1의 7개 필수 배열은 essentialInfo, financialLogs, assets, encryptedVault, workout1RM, healthMetrics, archivedDiaries입니다. 실제 로컬 키/별칭 변환 계약은 [아키텍처의 구버전 표](docs/ARCHITECTURE.md#audited-legacy-migration-contract)에 있습니다.

v1 전체 백업은 원래 사진·일반 메모·턱걸이 세트·루틴을 포함하지 않았습니다. 이 누락을 복구 완료로 오인시키지 않으며 원본 브라우저의 명시적 이전 기능을 별도로 안내합니다. 예전 암호문과 새 금고는 형식이 달라 자동 해독을 약속하지 않습니다.

설정 화면의 `previewBackup(file)`은 출처·대상 공간·활성/삭제/중복/충돌 수를 보여줍니다. 실제 `importBackup(file, token)`은 같은 File, 현재 세션·scope, 변경되지 않은 기록 버전을 요구합니다. 취소·새 파일·계정 전환 시 승인을 무효화합니다.

반복 v1 가져오기에서 같은 ID의 내용이 바뀌었다면 기존 기록을 덮지 않고 확인용 memory 사본과 검증된 `importSnapshot`을 남깁니다. 거래·운동 통계를 중복 합산하지 않기 위한 정책입니다. 금고 사본은 암호문 형식을 유지합니다. 동일 변경의 재가져오기는 중복을 만들지 않고, 삭제 기록도 되살리지 않습니다. 이 경로의 자동 검사와 v1/v2 미리보기→적용·오류 차단·재가져오기 중복 표시를 브라우저에서 확인했습니다. 변경 사본의 모든 경계와 실기기 다운로드는 추가 검증이 필요합니다.

**개인 데이터 백업과 코드 인계는 별개입니다.** 실제 웹에서 저장한 기록이 소스 폴더나 Git에 들어 있다고 가정하지 마세요. 이번 인계 문서 작성에서 개인 브라우저 기록·Firebase 데이터 전체를 수집하거나 백업하지 않았습니다.

## 9. 디자인 시스템·모바일 레이아웃

기준은 [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md), 실제 토큰은 `globals.css`, UI는 `ui.tsx`입니다. 차분한 그린 배경·백색 카드·OS 기본 한글 글꼴을 사용합니다.

| 역할                         | 기준                                               |
| ---------------------------- | -------------------------------------------------- |
| 배경 / 표면                  | `#f6f7f5` / `#ffffff`                              |
| 주요 글자 / 브랜드           | `#293b32` / `#386750`                              |
| 테두리                       | `#e6e9e3`                                          |
| 카드 / 입력 모서리           | 14–16px / 8px                                      |
| 모바일 입력                  | 글자 16px 이상                                     |
| 최신 모바일 주요·아이콘 동작 | 44px 이상을 기준으로 조정                          |
| 아이콘                       | 독립적인 8방향 꽃/별 SVG와 설치 PNG, 기능은 Lucide |

새 grid는 `minmax(0,1fr)`, flex 본문은 `min-width:0`, 긴 URL은 의도적으로 줄바꿈합니다. 버튼 레이블은 함께 유지하고 액션 그룹이 별도 행으로 내려갑니다. Safe area·하단 탐색 여백·감소된 모션·사용자 확대·접근 가능한 이름을 유지합니다.

### iPhone 입력창 이탈 제보에 대한 현재 변경

사용자는 실제 iPhone 13 Pro에서 일기 입력이 화면 밖으로 벗어난다고 제보했습니다. 날짜/time/month 입력의 네이티브 최소 폭을 제어하고 필드 자식의 폭을 제한했습니다. 모달은 VisualViewport 크기·오프셋 변화에 맞춰 가용 높이/폭을 갱신하고 내부를 스크롤합니다. 모바일에서는 입력 자동 포커스로 키보드를 먼저 열지 않습니다.

초안 버리기 확인은 원래 폼을 unmount하지 않습니다. 포커스 복귀는 연결된 요소인지 확인하고 대체 빠른 기록 동작으로 복귀합니다. drawer→modal 전환의 스크롤 잠금은 참조 계수로 관리합니다. 매우 긴 모달 제목은 폼 높이를 모두 차지하지 않도록 제한합니다.

Chromium 390×500 모의 화면에서 모달 366×476, 입력 폭 326px·글자 16px·내부 스크롤을 확인했습니다. **이는 실제 iOS Safari 날짜 선택기·키보드 검증을 대신하지 않습니다.** 실제 iPhone에서 같은 일기 폼을 재검사해야 합니다.

### 오른쪽 리뷰 화면 사용

`/review`에서 모바일/웹을 직접 선택합니다. 선택값은 저장되며 모바일 iframe은 **390×844**, 웹은 **1440×900**입니다. 모바일 가로·짧은 높이 모의도 있습니다. 패널 폭에 따라 바깥 표시 배율만 조정하며 iframe의 CSS 픽셀 폭을 바꾸지 않습니다. iframe 경로는 컴파일된 basePath를 사용합니다.

이 화면은 레이아웃 주석용 도구입니다. 실제 iPhone Safari 엔진·키보드·홈 화면 설치를 에뮬레이션하지 않습니다. 표시 배율로 작아 보이는 것과 내부 반응형 폭을 구분하세요.

## 10. Git·배포·공개 주소

| 주소/대상                                                       | 의미                                  |
| --------------------------------------------------------------- | ------------------------------------- |
| [원본 저장소](https://github.com/pikurate-ai/life-os)           | master 기존 운영, 기능 브랜치 v2 개발 |
| [초안 PR #1](https://github.com/pikurate-ai/life-os/pull/1)     | 검토용, merge/운영 배포와 별도        |
| [기존 서비스](https://pikurate-ai.github.io/life-os/)           | v2가 운영 배포된 주소가 아님          |
| [공개 테스트](https://pikurate-ai.github.io/life-os-preview/)   | 2026-10-21 기기 저장 테스트 빌드      |
| [테스트 저장소](https://github.com/pikurate-ai/life-os-preview) | 소스 대신 `out/` 정적 파일 게시       |

2026-10-21 공개 preview의 소스는 `078ebcc`, 정적 커밋은 `d0db06e1ffabe2593119bfa6d3e1c09207c78187`입니다. [Pages 실행 39504064724](https://github.com/pikurate-ai/life-os-preview/actions/runs/39504064724)의 build/deploy가 성공했고, 실제 HTTPS의 최신 HTML·리뷰·manifest·SW·설치 아이콘·스크립트/CSS를 확인했습니다. [소스 CI 실행 39503884788](https://github.com/pikurate-ai/life-os/actions/runs/39503884788)의 validate와 Firestore 규칙 job도 성공했습니다. 이전 `649b020`/`b408294` 배포는 2026-10-17 이력입니다.

preview는 main/루트의 Pages 브랜치 배포, HTTPS 강제입니다. API의 build_type `legacy`는 Pages 설정 명칭이며 v1 앱 사용이라는 뜻이 아닙니다. `build:iphone`은 Firebase 웹 값을 비우고 앱에서도 강제로 클라우드를 끕니다. **이 명령으로 PC·iPhone 동기화 출시를 시도하면 안 됩니다.** 실제 클라우드 검증에는 Firebase가 켜진 별도 빌드가 필요합니다.

기존 `deploy.yml`은 master push/수동 배포에서 Firebase 6개 값을 확인하고 Pages 경로로 빌드합니다. 값이 없으면 중단합니다. rules 배포는 별개입니다. 사용자가 승인한 공개 테스트 배포와 기능 브랜치 push/PR 갱신을 수행했습니다. master merge·기존 운영 DB/규칙 변경은 수행하지 않았습니다.

배포 재개 시 [DEPLOYMENT.md](docs/DEPLOYMENT.md)를 읽고 로컬 변경 보존 → 코드/데이터 전환 검토 → 검사 → 기능 브랜치 일반 push/PR → 적합한 대상 배포 → 실제 HTTPS·로그인·두 기기 검증을 진행합니다. `.git` 초기화·강제 push·원격 이력 덮어쓰기는 하지 않습니다.

## 11. 검증 근거와 알려진 미완료

### 최신 로컬 자동 검사 — 2026-10-20–21

- `npm run format:check`, `npm run typecheck`: 통과.
- `npm test`: **59개 통과, 실패 0개**, 후속 CSV·일기·암호화 검사 통과.
- `npm run test:rules`: **9개 통과, 실패 0개**. 일반 59개와 별도인 합성 emulator 검사.
- `npm run build`: 일반 정적 export 통과. 기본 sandbox의 spawn EPERM 후 허용된 실행 권한으로 완료.
- Node의 MODULE_TYPELESS_PACKAGE_JSON은 알려진 안내이며 테스트 실패가 아님.

규칙 검사는 `demo-life-os-qa`, `127.0.0.1:8085`만 사용합니다. `.tools`에 공식 체크섬을 확인한 portable Java 21을 준비했고 시스템/전역 설정을 바꾸지 않았습니다. CI는 Java 21을 설치합니다. 실제 운영 규칙을 배포하거나 사용자 DB를 대상으로 검사하지 않았습니다.

### 규칙 검사 연결 완료와 한계

이전에 없던 `test:rules`를 연결했고, 예약 ID를 Firestore 자체가 거부하는 invalid-argument와 규칙의 permission-denied를 구분하도록 테스트를 바로잡았습니다. owner/다른 사용자/익명, 이전 경로, 금고 평문 차단, tombstone, 오래된 갱신 거부를 로컬에서 확인했습니다. CI 성공과 운영 배포·실계정 권한 검증은 별개로 확인해야 합니다.

### 실제로 수행한 브라우저 검사

이전 기본 빌드에서는 320–1440px 화면·모달·긴 문자열·운동 저장/수정/삭제·로컬 별도 창·사진 압축·오프라인 앱 셸을 확인했습니다. 공개 preview는 HTML/manifest/SW/아이콘/스크립트 HTTP 200과 달리기 저장·새로고침을 확인했습니다. 상세는 [QA.md](docs/QA.md)에 날짜별로 구분합니다.

최근 합성 사용자 시나리오는 별도 localhost **demo 공간**에서 일기·운동·금고·메모·가계·읽기 일부를 실제 버튼으로 검사했습니다. 0.5km/2분30초→5′00″/km, 수정 3분15초→6′30″/km, 수영 500m/15분, 0원 자산 저장, 긴 메모·URL, 잘못된 URL 거부, 필터 복구를 확인했습니다. 읽기 화면의 검색 폭 축소 문제를 발견해 수정 후 가로 넘침을 재측정했습니다.

2026-10-18에는 사진 업로드 직전 도구 크레딧 제한으로 검증이 중단됐습니다. 2026-10-20–21에 재개하여 합성 아이콘 사진 압축·저장·재열기, 목표 재개/중복 이름 단계 보존, 빠른 기록 초안·키보드, v1/v2 백업 적용/오류 차단/중복 표시와 작은 화면을 추가 확인했습니다. IAB 내보내기 완료 알림은 있었으나 download 이벤트가 없어 실제 파일 다운로드는 미확인입니다. 최신 범위는 [검증 기록](docs/QA_2026-10-21.md)을 확인하세요. 일부 합성 기록은 별도 3100 포트 demo에 남아 있으며 실제 사용자 기록을 테스트용으로 옮기거나 지우지 않았습니다.

실제 사람 10명의 인터뷰·별점·후기, 실제 iPhone 13 Pro Safari의 날짜/키보드, 실계정 OAuth, 운영 Firestore 권한, 데스크톱+iPhone 동기화는 아직 확인되지 않았습니다.

## 12. 다음 개발자가 이어갈 순서

1. **현재 작업본 보존:** 기능 브랜치·최신 커밋·diff·신규 파일 확인. 개인 기록 백업은 소스와 분리하고 과거 clone으로 덮지 않기.
2. **검사 재현:** 포맷·타입·59개 테스트·규칙 9개·일반 빌드의 최신 근거와 CI 확인. 새 변경이 있을 때 관련 검사를 갱신.
3. **남은 사용성 경계:** 완료한 7–10 주요 흐름 외 최신 금고 CSV·백업 변경 사본·저장 실패·접근성, 긴 한글/URL와 좁은 화면 추가 검사.
4. **실제 iPhone 재현:** Safari/홈 화면에서 일기 날짜 입력·키보드·스크롤·닫기·포커스·사진 선택. 우측 리뷰 결과와 실제 기기 결과를 별도 기록.
5. **클라우드 운영 설정:** 소유자 권한 확인, Google 공급자·허용 도메인·Firestore·규칙 전환 계획, CI 환경 값 등록. 구버전 서비스 영향 검토 후 진행.
6. **두 기기·두 계정 검증:** 같은 계정의 생성/수정/삭제·오프라인 재연결·충돌·새로고침, 다른 계정/익명 접근 거부, 오래된 탭 큐, 계정 전환 초안 정리 확인.
7. **최신 버전 공개 배포:** 정상 빌드와 HTTPS 에셋·PWA 갱신 확인, 소스/정적 커밋·검증 날짜 기록. preview의 cloud-off 한계를 계속 명시.
8. **상용 출시 범위 확정:** 계정 삭제/보관·개인정보 정책·캐시 제거·관측/비용 경보·복구 훈련·접근성·대용량 미디어. 결제/구독·스토어 네이티브 앱·외부 OAuth 수집은 별도 제품 결정.

사용자는 기본 구현·검사·수정·공개 배포를 요청했습니다. 이미 허용된 가역적 개발 작업마다 재승인을 요구하지 않습니다. 유료 서비스 선택, 기존 운영 데이터에 영향을 주는 전환, 네이티브 계정/서명 등 실제 선택이 필요한 경우 구체적인 선택지와 영향을 준비해 질문합니다. 기능 확대보다 기록 보존·편집 신뢰·모바일 입력 안정성을 먼저 완성합니다.

## 13. 인계 문서와 작업 재개 프롬프트

| 문서                                                  | 용도                                             |
| ----------------------------------------------------- | ------------------------------------------------ |
| [HANDOVER_START_HERE.md](HANDOVER_START_HERE.md)      | 새 작업자/AI의 시작 순서와 즉시 재개 프롬프트    |
| [PROJECT_STATE.md](PROJECT_STATE.md)                  | 현재 완료/미완료 상태 요약                       |
| [최신 검증](docs/QA_2026-10-21.md)                    | 후속 수정·59+9 검사·브라우저 근거·계정 접근 제한 |
| [날짜별 스냅샷](docs/HANDOVER_SNAPSHOT_2026-10-18.md) | 미커밋 파일·사용성 시나리오·남은 검사            |
| [PRODUCT_BRIEF.md](docs/PRODUCT_BRIEF.md)             | 기획 의도·사용 맥락·정보 구조                    |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md)               | 데이터·병합·구버전 변환 상세                     |
| [DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md)             | 지속 가능한 UI 규칙                              |
| [DEPLOYMENT.md](docs/DEPLOYMENT.md)                   | 환경·배포·실기기 검증 절차                       |
| [QA.md](docs/QA.md)                                   | 날짜별 검사 근거·이전 화면                       |
| [IPHONE_TEST_GUIDE.md](docs/IPHONE_TEST_GUIDE.md)     | 기존 공개 테스트 빌드의 사용 안내                |
| [AGENTS.md](AGENTS.md)                                | 저장소 개발 규칙                                 |

```text
Life OS v2를 현재 작업본에서 이어서 개발해 주세요.
HANDOVER_START_HERE.md, PROJECT_HANDOVER.md, PROJECT_STATE.md,
docs/HANDOVER_SNAPSHOT_2026-10-18.md, docs/PRODUCT_BRIEF.md,
docs/ARCHITECTURE.md, docs/DESIGN_SYSTEM.md, docs/DEPLOYMENT.md,
AGENTS.md를 먼저 읽으세요.

검증된 구현은 codex/life-os-v2의 078ebcc로 원격에 반영됐습니다.
최신 문서 커밋·로컬 변경과 master를 구분해 확인하세요.
목표는 개인의 일상 기록·검색·회복을 돕는 상용 수준의 차분한 Life OS입니다.
현재 v2 모듈과 디자인 토큰을 사용하고 demo/guest/UID를 분리하세요.
지속 로컬 저장과 원격 승인, 삭제 tombstone, 금고 암호화를 보존하세요.
개인 데이터·.env.local·토큰·마스터 암호를 출력/커밋하지 마세요.

포맷·타입·59개 테스트·규칙 9개와 일반 빌드는 통과했습니다.
최신 검증 문서를 읽고 남은 금고 CSV·백업 다운로드·실제 iPhone 검사를 진행하세요.
그 다음 실제 OAuth·권한 규칙·두 기기 동기화·최신 공개 배포를 완성하세요.
preview는 cloud-off이고 소스 078ebcc / 정적 d0db06e 기준임을 유의하세요.
실제 사람 10명 평가나 실제 기기 검증을 합성 검사로 대체해 완료라 표현하지 마세요.
기록 보존을 우선하며 구현·검증·배포 상태를 각각 근거와 함께 갱신하세요.
```
