<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <div class="fixed bottom-0 left-0 z-50 w-full h-16 bg-white/80 backdrop-blur-xl border-t border-white/20 sm:hidden">
    <div class="grid h-full max-w-lg grid-cols-3 mx-auto font-medium">
      <RouterLink to="/" class="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 group" active-class="text-[#3182F6]">
        <svg class="w-6 h-6 mb-1 text-[#8B95A1] group-hover:text-[#3182F6] group-[.router-link-active]:text-[#3182F6]" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
          <path d="m19.707 9.293-2-2-7-7a1 1 0 0 0-1.414 0l-7 7-2 2a1 1 0 0 0 1.414 1.414L2 10.414V18a2 2 0 0 0 2 2h3a1 1 0 0 0 1-1v-4a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v4a1 1 0 0 0 1 1h3a2 2 0 0 0 2-2v-7.586l.293.293a1 1 0 0 0 1.414-1.414Z"/>
        </svg>
        <span class="text-xs text-[#8B95A1] group-hover:text-[#3182F6] group-[.router-link-active]:text-[#3182F6]">Home</span>
      </RouterLink>
      <RouterLink to="/search" class="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 group" active-class="text-[#3182F6]">
        <svg class="w-6 h-6 mb-1 text-[#8B95A1] group-hover:text-[#3182F6] group-[.router-link-active]:text-[#3182F6]" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 20 20">
            <path stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="m19 19-4-4m0-7A7 7 0 1 1 1 8a7 7 0 0 1 14 0Z"/>
        </svg>
        <span class="text-xs text-[#8B95A1] group-hover:text-[#3182F6] group-[.router-link-active]:text-[#3182F6]">Search</span>
      </RouterLink>
      <RouterLink to="/profile" class="inline-flex flex-col items-center justify-center px-5 hover:bg-gray-50 group" active-class="text-[#3182F6]">
        <svg class="w-6 h-6 mb-1 text-[#8B95A1] group-hover:text-[#3182F6] group-[.router-link-active]:text-[#3182F6]" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 20 20">
          <path d="M10 0a10 10 0 1 0 10 10A10.011 10.011 0 0 0 10 0Zm0 5a3 3 0 1 1-3 3 3.003 3.003 0 0 1 3-3Zm5.766 12.643A8 8 0 0 1 10 18a8 8 0 0 1-5.766-2.357 5 5 0 0 1 9.532 0Z"/>
        </svg>
        <span class="text-xs text-[#8B95A1] group-hover:text-[#3182F6] group-[.router-link-active]:text-[#3182F6]">Profile</span>
      </RouterLink>
    </div>
  </div>
</template>
