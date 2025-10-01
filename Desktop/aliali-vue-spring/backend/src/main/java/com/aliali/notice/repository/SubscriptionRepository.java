package com.aliali.notice.repository;

import com.aliali.notice.entity.Site;
import com.aliali.notice.entity.Subscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SubscriptionRepository extends JpaRepository<Subscription, Long> {
    
    List<Subscription> findByFcmTokenAndIsActiveTrue(String fcmToken);
    
    List<Subscription> findByDeviceIdAndIsActiveTrue(String deviceId);
    
    @Query("SELECT s FROM Subscription s WHERE s.site = :site AND s.isActive = true")
    List<Subscription> findActiveSubscriptionsBySite(@Param("site") Site site);
    
    @Query("SELECT s FROM Subscription s WHERE s.fcmToken = :fcmToken AND s.site = :site AND s.isActive = true")
    Optional<Subscription> findActiveSubscriptionByFcmTokenAndSite(@Param("fcmToken") String fcmToken, @Param("site") Site site);
    
    @Query("SELECT s FROM Subscription s WHERE s.deviceId = :deviceId AND s.site = :site AND s.isActive = true")
    Optional<Subscription> findActiveSubscriptionByDeviceIdAndSite(@Param("deviceId") String deviceId, @Param("site") Site site);
    
    @Query("SELECT DISTINCT s.fcmToken FROM Subscription s WHERE s.isActive = true")
    List<String> findDistinctActiveFcmTokens();
    
    @Query("SELECT s FROM Subscription s WHERE s.site = :site AND s.isActive = true")
    List<Subscription> findActiveSubscriptionsBySiteId(@Param("site") Site site);
}
