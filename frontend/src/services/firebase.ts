import { initializeApp } from 'firebase/app'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'

// Firebase 설정 (환경변수에서 가져오기, 기본값 제공)
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyDZvIopijEsI9MrC-WHSqS1G9arX_U5m5Y",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "noti-4f125.firebaseapp.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "noti-4f125",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "noti-4f125.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "218411557852",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:218411557852:web:896358449c61ee029ce519",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-84PX1VTECE"
}

// Firebase 초기화
const app = initializeApp(firebaseConfig)
const messaging = getMessaging(app)

export class FirebaseService {
  private static instance: FirebaseService
  private fcmToken: string | null = null
  private deviceId: string | null = null
  private messaging: any = null
  private isInitialized: boolean = false

  private constructor() {
    this.deviceId = this.generateDeviceId()
    this.messaging = messaging
  }

  public static getInstance(): FirebaseService {
    if (!FirebaseService.instance) {
      FirebaseService.instance = new FirebaseService()
    }
    return FirebaseService.instance
  }

  private generateDeviceId(): string {
    let deviceId = localStorage.getItem('deviceId')
    if (!deviceId) {
      deviceId = 'device_' + Math.random().toString(36).substr(2, 9)
      localStorage.setItem('deviceId', deviceId)
    }
    return deviceId
  }

  public async requestPermission(): Promise<boolean> {
    try {
      const permission = await Notification.requestPermission()
      return permission === 'granted'
    } catch (error) {
      console.error('Permission request failed:', error)
      return false
    }
  }

  public async requestPermissionAndGetToken(): Promise<string | null> {
    try {
      console.log('🔔 FCM 토큰 요청 시작...')
      console.log('현재 알림 권한 상태:', Notification.permission)
      
      // 1. 이미 토큰이 있으면 반환
      if (this.fcmToken) {
        console.log('✅ 기존 FCM 토큰 사용:', this.fcmToken.substring(0, 20) + '...')
        return this.fcmToken
      }

      // 2. 권한이 이미 허용되어 있는지 확인
      if (Notification.permission === 'granted') {
        console.log('✅ 알림 권한이 허용되어 있습니다. FCM 토큰 생성 중...')
        
        const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY || "BOkYvfB9VwE9IL66t0GxDEVr2Zob_DBfOi4v_coBWUHW5X8wIXwGpnnyu9Jz4-tshN5sAS1kPH3dO-HQY5gXOtk"
        console.log('VAPID 키 사용:', vapidKey.substring(0, 20) + '...')
        
        const token = await getToken(messaging, {
          vapidKey: vapidKey
        })

        if (token) {
          this.fcmToken = token
          localStorage.setItem('fcmToken', token)
          console.log('🎉 FCM 토큰 생성 성공!')
          console.log('토큰 길이:', token.length)
          console.log('토큰 시작:', token.substring(0, 50) + '...')
          console.log('토큰 끝:', '...' + token.substring(token.length - 20))
          return token
        } else {
          console.error('❌ FCM 토큰이 null입니다')
          throw new Error('No registration token available')
        }
      } else {
        console.error('❌ 알림 권한이 허용되지 않았습니다:', Notification.permission)
        throw new Error('Notification permission not granted')
      }
    } catch (error: any) {
      console.error('❌ FCM token retrieval failed:', error)
      console.error('에러 상세:', error.message)
      console.log('Firebase 설정을 확인해주세요. VAPID 키가 필요합니다.')
      return null
    }
  }

  public async getFCMToken(): Promise<string | null> {
    console.log('getFCMToken 호출됨')
    
    // 기존 토큰이 있으면 반환
    if (this.fcmToken) {
      console.log('메모리에서 FCM 토큰 발견:', this.fcmToken.substring(0, 20) + '...')
      return this.fcmToken
    }
    
    // localStorage에서 토큰 확인
    const storedToken = localStorage.getItem('fcmToken')
    console.log('localStorage에서 토큰 확인:', storedToken ? '있음' : '없음')
    
    if (storedToken) {
      this.fcmToken = storedToken
      console.log('localStorage에서 FCM 토큰 로드:', storedToken.substring(0, 20) + '...')
      return storedToken
    }
    
    // 토큰이 없으면 null 반환 (임시 토큰 생성하지 않음)
    console.log('FCM 토큰이 없습니다. 알림 권한을 허용해주세요.')
    return null
  }

  public getDeviceId(): string {
    return this.deviceId!
  }

  public onMessage(callback: (payload: any) => void): void {
    onMessage(messaging, (payload) => {
      console.log('🔔 포그라운드 메시지 수신:', payload)
      console.log('알림 제목:', payload.notification?.title)
      console.log('알림 내용:', payload.notification?.body)
      
      // 포그라운드에서 즉시 알림 표시
      if (Notification.permission === 'granted') {
        const title = payload.notification?.title || '새 알림'
        const body = payload.notification?.body || '새로운 메시지가 있습니다.'
        
        new Notification(title, {
          body: body,
          icon: '/favicon.ico',
          badge: '/favicon.ico',
          tag: 'aliali-notification'
        })
      }
      
      callback(payload)
    })
  }

  public initialize(): void {
    // 이미 초기화되었으면 중복 실행 방지
    if (this.isInitialized) {
      console.log('⚠️ Firebase Service가 이미 초기화되었습니다. 중복 실행을 방지합니다.')
      return
    }
    
    console.log('🚀 Firebase Service 초기화 시작...')
    console.log('Device ID:', this.deviceId)
    
    // 서비스 워커 등록 확인
    if ('serviceWorker' in navigator) {
      console.log('✅ 브라우저가 Service Worker를 지원합니다')
      
      // 기존 등록된 Service Worker 확인
      navigator.serviceWorker.getRegistrations()
        .then((registrations) => {
          const existingRegistration = registrations.find(reg => 
            reg.scope === window.location.origin + '/' && 
            reg.active?.scriptURL?.includes('firebase-messaging-sw.js')
          )
          
          if (existingRegistration) {
            console.log('✅ 기존 Service Worker 발견, 재사용:', existingRegistration.scope)
            console.log('Active:', existingRegistration.active)
            return existingRegistration
          } else {
            console.log('🆕 새로운 Service Worker 등록 중...')
            return navigator.serviceWorker.register('/firebase-messaging-sw.js')
          }
        })
        .then((registration) => {
          console.log('✅ Service Worker 등록 성공!')
          console.log('Scope:', registration.scope)
          console.log('Active:', registration.active)
          console.log('Installing:', registration.installing)
          console.log('Waiting:', registration.waiting)
          
          // Service Worker 상태 확인
          if (registration.active) {
            console.log('✅ Service Worker가 활성 상태입니다')
          } else {
            console.log('⚠️ Service Worker가 아직 활성화되지 않았습니다')
          }
        })
        .catch((error) => {
          console.error('❌ Service Worker 등록 실패:', error)
          console.error('에러 상세:', error.message)
        })
    } else {
      console.warn('⚠️ 이 브라우저는 Service Worker를 지원하지 않습니다.')
    }
    
    // 알림 권한 상태 확인
    console.log('현재 알림 권한 상태:', Notification.permission)
    
    // 기존 FCM 토큰 확인
    const existingToken = localStorage.getItem('fcmToken')
    if (existingToken) {
      console.log('기존 FCM 토큰 발견:', existingToken.substring(0, 20) + '...')
      this.fcmToken = existingToken
    } else {
      console.log('기존 FCM 토큰이 없습니다')
    }
    
    // 포그라운드 메시지 처리 설정
    this.setupForegroundMessageHandling()
    
    // 초기화 완료 표시
    this.isInitialized = true
    console.log('✅ Firebase Service 초기화 완료')
  }
  
  private setupForegroundMessageHandling(): void {
    if (this.messaging) {
      // 포그라운드에서 메시지 수신 시 처리
      this.messaging.onMessage((payload: any) => {
        console.log('🔔 포그라운드 메시지 수신:', payload)
        
        // 브라우저 알림 표시
        if (Notification.permission === 'granted') {
          const { title, body, icon } = payload.notification || {}
          const notificationOptions = {
            body: body || '새로운 공지사항이 있습니다.',
            icon: icon || '/favicon.ico',
            badge: '/favicon.ico',
            tag: 'aliali-notice',
            requireInteraction: true,
            data: payload.data
          }
          
          new Notification(title || '알리알리 공지사항', notificationOptions)
        }
      })
    }
  }
}

export default FirebaseService.getInstance()
