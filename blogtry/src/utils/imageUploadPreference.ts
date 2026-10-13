import { ref } from 'vue'

// Shared by every uploader for this browser session; API options can override it.
export const keepOriginalImages = ref(false)
