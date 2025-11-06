package com.aliali.notice.dto;

import com.aliali.notice.entity.Site;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
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
    

}
