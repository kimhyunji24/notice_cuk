# 🚀 CUK 공지사항 알리미 - 배포 가이드

## 📋 배포 전 체크리스트

### 1. 환경 준비
- [ ] Node.js 18 이상 설치
- [ ] Firebase CLI 설치 및 로그인
- [ ] 프로젝트 의존성 설치

### 2. 로컬 테스트

#### 2.1 Functions 테스트
```bash
cd functions
npm install
npm run build
npm test
```

#### 2.2 Firebase 에뮬레이터 테스트
```bash
# 프로젝트 루트에서
firebase emulators:start --only functions,firestore
```

#### 2.3 프론트엔드 테스트
```bash
# 로컬 서버로 테스트 (python 사용)
cd pubilc
python3 -m http.server 3000

# 또는 Node.js serve 사용
npx serve -p 3000
```

### 3. Firebase 설정

#### 3.1 환경 변수 설정
```bash
# FCM VAPID 키 설정
firebase functions:config:set fcm.vapid_key="YOUR_VAPID_KEY"

# 모니터링 웹훅 URL 설정 (선택사항)
firebase functions:config:set monitoring.webhook_url="YOUR_SLACK_WEBHOOK"
```

#### 3.2 VAPID 키 생성 방법
1. Firebase Console → 프로젝트 설정 → 클라우드 메시징
2. 웹 푸시 인증서 → 키 쌍 생성
3. 생성된 키를 위 명령어로 설정

### 4. 배포 단계

#### 4.1 개발 환경 배포
```bash
# Functions 빌드 및 배포
cd functions
npm run build
firebase use cuknotice-dev
firebase deploy --only functions

# Hosting 배포
firebase deploy --only hosting
```

#### 4.2 프로덕션 환경 배포
```bash
# 프로덕션 프로젝트로 변경
firebase use cuknotice

# 전체 배포
firebase deploy
```

### 5. 배포 후 검증

#### 5.1 Functions 상태 확인
```bash
# 헬스체크 API 호출
curl https://asia-northeast3-cuknotice.cloudfunctions.net/api/health

# 상태 API 확인
curl https://asia-northeast3-cuknotice.cloudfunctions.net/api/status
```

#### 5.2 크롤링 테스트
```bash
# 수동 크롤링 실행 (Firebase Console Functions 탭에서)
# 또는 curl로 테스트
curl -X POST https://asia-northeast3-cuknotice.cloudfunctions.net/api/test-crawl
```

#### 5.3 푸시 알림 테스트
1. 웹 앱에서 알림 권한 허용
2. 학과 구독 설정
3. 테스트 알림 발송 확인

### 6. 모니터링 설정

#### 6.1 Firebase Console 설정
- Functions 로그 모니터링
- 사용량 및 성능 메트릭 확인
- 알림 설정 (오류 발생 시)

#### 6.2 Firestore 보안 규칙
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 구독 정보 (읽기/쓰기 허용)
    match /subscriptions/{token} {
      allow read, write: if true;
    }
    
    // 크롤링 상태 (읽기만 허용)
    match /crawled_posts/{siteId} {
      allow read: if true;
      allow write: if false;
    }
    
    // 시스템 메트릭 (읽기만 허용)
    match /system_metrics/{metricId} {
      allow read: if true;
      allow write: if false;
    }
  }
}
```

### 7. 성능 최적화

#### 7.1 Functions 메모리 조정
```typescript
// 크롤링 작업량에 따라 메모리 조정
export const crawler = functions
  .region('asia-northeast3')
  .runWith({
    memory: '1GB', // 필요시 2GB로 증가
    timeoutSeconds: 540
  })
```

#### 7.2 동시 실행 제한
```typescript
// crawler.service.ts에서 동시 실행 수 조정
private readonly CONCURRENT_LIMIT = 5; // 서버 성능에 맞게 조정
```

### 8. 장애 대응

#### 8.1 일반적인 문제들
- **Functions 타임아웃**: 메모리 증가 또는 CONCURRENT_LIMIT 감소
- **Firestore 쓰기 제한**: 배치 크기 조정
- **FCM 실패율 증가**: 무효 토큰 정리 주기 단축

#### 8.2 롤백 절차
```bash
# 이전 버전으로 롤백
firebase functions:config:clone --from cuknotice-dev --to cuknotice
firebase deploy --only functions
```

### 9. 보안 체크

#### 9.1 API 키 보안
- Firebase API 키 제한 설정
- CORS 도메인 제한
- Rate Limiting 적용

#### 9.2 Functions 보안
- 환경 변수로 민감 정보 관리
- HTTPS 강제 적용
- 입력 값 검증

### 10. 스케일링 준비

#### 10.1 사용자 증가 대비
- Firestore 인덱스 최적화
- Functions 동시 실행 수 모니터링
- FCM 배치 크기 조정

#### 10.2 새로운 학과 추가
```typescript
// sites.config.ts에 새 사이트 추가
'new_dept': {
  id: 'new_dept',
  name: '신규학과',
  url: 'https://newdept.catholic.ac.kr/notice',
  selector: 'a.b-title',
  category: '계열명'
}
```

---

## 🎯 배포 성공 기준

✅ **Functions 배포 완료**  
✅ **Hosting 배포 완료**  
✅ **헬스체크 API 응답 200**  
✅ **크롤링 스케줄러 정상 동작**  
✅ **푸시 알림 발송 테스트 성공**  
✅ **모니터링 대시보드 정상 표시**  

배포가 완료되면 실시간으로 42개 학과의 공지사항을 모니터링하고, 새로운 글이 올라올 때마다 구독자들에게 즉시 알림이 전송됩니다!