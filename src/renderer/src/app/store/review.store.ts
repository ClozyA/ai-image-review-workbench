import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { mockReviews } from '@renderer/app/mocks/review.mock'
import { useProjectStore } from '@renderer/app/store/project.store'
import type { AssetCategory, AssetId, AssetReview, ReviewDecision } from '@renderer/app/types/review'

export const useReviewStore = defineStore('review', () => {
  const reviews = ref<AssetReview[]>(mockReviews)
  const saveStatus = ref<'idle' | 'saving' | 'saved'>('saved')

  const projectStore = useProjectStore()

  const reviewsByCurrentProject = computed(() =>
    reviews.value.filter((review) => review.projectId === projectStore.currentProjectId)
  )

  function getReviewByAssetId(assetId: AssetId): AssetReview | undefined {
    return reviews.value.find((review) => review.assetId === assetId)
  }

  function updateDecision(assetId: AssetId, decision: ReviewDecision): void {
    const target = getReviewByAssetId(assetId)
    if (!target) return
    saveStatus.value = 'saving'
    target.decision = decision
    target.updatedAt = new Date().toISOString()
    if (decision !== 'unreviewed') target.reviewedAt = target.updatedAt
    saveStatus.value = 'saved'
    projectStore.refreshSummary(target.projectId)
  }

  function updateCategory(assetId: AssetId, category: AssetCategory): void {
    const target = getReviewByAssetId(assetId)
    if (!target) return
    saveStatus.value = 'saving'
    target.category = category
    target.updatedAt = new Date().toISOString()
    saveStatus.value = 'saved'
    projectStore.refreshSummary(target.projectId)
  }

  function updateComment(assetId: AssetId, comment: string): void {
    const target = getReviewByAssetId(assetId)
    if (!target) return
    saveStatus.value = 'saving'
    target.comment = comment
    target.updatedAt = new Date().toISOString()
    saveStatus.value = 'saved'
    projectStore.refreshSummary(target.projectId)
  }

  return {
    reviews,
    saveStatus,
    reviewsByCurrentProject,
    getReviewByAssetId,
    updateDecision,
    updateCategory,
    updateComment
  }
})
