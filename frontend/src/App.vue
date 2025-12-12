<script setup lang="ts">
import { onMounted } from 'vue'
import { RouterView } from 'vue-router'
import { useSubscriptionStore } from '@/stores/subscription'
import Navbar from '@/components/Navbar.vue'
import BottomNavigation from '@/components/BottomNavigation.vue'
import InteractiveBackground from '@/components/InteractiveBackground.vue'
import ToastContainer from '@/components/ToastContainer.vue'

const subscriptionStore = useSubscriptionStore()

onMounted(async () => {
  // 앱 초기화 (Firebase 초기화 및 데이터 로드)
  await subscriptionStore.initialize()
})
</script>

<template>
  <div class="min-h-screen pb-16 sm:pb-0">
    <InteractiveBackground />
    <ToastContainer />
    <Navbar />
    <main class="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
      <RouterView />
    </main>
    <BottomNavigation />
  </div>
</template>
