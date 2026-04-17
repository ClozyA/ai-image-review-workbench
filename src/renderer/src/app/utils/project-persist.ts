import type { useAssetStore } from '@renderer/app/store/asset.store'
import type { useProjectStore } from '@renderer/app/store/project.store'
import type { useReviewStore } from '@renderer/app/store/review.store'
import { buildProjectSnapshot } from '@renderer/app/utils/project-snapshot'

export async function persistProjectById(
  projectId: string,
  projectStore: ReturnType<typeof useProjectStore>,
  assetStore: ReturnType<typeof useAssetStore>,
  reviewStore: ReturnType<typeof useReviewStore>
): Promise<void> {
  const project = projectStore.projects.find((item) => item.id === projectId) ?? null
  const snapshot = buildProjectSnapshot(
    project,
    assetStore.assets,
    reviewStore.reviews,
    projectStore.getProjectUiState(projectId)
  )
  if (!snapshot) return
  await window.api.saveProjectSnapshot(snapshot)
}
