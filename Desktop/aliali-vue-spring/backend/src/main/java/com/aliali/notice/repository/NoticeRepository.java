package com.aliali.notice.repository;

import com.aliali.notice.entity.Notice;
import com.aliali.notice.entity.Site;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface NoticeRepository extends JpaRepository<Notice, Long> {
    
    List<Notice> findBySiteOrderByPublishedAtDesc(Site site);
    
    List<Notice> findBySiteOrderByCreatedAtDesc(Site site);
    
    List<Notice> findBySiteAndIsNewTrueOrderByPublishedAtDesc(Site site);
    
    List<Notice> findBySiteAndIsNewTrue(Site site);
    
    @Query("SELECT n FROM Notice n WHERE n.site = :site AND n.externalId = :externalId")
    Optional<Notice> findBySiteAndExternalId(@Param("site") Site site, @Param("externalId") String externalId);
    
    @Query("SELECT n FROM Notice n WHERE n.site = :site ORDER BY n.publishedAt DESC")
    List<Notice> findRecentNoticesBySite(@Param("site") Site site);
    
    @Query("SELECT n FROM Notice n WHERE n.publishedAt >= :since ORDER BY n.publishedAt DESC")
    List<Notice> findNoticesSince(@Param("since") LocalDateTime since);
    
    @Query("SELECT n FROM Notice n WHERE n.isNew = true ORDER BY n.publishedAt DESC")
    List<Notice> findNewNotices();
    
    @Query("SELECT COUNT(n) FROM Notice n WHERE n.site = :site AND n.publishedAt >= :since")
    long countNoticesBySiteSince(@Param("site") Site site, @Param("since") LocalDateTime since);
    
    @Query("SELECT n FROM Notice n WHERE n.site = :site ORDER BY n.publishedAt DESC LIMIT :limit")
    List<Notice> findTopNoticesBySite(@Param("site") Site site, @Param("limit") int limit);
    
    @Query("SELECT n FROM Notice n WHERE n.site = :site ORDER BY n.publishedAt DESC")
    List<Notice> findAllNoticesBySiteOrderByPublishedAtDesc(@Param("site") Site site);
}
