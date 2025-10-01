package com.aliali.notice.config;

import com.aliali.notice.entity.Site;
import com.aliali.notice.repository.SiteRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class SiteInitializer implements CommandLineRunner {
    
    private static final Logger logger = LoggerFactory.getLogger(SiteInitializer.class);
    
    @Autowired
    private SiteRepository siteRepository;
    
    @Override
    public void run(String... args) throws Exception {
        initializeSites();
    }
    
    public void initializeSites() {
        logger.info("사이트 설정 초기화 시작");
        
        // 기존 사이트가 있는지 확인
        long existingCount = siteRepository.count();
        if (existingCount > 0) {
            logger.info("사이트가 이미 초기화되어 있습니다. 건너뜁니다. (기존: {}개)", existingCount);
            return;
        }
        
        List<Site> sites = createSiteConfigurations();
        
        for (Site site : sites) {
            try {
                siteRepository.save(site);
                logger.info("사이트 저장 완료: {} - {}", site.getId(), site.getName());
            } catch (Exception e) {
                logger.error("사이트 저장 실패: {} - {}", site.getId(), site.getName(), e);
            }
        }
        
        logger.info("사이트 설정 초기화 완료: {}개 사이트", sites.size());
    }
    
    private List<Site> createSiteConfigurations() {
        return Arrays.asList(
            // 대학 공지사항
            createSite("catholic_notice", "가톨릭대학교 공지사항", 
                "https://www.catholic.ac.kr/ko/campuslife/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "대학공지"),
            
            // 인문계열
            createSite("dept_korean_language", "국어국문학과", 
                "https://korean.catholic.ac.kr/korean/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "인문계열"),
            createSite("dept_philosophy", "철학과", 
                "https://philosophy.catholic.ac.kr/philosophy/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "인문계열"),
            createSite("dept_korean_history", "사학과", 
                "https://koreanhistory.catholic.ac.kr/koreanhistory/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "인문계열"),
            createSite("dept_english", "영어영문학과", 
                "https://english.catholic.ac.kr/english/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "인문계열"),
            createSite("dept_chinese", "중국어중국학과", 
                "https://cn.catholic.ac.kr/cn/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "인문계열"),
            createSite("dept_japanese", "일본어일본문화학과", 
                "https://japanese.catholic.ac.kr/japanese/major/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "인문계열"),
            createSite("dept_french", "프랑스어프랑스문화학과", 
                "https://french.catholic.ac.kr/french/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "인문계열"),
            
            // 사회계열
            createSite("dept_social_welfare", "사회복지학과", 
                "https://socialwelfare.catholic.ac.kr/socialwelfare/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "사회계열"),
            createSite("dept_psychology", "심리학과", 
                "https://psych.catholic.ac.kr/psychology/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "사회계열"),
            createSite("dept_sociology", "사회학과", 
                "https://sociology.catholic.ac.kr/sociology/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "사회계열"),
            createSite("dept_child_study", "아동학과", 
                "https://children.catholic.ac.kr/children/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "사회계열"),
            
            // 교육계열
            createSite("dept_special_education", "특수교육과", 
                "https://sped.catholic.ac.kr/sped/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "교육계열"),
            createSite("dept_teacher", "교직과", 
                "https://teaching.catholic.ac.kr/teaching/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "교육계열"),
            
            // 경영계열
            createSite("dept_business", "경영학부", 
                "https://business.catholic.ac.kr/business/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "경영계열"),
            createSite("dept_accounting", "회계학과", 
                "https://accounting.catholic.ac.kr/accounting/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "경영계열"),
            createSite("dept_global_business", "글로벌비즈니스학과", 
                "https://globalbiz.catholic.ac.kr/globalbiz/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "경영계열"),
            
            // 국제계열
            createSite("dept_international", "국제학부", 
                "https://is.catholic.ac.kr/is/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "국제계열"),
            
            // 법정계열
            createSite("dept_law", "법학과", 
                "https://law.catholic.ac.kr/law/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "법정계열"),
            
            // 경제계열
            createSite("dept_economics", "경제학과", 
                "https://economics.catholic.ac.kr/economics/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "경제계열"),
            
            // 행정계열
            createSite("dept_public_admin", "행정학과", 
                "https://pa.catholic.ac.kr/pa/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "행정계열"),
            
            // 문화계열
            createSite("dept_korean_culture", "한국문화학과", 
                "https://klc.catholic.ac.kr/klc/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "문화계열"),
            
            // 자연계열
            createSite("dept_chemistry", "화학과", 
                "https://chemistry.catholic.ac.kr/chemistry/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "자연계열"),
            createSite("dept_mathematics", "수학과", 
                "https://math.catholic.ac.kr/math/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "자연계열"),
            createSite("dept_physics", "물리학과", 
                "https://physics.catholic.ac.kr/physics/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "자연계열"),
            createSite("dept_biomedical_life", "의생명과학과", 
                "https://mbs.catholic.ac.kr/mbs/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "자연계열"),
            
            // 생활계열
            createSite("dept_spatial_consumer", "소비자주거학과", 
                "https://design.catholic.ac.kr/design/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "생활계열"),
            createSite("dept_clothing", "의류학과", 
                "https://clothing.catholic.ac.kr/clothing/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "생활계열"),
            createSite("dept_food_nutrition", "식품영양학과", 
                "https://fn.catholic.ac.kr/fn/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "생활계열"),
            
            // 공학계열
            createSite("dept_media_tech", "미디어기술콘텐츠학과", 
                "https://mtc.catholic.ac.kr/mtc/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "공학계열"),
            createSite("dept_computer_info", "컴퓨터정보공학부", 
                "https://csie.catholic.ac.kr/csie/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "공학계열"),
            createSite("dept_info_communication", "정보통신전자공학부", 
                "https://ice.catholic.ac.kr/ice/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "공학계열"),
            createSite("dept_biotech", "생명공학과", 
                "https://biotech.catholic.ac.kr/biotech/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "공학계열"),
            createSite("dept_energy_environment", "에너지환경공학과", 
                "https://envi.catholic.ac.kr/envi/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "공학계열"),
            createSite("dept_biomedical_chem", "의생명화학공학과", 
                "https://bmce.catholic.ac.kr/bmce/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "공학계열"),
            createSite("dept_ai", "인공지능학과", 
                "https://ai.catholic.ac.kr/ai/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "공학계열"),
            createSite("dept_data_science", "데이터사이언스학과", 
                "https://datascience.catholic.ac.kr/datascience/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "공학계열"),
            createSite("dept_biomedical_sw", "의생명소프트웨어학과", 
                "https://bmsw.catholic.ac.kr/bmsw/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "공학계열"),
            
            // 예체능계열
            createSite("dept_music", "음악과", 
                "https://music.catholic.ac.kr/music/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "예체능계열"),
            createSite("dept_vocal_foreign", "성악과", 
                "https://voice.catholic.ac.kr/voice/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "예체능계열"),
            
            // 교양
            createSite("dept_liberal_arts", "교양교육원", 
                "https://liberal.catholic.ac.kr/liberal/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "교양"),
            createSite("dept_general_college", "가톨릭대학교 학부대학", 
                "https://catholic-college.catholic.ac.kr/catholic_college/notification/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "대학"),
            createSite("dept_convergence", "융합전공", 
                "https://major-convergence.catholic.ac.kr/major_convergence/notice/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "융합"),
            
            // 대학원
            createSite("dept_gbs", "GBS", 
                "https://gbs.catholic.ac.kr/gbs/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "대학원"),
            
            // 약학계열
            createSite("dept_pharmacy", "약학대학", 
                "https://pharmacy.catholic.ac.kr/pharmacy/community/notice.do", 
                "a.b-title", "a.b-title", "a.b-title", "약학계열")
        );
    }
    
    private Site createSite(String id, String name, String url, String selector, 
                           String titleSelector, String linkSelector, String category) {
        Site site = new Site();
        site.setId(id);
        site.setName(name);
        site.setUrl(url);
        site.setSelector(selector);
        site.setTitleSelector(titleSelector);
        site.setLinkSelector(linkSelector);
        site.setCategory(category);
        site.setEnabled(true);
        return site;
    }
}
