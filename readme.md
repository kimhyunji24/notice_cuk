# 🔔 CUK 공지사항 알리미

가톨릭대학교 각 학과의 공지사항을 실시간으로 크롤링하여 웹 푸시 알림으로 전달하는 서비스입니다.

## ✨ 주요 기능

  * **실시간 크롤링**: 45개 이상의 학과 사이트를 10분마다 자동으로 크롤링합니다.
  * **웹 푸시 알림**: FCM(Firebase Cloud Messaging)을 이용한 실시간 알림을 전송합니다.
  * **선택적 구독**: 사용자가 원하는 학과만 선택하여 알림을 받을 수 있습니다.
  * **상태 모니터링**: 각 사이트의 크롤링 상태, 시스템 현황을 실시간으로 확인할 수 있는 대시보드를 제공합니다.
  * **PWA 지원**: 모바일 기기 홈 화면에 설치하여 앱처럼 사용할 수 있으며, 백그라운드에서도 알림을 수신합니다.

-----

## 🏗️ 아키텍처

이 프로젝트는 Firebase의 서버리스(Serverless) 플랫폼을 기반으로 구축되었습니다.

  * **백엔드**: **Firebase Functions** (Node.js, TypeScript)
      * **크롤링**: `Axios`와 `Cheerio`를 사용하여 웹사이트 파싱
      * **데이터베이스**: **Firestore**를 사용하여 구독 정보 및 크롤링 상태 저장
      * **알림**: \*\*Firebase Cloud Messaging (FCM)\*\*을 통해 웹 푸시 알림 발송
  * **프론트엔드**: **Firebase Hosting**
      * Vanilla JavaScript와 CSS로 구현된 정적 웹페이지
      * PWA(Progressive Web App) 기능을 위해 **Service Worker** 및 **Web App Manifest** 사용

-----

## 🔧 설치 및 실행

### 사전 준비

  * Node.js (v20 이상 권장)
  * Firebase CLI (`npm install -g firebase-tools`)

### 1\. 프로젝트 클론 및 의존성 설치

```bash
# 프로젝트 클론
git clone <repository-url>
cd cuk-notice-alert

# Functions 의존성 설치
cd functions
npm install
cd ..
```

### 2\. Firebase 프로젝트 연결

```bash
# Firebase 로그인
firebase login

# 사용할 Firebase 프로젝트 선택 또는 추가
firebase use --add
```

### 3\. 환경 변수 설정

푸시 알림을 위해 Firebase 프로젝트의 VAPID 키를 설정해야 합니다.

1.  Firebase Console → 프로젝트 설정 → 클라우드 메시징(Cloud Messaging)
2.  웹 푸시 인증서 섹션에서 **키 쌍을 생성**합니다.
3.  생성된 키 값을 아래 명령어를 통해 Firebase 환경 변수에 설정합니다.

<!-- end list -->

```bash
firebase functions:config:set fcm.vapid_key="여기에_생성된_VAPID_키를_입력하세요"
```

### 4\. 로컬 개발 환경 실행

Firebase Emulators를 사용하여 로컬에서 전체 서비스를 테스트할 수 있습니다.

```bash
# 에뮬레이터 실행 (Functions, Firestore, Hosting)
firebase emulators:start
```

  * **웹사이트**: [http://localhost:5010](https://www.google.com/search?q=http://localhost:5010)
  * **에뮬레이터 UI**: [http://localhost:4000](https://www.google.com/search?q=http://localhost:4000)

-----

## 🚀 배포

프로젝트를 실제 운영 환경에 배포합니다.

```bash
# Functions 코드 빌드
npm run build --prefix functions

# Firebase에 전체 프로젝트 배포 (Hosting + Functions + Firestore Rules)
firebase deploy
```

-----

## 📊 데이터베이스 구조

### `subscriptions` 컬렉션

  * **문서 ID**: 사용자의 FCM 토큰
  * **필드**:
      * `sites`: 사용자가 구독한 사이트 ID 배열 (e.g., `['dept_computer_info', 'dept_ai']`)
      * `updatedAt`: 마지막 업데이트 시각

### `crawled_posts` 컬렉션

  * **문서 ID**: 사이트 ID (e.g., `dept_computer_info`)
  * **필드**:
      * `processedNos`: 이미 처리(알림 발송)된 게시물 번호 배열
      * `lastTitle`: 가장 최근에 크롤링된 게시물 제목
      * `postCount`: 해당 사이트의 게시물 수
      * `updatedAt`: 마지막 크롤링 시각

-----

## 📝 API 엔드포인트

  * `POST /api/subscribe`: 사용자의 구독 정보를 저장합니다.
  * `GET /api/sites`: 구독 가능한 전체 학과 목록을 반환합니다.
  * `GET /api/status`: 시스템의 전반적인 상태(크롤링 현황, 구독자 통계 등)를 조회합니다.
  * `GET /api/health`: 시스템의 핵심 서비스(Firestore, FCM 등) 상태를 확인하는 간단한 헬스체크 엔드포인트입니다.

-----

## 🚨 문제 해결

  * **알림이 오지 않는 경우**:
    1.  브라우저의 알림 권한이 '허용' 상태인지 확인하세요.
    2.  스마트폰이 '방해금지' 또는 '절전' 모드가 아닌지 확인하세요.
    3.  `firebase-messaging-sw.js`가 정상적으로 등록되었는지 개발자 도구의 'Application' 탭에서 확인하세요.
  * **크롤링이 실패하는 경우**:
    1.  `functions/src/config/sites.config.ts` 파일에 정의된 학과 사이트의 URL이나 HTML 구조(CSS Selector)가 변경되었을 수 있습니다.
    2.  Firebase Console의 Functions 로그에서 자세한 에러 내용을 확인하세요 (`firebase functions:log`).

---

#🌳 Project Tree

```
notice
├─ .firebaserc
├─ firebase.json
├─ firestore.rules
├─ functions
│  ├─ .eslintrc.js
│  ├─ jest.config.js
│  ├─ lib
│  │  ├─ __tests__
│  │  │  ├─ api
│  │  │  │  ├─ status.controller.test.js
│  │  │  │  └─ status.controller.test.js.map
│  │  │  ├─ config
│  │  │  │  ├─ environment.test.js
│  │  │  │  └─ environment.test.js.map
│  │  │  ├─ jest.setup.js
│  │  │  ├─ jest.setup.js.map
│  │  │  ├─ services
│  │  │  │  ├─ crawler.test.js
│  │  │  │  ├─ crawler.test.js.map
│  │  │  │  ├─ fcm.test.js
│  │  │  │  └─ fcm.test.js.map
│  │  │  ├─ setup.js
│  │  │  └─ setup.js.map
│  │  ├─ api
│  │  │  ├─ api.types.js
│  │  │  ├─ api.types.js.map
│  │  │  ├─ controller
│  │  │  │  ├─ sites.controller.js
│  │  │  │  ├─ sites.controller.js.map
│  │  │  │  ├─ status.controller.js
│  │  │  │  ├─ status.controller.js.map
│  │  │  │  ├─ subscription.controller.js
│  │  │  │  └─ subscription.controller.js.map
│  │  │  ├─ middleware
│  │  │  │  ├─ error-handler.js
│  │  │  │  ├─ error-handler.js.map
│  │  │  │  ├─ request-logger.js
│  │  │  │  └─ request-logger.js.map
│  │  │  ├─ router.js
│  │  │  ├─ router.js.map
│  │  │  └─ validators
│  │  │     ├─ subscription.validator.js
│  │  │     └─ subscription.validator.js.map
│  │  ├─ config
│  │  │  ├─ environment.js
│  │  │  ├─ environment.js.map
│  │  │  ├─ sites.config.js
│  │  │  └─ sites.config.js.map
│  │  ├─ crawler
│  │  │  ├─ crawler.service.js
│  │  │  └─ crawler.service.js.map
│  │  ├─ index.js
│  │  ├─ index.js.map
│  │  └─ services
│  │     ├─ crawled-post.service.js
│  │     ├─ crawled-post.service.js.map
│  │     ├─ fcm.service.js
│  │     ├─ fcm.service.js.map
│  │     ├─ monitoring.service.js
│  │     ├─ monitoring.service.js.map
│  │     ├─ subscription.service.js
│  │     └─ subscription.service.js.map
│  ├─ package-lock.json
│  ├─ package.json
│  ├─ src
│  │  ├─ __tests__
│  │  │  ├─ api
│  │  │  │  └─ status.controller.test.ts
│  │  │  ├─ config
│  │  │  │  └─ environment.test.ts
│  │  │  ├─ jest.setup.ts
│  │  │  ├─ services
│  │  │  │  ├─ crawler.test.ts
│  │  │  │  └─ fcm.test.ts
│  │  │  └─ setup.ts
│  │  ├─ api
│  │  │  ├─ api.types.ts
│  │  │  ├─ controller
│  │  │  │  ├─ sites.controller.ts
│  │  │  │  ├─ status.controller.ts
│  │  │  │  └─ subscription.controller.ts
│  │  │  ├─ middleware
│  │  │  │  ├─ error-handler.ts
│  │  │  │  └─ request-logger.ts
│  │  │  ├─ router.ts
│  │  │  └─ validators
│  │  │     └─ subscription.validator.ts
│  │  ├─ config
│  │  │  ├─ environment.ts
│  │  │  └─ sites.config.ts
│  │  ├─ crawler
│  │  │  └─ crawler.service.ts
│  │  ├─ index.ts
│  │  └─ services
│  │     ├─ crawled-post.service.ts
│  │     ├─ fcm.service.ts
│  │     ├─ monitoring.service.ts
│  │     └─ subscription.service.ts
│  └─ tsconfig.json
├─ package-lock.json
├─ package.json
├─ public
│  ├─ config.js
│  ├─ firebase-messaging-sw.js
│  ├─ index.html
│  ├─ manifest.json
│  ├─ script.js
│  ├─ status-enhanced.html
│  ├─ status-enhanced.js
│  └─ style.css
└─ readme.md

```