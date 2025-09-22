package com.aliali.notice.service;

import com.google.firebase.FirebaseApp;
import com.google.firebase.FirebaseOptions;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.firebase.messaging.FirebaseMessagingException;
import com.google.firebase.messaging.Message;
import com.google.firebase.messaging.Notification;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.io.InputStream;

@Service
public class FirebaseService {
    
    private static final Logger logger = LoggerFactory.getLogger(FirebaseService.class);
    
    @Value("${firebase.project-id}")
    private String projectId;
    
    @Value("${firebase.service-account-path}")
    private String serviceAccountPath;
    
    private FirebaseMessaging firebaseMessaging;
    
    @PostConstruct
    public void initialize() {
        logger.info("🔥 Firebase 초기화 시작...");
        logger.info("Project ID: {}", projectId);
        logger.info("Service Account Path: {}", serviceAccountPath);
        
        try {
            // Firebase App이 이미 초기화되어 있는지 확인
            if (!FirebaseApp.getApps().isEmpty()) {
                logger.info("✅ Firebase App이 이미 초기화되어 있습니다");
                firebaseMessaging = FirebaseMessaging.getInstance();
                logger.info("✅ Firebase Messaging 인스턴스 생성 완료");
                return;
            }
            
            // Service Account 파일 확인
            ClassPathResource resource = new ClassPathResource(serviceAccountPath);
            if (!resource.exists()) {
                logger.error("❌ Service Account 파일이 존재하지 않습니다: {}", serviceAccountPath);
                firebaseMessaging = null;
                return;
            }
            
            logger.info("✅ Service Account 파일 발견: {}", serviceAccountPath);
            
            // Firebase 초기화
            InputStream serviceAccount = resource.getInputStream();
            FirebaseOptions options = FirebaseOptions.builder()
                    .setCredentials(com.google.auth.oauth2.GoogleCredentials.fromStream(serviceAccount))
                    .setProjectId(projectId)
                    .build();
            
            FirebaseApp.initializeApp(options);
            logger.info("✅ Firebase App 초기화 완료");
            
            firebaseMessaging = FirebaseMessaging.getInstance();
            logger.info("✅ Firebase Messaging 인스턴스 생성 완료");
            
        } catch (Exception e) {
            logger.error("❌ Firebase 초기화 실패: {}", e.getMessage());
            e.printStackTrace();
            firebaseMessaging = null;
        }
    }
    
    public boolean sendNotification(String fcmToken, String title, String body, String data) {
        if (firebaseMessaging == null) {
            logger.warn("Firebase not initialized, skipping notification");
            return false;
        }
        
        logger.info("Sending FCM notification to token: {}", fcmToken.substring(0, Math.min(20, fcmToken.length())) + "...");
        logger.info("Token length: {}, starts with: {}", fcmToken.length(), fcmToken.substring(0, Math.min(10, fcmToken.length())));
        
        try {
            Message message = Message.builder()
                    .setToken(fcmToken)
                    .setNotification(Notification.builder()
                            .setTitle(title)
                            .setBody(body)
                            .build())
                    .putData("data", data)
                    .build();
            
            String response = firebaseMessaging.send(message);
            logger.info("Successfully sent message: {}", response);
            return true;
        } catch (FirebaseMessagingException e) {
            logger.error("Failed to send notification to token {}: {}", fcmToken, e.getMessage());
            logger.error("Error details: {}", e.getErrorCode());
            return false;
        } catch (Exception e) {
            logger.error("Unexpected error sending notification: {}", e.getMessage());
            return false;
        }
    }
    
    public boolean sendNotificationToMultiple(String[] fcmTokens, String title, String body, String data) {
        if (firebaseMessaging == null) {
            logger.warn("Firebase not initialized, skipping notification");
            return false;
        }
        
        boolean allSuccess = true;
        for (String token : fcmTokens) {
            if (!sendNotification(token, title, body, data)) {
                allSuccess = false;
            }
        }
        return allSuccess;
    }
    
    public boolean isFirebaseAvailable() {
        return firebaseMessaging != null;
    }
    
    public void forceInitialize() {
        logger.info("🔥 Firebase 강제 초기화 시작...");
        initialize();
    }
}
