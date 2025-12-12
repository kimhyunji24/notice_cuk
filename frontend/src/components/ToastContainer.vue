<script setup lang="ts">
import { useToastStore } from '@/stores/toast'
import { storeToRefs } from 'pinia'

const toastStore = useToastStore()
const { toasts } = storeToRefs(toastStore)

const removeToast = (id: number) => {
  toastStore.removeToast(id)
}
</script>

<template>
  <div class="fixed top-4 right-4 z-[100] flex flex-col gap-3 w-full max-w-sm pointer-events-none px-4 sm:px-0">
    <TransitionGroup name="toast">
      <div 
        v-for="toast in toasts" 
        :key="toast.id"
        class="pointer-events-auto bg-white/80 backdrop-blur-xl border border-white/40 shadow-lg rounded-2xl p-4 flex items-start gap-3 transition-all duration-300"
        role="alert"
      >
        <!-- Icon based on type -->
        <div class="flex-shrink-0 mt-0.5">
          <span v-if="toast.type === 'success'" class="text-green-500 text-xl">✅</span>
          <span v-else-if="toast.type === 'error'" class="text-red-500 text-xl">❌</span>
          <span v-else-if="toast.type === 'warning'" class="text-orange-500 text-xl">⚠️</span>
          <span v-else class="text-[#3182F6] text-xl">🔔</span>
        </div>

        <div class="flex-1 min-w-0">
          <h4 v-if="toast.title" class="text-sm font-bold text-[#191F28] mb-0.5">{{ toast.title }}</h4>
          <p class="text-sm text-[#4E5968] leading-relaxed">{{ toast.message }}</p>
        </div>

        <button 
          @click="removeToast(toast.id)"
          class="flex-shrink-0 text-[#8B95A1] hover:text-[#191F28] transition-colors"
        >
          ✕
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(30px);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
