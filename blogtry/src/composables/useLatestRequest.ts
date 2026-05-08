import { ref } from 'vue'

type LatestRequestOptions<T> = {
  onSuccess?: (result: T) => void
  onError?: (error: unknown) => void
}

export function useLatestRequest() {
  const loading = ref(false)
  const latestRequestId = ref(0)

  const run = async <T>(
    executor: () => Promise<T>,
    options: LatestRequestOptions<T> = {}
  ): Promise<T> => {
    const requestId = ++latestRequestId.value
    loading.value = true

    try {
      const result = await executor()

      if (requestId === latestRequestId.value) {
        options.onSuccess?.(result)
      }

      return result
    } catch (error) {
      if (requestId === latestRequestId.value) {
        options.onError?.(error)
      }

      throw error
    } finally {
      if (requestId === latestRequestId.value) {
        loading.value = false
      }
    }
  }

  return {
    loading,
    latestRequestId,
    run
  }
}
