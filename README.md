# Life OS

하루의 계획, 운동, 일기, 가족의 기억, 돈의 흐름, 다시 읽을 자료를 한곳에 남기는 개인 라이프 운영 도구입니다. 기존 앱의 목적을 유지하면서 화면과 데이터 구조를 v2로 재설계했습니다.

Next.js App Router, React, TypeScript, 공통 디자인 토큰과 Firebase Auth / Firestore를 사용합니다. 데스크톱과 모바일 브라우저에서 같은 기록 모델을 공유합니다. 기본 화면은 **가상 체험 데이터**이며 개인·계정 데이터와 분리됩니다.

## 시작하기

Node.js 24가 필요합니다.

```sh
npm ci
npm run dev
```

`http://localhost:3000`을 엽니다. 개인 기록 모드는 Firebase 없이 기기에 저장할 수 있습니다. 실제 Google 로그인과 기기 간 동기화는 `.env.local.example`을 참고해 별도 Firebase 프로젝트를 설정해야 합니다. 운영 설정을 하드코딩하거나 이메일 입력을 로그인으로 대체하지 않습니다.

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

암호금고 내용은 암호화하지만 일반 일기·금융·사진 전체가 종단간 암호화되는 것은 아닙니다. JSON 백업은 안전한 곳에 보관합니다. 로그아웃은 현재 화면 접근을 닫으며 계정의 브라우저 캐시를 자동 삭제하지 않습니다.

## 개발 인계

- [전체 인계](PROJECT_HANDOVER.md)
- [현재 상태](PROJECT_STATE.md)
- [아키텍처와 데이터 정책](docs/ARCHITECTURE.md)
- [배포와 실제 기기 검증](docs/DEPLOYMENT.md)
- [디자인 시스템](docs/DESIGN_SYSTEM.md)
- [제품 기획](docs/PRODUCT_BRIEF.md)
- [검증 기록과 화면](docs/QA.md)

기존 원격 master를 확인해 `codex/life-os-v2` 브랜치로 Git 연결을 복구했습니다. 변경은 초안 PR로 검토하며 운영 배포는 별도입니다. 기존 [저장소](https://github.com/pikurate-ai/life-os)와 [서비스](https://pikurate-ai.github.io/life-os/)는 별도 운영 확인과 배포 준비가 필요합니다.
