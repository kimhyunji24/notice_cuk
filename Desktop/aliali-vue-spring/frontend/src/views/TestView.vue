<template>
  <div class="test-container">
    <h1>알리알리 테스트</h1>
    
    <div class="test-section">
      <h2>백엔드 연결 테스트</h2>
      <button @click="testPing" :disabled="loading">
        {{ loading ? '테스트 중...' : 'Ping 테스트' }}
      </button>
      <p v-if="pingResult">{{ pingResult }}</p>
    </div>

    <div class="test-section">
      <h2>크롤링 테스트</h2>
      <button @click="testCrawl" :disabled="loading">
        {{ loading ? '크롤링 중...' : '크롤링 테스트' }}
      </button>
      <p v-if="crawlResult">{{ crawlResult }}</p>
    </div>

    <div class="test-section">
      <h2>FCM 알림 테스트</h2>
      <button @click="testNotification" :disabled="loading">
        {{ loading ? '전송 중...' : '알림 테스트' }}
      </button>
      <p v-if="notificationResult">{{ notificationResult }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const loading = ref(false)
const pingResult = ref('')
const crawlResult = ref('')
const notificationResult = ref('')

const testPing = async () => {
  loading.value = true
  try {
    const response = await fetch('http://localhost:8080/api/ping')
    const data = await response.text()
    pingResult.value = `✅ 백엔드 연결 성공: ${data}`
  } catch (error) {
    pingResult.value = `❌ 백엔드 연결 실패: ${error}`
  } finally {
    loading.value = false
  }
}

const testCrawl = async () => {
  loading.value = true
  try {
    const response = await fetch('http://localhost:8080/api/test-crawl')
    const data = await response.text()
    crawlResult.value = `✅ 크롤링 테스트 성공: ${data}`
  } catch (error) {
    crawlResult.value = `❌ 크롤링 테스트 실패: ${error}`
  } finally {
    loading.value = false
  }
}

const testNotification = async () => {
  loading.value = true
  try {
    const response = await fetch('http://localhost:8080/api/test-notification', {
      method: 'POST'
    })
    const data = await response.text()
    notificationResult.value = `✅ 알림 테스트 성공: ${data}`
  } catch (error) {
    notificationResult.value = `❌ 알림 테스트 실패: ${error}`
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.test-container {
  max-width: 800px;
  margin: 0 auto;
  padding: 2rem;
}

.test-section {
  margin: 2rem 0;
  padding: 1rem;
  border: 1px solid #ddd;
  border-radius: 8px;
}

button {
  background: #007bff;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 1rem;
}

button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

p {
  margin-top: 1rem;
  padding: 0.5rem;
  border-radius: 4px;
  background: #f8f9fa;
}
</style>
