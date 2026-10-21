# Life OS

**2026-10-21 인증 구조 갱신:** [앱 열기](https://life-os-563cd.firebaseapp.com/) · [모바일/웹 리뷰](https://life-os-563cd.firebaseapp.com/review) · [현재 상태](PROJECT_STATE.md) · [인증 수정 근거](docs/AUTH_FIX_2026-10-21.md) · [종합 인계](PROJECT_HANDOVER.md).

`codex/life-os-v2`에서 모바일 입력·백업을 개선하고 Firebase Hosting에 앱을 배포했습니다. Google 인증 도우미와 앱을 같은 `life-os-563cd.firebaseapp.com` 출처에 두어 iPhone의 교차 사이트 저장 제한을 피하는 구조로 바꿨습니다. 새 프로젝트 `life-os-563cd`의 서울 Firestore와 UID별 규칙은 앞선 설정에서 배포했습니다. 포맷·타입·73개 자동 테스트·추가 CSV/일기/암호화 검사·일반 및 Firebase Hosting 빌드가 통과했습니다. 실제 Chromium에서는 첫 인증 시도에 네트워크 오류가 있었고 두 번째 시도에서 Google 계정 선택→복귀→계정 표시·새로고침 유지·클라우드 동기화를 확인했습니다. 실제 iPhone과 PC/iPhone 두 기기 검증은 아직 남아 있습니다.

하루의 계획, 운동, 일기, 가족의 기억, 돈의 흐름, 다시 읽을 자료를 한곳에 남기는 개인 라이프 운영 도구입니다. 기존 앱의 목적을 유지하면서 화면과 데이터 구조를 v2로 재설계했습니다.

Next.js App Router, React, TypeScript, 공통 디자인 토큰과 Firebase Auth / Firestore를 사용합니다. 데스크톱과 모바일 브라우저에서 같은 기록 모델을 공유합니다. 기본 화면은 **가상 체험 데이터**이며 개인·계정 데이터와 분리됩니다.

## iPhone에서 테스트하기

Safari에서 **[Life OS 열기](https://life-os-563cd.firebaseapp.com/)** → **전체 → 설정과 데이터 → Google로 로그인**을 선택하세요. 로그인 후 계정이 표시되는지 확인하고, PC에서도 같은 주소와 Google 계정을 사용합니다. [리뷰 화면](https://life-os-563cd.firebaseapp.com/review)은 레이아웃 확인용이며 프레임 안의 로그인은 독립 앱을 새 창으로 엽니다. 실제 iPhone Safari 엔진을 에뮬레이션하지 않습니다.

기존 [GitHub Pages 주소](https://pikurate-ai.github.io/life-os-preview/)는 보존하며 로그인은 새 Firebase 주소로 안내합니다. 예전 주소의 브라우저 기록이 자동으로 이동하지는 않습니다. 필요한 기록은 기존 주소에서 JSON 백업한 뒤 새 주소에 로그인하여 명시적으로 가져오세요. 기존 기록이나 브라우저 데이터를 지우지 마세요. [아이폰 확인 절차](docs/IPHONE_TEST_GUIDE.md)에 로그인·동기화·홈 화면 설치 순서를 정리했습니다.

```sh
npm run build:firebase
npm run preview
```

`build:firebase`는 확인된 Firebase 프로젝트 설정과 루트 경로로 `out/`을 만듭니다. `build:iphone`은 GitHub Pages의 `/life-os-preview/` 경로용이며 현재 클라우드를 강제로 끄지 않습니다. 빌드와 개발 서버는 동시에 실행하지 마세요. 실제 배포 절차는 [배포 문서](docs/DEPLOYMENT.md)를 따릅니다.

현재 Chromium에서 합성 메모 1개를 Firebase 앱에 저장한 뒤, 별도 GitHub 출처의 390×844 프레임에서 같은 기록을 확인·수정하고 Firebase 앱에 반영되는 것까지 확인했습니다. 같은 브라우저의 두 출처 검증이며 실제 두 기기 검증은 아닙니다. 이전 기기 저장 빌드의 49개/59개 테스트, 별도 Firestore 규칙 9개와 320–1440px 화면 검사는 [기존 QA 이력](docs/QA_2026-10-21.md)에 있습니다. 현재 인증 변경의 근거는 [인증 수정 기록](docs/AUTH_FIX_2026-10-21.md)을 우선합니다.

## 시작하기

Node.js 24가 필요합니다.

```sh
npm ci
npm run dev
```

`http://localhost:3000`을 엽니다. Firebase 없이도 개인 기록 모드는 기기에 저장할 수 있습니다. 배포 프로젝트는 `life-os-563cd`이며 다른 PC의 개발 환경에는 `.env.local.example`을 참고해 별도 전달받은 공개 웹 설정을 넣습니다. 서비스 계정 키·토큰은 클라이언트에 넣지 않으며 이메일 입력을 로그인으로 대체하지 않습니다.

```sh
npm run typecheck
npm test
npm run build
npm run preview
```

정적 산출물은 `out/`에 생성됩니다. Pages의 `/life-os` 경로로 빌드하려면 `GITHUB_PAGES=true`를 설정합니다.

## 기록 공간

- 오늘: 할 일, 루틴, 최근 기록과 목표 진행
- 기억: 자주 꺼낼 정보와 메모, 분류·고정·검색
- 일기: 날짜별 하루 기록, 기분·감사, 기존 TXT/Markdown/JSON 가져오기
- 건강: 일자별 수영·달리기 거리와 시간, 턱걸이 세트, 근력과 체중
- 가계/자산: 수입·지출과 자산·부채 직접 기록
- 나중에 읽기: 링크, 태그, 읽음과 즐겨찾기
- 소중한 순간: 사용자가 선택한 사진과 기억
- 목표와 성장: 기한과 단계별 진행
- 암호금고: 마스터 암호 기반 암호화, 사용자 선택 CSV 가져오기
- 설정: 체험/개인 모드, 실제 계정 로그인, JSON 백업과 이전 로컬 기록 가져오기

Google Docs, iPhone 앨범, Apple Health, 은행, 비밀번호 관리 서비스의 자동 수집은 연결되어 있지 않습니다. 현재는 사용자가 선택한 지원 형식 파일을 가져오는 방식입니다. 사진은 작은 크기로 압축해 보관하며 대규모 미디어 저장소를 대체하지 않습니다.

## 데이터 원칙

기기 저장 성공 후에만 화면에 저장을 반영합니다. 계정 캐시는 Firebase UID로 분리하고 체험/비로그인 기록을 실계정에 자동 업로드하지 않습니다. Firestore는 `users/{uid}/records/{id}`에 기록별 저장하며 삭제 tombstone도 전달합니다. 오류·미설정 상태를 동기화 성공으로 표시하지 않습니다.

현재는 브라우저의 지속 캐시와 전송 대기열을 사용하는 구조입니다. 사용자가 요청한 **서버에만 저장하고 기기에 기록을 남기지 않는 방식은 아직 구현하지 않았습니다.** Firebase Auth도 SDK 기본 지속성을 사용합니다. 서버 전용 저장으로 바꾸려면 오프라인 저장·실패 복구·기존 로컬 기록의 명시적 이전을 함께 재설계해야 합니다.

암호금고 내용은 암호화하지만 일반 일기·금융·사진 전체가 종단간 암호화되는 것은 아닙니다. JSON 백업은 안전한 곳에 보관합니다. 로그아웃은 현재 화면 접근을 닫으며 계정의 브라우저 캐시를 자동 삭제하지 않습니다.

## 개발 인계

- [인계 시작 안내](HANDOVER_START_HERE.md)
- [전체 인계](PROJECT_HANDOVER.md)
- [현재 상태](PROJECT_STATE.md)
- [2026-10-18 미커밋 작업과 다음 순서](docs/HANDOVER_SNAPSHOT_2026-10-18.md)
- [아키텍처와 데이터 정책](docs/ARCHITECTURE.md)
- [배포와 실제 기기 검증](docs/DEPLOYMENT.md)
- [디자인 시스템](docs/DESIGN_SYSTEM.md)
- [제품 기획](docs/PRODUCT_BRIEF.md)
- [검증 기록과 화면](docs/QA.md)
- [2026-10-20–21 후속 검증](docs/QA_2026-10-21.md)
- [iPhone 테스트 가이드](docs/IPHONE_TEST_GUIDE.md)

기존 원격 master를 확인해 `codex/life-os-v2` 브랜치로 Git 연결을 복구했습니다. 변경은 초안 PR로 검토하며 운영 배포는 별도입니다. 기존 [저장소](https://github.com/pikurate-ai/life-os)와 [서비스](https://pikurate-ai.github.io/life-os/)는 별도 운영 확인과 배포 준비가 필요합니다.
