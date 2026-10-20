# 배포와 운영 인계

## 2026-10-21 재개 결과

**공개 테스트 갱신 완료:** 소스 `078ebcc` / 정적 `d0db06e1ffabe2593119bfa6d3e1c09207c78187`. [소스 CI](https://github.com/pikurate-ai/life-os/actions/runs/39503884788)와 [Pages](https://github.com/pikurate-ai/life-os-preview/actions/runs/39504064724)가 성공했습니다. [테스트 앱](https://pikurate-ai.github.io/life-os-preview/)의 최신 HTML·리뷰·manifest·SW·설치 아이콘·스크립트/CSS와 390px 일기 입력을 확인했습니다. 자세한 측정은 [최신 QA](QA_2026-10-21.md)에 있습니다. 기존 master 서비스·DB·규칙은 변경하지 않았고 cloud-off 정책을 유지합니다.

포맷·타입·59개 일반 테스트·9개 전용 규칙 검사·일반 빌드가 통과했습니다. `test:rules` 누락을 해결했고 CI는 Temurin Java 21을 준비합니다. 로컬에서는 체크섬을 확인한 portable Java를 `.tools`에만 준비했습니다. 실제 운영 규칙은 배포하지 않았습니다. [최신 검증](QA_2026-10-21.md)에 구체적인 근거가 있습니다.

CLI Google 관리자 로그인은 성공했지만 접근 가능한 프로젝트 목록이 0개이고 기존 환경의 프로젝트 조회가 실패했습니다. 기존 프로젝트 접근 계정 또는 새 v2 프로젝트 중 사용자 선택을 기다립니다. 앱 사용자 로그인·도메인/공급자·운영 권한·두 기기 동기화 완료와는 다릅니다. 최신 소스/정적 배포 커밋과 CI는 [현재 상태](../PROJECT_STATE.md)를 확인하세요. 아래 이전 연결 미완료 기록은 날짜별 이력입니다.

## 2026-10-18 현재 작업본 주의사항

최신 소스는 로컬 `codex/life-os-v2`의 `117bf4d`와 이후 미커밋/신규 파일입니다. 마지막 확인한 원격 소스는 `d036f3e`, [초안 PR #1](https://github.com/pikurate-ai/life-os/pull/1)이며 공개 preview는 아래 `649b020` 기준입니다. 이번 인계 작업에서 원격 상태를 새로 조회하거나 배포하지 않았습니다.

현재 타입 검사·59개 자동 테스트는 통과했지만 포맷 5개 파일과 최신 전체 빌드가 남아 있습니다. 새 CI `firestore-rules` job은 **package.json에 없는 `test:rules`를 호출하는 미완성 상태**입니다. Java 21·에뮬레이터 실행·CI 성공을 확인해야 합니다. 아래 과거 CI/배포 기록을 최신 변경의 통과로 읽지 마세요.

Firebase CLI용 Google 로그인 페이지를 열었으나 로그인 완료·프로젝트 권한·공급자/허용 도메인·운영 규칙 배포는 확인되지 않았습니다. 실제 동기화는 Firebase를 켠 빌드에서 검사해야 합니다. `build:iphone`은 계속 cloud-off입니다. 최신 제한과 재개 순서는 [종합 인계](../PROJECT_HANDOVER.md)와 [작업 스냅샷](HANDOVER_SNAPSHOT_2026-10-18.md)을 우선합니다.

## 이전 배포 기준 — 2026-10-17

기준일: 2026-10-17. 기존 원격 master를 확인한 후 로컬 변경을 보존하여 `codex/life-os-v2` 개발 브랜치로 Git 연결을 복구했습니다. 변경은 검토용 브랜치/초안 PR로 전달하며 운영 master와 별도로 관리합니다. iPhone용 정적 테스트 사이트는 별도 저장소에서 공개 배포했으며 기존 서비스는 변경하지 않았습니다. 소스 PR 상태와 주소는 주 작업자의 최종 보고를 확인합니다.

## 로컬 실행과 검사

Node.js 24를 사용합니다.

```sh
npm ci
npm run dev
# http://localhost:3000
npm run typecheck
npm test
npm run build
```

가상 체험 데이터로 시작합니다. 개인 기록으로 전환하면 비어 있는 별도 작업 공간을 사용합니다. Firebase 설정 없이도 이 기기에 기록하고 JSON 백업을 내보낼 수 있습니다. 정적 배포 파일은 `out/`에 생성됩니다. 정적 export는 `next start` 대신 정적 호스팅으로 서비스합니다.

## 실제 로그인과 동기화 설정

1. Firebase 프로젝트의 웹 앱에서 설정 값을 발급합니다. `.env.local.example`을 `.env.local`로 복사하고 여섯 가지 `NEXT_PUBLIC_FIREBASE_*` 값을 채웁니다. 서비스 계정 비밀키는 넣지 않습니다.
2. Authentication의 Google 공급자를 켜고 실제 서비스 도메인과 localhost를 허용 도메인으로 등록합니다.
3. Cloud Firestore를 생성하고 프로젝트를 명시하여 아래 규칙·색인 제외를 배포합니다.
4. 환경 변수 변경 후 정적 앱을 다시 빌드합니다.
5. 두 계정으로 본인 이외 UID 경로와 인증하지 않은 요청이 거부되는지 확인합니다.

```sh
firebase deploy --only firestore:rules,firestore:indexes --project YOUR_PROJECT_ID
```

Firebase CLI 및 관리자의 프로젝트 권한이 필요한 명령입니다. 이번 작업에서 관리 콘솔 설정, 실제 Google 로그인, 운영 규칙 배포는 수행하지 않았습니다. `firebase.json`의 에뮬레이터 포트는 테스트용 설정이며 브라우저 앱을 에뮬레이터에 자동 연결하지 않습니다.

기존 Firebase 프로젝트를 재사용할 때는 현재 운영 규칙을 먼저 보존하고 호환성을 검토해야 합니다. 포함된 v2 규칙은 `users/{uid}/records/{id}`만 허용하므로, 그대로 배포하면 v1의 `users_general_memos`, `users_financial_logs` 등 이전 컬렉션 접근이 차단될 수 있습니다. 별도 v2 테스트 프로젝트에서 먼저 검증하거나, 기존 서비스와 자료 이전을 포함한 규칙 전환 계획을 확정한 뒤 배포하세요. 로컬 웹 환경 값이 존재하는 것만으로 실제 공급자·허용 도메인·규칙·기기 간 동기화의 검증이 끝난 것은 아닙니다.

## GitHub Pages

기존 [저장소](https://github.com/pikurate-ai/life-os)와 [서비스](https://pikurate-ai.github.io/life-os/)에 새 변경이 배포되었다고 간주하지 않습니다. 로컬 `codex/life-os-v2` 브랜치에서 diff 검토와 PR을 진행하고 원격 master를 덮어쓰지 않습니다. `.env.local`, 개인 CSV, 백업, 인증 키는 커밋하지 않습니다. 루트의 `sheet1.csv`, `sheet2.csv`도 개인 원본일 수 있으므로 공개 저장소에 추가하지 않습니다.

`ci.yml`은 PR 및 main/master push에서 Node 24로 타입 검사·테스트·빌드를 실행합니다. `deploy.yml`은 기존 정책대로 master push 또는 수동 실행에서 Pages로 배포하며 다음을 적용했습니다.

- 타입 검사와 테스트를 통과해야 빌드
- `GITHUB_PAGES=true`로 `/life-os` 경로 반영
- 여섯 가지 Firebase repository/environment variables 또는 secrets를 빌드에 주입
- 운영 Firebase 값이 비어 있으면 배포 중단
- 기존 Pages artifact/environment 방식 유지

공개 Firebase 웹 설정 값은 repository variables에 둘 수 있습니다. 기존 secrets가 있다면 대체 값으로 사용합니다. Pages Source는 GitHub Actions로 설정합니다. 실제 Firestore 규칙 배포는 이 workflow와 별도 단계입니다.

## iPhone용 별도 테스트 사이트

운영의 Firebase 필수 배포 절차와 별개로, [life-os-preview 저장소](https://github.com/pikurate-ai/life-os-preview)에 `out/` 정적 산출물만 게시했습니다. 실제 주소는 **[Life OS 테스트](https://pikurate-ai.github.io/life-os-preview/)**입니다. Pages는 `main` 브랜치의 루트에서 배포하며 API의 `build_type`은 `legacy`이고 HTTPS를 강제합니다. 이는 Pages의 브랜치 배포 설정을 뜻하며 이전 앱 코드를 사용한다는 뜻은 아닙니다.

2026-10-17 [Pages 실행](https://github.com/pikurate-ai/life-os-preview/actions/runs/38986710274) 성공과 실제 HTTPS 응답을 확인했습니다. 빌드 소스 기준은 `649b020`, [정적 배포 커밋](https://github.com/pikurate-ai/life-os-preview/commit/b408294361964e229f54aedbf167b472f088d718)은 `b408294361964e229f54aedbf167b472f088d718`입니다. 원본 저장소의 master 서비스는 변경하지 않았습니다.

```sh
npm run build:iphone
npm run preview
```

- `scripts/build-iphone.cjs`가 `LIFE_OS_BASE_PATH=/life-os-preview`, `LIFE_OS_PREVIEW=true`를 설정하고 여섯 가지 Firebase 웹 환경 값을 비웁니다. 앱의 Firebase 모듈도 테스트 모드에서는 연결을 강제로 비활성화합니다.
- Next.js 경로, metadata, manifest의 `id`·`start_url`·`scope`, PNG 아이콘은 공통 `scripts/build-config.cjs` 계약을 사용합니다. 설치 이름은 **Life OS 테스트**입니다.
- 테스트 앱의 로컬 키는 경로별 preview namespace를 사용합니다. 같은 `pikurate-ai.github.io` origin의 기존 앱과 저장 공간 이름을 분리하지만, 원본 데이터는 여전히 명시적 백업·가져오기로만 옮깁니다.
- 기존 `/life-os/` 운영 서비스와 테스트 저장소를 분리합니다. 이번 테스트에서 OAuth·Firestore·PC와 iPhone의 클라우드 동기화는 사용하지 않습니다.

2026-10-17 설정 안내를 포함한 포맷·타입·49개 자동 테스트·암호화/가져오기 검사·일반 및 iPhone 빌드가 통과했습니다. manifest·아이콘과 절대 에셋 경로 18개의 `/life-os-preview/` 일치를 확인했고 실제 HTTPS의 HTML·manifest·service worker·설치 PNG 3종·스크립트 12개 모두 HTTP 200을 확인했습니다. 공개 Chromium의 390×844 동작은 [QA](QA.md)에 기록했습니다. 실제 아이폰의 홈 화면 설치·사용은 [테스트 가이드](IPHONE_TEST_GUIDE.md)에 따라 별도로 검증합니다.

### 테스트 사이트 재배포

1. 소스 기능 브랜치에서 검사 후 `npm run build:iphone`으로 `out/`을 다시 만듭니다. 개발 서버와 빌드는 동시에 실행하지 않습니다.
2. 별도 `life-os-preview` 저장소의 `main` 작업본에 `out/`의 정적 파일만 반영합니다. `.git`은 보존하고 `.nojekyll`을 포함합니다. 소스·개인 파일·환경 변수·백업은 올리지 않습니다.
3. 변경을 검토하고 일반 커밋·push를 진행합니다. 강제 push하지 않습니다. Pages의 `main`/루트 설정과 HTTPS 강제를 유지합니다.
4. Pages 실행 성공 후 HTML·manifest·PNG·service worker·스크립트의 실제 응답과 테스트 안내·로컬 저장을 다시 확인합니다. 소스 커밋과 정적 커밋, 검증 날짜를 이 문서와 QA에 남깁니다.

## 실제 기기 검증

| 시나리오                         | 필요한 결과                           |
| -------------------------------- | ------------------------------------- |
| 데스크톱과 iPhone에서 같은 계정  | 운동·일기·수정·삭제가 양쪽에 반영     |
| 네트워크를 끈 채 기록 후 재연결  | 기기 저장·대기 표시 후 업로드         |
| 서로 다른 Google 계정 전환       | 이전 계정 기록이 잠깐도 표시되지 않음 |
| 오래 열린 탭과 새 탭의 동시 사용 | 기록 보존, 큐 무한 재생성 없음        |
| 한 기기 삭제 후 다른 기기 재접속 | 삭제한 기록이 다시 나타나지 않음      |
| 팝업 차단·취소·미허용 도메인     | 구체적인 로그인 실패 안내             |
| 권한 거부·할당량 초과            | 오류와 로컬 큐 유지, 완료 표시 금지   |
| 브라우저 용량 초과               | 저장 실패 안내와 기존 기록 보존       |
| 백업을 빈 작업 공간으로 복구     | 기록·삭제 상태·암호문 복구            |
| 320/375px 모바일·태블릿·데스크톱 | 버튼·모달·탐색 겹침과 가로 넘침 없음  |

단위 테스트·로컬 브라우저 검증은 실제 OAuth와 운영 Firestore 규칙의 검증을 대체하지 않습니다. 판매 전에는 계정 삭제/보존 정책, 개인정보 처리방침, 모니터링, App Check/비용 경보, 백업 복구, 대용량 사진용 인증 객체 저장소, 접근성, 결제/구독을 별도 확정해야 합니다. 네이티브 App Store 출시와 Google Docs·앨범·은행·Apple Health 자동 연동도 구현 범위 밖입니다.
