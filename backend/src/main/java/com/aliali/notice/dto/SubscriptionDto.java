package com.aliali.notice.dto;

import com.aliali.notice.entity.Subscription;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class SubscriptionDto {
    private Long id;
    private String fcmToken;
    private String deviceId;
    private String siteId;
    private String siteName;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private LocalDateTime lastNotified;
    
    // Constructors
    public SubscriptionDto() {}
    
    public SubscriptionDto(Subscription subscription) {
        this.id = subscription.getId();
        this.fcmToken = subscription.getFcmToken();
        this.deviceId = subscription.getDeviceId();
        this.siteId = subscription.getSite().getId();
        this.siteName = subscription.getSite().getName();
        this.isActive = subscription.getIsActive();
        this.createdAt = subscription.getCreatedAt();
        this.updatedAt = subscription.getUpdatedAt();
        this.lastNotified = subscription.getLastNotified();
    }
    

}
