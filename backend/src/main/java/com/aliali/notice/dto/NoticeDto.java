package com.aliali.notice.dto;

import com.aliali.notice.entity.Notice;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Getter
@Setter
public class NoticeDto {
    private Long id;
    private String title;
    private String content;
    private String url;
    private String externalId;
    private String siteId;
    private String siteName;
    private LocalDateTime publishedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private Boolean isNew;
    
    // Constructors
    public NoticeDto() {}
    
    public NoticeDto(Notice notice) {
        this.id = notice.getId();
        this.title = notice.getTitle();
        this.content = notice.getContent();
        this.url = notice.getUrl();
        this.externalId = notice.getExternalId();
        this.siteId = notice.getSite().getId();
        this.siteName = notice.getSite().getName();
        this.publishedAt = notice.getPublishedAt();
        this.createdAt = notice.getCreatedAt();
        this.updatedAt = notice.getUpdatedAt();
        this.isNew = notice.getIsNew();
    }


}
