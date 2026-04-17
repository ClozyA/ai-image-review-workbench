import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { mockReviews } from '@renderer/app/mocks/review.mock'
import { useAssetStore } from '@renderer/app/store/asset.store'
import { useProjectStore } from '@renderer/app/store/project.store'
import { buildProjectSnapshot } from '@renderer/app/utils/project-snapshot'
import type {
  AssetCategory,
  AssetId,
  AssetReview,
  ReviewDecision,
  ReviewProjectSnapshot
} from '@renderer/app/types/review'

export const useReviewStore = defineStore('review', () => {
  const reviews = ref<AssetReview[]>(mockReviews)
  const saveStatus = ref<'idle' | 'saving' | 'saved'>('saved')

  const assetStore = useAssetStore()
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
    refreshProjectSummary(target.projectId)
    void persistProject(target.projectId)
  }

  function updateCategory(assetId: AssetId, category: AssetCategory): void {
    const target = getReviewByAssetId(assetId)
    if (!target) return
    saveStatus.value = 'saving'
    target.category = category
    target.updatedAt = new Date().toISOString()
    saveStatus.value = 'saved'
    refreshProjectSummary(target.projectId)
    void persistProject(target.projectId)
  }

  function updateComment(assetId: AssetId, comment: string): void {
    const target = getReviewByAssetId(assetId)
    if (!target) return
    saveStatus.value = 'saving'
    target.comment = comment
    target.updatedAt = new Date().toISOString()
    saveStatus.value = 'saved'
    refreshProjectSummary(target.projectId)
    void persistProject(target.projectId)
  }

  function toggleFavorite(assetId: AssetId): void {
    const target = getReviewByAssetId(assetId)
    if (!target) return
    saveStatus.value = 'saving'
    target.favorite = !target.favorite
    target.updatedAt = new Date().toISOString()
    saveStatus.value = 'saved'
    refreshProjectSummary(target.projectId)
    void persistProject(target.projectId)
  }

  function replaceBySnapshot(snapshot: ReviewProjectSnapshot): void {
    const otherReviews = reviews.value.filter((review) => review.projectId !== snapshot.project.id)
    reviews.value = [
      ...otherReviews,
      ...snapshot.reviews.map((review) => ({
        ...review,
        favorite: Boolean(review.favorite)
      }))
    ]
    saveStatus.value = 'saved'
    projectStore.refreshSummary(snapshot.project.id, snapshot.assets, snapshot.reviews)
  }

  function replaceBySnapshots(snapshots: ReviewProjectSnapshot[]): void {
    reviews.value = snapshots.flatMap((snapshot) =>
      snapshot.reviews.map((review) => ({
        ...review,
        favorite: Boolean(review.favorite)
      }))
    )
    saveStatus.value = 'saved'
  }

  function removeProjectReviews(projectId: string): void {
    reviews.value = reviews.value.filter((review) => review.projectId !== projectId)
  }

  function refreshProjectSummary(projectId: string): void {
    const projectAssets = assetStore.assets.filter((asset) => asset.projectId === projectId)
    const projectReviews = reviews.value.filter((review) => review.projectId === projectId)
    projectStore.refreshSummary(projectId, projectAssets, projectReviews)
  }

  async function persistProject(projectId: string): Promise<void> {
    const project = projectStore.projects.find((item) => item.id === projectId)
    if (!project) return
    const assets = assetStore.assets
      .filter((asset) => asset.projectId === projectId)
      .map((asset) => ({ ...asset }))
    const projectReviews = reviews.value
      .filter((review) => review.projectId === projectId)
      .map((review) => ({ ...review }))
    const now = new Date().toISOString()
    project.updatedAt = now
    project.lastOpenedAt = now
    project.assetCount = assets.length
    const snapshot = buildProjectSnapshot(
      project,
      assets,
      projectReviews,
      projectStore.getProjectUiState(projectId)
    )
    if (!snapshot) return
    await window.api.saveProjectSnapshot(snapshot)
  }

  return {
    reviews,
    saveStatus,
    reviewsByCurrentProject,
    getReviewByAssetId,
    updateDecision,
    updateCategory,
    updateComment,
    toggleFavorite,
    replaceBySnapshot,
    replaceBySnapshots,
    removeProjectReviews,
    refreshProjectSummary,
    persistProject
  }
})
