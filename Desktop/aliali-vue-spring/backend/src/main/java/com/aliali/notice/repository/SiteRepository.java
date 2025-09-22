package com.aliali.notice.repository;

import com.aliali.notice.entity.Site;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SiteRepository extends JpaRepository<Site, String> {
    
    List<Site> findByEnabledTrue();
    
    List<Site> findByCategory(String category);
    
    long countByEnabledTrue();
    
    @Query("SELECT s FROM Site s WHERE s.enabled = true ORDER BY s.name")
    List<Site> findEnabledSitesOrderByName();
    
    @Query("SELECT s FROM Site s WHERE s.category = :category AND s.enabled = true ORDER BY s.name")
    List<Site> findEnabledSitesByCategoryOrderByName(String category);
}
