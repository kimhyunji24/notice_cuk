package com.aliali.notice.controller;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.aliali.notice.dto.SubscriptionDto;
import com.aliali.notice.entity.Site;
import com.aliali.notice.entity.Subscription;
import com.aliali.notice.repository.SiteRepository;
import com.aliali.notice.repository.SubscriptionRepository;
import com.aliali.notice.service.NotificationService;

@RestController
@RequestMapping("/subscriptions")
@CrossOrigin(origins = "*")
public class SubscriptionController {
    
    @Autowired
    private SubscriptionRepository subscriptionRepository;
    
    @Autowired
    private SiteRepository siteRepository;
    
    @Autowired
    private NotificationService notificationService;
    
    @PostMapping
    public ResponseEntity<SubscriptionDto> createSubscription(
            @RequestBody CreateSubscriptionRequest request) {
        try {
            Optional<Site> siteOpt = siteRepository.findById(request.getSiteId());
            if (siteOpt.isEmpty()) {
                return ResponseEntity.badRequest().build();
            }
            
            Site site = siteOpt.get();
            
            // // 기존 구독 확인
            // Optional<Subscription> existingSubscription = subscriptionRepository
            //         .findActiveSubscriptionByFcmTokenAndSite(request.getFcmToken(), site);
            
            // if (existingSubscription.isPresent()) {
            //     return ResponseEntity.ok(new SubscriptionDto(existingSubscription.get()));
            // }
            
            // // 새 구독 생성
            // Subscription subscription = new Subscription();
            // subscription.setFcmToken(request.getFcmToken());
            // subscription.setDeviceId(request.getDeviceId());
            // subscription.setSite(site);
            // subscription.setIsActive(true);
            
                        // deviceId와 siteId를 기준으로 기존 구독 정보를 조회 (더 안정적인 방식)
            Optional<Subscription> existingSubscriptionOpt = subscriptionRepository
                    .findByDeviceIdAndSiteId(request.getDeviceId(), request.getSiteId());

            Subscription subscription;
            if (existingSubscriptionOpt.isPresent()) {
                // 기존 구독 정보가 존재하면, fcmToken을 최신으로 업데이트하고 활성화 상태로 변경
                subscription = existingSubscriptionOpt.get();
                subscription.setFcmToken(request.getFcmToken());
                subscription.setIsActive(true);
            } else {
                // 기존 구독 정보가 없으면, 새로운 구독 객체 생성
                subscription = new Subscription();
                subscription.setFcmToken(request.getFcmToken());
                subscription.setDeviceId(request.getDeviceId());
                subscription.setSite(site);
                subscription.setIsActive(true);
            }

            Subscription savedSubscription = subscriptionRepository.save(subscription);
            
            // 테스트 알림 전송
            notificationService.sendTestNotification(request.getFcmToken(), request.getDeviceId());
            
            return ResponseEntity.ok(new SubscriptionDto(savedSubscription));
            
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @GetMapping("/device/{deviceId}")
    public ResponseEntity<List<SubscriptionDto>> getSubscriptionsByDevice(@PathVariable String deviceId) {
        List<Subscription> subscriptions = subscriptionRepository.findByDeviceIdAndIsActiveTrue(deviceId);
        List<SubscriptionDto> subscriptionDtos = subscriptions.stream()
                .map(SubscriptionDto::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(subscriptionDtos);
    }
    
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSubscription(@PathVariable Long id) {
        try {
            Optional<Subscription> subscriptionOpt = subscriptionRepository.findById(id);
            if (subscriptionOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            Subscription subscription = subscriptionOpt.get();
            subscription.setIsActive(false);
            subscriptionRepository.save(subscription);
            
            return ResponseEntity.ok().build();
            
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @GetMapping
    public ResponseEntity<List<SubscriptionDto>> getAllSubscriptions() {
        try {
            List<Subscription> subscriptions = subscriptionRepository.findAll();
            List<SubscriptionDto> subscriptionDtos = subscriptions.stream()
                    .map(SubscriptionDto::new)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(subscriptionDtos);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    @PostMapping("/{id}/test")
    public ResponseEntity<String> testSubscription(@PathVariable Long id) {
        try {
            Optional<Subscription> subscriptionOpt = subscriptionRepository.findById(id);
            if (subscriptionOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            Subscription subscription = subscriptionOpt.get();
            notificationService.sendTestNotification(subscription.getFcmToken(), subscription.getDeviceId());
            
            return ResponseEntity.ok("테스트 알림이 전송되었습니다.");
            
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("알림 전송 중 오류가 발생했습니다: " + e.getMessage());
        }
    }
    
    // DTO for request body
    public static class CreateSubscriptionRequest {
        private String fcmToken;
        private String deviceId;
        private String siteId;
        
        // 기본 생성자
        public CreateSubscriptionRequest() {}
        
        // Getters and Setters
        public String getFcmToken() {
            return fcmToken;
        }
        
        public void setFcmToken(String fcmToken) {
            this.fcmToken = fcmToken;
        }
        
        public String getDeviceId() {
            return deviceId;
        }
        
        public void setDeviceId(String deviceId) {
            this.deviceId = deviceId;
        }
        
        public String getSiteId() {
            return siteId;
        }
        
        public void setSiteId(String siteId) {
            this.siteId = siteId;
        }
    }
}
