package com.aliali.notice.entity;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.List;

@Entity
@Table(name = "sites")
@Getter
@Setter
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

}
