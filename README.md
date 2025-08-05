# CUK 공지사항 알림 서비스

가톨릭대학교 공지사항을 자동으로 크롤링하여 사용자에게 실시간 알림을 제공하는 서비스입니다.

## 🏗️ 아키텍처

### 백엔드 (Firebase Functions)
- **API 서버**: Express.js 기반 REST API
- **크롤러**: 10분마다 실행되는 스케줄링 함수
- **데이터베이스**: Firestore
- **알림 서비스**: OneSignal

### 프론트엔드 (Firebase Hosting)
- **메인 페이지**: 구독 설정 페이지
- **상태 페이지**: 크롤링 상태 확인 페이지

## 🔄 API 흐름

### 1. 구독 설정 플로우
```
사용자 → 프론트엔드 → OneSignal Player ID 획득 → 백엔드 API → Firestore 저장
```

### 2. 크롤링 및 알림 플로우
```
스케줄러 → 사이트 크롤링 → 새 글 발견 → 구독자 조회 → OneSignal 알림 발송
```

## 🚀 설정 방법

### 1. 환경 변수 설정

`functions/env.example` 파일을 참고하여 Firebase Functions에 환경 변수를 설정하세요:

```bash
# Firebase CLI로 환경 변수 설정
firebase functions:config:set onesignal.app_id="your_app_id"
firebase functions:config:set onesignal.api_key="your_api_key"
```

### 2. OneSignal 설정

1. [OneSignal](https://onesignal.com)에서 계정 생성
2. 새 앱 생성 후 App ID 확인
3. Settings > Keys & IDs에서 REST API 키 확인
4. 환경 변수에 설정

### 3. 배포

```bash
# 의존성 설치
npm install
cd functions && npm install

# 배포
firebase deploy
```

## 📁 프로젝트 구조

```
notice_cuk/
├── functions/
│   ├── index.js          # Firebase Functions 메인 파일
│   ├── package.json      # 백엔드 의존성
│   └── env.example       # 환경 변수 예시
├── public/
│   ├── index.html        # 메인 페이지
│   ├── status.html       # 상태 확인 페이지
│   ├── script.js         # 프론트엔드 JavaScript
│   └── style.css         # 스타일시트
├── firebase.json         # Firebase 설정
└── package.json          # 프로젝트 설정
```

## 🔧 주요 기능

### 백엔드 API
- `GET /status`: 크롤링 상태 조회
- `POST /subscribe`: 구독 정보 저장

### 크롤러
- 10분마다 40개 학과 사이트 크롤링
- 새 글 발견 시 자동 알림 발송
- 학과 중요 공지는 알림에서 제외

### 프론트엔드
- 학과별 구독 설정
- 알림 타입 선택 (중요/일반)
- 실시간 상태 확인

## 🛡️ 보안 개선사항

### 이전 버전의 문제점
- ❌ CORS 설정이 너무 개방적
- ❌ 환경 변수 검증 부족
- ❌ 에러 처리 미흡
- ❌ 입력 데이터 검증 부족

### 개선된 보안 기능
- ✅ 특정 도메인만 허용하는 CORS 설정
- ✅ 환경 변수 존재 여부 검증
- ✅ 포괄적인 에러 처리
- ✅ 입력 데이터 유효성 검사
- ✅ 요청 크기 제한
- ✅ 타임아웃 설정

## 📊 모니터링

### 로그 수집
- 크롤링 성공/실패 통계
- 알림 발송 로그
- 에러 발생 시 상세 로그

### 상태 확인
- `/status` 페이지에서 실시간 크롤링 상태 확인
- 각 사이트별 마지막 확인된 게시물 정보

## 🔄 리팩토링 완료사항

### 프론트엔드 개선
- ✅ `getPlayerId` 함수 추가
- ✅ 에러 처리 강화
- ✅ 사용자 경험 개선 (로딩 상태, 버튼 비활성화)
- ✅ 코드 구조화 및 문서화

### 백엔드 개선
- ✅ 환경 변수 검증 추가
- ✅ CORS 보안 강화
- ✅ 에러 핸들링 미들웨어 추가
- ✅ 입력 데이터 검증 강화
- ✅ 로깅 시스템 개선
- ✅ 타임아웃 설정

### 전반적 개선
- ✅ API 응답 형식 표준화
- ✅ 코드 가독성 향상
- ✅ JSDoc 주석 추가
- ✅ 에러 메시지 개선

## 🐛 알려진 이슈

현재 알려진 이슈는 없습니다.

## 📝 라이선스

ISC License 