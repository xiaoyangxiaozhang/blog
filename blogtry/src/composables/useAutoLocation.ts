import { onBeforeUnmount } from 'vue'
import { getCurrentLocation } from '@/api/tools'
import { useLatestRequest } from '@/composables/useLatestRequest'

export function useAutoLocation(apply: (location: string) => void, canApply: () => boolean) {
  const { loading, latestRequestId, run } = useLatestRequest()
  let pending = Promise.resolve()

  const cancel = () => {
    latestRequestId.value++
    loading.value = false
  }

  const fill = () => {
    if (!canApply()) return Promise.resolve()
    pending = run(getCurrentLocation, {
      onSuccess: ({ location }) => {
        if (location && canApply()) apply(location)
      }
    }).then(() => {}, () => {}) // 定位失败仍可手动填写和保存。
    return pending
  }

  onBeforeUnmount(cancel)

  return { locating: loading, fill, cancel, wait: () => loading.value ? pending : Promise.resolve() }
}
