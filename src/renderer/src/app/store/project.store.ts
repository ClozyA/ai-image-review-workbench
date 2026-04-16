import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { EMPTY_PROJECT_SUMMARY } from '@renderer/app/constants/review'
import { mockAssets, mockProjects, mockReviews } from '@renderer/app/mocks/review.mock'
import type {
  AssetCategory,
  AssetReview,
  ImageAsset,
  ProjectId,
  ProjectSummary,
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
    if (review.category) summary.categoryCounts[review.category as AssetCategory] += 1
  }

  return summary
}

export const useProjectStore = defineStore('project', () => {
  const projects = ref<ReviewProject[]>(mockProjects)
  const currentProjectId = ref<ProjectId>(mockProjects[0]?.id ?? '')

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

  function selectProject(projectId: ProjectId): void {
    currentProjectId.value = projectId
  }

  function refreshSummary(projectId: ProjectId, assets: ImageAsset[], reviews: AssetReview[]): void {
    summaries.value[projectId] = buildSummary(assets, reviews)
  }

  function upsertProject(snapshot: ReviewProjectSnapshot): void {
    const index = projects.value.findIndex((project) => project.id === snapshot.project.id)
    if (index >= 0) {
      projects.value[index] = snapshot.project
    } else {
      projects.value = [snapshot.project, ...projects.value]
    }
    currentProjectId.value = snapshot.project.id
    refreshSummary(snapshot.project.id, snapshot.assets, snapshot.reviews)
  }

  return {
    projects,
    currentProjectId,
    summaries,
    currentProject,
    currentSummary,
    selectProject,
    refreshSummary,
    upsertProject
  }
})
