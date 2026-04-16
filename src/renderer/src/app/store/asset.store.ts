import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { mockAssets } from '@renderer/app/mocks/review.mock'
import type { AssetId, ImageAsset } from '@renderer/app/types/review'

export const useAssetStore = defineStore('asset', () => {
  const assets = ref<ImageAsset[]>(mockAssets)
  const currentAssetId = ref<AssetId>(mockAssets[1]?.id ?? mockAssets[0]?.id ?? '')

  const currentAsset = computed(
    () => assets.value.find((asset) => asset.id === currentAssetId.value) ?? null
  )

  function selectAsset(assetId: AssetId): void {
    currentAssetId.value = assetId
  }

  function selectNextAsset(): void {
    const index = assets.value.findIndex((asset) => asset.id === currentAssetId.value)
    if (index < 0) return
    const next = assets.value[index + 1] ?? assets.value[index]
    currentAssetId.value = next.id
  }

  function selectPreviousAsset(): void {
    const index = assets.value.findIndex((asset) => asset.id === currentAssetId.value)
    if (index <= 0) return
    currentAssetId.value = assets.value[index - 1].id
  }

  return {
    assets,
    currentAssetId,
    currentAsset,
    selectAsset,
    selectNextAsset,
    selectPreviousAsset
  }
})
