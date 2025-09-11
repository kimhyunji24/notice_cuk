package alli.notice_cuk.api.notice.repository;

import alli.notice_cuk.api.notice.entity.Notice;
import org.springframework.data.mongodb.repository.MongoRepository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

public interface NoticeRepository extends MongoRepository<Notice, String> {


    List<Notice> findBySiteIdOrderByCrawledAtDesc(String siteId);

    Optional<Notice> findTopBySiteIdOrderByCrawledAtDesc(String siteId);

    Set<Notice> findBySiteIdAndPostNoIn(String siteId, Set<String> postNos);

}
