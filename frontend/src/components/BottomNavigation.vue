<script setup lang="ts">
import { computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

const navItems = [
  { name: '홈', path: '/', icon: '🏠' },
  { name: '구독', path: '/subscriptions', icon: '🔔' },
  { name: '설정', path: '/settings', icon: '⚙️' }
]

const isActive = (path: string) => {
  return route.path === path
}

const navigateTo = (path: string) => {
  router.push(path)
}
</script>

<template>
  <nav class="bottom-nav">
    <div class="nav-container">
      <button
        v-for="item in navItems"
        :key="item.path"
        @click="navigateTo(item.path)"
        :class="['nav-item', { active: isActive(item.path) }]"
      >
        <span class="nav-icon">{{ item.icon }}</span>
        <span class="nav-label">{{ item.name }}</span>
      </button>
    </div>
  </nav>
</template>

<style scoped>
.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: white;
  border-top: 1px solid #e9ecef;
  z-index: 1000;
  padding: 0.5rem 0;
}

.nav-container {
  display: flex;
  justify-content: space-around;
  max-width: 500px;
  margin: 0 auto;
  padding: 0 1rem;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.5rem;
  border: none;
  background: none;
  cursor: pointer;
  transition: all 0.2s;
  border-radius: 8px;
  min-width: 60px;
}

.nav-item:hover {
  background: #f8f9fa;
}

.nav-item.active {
  background: #e3f2fd;
  color: #007bff;
}

.nav-icon {
  font-size: 1.2rem;
  line-height: 1;
}

.nav-label {
  font-size: 0.75rem;
  font-weight: 500;
  line-height: 1;
}

@media (max-width: 480px) {
  .nav-container {
    padding: 0 0.5rem;
  }
  
  .nav-item {
    min-width: 50px;
    padding: 0.25rem;
  }
  
  .nav-icon {
    font-size: 1rem;
  }
  
  .nav-label {
    font-size: 0.7rem;
  }
}
</style>
