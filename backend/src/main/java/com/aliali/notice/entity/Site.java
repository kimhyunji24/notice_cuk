package com.aliali.notice.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "sites")
public class Site {
    
    @Id
    @Column(name = "id")
    private String id;
    
    @NotBlank
    @Column(name = "name", nullable = false)
    private String name;
    
    @NotBlank
    @Column(name = "url", nullable = false)
    private String url;
    
    @Column(name = "selector")
    private String selector;
    
    @Column(name = "title_selector")
    private String titleSelector;
    
    @Column(name = "link_selector")
    private String linkSelector;
    
    @Column(name = "category")
    private String category;
    
    @Column(name = "enabled")
    private Boolean enabled = true;
    
    @Column(name = "last_crawled")
    private LocalDateTime lastCrawled;
    
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
    
    @OneToMany(mappedBy = "site", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Notice> notices;
    
    @OneToMany(mappedBy = "site", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<Subscription> subscriptions;
    
    @PrePersist
    protected void onCreate() {
        createdAt = LocalDateTime.now();
        updatedAt = LocalDateTime.now();
    }
    
    @PreUpdate
    protected void onUpdate() {
        updatedAt = LocalDateTime.now();
    }
    
    // Constructors
    public Site() {}
    
    public Site(String id, String name, String url, String selector, String titleSelector, String linkSelector, String category) {
        this.id = id;
        this.name = name;
        this.url = url;
        this.selector = selector;
        this.titleSelector = titleSelector;
        this.linkSelector = linkSelector;
        this.category = category;
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
    
    public List<Notice> getNotices() {
        return notices;
    }
    
    public void setNotices(List<Notice> notices) {
        this.notices = notices;
    }
    
    public List<Subscription> getSubscriptions() {
        return subscriptions;
    }
    
    public void setSubscriptions(List<Subscription> subscriptions) {
        this.subscriptions = subscriptions;
    }
}
