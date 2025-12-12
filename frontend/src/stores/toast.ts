import { defineStore } from 'pinia'
import { ref } from 'vue'

export interface Toast {
    id: number
    title?: string
    message: string
    type?: 'info' | 'success' | 'warning' | 'error'
    duration?: number
}

export const useToastStore = defineStore('toast', () => {
    const toasts = ref<Toast[]>([])
    let nextId = 0

    const addToast = (message: string, title?: string, type: Toast['type'] = 'info', duration = 5000) => {
        const id = nextId++
        const toast: Toast = {
            id,
            title,
            message,
            type,
            duration
        }

        toasts.value.push(toast)

        if (duration > 0) {
            setTimeout(() => {
                removeToast(id)
            }, duration)
        }
    }

    const removeToast = (id: number) => {
        const index = toasts.value.findIndex(t => t.id === id)
        if (index !== -1) {
            toasts.value.splice(index, 1)
        }
    }

    return {
        toasts,
        addToast,
        removeToast
    }
})
