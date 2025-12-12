<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const cursorX = ref(0)
const cursorY = ref(0)
const isHovering = ref(false)

const updateCursorPosition = (e: MouseEvent) => {
  cursorX.value = e.clientX
  cursorY.value = e.clientY
  isHovering.value = true
}

const handleMouseLeave = () => {
  isHovering.value = false
}

onMounted(() => {
  window.addEventListener('mousemove', updateCursorPosition)
  window.addEventListener('mouseleave', handleMouseLeave)
})

onUnmounted(() => {
  window.removeEventListener('mousemove', updateCursorPosition)
  window.removeEventListener('mouseleave', handleMouseLeave)
})
</script>

<template>
  <div class="fixed inset-0 -z-10 overflow-hidden pointer-events-none bg-[#F2F4F6]">
    <!-- Main Gradient Orb -->
    <div 
      class="absolute w-[600px] h-[600px] rounded-full blur-[100px] transition-opacity duration-500"
      :style="{
        left: `${cursorX}px`,
        top: `${cursorY}px`,
        transform: 'translate(-50%, -50%)',
        background: 'radial-gradient(circle, rgba(49, 130, 246, 0.15) 0%, rgba(49, 130, 246, 0) 70%)',
        opacity: isHovering ? 1 : 0
      }"
    ></div>

    <!-- Secondary Ambient Orbs (Fixed) -->
    <div class="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full blur-[80px] bg-blue-100/40 animate-pulse"></div>
    <div class="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full blur-[80px] bg-purple-100/40 animate-pulse" style="animation-delay: 2s"></div>
  </div>
</template>

<style scoped>
/* Smooth movement for the orb */
div {
  will-change: transform, opacity;
}
</style>
