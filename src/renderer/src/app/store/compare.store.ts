import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import type { AssetId, ProjectId } from '@renderer/app/types/review'

export const useCompareStore = defineStore('compare', () => {
  const compareAssetIdsByProject = ref<Record<ProjectId, AssetId[]>>({})

  const totalComparedCount = computed(() =>
    Object.values(compareAssetIdsByProject.value).reduce(
      (sum, assetIds) => sum + assetIds.length,
      0
    )
  )

  function getProjectCompareAssetIds(projectId: ProjectId): AssetId[] {
    return compareAssetIdsByProject.value[projectId] ?? []
  }

  function addAsset(projectId: ProjectId, assetId: AssetId): void {
    const currentIds = getProjectCompareAssetIds(projectId)
    if (currentIds.includes(assetId)) return
    compareAssetIdsByProject.value = {
      ...compareAssetIdsByProject.value,
      [projectId]: [...currentIds, assetId]
    }
  }

  function removeAsset(projectId: ProjectId, assetId: AssetId): void {
    const currentIds = getProjectCompareAssetIds(projectId)
    compareAssetIdsByProject.value = {
      ...compareAssetIdsByProject.value,
      [projectId]: currentIds.filter((id) => id !== assetId)
    }
  }

  function clearProject(projectId: ProjectId): void {
    const nextValue = { ...compareAssetIdsByProject.value }
    delete nextValue[projectId]
    compareAssetIdsByProject.value = nextValue
  }

  function hasAsset(projectId: ProjectId, assetId: AssetId): boolean {
    return getProjectCompareAssetIds(projectId).includes(assetId)
  }

  return {
    compareAssetIdsByProject,
    totalComparedCount,
    getProjectCompareAssetIds,
    addAsset,
    removeAsset,
    clearProject,
    hasAsset
  }
})
