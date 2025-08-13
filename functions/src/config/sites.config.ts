export interface SiteConfig {
  id: string;
  name: string;
  url: string;
  selector: string;
  category: string;
}

export const SITE_CONFIGS: Record<string, SiteConfig> = {

  'catholic_notice': {
    id: 'catholic_notice',
    name: '가톨릭대학교 공지사항',
    url: 'https://www.catholic.ac.kr/ko/campuslife/notice.do',
    selector: 'a.b-title',
    category: '대학공지'
  },

  'dept_korean_language': {
    id: 'dept_korean_language',
    name: '국어국문학과',
    url: 'https://korean.catholic.ac.kr/korean/community/notice.do',
    selector: 'a.b-title',
    category: '인문계열'
  },
  'dept_philosophy': {
    id: 'dept_philosophy',
    name: '철학과',
    url: 'https://philosophy.catholic.ac.kr/philosophy/community/notice.do',
    selector: 'a.b-title',
    category: '인문계열'
  },
  'dept_korean_history': {
    id: 'dept_korean_history',
    name: '사학과',
    url: 'https://koreanhistory.catholic.ac.kr/koreanhistory/community/notice.do',
    selector: 'a.b-title',
    category: '인문계열'
  },
  'dept_english': {
    id: 'dept_english',
    name: '영어영문학과',
    url: 'https://english.catholic.ac.kr/english/community/notice.do',
    selector: 'a.b-title',
    category: '인문계열'
  },
  'dept_chinese': {
    id: 'dept_chinese',
    name: '중국어중국학과',
    url: 'https://cn.catholic.ac.kr/cn/community/notice.do',
    selector: 'a.b-title',
    category: '인문계열'
  },
  'dept_japanese': {
    id: 'dept_japanese',
    name: '일본어일본문화학과',
    url: 'https://japanese.catholic.ac.kr/japanese/major/notice.do',
    selector: 'a.b-title',
    category: '인문계열'
  },
  'dept_french': {
    id: 'dept_french',
    name: '프랑스어프랑스문화학과',
    url: 'https://french.catholic.ac.kr/french/community/notice.do',
    selector: 'a.b-title',
    category: '인문계열'
  },
  'dept_social_welfare': {
    id: 'dept_social_welfare',
    name: '사회복지학과',
    url: 'https://socialwelfare.catholic.ac.kr/socialwelfare/community/notice.do',
    selector: 'a.b-title',
    category: '사회계열'
  },
  'dept_psychology': {
    id: 'dept_psychology',
    name: '심리학과',
    url: 'https://psych.catholic.ac.kr/psychology/community/notice.do',
    selector: 'a.b-title',
    category: '사회계열'
  },
  'dept_sociology': {
    id: 'dept_sociology',
    name: '사회학과',
    url: 'https://sociology.catholic.ac.kr/sociology/community/notice.do',
    selector: 'a.b-title',
    category: '사회계열'
  },
  'dept_child_study': {
    id: 'dept_child_study',
    name: '아동학과',
    url: 'https://children.catholic.ac.kr/children/community/notice.do',
    selector: 'a.b-title',
    category: '사회계열'
  },
  'dept_special_education': {
    id: 'dept_special_education',
    name: '특수교육과',
    url: 'https://sped.catholic.ac.kr/sped/community/notice.do',
    selector: 'a.b-title',
    category: '교육계열'
  },
  'dept_business': {
    id: 'dept_business',
    name: '경영학부',
    url: 'https://business.catholic.ac.kr/business/community/notice.do',
    selector: 'a.b-title',
    category: '경영계열'
  },
  'dept_accounting': {
    id: 'dept_accounting',
    name: '회계학과',
    url: 'https://accounting.catholic.ac.kr/accounting/community/notice.do',
    selector: 'a.b-title',
    category: '경영계열'
  },
  'dept_international': {
    id: 'dept_international',
    name: '국제학부',
    url: 'https://is.catholic.ac.kr/is/community/notice.do',
    selector: 'a.b-title',
    category: '국제계열'
  },
  'dept_law': {
    id: 'dept_law',
    name: '법학과',
    url: 'https://law.catholic.ac.kr/law/community/notice.do',
    selector: 'a.b-title',
    category: '법정계열'
  },
  'dept_economics': {
    id: 'dept_economics',
    name: '경제학과',
    url: 'https://economics.catholic.ac.kr/economics/community/notice.do',
    selector: 'a.b-title',
    category: '경제계열'
  },
  'dept_public_admin': {
    id: 'dept_public_admin',
    name: '행정학과',
    url: 'https://pa.catholic.ac.kr/pa/community/notice.do',
    selector: 'a.b-title',
    category: '행정계열'
  },
  'dept_global_business': {
    id: 'dept_global_business',
    name: '글로벌비즈니스학과',
    url: 'https://globalbiz.catholic.ac.kr/globalbiz/community/notice.do',
    selector: 'a.b-title',
    category: '경영계열'
  },
  'dept_korean_culture': {
    id: 'dept_korean_culture',
    name: '한국문화학과',
    url: 'https://klc.catholic.ac.kr/klc/community/notice.do',
    selector: 'a.b-title',
    category: '문화계열'
  },
  'dept_chemistry': {
    id: 'dept_chemistry',
    name: '화학과',
    url: 'https://chemistry.catholic.ac.kr/chemistry/community/notice.do',
    selector: 'a.b-title',
    category: '자연계열'
  },
  'dept_mathematics': {
    id: 'dept_mathematics',
    name: '수학과',
    url: 'https://math.catholic.ac.kr/math/community/notice.do',
    selector: 'a.b-title',
    category: '자연계열'
  },
  'dept_physics': {
    id: 'dept_physics',
    name: '물리학과',
    url: 'https://physics.catholic.ac.kr/physics/community/notice.do',
    selector: 'a.b-title',
    category: '자연계열'
  },
  'dept_spatial_consumer': {
    id: 'dept_spatial_consumer',
    name: '소비자주거학과',
    url: 'https://design.catholic.ac.kr/design/community/notice.do',
    selector: 'a.b-title',
    category: '생활계열'
  },
  'dept_clothing': {
    id: 'dept_clothing',
    name: '의류학과',
    url: 'https://clothing.catholic.ac.kr/clothing/community/notice.do',
    selector: 'a.b-title',
    category: '생활계열'
  },
  'dept_food_nutrition': {
    id: 'dept_food_nutrition',
    name: '식품영양학과',
    url: 'https://fn.catholic.ac.kr/fn/community/notice.do',
    selector: 'a.b-title',
    category: '생활계열'
  },
  'dept_media_tech': {
    id: 'dept_media_tech',
    name: '미디어기술콘텐츠학과',
    url: 'https://mtc.catholic.ac.kr/mtc/community/notice.do',
    selector: 'a.b-title',
    category: '공학계열'
  },
  'dept_computer_info': {
    id: 'dept_computer_info',
    name: '컴퓨터정보공학부',
    url: 'https://csie.catholic.ac.kr/csie/community/notice.do',
    selector: 'a.b-title',
    category: '공학계열'
  },
  'dept_info_communication': {
    id: 'dept_info_communication',
    name: '정보통신전자공학부',
    url: 'https://ice.catholic.ac.kr/ice/community/notice.do',
    selector: 'a.b-title',
    category: '공학계열'
  },
  'dept_biotech': {
    id: 'dept_biotech',
    name: '생명공학과',
    url: 'https://biotech.catholic.ac.kr/biotech/community/notice.do',
    selector: 'a.b-title',
    category: '공학계열'
  },
  'dept_energy_environment': {
    id: 'dept_energy_environment',
    name: '에너지환경공학과',
    url: 'https://envi.catholic.ac.kr/envi/community/notice.do',
    selector: 'a.b-title',
    category: '공학계열'
  },
  'dept_biomedical_chem': {
    id: 'dept_biomedical_chem',
    name: '의생명화학공학과',
    url: 'https://bmce.catholic.ac.kr/bmce/community/notice.do',
    selector: 'a.b-title',
    category: '공학계열'
  },
  'dept_ai': {
    id: 'dept_ai',
    name: '인공지능학과',
    url: 'https://ai.catholic.ac.kr/ai/community/notice.do',
    selector: 'a.b-title',
    category: '공학계열'
  },
  'dept_data_science': {
    id: 'dept_data_science',
    name: '데이터사이언스학과',
    url: 'https://datascience.catholic.ac.kr/datascience/community/notice.do',
    selector: 'a.b-title',
    category: '공학계열'
  },
  'dept_biomedical_sw': {
    id: 'dept_biomedical_sw',
    name: '의생명소프트웨어학과',
    url: 'https://bmsw.catholic.ac.kr/bmsw/community/notice.do',
    selector: 'a.b-title',
    category: '공학계열'
  },
  'dept_biomedical_life': {
    id: 'dept_biomedical_life',
    name: '의생명과학과',
    url: 'https://mbs.catholic.ac.kr/mbs/community/notice.do',
    selector: 'a.b-title',
    category: '자연계열'
  },
  'dept_music': {
    id: 'dept_music',
    name: '음악과',
    url: 'https://music.catholic.ac.kr/music/community/notice.do',
    selector: 'a.b-title',
    category: '예체능계열'
  },
  'dept_vocal_foreign': {
    id: 'dept_vocal_foreign',
    name: '성악과',
    url: 'https://voice.catholic.ac.kr/voice/community/notice.do',
    selector: 'a.b-title',
    category: '예체능계열'
  },
  'dept_liberal_arts': {
    id: 'dept_liberal_arts',
    name: '교양교육원',
    url: 'https://liberal.catholic.ac.kr/liberal/community/notice.do',
    selector: 'a.b-title',
    category: '교양'
  },
  'dept_general_college': {
    id: 'dept_general_college',
    name: '가톨릭대학교 학부대학',
    url: 'https://catholic-college.catholic.ac.kr/catholic_college/notification/notice.do',
    selector: 'a.b-title',
    category: '대학'
  },
  'dept_convergence': {
    id: 'dept_convergence',
    name: '융합전공',
    url: 'https://major-convergence.catholic.ac.kr/major_convergence/notice/notice.do',
    selector: 'a.b-title',
    category: '융합'
  },
  'dept_teacher': {
    id: 'dept_teacher',
    name: '교직과',
    url: 'https://teaching.catholic.ac.kr/teaching/community/notice.do',
    selector: 'a.b-title',
    category: '교육계열'
  },
  'dept_gbs': {
    id: 'dept_gbs',
    name: 'GBS',
    url: 'https://gbs.catholic.ac.kr/gbs/community/notice.do',
    selector: 'a.b-title',
    category: '대학원'
  },
  'dept_pharmacy': {
    id: 'dept_pharmacy',
    name: '약학대학',
    url: 'https://pharmacy.catholic.ac.kr/pharmacy/community/notice.do',
    selector: 'a.b-title',
    category: '약학계열'
  }
}