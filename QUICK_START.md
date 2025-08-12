# 🚀 CUK 공지사항 알리미 - 빠른 시작 가이드

## 📦 1단계: 의존성 설치

```bash
# 프로젝트 루트에서
cd /Users/hyunji/Desktop/notice

# Functions 의존성 설치
cd functions
npm install

# 프로젝트 루트로 돌아가기
cd ..
```

## 🧪 2단계: 로컬 테스트

### 2.1 TypeScript 컴파일 및 테스트
```bash
cd functions
npm run build
npm test
```

### 2.2 Firebase 에뮬레이터 실행
```bash
# 프로젝트 루트에서
firebase emulators:start --only functions,firestore
```

**에뮬레이터 접속 정보:**
- Functions: http://localhost:5002
- Firestore: http://localhost:6001  
- 에뮬레이터 UI: http://localhost:4000

### 2.3 API 테스트
```bash
# 헬스체크
curl http://localhost:5002/cuknotice-dev/asia-northeast3/api/health

# 상태 확인
curl http://localhost:5002/cuknotice-dev/asia-northeast3/api/status

# 사이트 목록
curl http://localhost:5002/cuknotice-dev/asia-northeast3/api/sites
```

### 2.4 프론트엔드 테스트
```bash
# 새 터미널에서
cd pubilc
python3 -m http.server 3000

# 브라우저에서 http://localhost:3000 접속
```

## 🔑 3단계: Firebase 설정

### 3.1 VAPID 키 설정
```bash
# Firebase Console에서 VAPID 키 생성 후
firebase functions:config:set fcm.vapid_key="YOUR_VAPID_KEY_HERE"

# 선택사항: 모니터링 웹훅
firebase functions:config:set monitoring.webhook_url="YOUR_WEBHOOK_URL"
```

### 3.2 Firestore 보안 규칙 설정
```javascript
// firestore.rules
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /subscriptions/{token} {
      allow read, write: if true;
    }
    match /crawled_posts/{siteId} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

## 🚀 4단계: 배포

### 4.1 개발 환경 배포
```bash
firebase use cuknotice-dev
firebase deploy
```

### 4.2 프로덕션 배포
```bash
firebase use cuknotice
firebase deploy
```

## ✅ 5단계: 배포 검증

### 5.1 API 테스트
```bash
# 헬스체크
curl https://asia-northeast3-cuknotice.cloudfunctions.net/api/health

# 예상 응답:
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "checks": {
    "firestore": true,
    "fcm": true,
    "crawler": true
  }
}
```

### 5.2 웹앱 테스트
1. https://cuknotice.web.app 접속
2. 알림 권한 허용
3. 학과 선택 및 구독
4. 테스트 알림 발송 확인

### 5.3 크롤링 확인
```bash
# 상태 페이지에서 확인
https://cuknotice.web.app/status-enhanced.html
```

## 🔧 문제 해결

### 일반적인 문제들

#### 1. Functions 빌드 실패
```bash
cd functions
rm -rf node_modules package-lock.json
npm install
npm run build
```

#### 2. 테스트 실패
```bash
# Jest 캐시 클리어
npm test -- --clearCache
npm test
```

#### 3. 에뮬레이터 포트 충돌
```bash
# 다른 포트로 실행
firebase emulators:start --only functions --functions-port=5003
```

#### 4. VAPID 키 오류
1. Firebase Console → 프로젝트 설정 → 클라우드 메시징
2. 웹 푸시 인증서 → 새 키 쌍 생성
3. `firebase functions:config:set fcm.vapid_key="새키"`

### 로그 확인
```bash
# Functions 로그
firebase functions:log

# 에뮬레이터 로그
firebase emulators:start --debug
```

## 📊 모니터링

### Firebase Console
- Functions 실행 로그 및 메트릭
- Firestore 사용량 및 성능
- Hosting 트래픽 분석

### 시스템 상태 모니터링
- **실시간 대시보드**: https://cuknotice.web.app/status-enhanced.html
- **자동 헬스체크**: 30분마다
- **메트릭 수집**: 1시간마다
- **데이터 정리**: 매일 새벽 2시

## 🎯 성공 지표

✅ **42개 학과 크롤링 정상 동작**  
✅ **구독자 알림 발송 성공률 > 90%**  
✅ **API 응답 시간 < 3초**  
✅ **시스템 가용률 > 99%**  

---

## 🚨 긴급 상황 대응

### 시스템 다운 시
1. Firebase Console에서 Functions 상태 확인
2. 에러 로그 분석
3. 필요시 이전 버전으로 롤백

### 대량 알림 실패 시
1. FCM 서비스 상태 확인
2. 무효 토큰 일괄 정리
3. 배치 크기 조정

**지원 연락처**: [개발팀 연락처]  
**모니터링 대시보드**: https://cuknotice.web.app/status-enhanced.html