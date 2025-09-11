package alli.notice_cuk.api.subscription.repository;

import alli.notice_cuk.api.subscription.entity.Subscription;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.time.LocalDateTime;
import java.util.List;

public interface SubscriptionRepository extends MongoRepository<Subscription, String> {

    List<Subscription> findBySitesContains(String siteId);

    List<Subscription> findByUpdatedAtBefore(LocalDateTime dateTime);
}
