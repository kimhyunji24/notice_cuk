# 알리알리 - 공지사항 알림 서비스

Vue 3 + Spring Boot로 구현된 실시간 공지사항 알림 서비스입니다.

## 🚀 주요 기능

- **실시간 크롤링**: 대학교/기관 웹사이트의 공지사항을 자동으로 수집
- **푸시 알림**: 새로운 공지사항이 올라오면 즉시 모바일로 알림 전송
- **구독 관리**: 사용자가 원하는 사이트만 선택해서 구독 가능
- **모바일 최적화**: PWA로 설치 가능한 모바일 친화적 인터페이스
- **실시간 모니터링**: 크롤링 상태 및 시스템 헬스체크

## 🛠 기술 스택

### 프론트엔드
- **Vue 3** + **TypeScript**
- **Vite** (빌드 도구)
- **Pinia** (상태 관리)
- **Vue Router** (라우팅)
- **Firebase** (FCM 알림)
- **PWA** (Progressive Web App)

### 백엔드
- **Spring Boot 3.2.0**
- **Spring Data JPA**
- **H2 Database** (개발용)
- **PostgreSQL** (운영용)
- **Jsoup** (웹 크롤링)
- **Firebase Admin SDK** (FCM)

## 📁 프로젝트 구조

```
aliali-vue-spring/
├── frontend/                 # Vue 3 프론트엔드
│   ├── src/
│   │   ├── api/             # API 클라이언트
│   │   ├── components/      # Vue 컴포넌트
│   │   ├── services/        # 서비스 (Firebase 등)
│   │   ├── stores/          # Pinia 스토어
│   │   └── views/           # 페이지 컴포넌트
│   ├── public/              # 정적 파일
│   └── package.json
├── backend/                 # Spring Boot 백엔드
│   ├── src/main/java/
│   │   └── com/aliali/notice/
│   │       ├── controller/  # REST 컨트롤러
│   │       ├── entity/      # JPA 엔티티
│   │       ├── repository/  # 데이터 리포지토리
│   │       ├── service/     # 비즈니스 로직
│   │       └── dto/         # 데이터 전송 객체
│   ├── src/main/resources/
│   │   └── application.yml  # 설정 파일
│   └── pom.xml
└── README.md
```

## 🚀 빠른 시작

### 1. 백엔드 실행

```bash
cd backend
./mvnw spring-boot:run
```

백엔드는 `http://localhost:8080`에서 실행됩니다.

### 2. 프론트엔드 실행

```bash
cd frontend
npm install
npm run dev
```

프론트엔드는 `http://localhost:5173`에서 실행됩니다.

### 3. 데이터베이스 확인

H2 콘솔: `http://localhost:8080/api/h2-console`
- JDBC URL: `jdbc:h2:mem:aliali`
- Username: `sa`
- Password: (비어있음)

## 📱 사용법

### 1. 홈 화면
- 최신 공지사항 확인
- 사이트 구독/해제
- 크롤링 상태 모니터링

### 2. 구독 관리
- 구독 중인 사이트 목록
- 테스트 알림 전송
- 구독 해제

### 3. 설정
- FCM 토큰 확인
- 디바이스 ID 확인
- 테스트 알림 전송
- 데이터 새로고침

## 🔧 API 엔드포인트

### 사이트 관리
- `GET /api/sites` - 사이트 목록 조회
- `GET /api/notices` - 공지사항 목록 조회

### 구독 관리
- `POST /api/subscriptions` - 구독 생성
- `GET /api/subscriptions/device/{deviceId}` - 디바이스별 구독 목록
- `DELETE /api/subscriptions/{id}` - 구독 해제

### 테스트
- `POST /api/crawl` - 크롤링 실행
- `POST /api/test-notification` - 테스트 알림 전송

## 🔥 Firebase 설정

1. Firebase 콘솔에서 새 프로젝트 생성
2. 웹 앱 추가 및 설정 복사
3. `frontend/src/services/firebase.ts`에서 설정 업데이트
4. Firebase Admin SDK 키를 `backend/src/main/resources/firebase-service-account.json`에 저장

## 📊 크롤링 설정

`backend/src/main/resources/application.yml`에서 크롤링 사이트를 설정할 수 있습니다:


## 🚀 배포

### 프론트엔드 빌드
```bash
cd frontend
npm run build
```

### 백엔드 빌드
```bash
cd backend
./mvnw clean package
```
=======
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
