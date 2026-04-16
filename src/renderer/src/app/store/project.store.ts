import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import { EMPTY_PROJECT_SUMMARY } from '@renderer/app/constants/review'
import { mockAssets, mockProjects, mockReviews } from '@renderer/app/mocks/review.mock'
import type { AssetCategory, ProjectId, ProjectSummary, ReviewProject } from '@renderer/app/types/review'

function buildSummary(projectId: ProjectId): ProjectSummary {
  const projectAssets = mockAssets.filter((asset) => asset.projectId === projectId)
  const projectReviews = mockReviews.filter((review) => review.projectId === projectId)

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
    Object.fromEntries(mockProjects.map((project) => [project.id, buildSummary(project.id)]))
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

  function refreshSummary(projectId: ProjectId): void {
    summaries.value[projectId] = buildSummary(projectId)
  }

  return {
    projects,
    currentProjectId,
    summaries,
    currentProject,
    currentSummary,
    selectProject,
    refreshSummary
  }
})
