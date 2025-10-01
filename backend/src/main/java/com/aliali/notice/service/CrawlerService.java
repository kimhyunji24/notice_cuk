package com.aliali.notice.service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.stream.Collectors;

import org.jsoup.Jsoup;
import org.jsoup.nodes.Document;
import org.jsoup.nodes.Element;
import org.jsoup.select.Elements;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import com.aliali.notice.entity.Notice;
import com.aliali.notice.entity.Site;
import com.aliali.notice.repository.NoticeRepository;
import com.aliali.notice.repository.SiteRepository;

@Service
public class CrawlerService {
    
    private static final Logger logger = LoggerFactory.getLogger(CrawlerService.class);
    
    @Autowired
    private SiteRepository siteRepository;
    
    @Autowired
    private NoticeRepository noticeRepository;
    
    @Autowired
    private NotificationService notificationService;
    
    @Value("${crawler.enabled:true}")
    private boolean crawlerEnabled;
    
    @Value("${crawler.interval:600000}")
    private long crawlerInterval;
    
    @Value("${crawler.concurrent-limit:5}")
    private int concurrentLimit;
    
    @Value("${crawler.request-timeout:10000}")
    private int requestTimeout;
    
    @Value("${crawler.max-retries:3}")
    private int maxRetries;
    
    @Value("${crawler.retry-delay:2000}")
    private long retryDelay;
    
    private final ExecutorService executorService = Executors.newFixedThreadPool(10);
    
    // 크롤링 결과를 저장하는 맵 (사이트별 처리된 게시물 번호)
    private final Map<String, Set<String>> processedPosts = new ConcurrentHashMap<>();
    
    // 크롤링 결과를 나타내는 내부 클래스
    public static class CrawlResult {
        private final String siteId;
        private final boolean success;
        private final int newPostsCount;
        private final String error;
        
        public CrawlResult(String siteId, boolean success, int newPostsCount, String error) {
            this.siteId = siteId;
            this.success = success;
            this.newPostsCount = newPostsCount;
            this.error = error;
        }
        
        public String getSiteId() { return siteId; }
        public boolean isSuccess() { return success; }
        public int getNewPostsCount() { return newPostsCount; }
        public String getError() { return error; }
    }
    
    // 게시물 정보를 나타내는 내부 클래스
    public static class PostInfo {
        private final String no;
        private final String title;
        private final String link;
        private final boolean isImportant;
        
        public PostInfo(String no, String title, String link, boolean isImportant) {
            this.no = no;
            this.title = title;
            this.link = link;
            this.isImportant = isImportant;
        }
        
        public String getNo() { return no; }
        public String getTitle() { return title; }
        public String getLink() { return link; }
        public boolean isImportant() { return isImportant; }
    }
    
    @Scheduled(fixedDelayString = "${crawler.interval:600000}")
    public void scheduledCrawlAllSites() {
        if (!crawlerEnabled) {
            logger.info("크롤러가 비활성화되어 있습니다");
            return;
        }
        
        logger.info("🕐 자동 크롤링 시작: {}", LocalDateTime.now());
        crawlAllSites();
    }
    
    /**
     * 전체 사이트 크롤링 (자동/수동 공통)
     */
    public void crawlAllSites() {
        logger.info("🚀 전체 사이트 크롤링 시작: {}", LocalDateTime.now());
        
        List<Site> sites = siteRepository.findByEnabledTrue();
        if (sites.isEmpty()) {
            logger.warn("크롤링할 활성 사이트가 없습니다");
            return;
        }
        
        // 병렬 처리를 위해 청크로 나누기
        List<List<Site>> chunks = partitionList(sites, concurrentLimit);
        int totalNewNotices = 0;
        int successCount = 0;
        
        for (List<Site> chunk : chunks) {
            List<CompletableFuture<CrawlResult>> futures = chunk.stream()
                .map(site -> CompletableFuture.supplyAsync(() -> crawlSiteWithRetry(site), executorService))
                .collect(Collectors.toList());
            
            // 모든 청크의 결과를 기다림
            CompletableFuture.allOf(futures.toArray(new CompletableFuture[0])).join();
            
            for (CompletableFuture<CrawlResult> future : futures) {
                try {
                    CrawlResult result = future.get();
                    if (result.isSuccess()) {
                        successCount++;
                        totalNewNotices += result.getNewPostsCount();
                        logger.info("✅ [{}] 크롤링 성공: 새 글 {}개", result.getSiteId(), result.getNewPostsCount());
                    } else {
                        logger.error("❌ [{}] 크롤링 실패: {}", result.getSiteId(), result.getError());
                    }
                } catch (Exception e) {
                    logger.error("크롤링 결과 처리 중 오류: {}", e.getMessage());
                }
            }
        }
        
        logger.info("🎉 크롤링 완료: {}/{} 성공, 새 글 {}개", successCount, sites.size(), totalNewNotices);
    }
    
    /**
     * 재시도 로직이 포함된 사이트 크롤링
     */
    public CrawlResult crawlSiteWithRetry(Site site) {
        logger.info("🔍 [{}] 크롤링 시작: {}", site.getId(), site.getName());
        
        for (int attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return crawlSite(site);
            } catch (Exception e) {
                logger.error("❌ [{}] 크롤링 시도 {}/{} 실패: {}", site.getId(), attempt, maxRetries, e.getMessage());
                
                if (attempt == maxRetries) {
                    return new CrawlResult(site.getId(), false, 0, e.getMessage());
                }
                
                // 재시도 전 대기
                try {
                    Thread.sleep(retryDelay);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    return new CrawlResult(site.getId(), false, 0, "Interrupted during retry delay");
                }
            }
        }
        
        return new CrawlResult(site.getId(), false, 0, "Unknown error");
    }
    
    /**
     * 단일 사이트 크롤링 (고급 로직 포함)
     */
    // public CrawlResult crawlSite(Site site) {
    //     try {
    //         logger.info("🔍 [{}] 크롤링 시작: {}", site.getId(), site.getUrl());
            
    //         // 기존 공지사항들을 isNew=false로 설정 (새로고침 시 새로운 공지사항만 표시하기 위해)
    //         List<Notice> existingNotices = noticeRepository.findBySiteAndIsNewTrue(site);
    //         if (!existingNotices.isEmpty()) {
    //             logger.info("🔄 [{}] 기존 공지사항 {}개를 isNew=false로 설정", site.getId(), existingNotices.size());
    //             for (Notice notice : existingNotices) {
    //                 notice.setIsNew(false);
    //             }
    //             noticeRepository.saveAll(existingNotices);
    //         }
            
    //         // 웹페이지 가져오기
    //         Document doc = Jsoup.connect(site.getUrl())
    //                 .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    //                 .timeout(requestTimeout)
    //                 .get();
            
    //         // 데이터베이스에서 최신 공지사항 번호들 가져오기 (실시간 조회)
    //         Set<String> processedNos = getProcessedPosts(site.getId());
            
    //         // 현재 게시물들 파싱 (최대 10개)
    //         List<PostInfo> currentPosts = parsePosts(doc, site);
            
    //         logger.info("[{}] DB에 저장된 번호: {}", site.getId(), processedNos);
    //         logger.info("[{}] 현재 파싱된 번호: {}", site.getId(), currentPosts.stream().map(PostInfo::getNo).collect(Collectors.toList()));
            
    //         if (currentPosts.isEmpty()) {
    //             logger.warn("⚠️ [{}] 게시글을 찾을 수 없습니다. HTML 구조를 확인하세요.", site.getId());
    //             return new CrawlResult(site.getId(), true, 0, null);
    //         }
            
    //         // 최적화: 첫 번째 게시물이 이미 처리된 번호에 있다면 새 글 없음
    //         if (!currentPosts.isEmpty() && processedNos.contains(currentPosts.get(0).getNo())) {
    //             logger.info("⚡ [{}] 첫 번째 게시물이 이미 처리됨 - 새 글 없음 (최적화)", site.getId());
    //             return new CrawlResult(site.getId(), true, 0, null);
    //         }
            
    //         // 새 게시물 식별
    //         List<PostInfo> newPosts = identifyNewPosts(currentPosts, processedNos, site.getId());
            
    //         if (!newPosts.isEmpty()) {
    //             logger.info("🎉 [{}] 새 글 {}개 발견", site.getId(), newPosts.size());
    //             newPosts.forEach(post -> logger.info("  - 새 글: {} | {}", post.getNo(), post.getTitle()));
                
    //             // 새 공지사항 저장 및 알림 발송
    //             for (PostInfo post : newPosts) {
    //                 try {
    //                     saveNoticeAndSendNotification(post, site);
    //                 } catch (Exception e) {
    //                     logger.error("❌ [{}] 게시물 '{}' 저장/알림 실패: {}", site.getId(), post.getTitle(), e.getMessage());
    //                 }
    //             }
    //         } else {
    //             logger.info("📭 [{}] 새 글 없음", site.getId());
    //         }
            
    //         // 크롤링 상태 업데이트
    //         updateCrawledPostData(site.getId(), currentPosts, newPosts);
            
    //         // 새 글이 저장된 후 메모리 캐시 갱신 (다음 크롤링을 위해)
    //         if (!newPosts.isEmpty()) {
    //             refreshProcessedPosts(site.getId());
    //         }
            
    //         // 사이트의 마지막 크롤링 시간 업데이트
    //         site.setLastCrawled(LocalDateTime.now());
    //         siteRepository.save(site);
            
    //         logger.info("✅ [{}] 크롤링 완료 - 새 글 {}개", site.getId(), newPosts.size());
            
    //         return new CrawlResult(site.getId(), true, newPosts.size(), null);
            
    //     } catch (Exception e) {
    //         logger.error("❌ [{}] 크롤링 실패: {}", site.getId(), e.getMessage());
    //         return new CrawlResult(site.getId(), false, 0, e.getMessage());
    //     }
    // }
    

    /**
     * 단일 사이트 크롤링 (고급 로직 포함)
     */
    public CrawlResult crawlSite(Site site) {
        try {
            // --- 💡 수정된 부분 시작 ---

            logger.info("▶️ [{}] 크롤링을 시작합니다: {}", site.getId(), site.getUrl());

            // 1. 기존 'new' 플래그 초기화
            List<Notice> existingNotices = noticeRepository.findBySiteAndIsNewTrue(site);
            if (!existingNotices.isEmpty()) {
                for (Notice notice : existingNotices) {
                    notice.setIsNew(false);
                }
                noticeRepository.saveAll(existingNotices);
            }

            // 2. 웹페이지에서 게시물 파싱
            Document doc = Jsoup.connect(site.getUrl())
                    .userAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
                    .timeout(requestTimeout)
                    .get();
            List<PostInfo> currentPosts = parsePosts(doc, site);
            logger.info("🔎 [{}] 게시물 파싱 완료: 총 {}개를 수집했습니다.", site.getId(), currentPosts.size());

            if (currentPosts.isEmpty()) {
                logger.warn("⚠️ [{}] 수집된 게시물이 없습니다. 사이트의 HTML 구조 변경이 의심됩니다.", site.getId());
                return new CrawlResult(site.getId(), true, 0, null);
            }
            
            // 3. 새 글 후보 식별
            Set<String> processedNos = getProcessedPosts(site.getId());
            List<PostInfo> potentialNewPosts = currentPosts.stream()
                .filter(post -> !processedNos.contains(post.getNo()))
                .collect(Collectors.toList());

            if (potentialNewPosts.isEmpty()) {
                logger.info("✅ [{}] 크롤링 완료: 새로운 게시물이 없습니다.", site.getId());
                site.setLastCrawled(LocalDateTime.now());
                siteRepository.save(site);
                return new CrawlResult(site.getId(), true, 0, null);
            }
            
            logger.info("👀 [{}] {}개의 글을 찾았습니다. 최종 중복 검사를 시작합니다...", site.getId(), potentialNewPosts.size());

            // 4. 최종 확인 및 저장
            int newPostsCount = 0;
            for (PostInfo post : potentialNewPosts) {
                String externalId = generateExternalId(post.getTitle(), post.getLink());
                
                // 최종 중복 검사: DB에 externalId가 없는 경우에만 저장
                if (noticeRepository.findBySiteAndExternalId(site, externalId).isEmpty()) {
                    newPostsCount++;
                    logger.info("  ✨ [{}] 신규 게시물 저장: {}", site.getId(), post.getTitle());
                    saveNoticeAndSendNotification(post, site); // 저장 및 알림 발송
                }
            }

            // 5. 크롤링 상태 업데이트 및 요약
            updateCrawledPostData(site.getId(), currentPosts, new ArrayList<>()); // processedNos 캐시 업데이트
            if (newPostsCount > 0) {
                refreshProcessedPosts(site.getId()); // 메모리 캐시 갱신
            }
            
            site.setLastCrawled(LocalDateTime.now());
            siteRepository.save(site);

            int duplicateCount = currentPosts.size() - newPostsCount;
            logger.info("✅ [{}] 크롤링 완료: 총 {}개 확인 (신규 {}개, 중복 {}개)", site.getId(), currentPosts.size(), newPostsCount, duplicateCount);

            return new CrawlResult(site.getId(), true, newPostsCount, null);


        } catch (Exception e) {
            logger.error("❌ [{}] 크롤링 중 심각한 오류 발생: {}", site.getId(), e.getMessage());
            return new CrawlResult(site.getId(), false, 0, e.getMessage());
        }
    }

    /**
     * 리스트를 청크로 나누는 유틸리티 메서드
     */
    private <T> List<List<T>> partitionList(List<T> list, int chunkSize) {
        List<List<T>> chunks = new ArrayList<>();
        for (int i = 0; i < list.size(); i += chunkSize) {
            chunks.add(list.subList(i, Math.min(i + chunkSize, list.size())));
        }
        return chunks;
    }
    
    /**
     * 사이트별 처리된 게시물 번호 가져오기 (데이터베이스에서 실시간 조회)
     */
    private Set<String> getProcessedPosts(String siteId) {
        // 메모리 캐시가 있으면 사용, 없으면 DB에서 조회
        if (processedPosts.containsKey(siteId)) {
            return processedPosts.get(siteId);
        }
        
        // 데이터베이스에서 기존 공지사항의 externalId들을 가져와서 초기화
        Site site = siteRepository.findById(siteId).orElse(null);
        if (site != null) {
            Set<String> dbProcessedNos = noticeRepository.findBySiteOrderByCreatedAtDesc(site).stream()
                .map(Notice::getExternalId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
            
            // 메모리 캐시에 저장
            processedPosts.put(siteId, dbProcessedNos);
            return dbProcessedNos;
        }
        return new HashSet<>();
    }
    
    /**
     * 메모리 캐시 갱신 (새 글이 저장된 후 호출)
     */
    private void refreshProcessedPosts(String siteId) {
        Site site = siteRepository.findById(siteId).orElse(null);
        if (site != null) {
            Set<String> dbProcessedNos = noticeRepository.findBySiteOrderByCreatedAtDesc(site).stream()
                .map(Notice::getExternalId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
            
            // 메모리 캐시 갱신
            processedPosts.put(siteId, dbProcessedNos);
            logger.info("🔄 [{}] 메모리 캐시 갱신: {}개", siteId, dbProcessedNos.size());
        }
    }
    
    /**
     * HTML에서 게시물들을 파싱 (고급 로직)
     */
    private List<PostInfo> parsePosts(Document doc, Site site) {
        List<PostInfo> posts = new ArrayList<>();
        Elements allElements = doc.select(site.getSelector());
        List<Element> postElements = allElements.subList(0, Math.min(10, allElements.size()));
        
        logger.info("[{}] 파싱 시작: {}개의 요소를 찾았습니다", site.getId(), postElements.size());
        
        for (Element element : postElements) {
            try {
                String articleNo = extractPostNumber(element, site);
                String title = extractTitle(element, site);
                String link = extractLink(element, site);
                
                if (articleNo == null || title == null || title.trim().isEmpty()) {
                    logger.warn("[{}] 게시물 건너뜀: articleNo={}, title={}", site.getId(), articleNo, title);
                    continue;
                }
                
                // 중요 공지 판단
                boolean isImportant = determineImportance(element, articleNo, title);
                
                posts.add(new PostInfo(articleNo, title.trim(), link, isImportant));
                
            } catch (Exception e) {
                logger.warn("[{}] 게시물 파싱 실패: {}", site.getId(), e.getMessage());
            }
        }
        
        logger.info("[{}] 파싱 완료: {}개의 유효한 게시물을 수집했습니다", site.getId(), posts.size());
        return posts;
    }
    
    /**
     * 게시물 번호 추출 (다양한 방식 시도)
     */
    private String extractPostNumber(Element element, Site site) {
        // 방법 1: data-article-no 속성
        String articleNo = element.attr("data-article-no");
        if (!articleNo.isEmpty()) {
            return articleNo;
        }
        
        // 방법 2: href에서 추출
        Element link = element.selectFirst("a");
        if (link != null) {
            String href = link.attr("href");
            if (!href.isEmpty()) {
                // URL 패턴들로 번호 추출
                String[] patterns = {"[?&](?:no|articleNo|seq|num|id)=(\\d+)", "/(\\d+)(?:\\?|$|\\.html)", "article/(\\d+)"};
                for (String pattern : patterns) {
                    java.util.regex.Pattern p = java.util.regex.Pattern.compile(pattern, java.util.regex.Pattern.CASE_INSENSITIVE);
                    java.util.regex.Matcher m = p.matcher(href);
                    if (m.find()) {
                        return m.group(1);
                    }
                }
            }
        }
        
        // 방법 3: 번호 컬럼에서 추출
        Element numberCell = element.selectFirst(".td-num, .num, td:first-child");
        if (numberCell != null) {
            String numText = numberCell.text().trim();
            java.util.regex.Pattern p = java.util.regex.Pattern.compile("\\d+");
            java.util.regex.Matcher m = p.matcher(numText);
            if (m.find()) {
                return m.group();
            }
        }
        
        // 방법 4: 전체 텍스트에서 번호 패턴 찾기
        String fullText = element.text();
        java.util.regex.Pattern p = java.util.regex.Pattern.compile("(\\d{4,})");
        java.util.regex.Matcher m = p.matcher(fullText);
        if (m.find()) {
            return m.group(1);
        }
        
        // 방법 5: 제목 기반 해시
        String titleHash = generateConsistentId(element.text().trim());
        if (titleHash != null) {
            logger.warn("[{}] 게시물 번호를 찾을 수 없어 제목 해시 사용: {}", site.getId(), titleHash);
            return titleHash;
        }
        
        return null;
    }
    
    /**
     * 제목 추출 (다양한 방식 시도)
     */
    private String extractTitle(Element element, Site site) {
        // 방법 1: 링크 안의 텍스트
        Element link = element.selectFirst("a");
        if (link != null) {
            String linkTitle = link.text().trim();
            if (!linkTitle.isEmpty()) {
                return linkTitle;
            }
        }
        
        // 방법 2: 제목 컬럼 클래스
        String[] titleClasses = {".title", ".subject", ".td-subject", ".board-title"};
        for (String titleClass : titleClasses) {
            Element titleEl = element.selectFirst(titleClass);
            if (titleEl != null) {
                String title = titleEl.text().trim();
                if (!title.isEmpty()) {
                    return title;
                }
            }
        }
        
        // 방법 3: 전체 텍스트에서 의미있는 부분 추출
        String fullText = element.text().trim();
        if (!fullText.isEmpty()) {
            String cleanTitle = fullText
                .replaceAll("^\\d+\\s*", "") // 앞의 번호 제거
                .replaceAll("\\d{4}-\\d{2}-\\d{2}.*$", "") // 뒤의 날짜 제거
                .replaceAll("\\s+", " ")
                .trim();
            
            if (!cleanTitle.isEmpty() && cleanTitle.length() > 5) {
                return cleanTitle;
            }
        }
        
        return null;
    }
    
    /**
     * 링크 추출
     */
    private String extractLink(Element element, Site site) {
        Element link = element.selectFirst("a");
        if (link == null) {
            return site.getUrl();
        }
        
        String href = link.attr("href");
        if (href.isEmpty()) {
            return site.getUrl();
        }
        
        // 절대 URL인 경우 그대로 반환
        if (href.startsWith("http")) {
            return href;
        }
        
        String baseUrl = site.getUrl();
        
        // 상대 URL 처리
        if (href.startsWith("/")) {
            // 절대 경로: /notice.do?no=123
            return baseUrl + href;
        } else if (href.startsWith("notice.do")) {
            // notice.do로 시작하는 경우: notice.do?mode=view&no=123
            // 사이트 URL이 notice.do로 끝나는 경우와 그렇지 않은 경우를 구분
            if (baseUrl.endsWith("notice.do")) {
                // 사이트 URL이 notice.do로 끝나는 경우: https://example.com/community/notice.do
                // notice.do?mode=view&no=123 -> https://example.com/community/notice.do?mode=view&no=123
                if (href.contains("?")) {
                    return baseUrl + "?" + href.substring(href.indexOf('?') + 1);
                } else {
                    return baseUrl;
                }
            } else {
                // 사이트 URL이 notice.do로 끝나지 않는 경우
                // baseUrl에서 notice.do/ 형태를 notice.do로 정규화
                String normalizedBaseUrl = baseUrl;
                if (normalizedBaseUrl.endsWith("notice.do")) {
                    normalizedBaseUrl = normalizedBaseUrl.substring(0, normalizedBaseUrl.length() - 1);
                }
                
                // notice.do?mode=view 형태로 직접 연결 (슬래시 없이)
                return normalizedBaseUrl + href;
            }
        } else {
            // 기타 상대 URL
            // baseUrl이 이미 /로 끝나는지 확인하여 중복 슬래시 방지
            if (baseUrl.endsWith("/")) {
                return baseUrl + href;
            } else {
                return baseUrl + "" + href;
            }
        }
    }
    
    /**
     * 중요 공지 판단
     */
    private boolean determineImportance(Element element, String articleNo, String title) {
        // 번호가 숫자가 아닌 경우 (공지, 중요 등)
        if (!articleNo.matches("\\d+")) {
            return true;
        }
        
        // 제목에 중요 키워드가 있는 경우
        String[] importantKeywords = {"중요", "긴급", "공지", "[공지]", "[중요]", "[필독]", "필독"};
        String lowerTitle = title.toLowerCase();
        for (String keyword : importantKeywords) {
            if (lowerTitle.contains(keyword.toLowerCase())) {
                return true;
            }
        }
        
        // 특별한 스타일이 적용된 경우
        return element.select(".notice, .important, .urgent").size() > 0 ||
               element.hasClass("notice") || 
               element.hasClass("important");
    }
    
    /**
     * 새 게시물 식별
     */
    private List<PostInfo> identifyNewPosts(List<PostInfo> currentPosts, Set<String> processedNos, String siteId) {
        logger.info("[{}] 새 게시물 식별 시작 - 현재: {}개, 처리됨: {}개", siteId, currentPosts.size(), processedNos.size());
        
        List<PostInfo> newPosts = currentPosts.stream()
            .filter(post -> !processedNos.contains(post.getNo()))
            .collect(Collectors.toList());
        
        logger.info("[{}] 새 게시물 {}개 발견", siteId, newPosts.size());
        return newPosts;
    }
    
    /**
     * 공지사항 저장 및 알림 발송
     */
    private void saveNoticeAndSendNotification(PostInfo post, Site site) {
        String externalId = generateExternalId(post.getTitle(), post.getLink());
        
        // 중복 체크
        if (noticeRepository.findBySiteAndExternalId(site, externalId).isPresent()) {
            logger.info("🔄 [{}] 중복 게시물 발견 - 건너뜀: {} (External ID: {})", site.getId(), post.getTitle(), externalId);
            return;
        }
        
        logger.info("✨ [{}] 새 게시물 확인됨 - 저장 진행: {} (External ID: {})", site.getId(), post.getTitle(), externalId);
        
        Notice notice = new Notice();
        notice.setTitle(post.getTitle());
        notice.setUrl(post.getLink());
        notice.setExternalId(externalId);
        notice.setSite(site);
        notice.setPublishedAt(LocalDateTime.now());
        notice.setIsNew(true);
        
        noticeRepository.save(notice);
        
        // 사이트별 게시글 10개 제한 로직
        maintainNoticeLimit(site);
        
        // 새 글 알림 발송
        notificationService.sendNotificationForNewNotice(notice);
        
        logger.info("💾 [{}] 새 공지사항 저장 및 알림 발송: {}", site.getId(), post.getTitle());
    }
    
    /**
     * 사이트별 게시글을 10개로 제한하는 메서드
     */
    private void maintainNoticeLimit(Site site) {
        try {
            List<Notice> allNotices = noticeRepository.findAllNoticesBySiteOrderByPublishedAtDesc(site);
            
            if (allNotices.size() > 10) {
                // 10개를 초과하는 오래된 게시글들을 삭제
                List<Notice> noticesToDelete = allNotices.subList(10, allNotices.size());
                
                for (Notice notice : noticesToDelete) {
                    logger.info("🗑️ [{}] 오래된 게시글 삭제: {} (ID: {})", site.getId(), notice.getTitle(), notice.getId());
                }
                
                noticeRepository.deleteAll(noticesToDelete);
                logger.info("🧹 [{}] {}개의 오래된 게시글을 삭제했습니다", site.getId(), noticesToDelete.size());
            }
        } catch (Exception e) {
            logger.error("❌ [{}] 게시글 제한 관리 중 오류 발생: {}", site.getId(), e.getMessage());
        }
    }
    
    /**
     * 크롤링 데이터 업데이트
     */
    private void updateCrawledPostData(String siteId, List<PostInfo> currentPosts, List<PostInfo> newPosts) {
        // 숫자 기반 게시물만 processedNos에 저장
        Set<String> numericPosts = currentPosts.stream()
            .filter(post -> post.getNo().matches("\\d+"))
            .map(PostInfo::getNo)
            .collect(Collectors.toSet());
        
        processedPosts.put(siteId, numericPosts);
        logger.info("[{}] processedNos 업데이트: {}개 (해시 ID 제외)", siteId, numericPosts.size());
    }
    
    /**
     * 제목 기반 일관성 있는 ID 생성
     */
    private String generateConsistentId(String text) {
        if (text == null || text.trim().length() < 5) {
            return null;
        }
        
        String normalized = text.trim()
            .replaceAll("\\s+", " ")
            .replaceAll("[^\\w\\s가-힣]", "")
            .substring(0, Math.min(100, text.length()));
        
        if (normalized.length() < 5) {
            return null;
        }
        
        // 간단한 해시 함수
        int hash = 0;
        for (int i = 0; i < normalized.length(); i++) {
            char c = normalized.charAt(i);
            hash = ((hash << 5) - hash) + c;
            hash = hash & hash; // 32비트 정수로 변환
        }
        
        return "hash_" + Math.abs(hash);
    }
    
    private String generateExternalId(String title, String link) {
        if (link != null && !link.trim().isEmpty()) {
            return String.valueOf(link.hashCode());
        }
        return String.valueOf((title + System.currentTimeMillis()).hashCode());
    }
    
    /**
     * 수동 크롤링 - 모든 사이트 크롤링
     */
    public void manualCrawlAllSites() {
        logger.info("🔧 수동 크롤링 시작 - 모든 사이트");
        crawlAllSites();
    }
    
    /**
     * 수동 크롤링 - 특정 사이트 크롤링
     */
    public CrawlResult manualCrawlSite(String siteId) {
        logger.info("🔧 수동 크롤링 시작 - 사이트: {}", siteId);
        
        Optional<Site> siteOpt = siteRepository.findById(siteId);
        if (siteOpt.isEmpty()) {
            logger.warn("사이트를 찾을 수 없습니다: {}", siteId);
            return new CrawlResult(siteId, false, 0, "Site not found");
        }
        
        Site site = siteOpt.get();
        if (site.getEnabled() == null || !site.getEnabled()) {
            logger.warn("사이트가 비활성화되어 있습니다: {}", siteId);
            return new CrawlResult(siteId, false, 0, "Site is disabled");
        }
        
        return crawlSite(site);
    }
    
    /**
     * 크롤링 상태 확인
     */
    public Map<String, Object> getCrawlingStatus() {
        Map<String, Object> status = new HashMap<>();
        status.put("crawlerEnabled", crawlerEnabled);
        status.put("crawlerInterval", crawlerInterval);
        status.put("concurrentLimit", concurrentLimit);
        status.put("requestTimeout", requestTimeout);
        status.put("maxRetries", maxRetries);
        status.put("retryDelay", retryDelay);
        
        // 활성화된 사이트 수
        long enabledSitesCount = siteRepository.countByEnabledTrue();
        status.put("enabledSitesCount", enabledSitesCount);
        
        // 전체 사이트 수
        long totalSitesCount = siteRepository.count();
        status.put("totalSitesCount", totalSitesCount);
        
        // 마지막 크롤링 시간들
        List<Site> sites = siteRepository.findByEnabledTrue();
        Map<String, LocalDateTime> lastCrawledTimes = sites.stream()
                .collect(Collectors.toMap(
                    Site::getId,
                    site -> site.getLastCrawled() != null ? site.getLastCrawled() : LocalDateTime.MIN
                ));
        status.put("lastCrawledTimes", lastCrawledTimes);
        
        return status;
    }
    
    /**
     * 단일 사이트 크롤링 테스트 (디버깅용)
     */
    public CrawlResult testCrawlSite(String siteId) {
        logger.info("🧪 [{}] 테스트 크롤링 시작", siteId);
        
        Site site = siteRepository.findById(siteId).orElse(null);
        if (site == null) {
            return new CrawlResult(siteId, false, 0, "Site not found");
        }
        
        try {
            return crawlSite(site);
        } catch (Exception e) {
            logger.error("🧪 [{}] 테스트 크롤링 실패: {}", siteId, e.getMessage());
            return new CrawlResult(siteId, false, 0, e.getMessage());
        }
    }
}
