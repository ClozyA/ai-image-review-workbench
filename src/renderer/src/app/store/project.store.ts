import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { EMPTY_PROJECT_SUMMARY, normalizeCategoryNames } from '@renderer/app/constants/review'
import { mockAssets, mockProjects, mockReviews } from '@renderer/app/mocks/review.mock'
import type {
  AssetReview,
  ImageAsset,
  ProjectId,
  ProjectSummary,
  ProjectUiState,
  ReviewProject,
  ReviewProjectSnapshot
} from '@renderer/app/types/review'

function buildSummary(projectAssets: ImageAsset[], projectReviews: AssetReview[]): ProjectSummary {
  const summary: ProjectSummary = {
    ...EMPTY_PROJECT_SUMMARY,
    categoryCounts: { ...EMPTY_PROJECT_SUMMARY.categoryCounts }
  }

  summary.totalCount = projectAssets.length

  for (const review of projectReviews) {
    if (review.decision !== 'unreviewed') summary.reviewedCount += 1
    if (review.decision === 'approved') summary.approvedCount += 1
    if (review.decision === 'pending') summary.pendingCount += 1
    if (review.decision === 'rejected') summary.rejectedCount += 1
    if (review.comment.trim()) summary.commentedCount += 1
    if (review.category) {
      const categoryName = review.category.trim()
      summary.categoryCounts[categoryName] = (summary.categoryCounts[categoryName] ?? 0) + 1
    }
  }

  return summary
}

export const useProjectStore = defineStore('project', () => {
  const projects = ref<ReviewProject[]>(mockProjects)
  const currentProjectId = ref<ProjectId>(mockProjects[0]?.id ?? '')
  const uiStates = ref<Record<ProjectId, ProjectUiState>>({})

  const summaries = ref<Record<ProjectId, ProjectSummary>>(
    Object.fromEntries(
      mockProjects.map((project) => [
        project.id,
        buildSummary(
          mockAssets.filter((asset) => asset.projectId === project.id),
          mockReviews.filter((review) => review.projectId === project.id)
        )
      ])
    )
  )

  const currentProject = computed(
    () => projects.value.find((project) => project.id === currentProjectId.value) ?? null
  )

  const currentSummary = computed(
    () => summaries.value[currentProjectId.value] ?? { ...EMPTY_PROJECT_SUMMARY }
  )

  const currentUiState = computed(() => uiStates.value[currentProjectId.value] ?? {})

  function selectProject(projectId: ProjectId): void {
    currentProjectId.value = projectId
  }

  function refreshSummary(
    projectId: ProjectId,
    assets: ImageAsset[],
    reviews: AssetReview[]
  ): void {
    summaries.value[projectId] = buildSummary(assets, reviews)
  }

  function getProjectUiState(projectId: ProjectId): ProjectUiState {
    return uiStates.value[projectId] ?? {}
  }

  function updateUiState(projectId: ProjectId, patch: Partial<ProjectUiState>): void {
    uiStates.value = {
      ...uiStates.value,
      [projectId]: {
        ...getProjectUiState(projectId),
        ...patch
      }
    }
  }

  function upsertProject(snapshot: ReviewProjectSnapshot): void {
    const normalizedProject = {
      ...snapshot.project,
      categories: normalizeCategoryNames(snapshot.project.categories)
    }
    const index = projects.value.findIndex((project) => project.id === snapshot.project.id)
    if (index >= 0) {
      projects.value[index] = normalizedProject
    } else {
      projects.value = [normalizedProject, ...projects.value]
    }
    currentProjectId.value = snapshot.project.id
    updateUiState(snapshot.project.id, snapshot.uiState ?? {})
    refreshSummary(snapshot.project.id, snapshot.assets, snapshot.reviews)
  }

  function replaceBySnapshots(snapshots: ReviewProjectSnapshot[]): void {
    projects.value = snapshots.map((snapshot) => ({
      ...snapshot.project,
      categories: normalizeCategoryNames(snapshot.project.categories)
    }))
    summaries.value = Object.fromEntries(
      snapshots.map((snapshot) => [
        snapshot.project.id,
        buildSummary(snapshot.assets, snapshot.reviews)
      ])
    )
    uiStates.value = Object.fromEntries(
      snapshots.map((snapshot) => [snapshot.project.id, snapshot.uiState ?? {}])
    )
    currentProjectId.value = snapshots[0]?.project.id ?? ''
  }

  function removeProject(projectId: ProjectId): void {
    projects.value = projects.value.filter((project) => project.id !== projectId)
    const nextSummaries = { ...summaries.value }
    delete nextSummaries[projectId]
    summaries.value = nextSummaries
    const nextUiStates = { ...uiStates.value }
    delete nextUiStates[projectId]
    uiStates.value = nextUiStates

    if (currentProjectId.value === projectId) {
      currentProjectId.value = projects.value[0]?.id ?? ''
    }
  }

  return {
    projects,
    currentProjectId,
    summaries,
    uiStates,
    currentProject,
    currentSummary,
    currentUiState,
    selectProject,
    refreshSummary,
    getProjectUiState,
    updateUiState,
    upsertProject,
    replaceBySnapshots,
    removeProject
  }
})
