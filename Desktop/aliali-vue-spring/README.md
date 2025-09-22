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
