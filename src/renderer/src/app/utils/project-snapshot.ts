import type {
  AssetReview,
  ImageAsset,
  ProjectUiState,
  ReviewProject,
  ReviewProjectSnapshot
} from '@renderer/app/types/review'

export function buildProjectSnapshot(
  project: ReviewProject | null,
  assets: ImageAsset[],
  reviews: AssetReview[],
  uiState?: ProjectUiState
): ReviewProjectSnapshot | null {
  if (!project) return null

  return {
    project: cloneProject(project),
    assets: assets.filter((asset) => asset.projectId === project.id).map((asset) => ({ ...asset })),
    reviews: reviews
      .filter((review) => review.projectId === project.id)
      .map((review) => ({ ...review })),
    uiState: cloneUiState(uiState)
  }
}

export function mergeProjectSnapshots(
  existing: ReviewProjectSnapshot,
  incoming: ReviewProjectSnapshot
): ReviewProjectSnapshot {
  const mergedAssets = Array.from(
    new Map(
      [...existing.assets, ...incoming.assets].map((asset) => [
        asset.id,
        {
          ...asset
        }
      ])
    ).values()
  )

  const mergedReviews = Array.from(
    new Map(
      [...existing.reviews, ...incoming.reviews].map((review) => {
        const current = existing.reviews.find((item) => item.assetId === review.assetId)
        const candidate = current ? pickNewerReview(current, review) : review
        return [review.assetId, { ...candidate, favorite: Boolean(candidate.favorite) }]
      })
    ).values()
  )

  const now = new Date().toISOString()

  return {
    project: {
      ...existing.project,
      name: existing.project.name,
      categories: Array.from(
        new Set([...(existing.project.categories ?? []), ...(incoming.project.categories ?? [])])
      ),
      coverAssetId: incoming.project.coverAssetId ?? existing.project.coverAssetId,
      assetCount: mergedAssets.length,
      updatedAt: now,
      lastOpenedAt: now
    },
    assets: mergedAssets,
    reviews: mergedReviews,
    uiState: existing.uiState ?? incoming.uiState
  }
}

function pickNewerReview(left: AssetReview, right: AssetReview): AssetReview {
  const leftTime = Date.parse(left.updatedAt || '')
  const rightTime = Date.parse(right.updatedAt || '')
  if (Number.isNaN(leftTime)) return right
  if (Number.isNaN(rightTime)) return left
  return rightTime >= leftTime ? right : left
}

function cloneProject(project: ReviewProject): ReviewProject {
  return {
    ...project,
    categories: [...project.categories]
  }
}

function cloneUiState(uiState?: ProjectUiState): ProjectUiState | undefined {
  if (!uiState) return undefined

  return {
    ...uiState,
    filter: uiState.filter
      ? {
          ...uiState.filter,
          decisions: [...uiState.filter.decisions],
          categories: [...uiState.filter.categories]
        }
      : undefined
  }
}
