# CUK 공지사항 알리미 🔔

가톨릭대학교 각 학과의 공지사항을 실시간으로 크롤링하여 웹 푸시 알림으로 전달하는 서비스입니다.

## 🚀 주요 기능

- **실시간 크롤링**: 40개 이상의 학과 사이트를 10분마다 자동 크롤링
- **웹 푸시 알림**: FCM을 이용한 실시간 알림 전송
- **선택적 구독**: 원하는 학과만 골라서 구독 가능
- **상태 모니터링**: 각 사이트의 크롤링 상태 실시간 확인
- **모바일 최적화**: PWA로 구현되어 모바일에서도 완벽 동작

## 🏗️ 아키텍처

### 백엔드 (Firebase Functions)
- **언어**: TypeScript + Node.js
- **런타임**: Node.js 18
- **데이터베이스**: Firestore
- **크롤링**: Axios + Cheerio
- **알림**: Firebase Cloud Messaging (FCM)

### 프론트엔드 (Firebase Hosting)
- **언어**: Vanilla JavaScript
- **스타일**: 순수 CSS (반응형 디자인)
- **PWA**: Service Worker + Web App Manifest

## 📁 프로젝트 구조

```
cuk-notice-alert/
├── functions/
│   ├── src/
│   │   ├── api/
│   │   │   ├── controllers/
│   │   │   ├── middleware/
│   │   │   ├── types/
│   │   │   ├── validators/
│   │   │   └── router.ts
│   │   ├── config/
│   │   │   └── sites.config.ts
│   │   ├── crawler/
│   │   │   └── crawler.service.ts
│   │   ├── services/
│   │   │   ├── crawled-post.service.ts
│   │   │   ├── fcm.service.ts
│   │   │   └── subscription.service.ts
│   │   └── index.ts
│   ├── package.json
│   └── tsconfig.json
├── public/
│   ├── index.html
│   ├── status.html
│   ├── script.js
│   ├── status.js
│   ├── style.css
│   ├── firebase-messaging-sw.js
│   └── manifest.json
├── firebase.json
├── package.json
└── README.md
```

## 🛠️ 설치 및 실행

### 1. 프로젝트 클론
```bash
git clone <repository-url>
cd cuk-notice-alert
```

### 2. Firebase 프로젝트 설정
```bash
# Firebase CLI 설치 (전역)
npm install -g firebase-tools

# Firebase 로그인
firebase login

# Firebase 프로젝트 초기화
firebase use --add
```

### 3. 환경 설정
```bash
# 루트에서 Functions 의존성 설치
cd functions && npm install && cd ..

# Firebase 설정 업데이트
# public/script.js와 public/firebase-messaging-sw.js에서 
# Firebase 설정값들을 실제 프로젝트 값으로 변경
```

### 4. 로컬 개발 서버 실행
```bash
# Firebase 에뮬레이터 실행
npm run serve

# 또는 직접 실행
firebase emulators:start --import=./emulator-data --export-on-exit
```

### 5. 배포
```bash
# 전체 배포
npm run deploy

# 개별 배포
npm run deploy:hosting    # 호스팅만
npm run deploy:functions  # Functions만
```

## 🔧 환경변수 설정

실제 운영환경에서는 다음 값들을 Firebase Console에서 가져와 설정해야 합니다:

### Firebase 설정 (`public/script.js`, `public/firebase-messaging-sw.js`)
```javascript
const firebaseConfig = {
    apiKey: "your-actual-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "your-sender-id",
    appId: "your-app-id"
};
```

### VAPID 키 설정
```javascript
// Firebase Console > Project Settings > Cloud Messaging > Web Push certificates
messaging.usePublicVapidKey('your-vapid-key');
```

## 📊 데이터베이스 구조

### `subscriptions` 컬렉션
```typescript
interface Subscription {
  sites: string[];           // 구독 사이트 ID 배열
  updatedAt: Timestamp;      // 마지막 업데이트 시각
  createdAt: Timestamp;      // 생성 시각
}
// 문서 ID: FCM 토큰
```

### `crawled_posts` 컬렉션
```typescript
interface CrawledPost {
  processedNos: string[];    // 처리된 게시물 번호들 (최대 50개)
  lastTitle: string | null;  // 최신 글 제목
  lastPostNo: string | null; // 최신 글 번호
  postCount: number;         // 크롤링된 게시물 수
  updatedAt: Timestamp;      // 마지막 크롤링 시각
}
// 문서 ID: 사이트 ID (예: dept_computer_info)
```

## 🔄 크롤링 로직

1. **스케줄링**: Cloud Functions의 Pub/Sub 트리거로 10분마다 실행
2. **병렬 처리**: 5개씩 배치로 나누어 동시 크롤링 (성능 최적화)
3. **새 글 감지**: Firestore의 `processedNos`와 현재 크롤링 결과 비교
4. **알림 발송**: 새 글이 발견되면 해당 사이트 구독자들에게 FCM 알림 전송
5. **상태 업데이트**: 크롤링 결과를 Firestore에 저장

## 📱 PWA 기능

- **Service Worker**: 백그라운드 알림 수신 및 처리
- **Web App Manifest**: 홈 화면에 설치 가능
- **Offline Support**: 기본적인 캐시 전략 구현
- **Push Notifications**: 브라우저 알림 완벽 지원

## 🛡️ 보안 및 최적화

### 보안 기능
- **Helmet.js**: 보안 헤더 자동 설정
- **CORS**: 적절한 CORS 정책 적용
- **입력 검증**: Joi를 이용한 API 요청 데이터 검증
- **에러 처리**: 중앙집중식 에러 핸들링

### 성능 최적화
- **배치 처리**: FCM 알림 배치 전송 (500개씩)
- **메모리 관리**: 처리된 게시물 번호 제한 (50개)
- **타임아웃**: 크롤링 요청 15초 타임아웃
- **정리 작업**: 유효하지 않은 토큰 자동 정리

## 📝 API 엔드포인트

### `POST /api/subscribe`
구독 정보 저장
```json
{
  "token": "fcm-token-string",
  "sites": ["dept_computer_info", "dept_ai"]
}
```

### `GET /api/status`
크롤링 상태 조회
```json
{
  "success": true,
  "data": {
    "sites": {
      "dept_computer_info": {
        "name": "컴퓨터정보공학부",
        "category": "공학계열",
        "isActive": true,
        "lastTitle": "최신 공지사항 제목",
        "updatedAt": "2024-01-01T00:00:00.000Z"
      }
    }
  }
}
```

## 🚨 문제 해결

### 알림이 오지 않는 경우
1. 브라우저 알림 권한 확인
2. Firebase 설정값 확인 (API Key, Project ID 등)
3. VAPID 키 설정 확인
4. 구독 상태 확인 (개발자 도구 > Application > Storage)

### 크롤링이 실패하는 경우
1. 사이트 URL 변경 확인
2. HTML 구조 변경 확인 (셀렉터 업데이트 필요)
3. 네트워크 타임아웃 확인
4. Functions 로그 확인 (`firebase functions:log`)

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/amazing-feature`)
3. Commit your Changes (`git commit -m 'Add some amazing feature'`)
4. Push to the Branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 🙏 감사의 말

- 가톨릭대학교 각 학과 웹사이트
- Firebase/Google Cloud Platform
- 모든 오픈소스 라이브러리 기여자들