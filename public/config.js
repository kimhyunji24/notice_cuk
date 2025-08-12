/**
 * 프론트엔드 환경 설정
 * Firebase 설정과 API 엔드포인트를 환경별로 관리합니다.
 */

class EnvironmentConfig {
    constructor() {
        this.environment = this.detectEnvironment();
        this.config = this.getConfig();
    }

    /**
     * 현재 환경을 감지합니다.
     */
    detectEnvironment() {
        const hostname = window.location.hostname;
        
        if (hostname === 'localhost' || hostname === '127.0.0.1') {
            return 'development';
        } else if (hostname.includes('firebase') || hostname.includes('web.app')) {
            return 'production';
        } else {
            return 'staging';
        }
    }

    /**
     * 환경별 설정을 반환합니다.
     */
    getConfig() {
        const configs = {
            development: {
                firebase: {
                    apiKey: "AIzaSyDZvIopijEsI9MrC-WHSqS1G9arX_U5m5Y",
                    authDomain: "cuknotice-dev.firebaseapp.com",
                    projectId: "cuknotice-dev",
                    storageBucket: "cuknotice-dev.firebasestorage.app",
                    messagingSenderId: "218411557852",
                    appId: "1:218411557852:web:896358449c61ee029ce519",
                    vapidKey: "BOkYvfB9VwE9IL66t0GxDEVr2Zob_DBfOi4v_coBWUHW5X8wIXwGpnnyu9Jz4-tshN5sAS1kPH3dO-HQY5gXOtk"
                },
                api: {
                    baseUrl: 'http://localhost:5001/cuknotice-dev/asia-northeast3/api',
                    timeout: 10000
                },
                features: {
                    enableAnalytics: false,
                    enablePerformanceMonitoring: false,
                    debugMode: true
                }
            },
            
            production: {
                firebase: {
                    apiKey: "AIzaSyDZvIopijEsI9MrC-WHSqS1G9arX_U5m5Y",
                    authDomain: "cuknotice.firebaseapp.com",
                    projectId: "cuknotice",
                    storageBucket: "cuknotice.firebasestorage.app",
                    messagingSenderId: "218411557852",
                    appId: "1:218411557852:web:896358449c61ee029ce519",
                    measurementId: "G-84PX1VTECE",
                    vapidKey: "BOkYvfB9VwE9IL66t0GxDEVr2Zob_DBfOi4v_coBWUHW5X8wIXwGpnnyu9Jz4-tshN5sAS1kPH3dO-HQY5gXOtk"
                },
                api: {
                    baseUrl: 'https://asia-northeast3-cuknotice.cloudfunctions.net/api',
                    timeout: 15000
                },
                features: {
                    enableAnalytics: true,
                    enablePerformanceMonitoring: true,
                    debugMode: false
                }
            }
        };

        return configs[this.environment] || configs.production;
    }

    /**
     * Firebase 설정을 반환합니다.
     */
    getFirebaseConfig() {
        return this.config.firebase;
    }

    /**
     * API 설정을 반환합니다.
     */
    getApiConfig() {
        return this.config.api;
    }

    /**
     * 기능 플래그를 반환합니다.
     */
    getFeatures() {
        return this.config.features;
    }

    /**
     * 현재 환경이 개발 환경인지 확인합니다.
     */
    isDevelopment() {
        return this.environment === 'development';
    }

    /**
     * 현재 환경이 프로덕션 환경인지 확인합니다.
     */
    isProduction() {
        return this.environment === 'production';
    }

    /**
     * 디버그 모드 여부를 반환합니다.
     */
    isDebugMode() {
        return this.config.features.debugMode;
    }

    /**
     * 환경 정보를 콘솔에 출력합니다.
     */
    logEnvironmentInfo() {
        if (this.isDevelopment()) {
            console.log('🔧 개발 환경에서 실행 중');
            console.log('Firebase Project:', this.config.firebase.projectId);
            console.log('API Base URL:', this.config.api.baseUrl);
        }
    }
}

// 전역 인스턴스 생성
window.EnvironmentConfig = new EnvironmentConfig();

// 개발 환경에서 정보 출력
if (window.EnvironmentConfig.isDevelopment()) {
    window.EnvironmentConfig.logEnvironmentInfo();
}