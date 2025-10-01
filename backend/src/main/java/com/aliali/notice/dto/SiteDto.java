package com.aliali.notice.dto;

import com.aliali.notice.entity.Site;
import java.time.LocalDateTime;

public class SiteDto {
    private String id;
    private String name;
    private String url;
    private String selector;
    private String titleSelector;
    private String linkSelector;
    private String category;
    private Boolean enabled;
    private LocalDateTime lastCrawled;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    // Constructors
    public SiteDto() {}
    
    public SiteDto(Site site) {
        this.id = site.getId();
        this.name = site.getName();
        this.url = site.getUrl();
        this.selector = site.getSelector();
        this.titleSelector = site.getTitleSelector();
        this.linkSelector = site.getLinkSelector();
        this.category = site.getCategory();
        this.enabled = site.getEnabled();
        this.lastCrawled = site.getLastCrawled();
        this.createdAt = site.getCreatedAt();
        this.updatedAt = site.getUpdatedAt();
    }
    
    // Getters and Setters
    public String getId() {
        return id;
    }
    
    public void setId(String id) {
        this.id = id;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getUrl() {
        return url;
    }
    
    public void setUrl(String url) {
        this.url = url;
    }
    
    public String getSelector() {
        return selector;
    }
    
    public void setSelector(String selector) {
        this.selector = selector;
    }
    
    public String getTitleSelector() {
        return titleSelector;
    }
    
    public void setTitleSelector(String titleSelector) {
        this.titleSelector = titleSelector;
    }
    
    public String getLinkSelector() {
        return linkSelector;
    }
    
    public void setLinkSelector(String linkSelector) {
        this.linkSelector = linkSelector;
    }
    
    public String getCategory() {
        return category;
    }
    
    public void setCategory(String category) {
        this.category = category;
    }
    
    public Boolean getEnabled() {
        return enabled;
    }
    
    public void setEnabled(Boolean enabled) {
        this.enabled = enabled;
    }
    
    public LocalDateTime getLastCrawled() {
        return lastCrawled;
    }
    
    public void setLastCrawled(LocalDateTime lastCrawled) {
        this.lastCrawled = lastCrawled;
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
}
