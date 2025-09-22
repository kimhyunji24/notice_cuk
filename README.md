# [ 주요 변경사항 ]

### 아키텍처 마이그레이션
- Firebase Functions → Spring Boot 백엔드로 전환
- Vanilla JS → Vue 3 + TypeScript + Pinia로 프론트엔드 현대화
- Firestore → H2 Database (JPA/Hibernate)로 데이터베이스 변경

### 백엔드 (Spring Boot)
- RESTful API 엔드포인트 구현 (공지사항, 사이트, 구독 관리)
- JPA 엔티티 및 리포지토리 설계 (Notice, Site, Subscription)
- Firebase Admin SDK 통합 및 FCM 푸시 알림 서비스
- 웹 크롤링 서비스 (Jsoup 기반)
- CORS 설정 및 API 문서화

### 프론트엔드 (Vue.js)
- Vue 3 Composition API + TypeScript 기반 컴포넌트 구조
- Pinia 상태 관리 (공지사항, 구독, 사이트 데이터)
- PWA 기능 구현 (Service Worker, Web App Manifest)
- Firebase SDK 통합 및 FCM 토큰 관리
- 반응형 UI/UX 디자인

### PWA 및 알림 시스템 개선
- 중복 초기화 방지 로직 (Firebase Service, Notice Store)
- isNew=true인 공지사항만 정확히 카운팅
- Service Worker 중복 등록 방지
- 구독 API 400 에러 수정 (@RequestBody 사용)
- 테스트 공지사항 중복 처리 개선 (mark-new API)

# [ 개발 환경 ]
- Maven 기반 Spring Boot 프로젝트 구조
- Vite 기반 Vue 3 개발 서버
- H2 인메모리 데이터베이스 (개발용)
- Firebase 서비스 계정 키는 환경변수로 관리

# [ 기술 스택 ]
- Backend: Spring Boot 3.2, JPA/Hibernate, H2, Firebase Admin SDK
- Frontend: Vue 3, TypeScript, Pinia, Vite, Firebase SDK
- PWA: Service Worker, Web App Manifest, FCM
