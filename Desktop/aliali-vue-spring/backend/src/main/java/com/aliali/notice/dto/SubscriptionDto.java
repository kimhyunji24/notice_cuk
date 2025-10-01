package com.aliali.notice.dto;

import com.aliali.notice.entity.Subscription;
import java.time.LocalDateTime;

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
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
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
    
    public String getSiteName() {
        return siteName;
    }
    
    public void setSiteName(String siteName) {
        this.siteName = siteName;
    }
    
    public Boolean getIsActive() {
        return isActive;
    }
    
    public void setIsActive(Boolean isActive) {
        this.isActive = isActive;
    }
    
    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
    
    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    public LocalDateTime getLastNotified() {
        return lastNotified;
    }
    
    public void setLastNotified(LocalDateTime lastNotified) {
        this.lastNotified = lastNotified;
    }
}
