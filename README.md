# 🏛️ Life-OS (인생 슈퍼앱)

> **단 하나의 개인 전용 1인 라이프 운영체제 (Life Operating System)**  
> 필수 정보 원터치 복사, 지독한 일기 & 루틴 알람, SMS 파싱 가계부, 영지식 암호금고, 턱걸이/피트니스 성장 트래커, 인생샷 앨범

- 🌐 **실시간 웹앱 주소:** [https://pikurate-ai.github.io/life-os/](https://pikurate-ai.github.io/life-os/)
- 📖 **프로젝트 종합 인계 가이드:** [PROJECT_HANDOVER.md](./PROJECT_HANDOVER.md)

---

## ⚡ 빠른 시작 (Quick Start)

```bash
# 1. 저장소 클론
git clone https://github.com/pikurate-ai/life-os.git
cd life-os

# 2. 의존성 설치
npm install

# 3. 로컬 개발 서버 실행
npm run dev
# 브라우저에서 http://localhost:3000 접속

# 4. 프로덕션 빌드 (정적 HTML 익스포트)
npm run build
```

---

## 🌟 핵심 5대 기능 요약

1. **기억 (필수 정보 & 자유 일반 메모):** 주민번호/계좌/면허 1초 복사 + 클릭 시 최상단 자동 승격(LRU).
2. **지독한 일기 & 데일리 루틴:** 일기를 쓸 때까지 울리는 집요한 알람/진동, 5점 척도 기분 기록, 스트릭 편집.
3. **가계/자산 대시보드:** 결제 문자 0.1초 자동 파싱, 순자산(총자산 - 부채) 및 포트폴리오 비중.
4. **암호화 Vault 매니저:** Web Crypto AES-256 영지식(Zero-Knowledge) 보안 금고.
5. **헬스 1RM & 피트니스:** 턱걸이(Pull-up) 세트별 기록 & 발전 히스토리, 체중 히어로, 애플건강 실제 수치 직접 수정.

---

자세한 아키텍처 및 소스 코드 설명은 [PROJECT_HANDOVER.md](./PROJECT_HANDOVER.md)를 참고하세요.
