<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()
const status = ref<any>(null)
const loading = ref(false)
const error = ref('')

const fetchStatus = async () => {
  loading.value = true
  error.value = ''
  try {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080/api'}/crawl/status`)
    if (!response.ok) throw new Error('Failed to fetch status')
    status.value = await response.json()
  } catch (e: any) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(fetchStatus)

const goBack = () => router.push('/')
</script>

<template>
  <div class="max-w-4xl mx-auto px-4 py-8 pb-24">
    <div class="flex items-center justify-between mb-8">
      <h1 class="text-3xl font-bold text-[#191F28] font-inkliquid">시스템 상태</h1>
      <button @click="goBack" class="px-4 py-2 bg-white/50 hover:bg-white/80 rounded-xl text-sm transition-colors text-[#191F28]">
        ← 돌아가기
      </button>
    </div>

    <div v-if="loading" class="text-center py-12">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3182F6] mx-auto"></div>
    </div>

    <div v-else-if="error" class="bg-red-50 text-red-600 p-4 rounded-xl text-center border border-red-100">
      {{ error }}
      <button @click="fetchStatus" class="ml-2 underline font-medium">재시도</button>
    </div>

    <div v-else-if="status" class="grid gap-6">
      <!-- Crawler Config -->
      <div class="bg-white/70 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-sm">
        <h2 class="text-xl font-bold text-[#191F28] mb-4">크롤러 설정</h2>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="p-4 bg-white/50 rounded-2xl">
            <div class="text-sm text-[#8B95A1] mb-1">상태</div>
            <div class="text-lg font-bold" :class="status.crawlerEnabled ? 'text-green-600' : 'text-red-600'">
              {{ status.crawlerEnabled ? '활성' : '비활성' }}
            </div>
          </div>
          <div class="p-4 bg-white/50 rounded-2xl">
            <div class="text-sm text-[#8B95A1] mb-1">주기</div>
            <div class="text-lg font-bold text-[#191F28]">{{ status.crawlerInterval / 1000 }}초</div>
          </div>
           <div class="p-4 bg-white/50 rounded-2xl">
            <div class="text-sm text-[#8B95A1] mb-1">동시 처리</div>
            <div class="text-lg font-bold text-[#191F28]">{{ status.concurrentLimit }}개</div>
          </div>
           <div class="p-4 bg-white/50 rounded-2xl">
            <div class="text-sm text-[#8B95A1] mb-1">타임아웃</div>
            <div class="text-lg font-bold text-[#191F28]">{{ status.requestTimeout / 1000 }}초</div>
          </div>
        </div>
      </div>

      <!-- Site Status -->
      <div class="bg-white/70 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-sm">
        <h2 class="text-xl font-bold text-[#191F28] mb-4">사이트 현황</h2>
        <div class="flex gap-8">
            <div>
                <span class="text-[#8B95A1] block mb-1">전체 사이트</span>
                <span class="text-3xl font-bold text-[#191F28]">{{ status.totalSitesCount }}</span>
            </div>
             <div>
                <span class="text-[#8B95A1] block mb-1">활성 사이트</span>
                <span class="text-3xl font-bold text-[#3182F6]">{{ status.enabledSitesCount }}</span>
            </div>
        </div>
      </div>

      <!-- Last Crawled -->
      <div class="bg-white/70 backdrop-blur-xl border border-white/20 rounded-3xl p-6 shadow-sm">
        <div class="flex items-center justify-between mb-4">
            <h2 class="text-xl font-bold text-[#191F28]">최근 크롤링 기록</h2>
            <button @click="fetchStatus" class="px-3 py-1 bg-[#E8F3FF] text-[#3182F6] rounded-lg text-sm hover:bg-[#DBEDFF] transition-colors">
              새로고침
            </button>
        </div>
        <div class="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            <div v-for="(time, siteId) in status.lastCrawledTimes" :key="siteId" class="flex justify-between items-center p-3 bg-white/50 rounded-xl hover:bg-white/80 transition-colors">
                <span class="font-medium text-[#191F28]">{{ siteId }}</span>
                <span class="text-sm text-[#8B95A1]">{{ new Date(time).toLocaleString() }}</span>
            </div>
             <div v-if="!status.lastCrawledTimes || Object.keys(status.lastCrawledTimes).length === 0" class="text-center text-[#8B95A1] py-8 bg-white/30 rounded-xl">
                기록이 없습니다.
            </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 6px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: transparent;
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background-color: rgba(139, 149, 161, 0.2);
  border-radius: 3px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background-color: rgba(139, 149, 161, 0.4);
}
</style>
