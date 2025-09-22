package com.aliali.notice.service;

import com.aliali.notice.entity.Notice;
import com.aliali.notice.entity.Site;
import com.aliali.notice.entity.Subscription;
import com.aliali.notice.repository.SubscriptionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class NotificationService {
    
    private static final Logger logger = LoggerFactory.getLogger(NotificationService.class);
    
    @Autowired
    private FirebaseService firebaseService;
    
    @Autowired
    private SubscriptionRepository subscriptionRepository;
    
    public void sendNotificationForNewNotice(Notice notice) {
        logger.info("🔔 알림 발송 시작: [{}] {}", notice.getSite().getName(), notice.getTitle());
        
        if (!firebaseService.isFirebaseAvailable()) {
            logger.warn("Firebase not available, skipping notification for notice: {}", notice.getTitle());
            logger.info("📢 새 공지사항 감지됨: [{}] {}", notice.getSite().getName(), notice.getTitle());
            return;
        }
        
        Site site = notice.getSite();
        List<Subscription> subscriptions = subscriptionRepository.findActiveSubscriptionsBySite(site);
        
        logger.info("🔍 구독자 검색 결과: 사이트={}, 구독자 수={}", site.getName(), subscriptions.size());
        
        if (subscriptions.isEmpty()) {
            logger.info("No active subscriptions found for site: {}", site.getName());
            return;
        }
        
        // 알림 제목과 내용 구성
        String title = "🔔 새 공지사항";
        String body = String.format("[%s] %s", site.getName(), 
                notice.getTitle().length() > 50 ? 
                notice.getTitle().substring(0, 50) + "..." : 
                notice.getTitle());
        
        // 알림 데이터 구성 (더 상세한 정보 포함)
        String data = String.format(
            "{\"type\":\"new_notice\",\"noticeId\":%d,\"siteId\":\"%s\",\"siteName\":\"%s\",\"title\":\"%s\",\"url\":\"%s\",\"publishedAt\":\"%s\"}", 
            notice.getId(), 
            site.getId(), 
            site.getName(),
            notice.getTitle().replace("\"", "\\\""), // JSON 이스케이프
            notice.getUrl() != null ? notice.getUrl() : "",
            notice.getPublishedAt() != null ? notice.getPublishedAt().toString() : ""
        );
        
        int successCount = 0;
        int failureCount = 0;
        
        for (Subscription subscription : subscriptions) {
            try {
                boolean success = firebaseService.sendNotification(
                        subscription.getFcmToken(),
                        title,
                        body,
                        data
                );
                
                if (success) {
                    subscription.setLastNotified(LocalDateTime.now());
                    subscriptionRepository.save(subscription);
                    successCount++;
                    logger.debug("✅ 알림 발송 성공: [{}] {} -> {}", site.getName(), notice.getTitle(), subscription.getDeviceId());
                } else {
                    failureCount++;
                    logger.warn("❌ 알림 발송 실패: [{}] {} -> {}", site.getName(), notice.getTitle(), subscription.getDeviceId());
                }
            } catch (Exception e) {
                failureCount++;
                logger.error("❌ 알림 발송 중 오류: [{}] {} -> {}: {}", 
                        site.getName(), notice.getTitle(), subscription.getDeviceId(), e.getMessage());
            }
        }
        
        logger.info("📱 알림 발송 완료: [{}] '{}' -> 성공: {}/{}", 
                site.getName(), notice.getTitle(), successCount, subscriptions.size());
        
        if (failureCount > 0) {
            logger.warn("⚠️ 알림 발송 실패: {}개", failureCount);
        }
    }
    
    public void sendTestNotification(String fcmToken, String deviceId) {
        if (!firebaseService.isFirebaseAvailable()) {
            logger.warn("Firebase not available, skipping test notification");
            return;
        }
        
        String title = "알리알리 테스트 알림";
        String body = "알리알리 서비스가 정상적으로 작동하고 있습니다!";
        String data = "{\"type\":\"test\",\"timestamp\":\"" + LocalDateTime.now() + "\"}";
        
        boolean success = firebaseService.sendNotification(fcmToken, title, body, data);
        if (success) {
            logger.info("Test notification sent successfully to device: {}", deviceId);
        } else {
            logger.error("Failed to send test notification to device: {}", deviceId);
        }
    }
    
    public void sendBulkNotification(String title, String body, String data) {
        if (!firebaseService.isFirebaseAvailable()) {
            logger.warn("Firebase not available, skipping bulk notification");
            return;
        }
        
        List<String> fcmTokens = subscriptionRepository.findDistinctActiveFcmTokens();
        if (fcmTokens.isEmpty()) {
            logger.info("No active FCM tokens found for bulk notification");
            return;
        }
        
        String[] tokenArray = fcmTokens.toArray(new String[0]);
        boolean success = firebaseService.sendNotificationToMultiple(tokenArray, title, body, data);
        
        if (success) {
            logger.info("Bulk notification sent successfully to {} devices", fcmTokens.size());
        } else {
            logger.error("Failed to send bulk notification to some devices");
        }
    }
}
