package alli.notice_cuk.api.site.repository;

import alli.notice_cuk.api.site.entity.Site;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.Optional;

public interface SiteRepository extends MongoRepository<Site, String> {

    Optional<Site> findBySiteId(String siteId);
}
