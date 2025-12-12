package com.aliali.notice.controller;

import com.aliali.notice.dto.NoticeDto;
import com.aliali.notice.dto.SiteDto;
import com.aliali.notice.dto.SubscriptionDto;
import com.aliali.notice.entity.Notice;
import com.aliali.notice.entity.Site;
import com.aliali.notice.entity.Subscription;
import com.aliali.notice.repository.NoticeRepository;
import com.aliali.notice.repository.SiteRepository;
import com.aliali.notice.repository.SubscriptionRepository;
import com.aliali.notice.service.CrawlerService;
import com.aliali.notice.service.NotificationService;
import com.aliali.notice.service.FirebaseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

@RestController
@CrossOrigin(origins = "*")
public class TestController {
    private static final Logger logger = LoggerFactory.getLogger(TestController.class);

    @Autowired
    private SiteRepository siteRepository;
    
    @Autowired
    private NoticeRepository noticeRepository;
    
    @Autowired
    private CrawlerService crawlerService;
    
    @Autowired
    private NotificationService notificationService;
    
    @Autowired
    private FirebaseService firebaseService;
    
    @Autowired
    private SubscriptionRepository subscriptionRepository;

    @GetMapping("/")
    public ResponseEntity<String> root() {
        return ResponseEntity.ok("알리알리 서비스가 정상적으로 작동하고 있습니다!");
    }
    
    @GetMapping("/ping")
    public ResponseEntity<String> ping() {
        return ResponseEntity.ok("알리알리 서비스가 정상적으로 작동하고 있습니다!");
    }
    
    @GetMapping("/sites")
    public ResponseEntity<List<SiteDto>> getSites() {
        List<Site> sites = siteRepository.findByEnabledTrue();
        List<SiteDto> siteDtos = sites.stream()
                .map(SiteDto::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(siteDtos);
    }
    
    @GetMapping("/notices")
    public ResponseEntity<List<NoticeDto>> getNotices() {
        List<Notice> notices = noticeRepository.findAll();
        List<NoticeDto> noticeDtos = notices.stream()
                .map(NoticeDto::new)
                .collect(Collectors.toList());
        return ResponseEntity.ok(noticeDtos);
    }
    
    @PostMapping("/crawl")
    public ResponseEntity<String> crawlSites() {
        try {
            crawlerService.crawlAllSites();
            return ResponseEntity.ok("크롤링이 완료되었습니다.");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("크롤링 중 오류가 발생했습니다: " + e.getMessage());
        }
    }
    
    @PostMapping("/crawl/{siteId}")
    public ResponseEntity<String> crawlSite(@PathVariable String siteId) {
        try {
            CrawlerService.CrawlResult result = crawlerService.testCrawlSite(siteId);
            if (result.isSuccess()) {
                return ResponseEntity.ok(String.format("사이트 크롤링 성공: %s, 새 글 %d개", siteId, result.getNewPostsCount()));
            } else {
                return ResponseEntity.internalServerError().body(String.format("사이트 크롤링 실패: %s, 오류: %s", siteId, result.getError()));
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("크롤링 중 오류가 발생했습니다: " + e.getMessage());
        }
    }
    
    @PostMapping("/test-notification")
    public ResponseEntity<String> testNotification(
            @RequestParam String fcmToken, 
            @RequestParam String deviceId,
            @RequestParam(required = false) String title,
            @RequestParam(required = false) String body,
            @RequestParam(required = false) String url) {
        try {
            if (title != null || body != null) {
                 notificationService.sendCustomNotification(fcmToken, deviceId, 
                    title != null ? title : "알리알리 알림", 
                    body != null ? body : "새로운 알림이 있습니다.",
                    url);
                 return ResponseEntity.ok("맞춤 알림이 전송되었습니다.");
            } else {
                notificationService.sendTestNotification(fcmToken, deviceId);
                return ResponseEntity.ok("테스트 알림이 전송되었습니다.");
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("알림 전송 중 오류가 발생했습니다: " + e.getMessage());
        }
    }
    
    @PostMapping("/firebase-init")
    public ResponseEntity<String> initializeFirebase() {
        try {
            firebaseService.forceInitialize();
            boolean isAvailable = firebaseService.isFirebaseAvailable();
            if (isAvailable) {
                return ResponseEntity.ok("Firebase 초기화 성공!");
            } else {
                return ResponseEntity.internalServerError().body("Firebase 초기화 실패");
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("Firebase 초기화 중 오류가 발생했습니다: " + e.getMessage());
        }
    }
    
    @PostMapping("/test-notice")
    public ResponseEntity<String> createTestNotice(
            @RequestParam(defaultValue = "catholic_notice") String siteId, 
            @RequestParam(defaultValue = "RealFCMTest") String title,
            @RequestParam(required = false) String action) {
        
        // 기존 공지사항들의 isNew 플래그를 false로 리셋
        if ("reset_isnew".equals(action)) {
            try {
                List<Notice> allNotices = noticeRepository.findAll();
                int resetCount = 0;
                for (Notice notice : allNotices) {
                    if (notice.getIsNew() != null && notice.getIsNew()) {
                        notice.setIsNew(false);
                        resetCount++;
                    }
                }
                noticeRepository.saveAll(allNotices);
                return ResponseEntity.ok("기존 공지사항 " + resetCount + "개의 isNew 플래그를 false로 설정했습니다.");
            } catch (Exception e) {
                return ResponseEntity.internalServerError().body("isNew 플래그 리셋 중 오류: " + e.getMessage());
            }
        }
        try {
            Site site = siteRepository.findById(siteId).orElse(null);
            if (site == null) {
                return ResponseEntity.badRequest().body("사이트를 찾을 수 없습니다: " + siteId);
            }
            
            Notice notice = new Notice();
            notice.setTitle(title);
            notice.setUrl("https://test.example.com");
            notice.setExternalId("test-" + System.currentTimeMillis());
            notice.setSite(site);
            notice.setPublishedAt(LocalDateTime.now());
            notice.setIsNew(true);
            
            noticeRepository.save(notice);
            
            // 알림 발송
            notificationService.sendNotificationForNewNotice(notice);
            
            return ResponseEntity.ok("테스트 공지사항이 생성되고 알림이 발송되었습니다: " + title);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("테스트 공지사항 생성 중 오류가 발생했습니다: " + e.getMessage());
        }
    }
    
    @PostMapping("/subscribe")
    public ResponseEntity<String> subscribeToSite(
            @RequestParam String siteId, 
            @RequestParam String fcmToken, 
            @RequestParam String deviceId) {
        try {
            Site site = siteRepository.findById(siteId).orElse(null);
            if (site == null) {
                return ResponseEntity.badRequest().body("사이트를 찾을 수 없습니다: " + siteId);
            }
            
            // 기존 구독 확인
            Optional<Subscription> existingSubscription = subscriptionRepository
                    .findActiveSubscriptionByFcmTokenAndSite(fcmToken, site);
            
            if (existingSubscription.isPresent()) {
                return ResponseEntity.ok("이미 구독 중입니다: " + site.getName());
            }
            
            // 새 구독 생성
            Subscription subscription = new Subscription();
            subscription.setFcmToken(fcmToken);
            subscription.setDeviceId(deviceId);
            subscription.setSite(site);
            subscription.setIsActive(true);
            
            subscriptionRepository.save(subscription);
            
            // 테스트 알림 전송
            notificationService.sendTestNotification(fcmToken, deviceId);
            
            return ResponseEntity.ok("구독이 완료되었습니다: " + site.getName());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("구독 중 오류가 발생했습니다: " + e.getMessage());
        }
    }
    
    @GetMapping("/subscriptions/{deviceId}")
    public ResponseEntity<List<SubscriptionDto>> getDeviceSubscriptions(@PathVariable String deviceId) {
        try {
            List<Subscription> subscriptions = subscriptionRepository.findByDeviceIdAndIsActiveTrue(deviceId);
            List<SubscriptionDto> subscriptionDtos = subscriptions.stream()
                    .map(SubscriptionDto::new)
                    .collect(Collectors.toList());
            return ResponseEntity.ok(subscriptionDtos);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    // ==================== 데이터 관리 API ====================
    
    /**
     * 기존 공지사항들의 isNew 플래그를 false로 리셋
     */
    @PostMapping("/reset-isnew")
    public ResponseEntity<String> resetIsNewFlags() {
        try {
            List<Notice> allNotices = noticeRepository.findAll();
            int resetCount = 0;
            for (Notice notice : allNotices) {
                if (notice.getIsNew() != null && notice.getIsNew()) {
                    notice.setIsNew(false);
                    resetCount++;
                }
            }
            noticeRepository.saveAll(allNotices);
            return ResponseEntity.ok("기존 공지사항 " + resetCount + "개의 isNew 플래그를 false로 설정했습니다.");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("isNew 플래그 리셋 중 오류: " + e.getMessage());
        }
    }
    
    // ==================== 크롤링 관련 API ====================
    
    /**
     * 수동 크롤링 - 모든 사이트
     */
    @PostMapping("/crawl/all")
    public ResponseEntity<String> manualCrawlAllSites() {
        try {
            crawlerService.manualCrawlAllSites();
            return ResponseEntity.ok("전체 사이트 크롤링이 시작되었습니다.");
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("크롤링 중 오류가 발생했습니다: " + e.getMessage());
        }
    }
    
    /**
     * 수동 크롤링 - 특정 사이트
     */
    @PostMapping("/crawl/site/{siteId}")
    public ResponseEntity<String> manualCrawlSite(@PathVariable String siteId) {
        try {
            var result = crawlerService.manualCrawlSite(siteId);
            if (result.isSuccess()) {
                return ResponseEntity.ok(String.format("사이트 '%s' 크롤링 완료: %d개 게시물 발견", siteId, result.getNewPostsCount()));
            } else {
                return ResponseEntity.badRequest().body("크롤링 실패: " + result.getError());
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("크롤링 중 오류가 발생했습니다: " + e.getMessage());
        }
    }
    
    /**
     * 크롤링 상태 확인
     */
    @GetMapping("/crawl/status")
    public ResponseEntity<Object> getCrawlingStatus() {
        try {
            return ResponseEntity.ok(crawlerService.getCrawlingStatus());
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * 크롤링 테스트 - 특정 사이트
     */
    @PostMapping("/crawl/test/{siteId}")
    public ResponseEntity<String> testCrawlSite(@PathVariable String siteId) {
        try {
            var result = crawlerService.testCrawlSite(siteId);
            if (result.isSuccess()) {
                return ResponseEntity.ok(String.format("테스트 크롤링 완료: %d개 게시물 발견", result.getNewPostsCount()));
            } else {
                return ResponseEntity.badRequest().body("테스트 크롤링 실패: " + result.getError());
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body("테스트 크롤링 중 오류가 발생했습니다: " + e.getMessage());
        }
    }
    
    /**
     * 특정 공지사항을 isNew=true로 마킹
     */
    @PostMapping("/notices/{noticeId}/mark-new")
    public ResponseEntity<String> markNoticeAsNew(@PathVariable Long noticeId) {
        try {
            logger.info("🔖 공지사항 {}를 isNew=true로 마킹 요청", noticeId);
            
            Optional<Notice> noticeOpt = noticeRepository.findById(noticeId);
            if (noticeOpt.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            Notice notice = noticeOpt.get();
            notice.setIsNew(true);
            noticeRepository.save(notice);
            
            logger.info("✅ 공지사항 {}를 isNew=true로 마킹 완료", noticeId);
            return ResponseEntity.ok("공지사항이 새 공지사항으로 마킹되었습니다.");
            
        } catch (Exception e) {
            logger.error("❌ 공지사항 마킹 중 오류:", e);
            return ResponseEntity.internalServerError().body("공지사항 마킹 중 오류: " + e.getMessage());
        }
    }
}
