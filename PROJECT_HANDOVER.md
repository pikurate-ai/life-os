# Life OS v2 프로젝트 종합 인계

기준일: 2026-10-16. 이전 인계의 검증되지 않은 “완벽한 보안/동기화/자동 연동” 표현을 현재 코드와 검증 범위에 맞게 교체했습니다.

## 기획 의도

Life OS는 기록을 통해 일상을 주도하고, 다시 꺼내 보며 다음 행동을 결정하는 개인 도구입니다. 업무·학습·가족·운동·재정 회복을 연결하며 죄책감과 강제 알람보다 지속할 수 있는 작은 행동을 돕습니다.

사용자는 AI·스타트업 경험을 바탕으로 업무·자격증·향후 해외 취업 준비, 수영·턱걸이·달리기, 가족의 기억, 돈의 흐름을 함께 관리하려 합니다. 이 배경은 우선순위의 맥락입니다. 공개 코드와 문서에는 구체적인 가족 식별 정보, 실제 계정·연락처·개인 금융/법적 상황을 복제하지 않습니다.

기본 흐름은 “오늘 볼 것 → 빠르게 기록 → 필요할 때 검색 → 작은 진행 확인”입니다. 성공한 제품의 익숙한 탐색·편집 관례를 참고하되 고유 로고와 자산을 그대로 복제하지 않습니다.

## 기술과 실행

Next.js App Router / React / TypeScript strict, CSS 디자인 토큰, Firebase Google OAuth와 Firestore, 지속 로컬 큐, Web Crypto 금고, JSON 백업과 사용자 선택 자료 가져오기를 사용합니다. 정확한 의존성 버전은 package.json과 lockfile을 기준으로 합니다.

Node 24에서 `npm ci`, `npm run dev`로 실행합니다. `npm run typecheck`, `npm test`, `npm run build`로 검사합니다. 정적 산출물은 out/이며 Pages 빌드에는 GITHUB_PAGES=true가 필요합니다.

### iPhone 테스트 빌드 — 공개 게시 대기

`npm run build:iphone`은 `/life-os-preview/` 경로, **Life OS 테스트** 설치 이름, 전용 manifest·아이콘으로 정적 산출물을 만듭니다. Firebase 값이 있더라도 이 빌드는 클라우드 연결을 강제로 끄며, 로컬 저장 공간 이름도 운영 앱과 분리합니다. 기기 기록·예시·백업용 테스트이며 PC·iPhone 자동 동기화 시험은 포함하지 않습니다.

2026-10-17 해당 빌드와 로컬 390×844 기록·새로고침·레이아웃 검사를 통과했습니다. 이후 설정의 기기 저장·자동 동기화 없음 안내와 로그인 버튼 숨김을 반영한 포맷·타입·자동 테스트 49개·암호화/가져오기 검사·일반 빌드도 통과했으며, 최종 iPhone 테스트 빌드도 성공했습니다. [전용 공개 저장소](https://github.com/pikurate-ai/life-os-preview)는 생성되었지만 아직 비어 있고 공개 게시 승인 대기 중입니다. [예정 주소](https://pikurate-ai.github.io/life-os-preview/)의 배포 완료나 실제 iPhone 사용은 확인하지 않았습니다. 공개 게시와 실제 HTTPS 응답 확인이 남아 있습니다. [QA](docs/QA.md), [배포 절차](docs/DEPLOYMENT.md), [아이폰 테스트 가이드](docs/IPHONE_TEST_GUIDE.md)를 함께 확인하세요.

## 코드 지도

| 경로                                     | 역할                                     |
| ---------------------------------------- | ---------------------------------------- |
| src/app/page.tsx                         | 앱 진입, 탐색, 오늘 화면                 |
| src/app/globals.css                      | 토큰, 공통 컴포넌트, 반응형              |
| src/app/layout.tsx                       | 메타데이터와 앱 레이아웃                 |
| src/components/life-os/                  | 새 도메인 화면과 공통 폼/모달            |
| src/lib/life-os/types.ts                 | 기록·날짜·탐색 계약                      |
| src/lib/life-os/store.tsx                | 로컬 저장·인증·계정 격리·동기화 Provider |
| src/lib/life-os/records.ts               | 검증, 백업, 병합, 큐 승인 버전           |
| src/lib/life-os/firebase.ts              | 별도 named app, 환경 변수 검사           |
| src/lib/life-os/demo.ts                  | 현재 로컬 날짜 기준 가상 데이터          |
| src/lib/life-os/legacy.ts                | 명시적 이전 로컬 데이터 가져오기         |
| src/lib/life-os/imports.ts               | 지원 CSV·일기 파서                       |
| src/lib/life-os/vault-crypto.ts          | 새 금고 키 파생과 인증 암호화            |
| firestore.rules / firestore.indexes.json | 별도 운영 배포할 규칙과 색인 제외        |
| .github/workflows/                       | 품질 검사와 기존 master Pages 배포       |
| tests/ / docs/                           | 회귀 검사와 운영·디자인 문서             |

이전 src/components/auth·diary·health·finance와 src/lib/firebase/client.ts, Supabase·iOS 파일은 옛 구현을 포함합니다. 새 앱에 이메일 기반 인증과 하드코딩 fallback을 다시 연결하지 않습니다. 개인 CSV와 예전 하드코딩 데이터를 데모나 공개 자산으로 사용하지 않습니다.

## 기록 계약

공통 필드는 id, type, title, body, 로컬 날짜 date, UTC updatedAt, data입니다. 삭제는 내용을 지운 tombstone과 deletedAt으로 전달합니다.

| 종류        | 주요 data 필드                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------- |
| task        | completed, category, time                                                                               |
| routine     | completedDates: string[], icon, target                                                                  |
| memory      | category: daily/family/work/study, pinned                                                               |
| diary       | mood: 1~5, gratitude                                                                                    |
| workout     | activity: running/swimming/pullups/strength, distance, duration, sets, exercise, load, reps             |
| weight      | kg                                                                                                      |
| transaction | direction: income/expense, amount, category                                                             |
| asset       | direction: asset/liability, amount, category                                                            |
| bookmark    | url, tags, read, favorite                                                                               |
| photo       | 압축 image data URL, category, bytes                                                                    |
| goal        | category, steps, completedSteps, targetDate, status                                                     |
| vault       | 일반 제목·빈 body, role: config/entry, version, iv, ciphertext, config의 salt/iterations, entry의 keyId |

수영은 m, 달리기는 km, 시간은 분, 체중과 하중은 kg입니다. 날짜 입력은 UTC 문자열을 자르지 말고 localDate()를 사용합니다. 기록 종류는 생성 후 바꾸지 않습니다.

## 인증과 동기화

Firebase에서 발급한 UID만 계정 경로에 사용합니다. 이메일을 입력했다고 인증하지 않습니다. 여섯 가지 Firebase 환경 변수 중 하나라도 없으면 로그인/클라우드가 비활성이고 로컬 기록을 사용합니다.

체험 demo, 비로그인 guest, uid:<UID> 공간은 분리됩니다. 체험/guest 기록을 로그인 계정으로 자동 업로드하지 않습니다. 계정이 바뀌는 동안 다른 계정 기록이 표시되지 않으며 비동기 응답도 현재 UID/scope를 검사합니다.

Firestore는 users/{uid}/records/{id}에 저장합니다. 기록별 최신 시각 병합, 삭제 tombstone, 지속 큐, 전송 트랜잭션, 서버 확인 snapshot, 재연결 재시도와 탭 간 저장 이벤트 병합을 사용합니다. 승인 버전을 디스크에 보존하여 오래된 탭이 완료된 전송 큐를 되살리지 않게 합니다.

같은 기록을 동시에 수정하면 최종 기록 하나를 선택하는 LWW이며 필드별 공동 편집이나 무손실 이력은 아닙니다. 기기 시계 오차와 실기기 동작은 별도 통합 검증이 필요합니다. 로그인 해제는 화면 접근을 닫지만 브라우저의 계정 캐시를 지우지는 않습니다.

## 금고와 자료 가져오기

마스터 암호와 복호화된 자격 증명은 지속 저장하지 않습니다. 새 Web Crypto 모듈을 사용하며 금고 본문과 password/masterPassword 등 평문 키는 저장 경계에서 거부합니다. 일반 기록 전체가 종단간 암호화되었다고 표현하면 안 됩니다.

LastPass·Google Password Manager·Excel은 사용자가 내보낸 CSV를 선택하는 방식입니다. Google Docs 일기도 지원 TXT/CSV/JSON으로 내보내 가져옵니다. 자동 OAuth 수집과 .docx/.xlsx 바이너리 파싱은 구현하지 않았습니다.

이전 로컬 가져오기는 알려진 키만 읽고 원본을 수정하지 않습니다. 결정적 ID로 반복 가져오기를 방지하고 지원하지 않는 항목을 알립니다. 이전 금고의 암호문은 새 형식과 다르므로 명시적 변환 또는 CSV가 필요합니다. 개인 데이터가 있는 옛 키 전체를 자동 업로드하지 않습니다.

실제 키와 필드는 기존 TypeScript 인터페이스·저장 코드를 대조했습니다. photos_v2의 url과 한국어 날짜, 공유 archive/daily 일기 사본, 루틴, 체중 측정 시각과 부가 수치, exercise_name/logged_date 등 이전 DB 별칭을 지원합니다. 큰 JPEG/PNG/WebP는 브라우저에서 압축하고 원격 사진은 외부 요청 없이 링크로 보존합니다. 루틴은 완료 날짜가 없으므로 과거 스트릭을 날짜로 만들어내지 않습니다. 잘못된 날짜·지원하지 않는 사진·예전 월 예산/알람·검증할 수 없는 HealthKit 요약의 처리 결과는 설정 화면에 표시합니다. 정확한 범위와 예외는 [이전 데이터 계약 표](docs/ARCHITECTURE.md#audited-legacy-migration-contract)를 확인합니다.

JSON 백업은 format: life-os, version: 2, export 시각, 식별자를 제외한 workspace 종류, records로 구성됩니다. 전체 검증 후 병합합니다. 기록 650KB, 백업 25MB, 공간 10,000개 제한이 있습니다. 브라우저 용량 제한은 별개이며 실패를 표시해야 합니다.

## 디자인과 확장

[디자인 시스템](docs/DESIGN_SYSTEM.md)의 토큰·버튼·폼·모달을 재사용합니다. 긴 한글 제목과 URL, 320/375px 폭, 큰 글꼴, 키보드가 열린 상태, 빈 화면과 저장 실패까지 검증합니다. 새 기능을 독립 저장소로 분리할 필요가 있는지 검토하고 미디어 원본과 외부 연동 비밀 토큰을 범용 data에 쌓지 않습니다. 대용량 사진은 향후 인증 객체 저장소와 업로드/삭제 정책으로 분리합니다.

## 인계 상태와 다음 작업

[현재 상태](PROJECT_STATE.md), [아키텍처](docs/ARCHITECTURE.md), [배포 문서](docs/DEPLOYMENT.md)를 함께 읽습니다. 실제 Firebase 설정, 규칙 운영 배포, 실계정/두 기기 검증, 계정 삭제·개인정보 정책·모니터링·과금, 네이티브 스토어 출시는 별도입니다.

기존 원격 master를 확인하고 로컬 변경을 보존해 codex/life-os-v2 브랜치로 Git 연결을 복구했습니다. 검토용 초안 PR과 운영 배포는 구분합니다. 기존 [저장소](https://github.com/pikurate-ai/life-os)와 [서비스](https://pikurate-ai.github.io/life-os/)는 이번 변경의 운영 배포가 확인된 주소가 아닙니다. PR 주소와 최종 검증은 주 작업자의 보고를 확인합니다.

## 새 개발자/AI 인계 프롬프트

```text
Life OS v2를 이어서 개발합니다. 먼저 PROJECT_HANDOVER.md, PROJECT_STATE.md,
docs/ARCHITECTURE.md, docs/DESIGN_SYSTEM.md, docs/DEPLOYMENT.md를 읽어 주세요.
현재 코드와 package.json을 기준으로 범위를 확인하고,
체험/guest/Firebase UID 격리와 실제 OAuth를 유지해 주세요.
옛 src/lib/firebase/client.ts의 이메일 기반 로그인과 fallback을 재사용하지 마세요.
개인 데이터와 .env.local을 출력하거나 커밋하지 마세요.
변경 후 타입 검사·관련 테스트·빌드·작은 모바일 화면을 검증하고,
실제 운영 연결은 구현 완료와 분리해 보고해 주세요.
```
