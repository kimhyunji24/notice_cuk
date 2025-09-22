<script setup lang="ts">
import { computed } from 'vue'
import { useNoticeStore } from '@/stores/notice'
import { useSubscriptionStore } from '@/stores/subscription'

const noticeStore = useNoticeStore()
const subscriptionStore = useSubscriptionStore()

const notices = computed(() => {
  console.log('NoticeList - 전체 공지사항 수:', noticeStore.notices?.length);
  console.log('NoticeList - isNew=true인 공지사항 수:', noticeStore.newNotices?.length);
  console.log('NoticeList - RealFCMTest 포함:', noticeStore.newNotices?.some(n => n.title.includes('RealFCMTest')));
  return noticeStore.newNotices.slice(0, 10); // newNotices 사용 (새로운 공지사항만)
})
const isLoading = computed(() => noticeStore.loading)
const error = computed(() => noticeStore.error)

const formatDate = (dateString: string) => {
  const date = new Date(dateString)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  
  const minutes = Math.floor(diff / (1000 * 60))
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  
  if (minutes < 60) {
    return `${minutes}분 전`
  } else if (hours < 24) {
    return `${hours}시간 전`
  } else if (days < 7) {
    return `${days}일 전`
  } else {
    return date.toLocaleDateString('ko-KR')
  }
}

const openNotice = (notice: any) => {
  if (notice.url) {
    window.open(notice.url, '_blank')
  }
}

const isDuplicate = (notice: any) => {
  // 같은 제목과 URL을 가진 공지사항이 2개 이상 있는지 확인
  const duplicates = noticeStore.notices.filter(n => 
    n.title === notice.title && n.url === notice.url
  )
  return duplicates.length > 1
}

const getDuplicateCount = (notice: any) => {
  const duplicates = noticeStore.notices.filter(n => 
    n.title === notice.title && n.url === notice.url
  )
  return duplicates.length
}
</script>

<template>
  <div class="notice-list">
    <div v-if="isLoading" class="loading">
      공지사항을 불러오는 중...
    </div>
    
    <div v-else-if="error" class="error">
      {{ error }}
    </div>
    
    <div v-else-if="notices.length === 0" class="empty">
      공지사항이 없습니다.
    </div>
    
    <div v-else class="notices">
      <div 
        v-for="notice in notices" 
        :key="notice.id" 
        class="notice-card"
        @click="openNotice(notice)"
      >
        <div class="notice-header">
          <span class="notice-site">{{ notice.siteName }}</span>
          <span class="notice-time">{{ formatDate(notice.publishedAt) }}</span>
        </div>
        
        <h3 class="notice-title">{{ notice.title }}</h3>
        
        <div class="notice-badges">
          <div v-if="notice.isNew" class="new-badge">
            NEW
          </div>
          <div v-if="isDuplicate(notice)" class="duplicate-badge">
            🔄 중복 ({{ getDuplicateCount(notice) }}개)
          </div>
        </div>
      </div>
    </div>
    
    <div class="refresh-section">
      <button 
        @click="subscriptionStore.runCrawler"
        :disabled="isLoading"
        class="refresh-btn"
      >
        {{ isLoading ? '크롤링 중...' : '새로고침' }}
      </button>
    </div>
  </div>
</template>

<style scoped>
.notice-list {
  width: 100%;
}

.loading, .error, .empty {
  text-align: center;
  padding: 2rem;
  color: #666;
}

.error {
  color: #e74c3c;
}

.notices {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.notice-card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  position: relative;
}

.notice-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

.notice-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.75rem;
}

.notice-site {
  font-size: 0.9rem;
  color: #007bff;
  font-weight: 500;
  background: #e3f2fd;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
}

.notice-time {
  font-size: 0.8rem;
  color: #999;
}

.notice-title {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
  line-height: 1.4;
  margin: 0;
}

.notice-badges {
  position: absolute;
  top: 1rem;
  right: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.new-badge {
  background: #e74c3c;
  color: white;
  font-size: 0.7rem;
  font-weight: bold;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  text-transform: uppercase;
  text-align: center;
}

.duplicate-badge {
  background: #ff9800;
  color: white;
  font-size: 0.65rem;
  font-weight: bold;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  text-align: center;
  white-space: nowrap;
}

.refresh-section {
  text-align: center;
  margin-top: 1.5rem;
}

.refresh-btn {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: #0056b3;
}

.refresh-btn:disabled {
  background: #6c757d;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .notice-card {
    padding: 1rem;
  }
  
  .notice-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .notice-time {
    align-self: flex-end;
  }
}
</style>
