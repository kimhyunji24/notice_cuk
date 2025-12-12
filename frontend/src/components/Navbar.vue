<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

const isMenuOpen = ref(false)

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}
</script>

<template>
  <nav class="bg-white/70 backdrop-blur-md border-b border-white/20 hidden sm:block sticky top-0 z-50">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex justify-between h-16">
        <div class="flex">
          <div class="flex-shrink-0 flex items-center gap-2">
            <img src="/AliAli_Logo.png" alt="AliAli Logo" class="w-8 h-8 object-contain" />
            <RouterLink to="/" class="text-2xl font-bold text-[#3182F6] font-inkliquid">AliAli</RouterLink>
          </div>
          <div class="hidden sm:ml-6 sm:flex sm:space-x-8">
            <RouterLink to="/" class="border-transparent text-[#8B95A1] hover:text-[#191F28] inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
              Home
            </RouterLink>
            <RouterLink to="/status" class="border-transparent text-[#8B95A1] hover:text-[#191F28] inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium">
              Status
            </RouterLink>
          </div>
        </div>
      </div>
    </div>
  </nav>
</template>
