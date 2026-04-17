import { ASSET_CATEGORY_TEXT, REVIEW_DECISION_TEXT } from '@renderer/app/constants/review'
import type { ExportItem, ExportPayload } from '@renderer/app/types/export'
import type {
  AssetReview,
  ImageAsset,
  ReviewProject,
  ReviewProjectSnapshot
} from '@renderer/app/types/review'

export function buildProjectSnapshotForExport(
  project: ReviewProject | null,
  assets: ImageAsset[],
  reviews: AssetReview[]
): ReviewProjectSnapshot | null {
  if (!project) return null

  return {
    project: { ...project },
    assets: assets.filter((asset) => asset.projectId === project.id).map((asset) => ({ ...asset })),
    reviews: reviews
      .filter((review) => review.projectId === project.id)
      .map((review) => ({ ...review }))
  }
}

export function buildExportItems(
  snapshot: ReviewProjectSnapshot,
  assetIds?: string[]
): ExportItem[] {
  const assetIdSet = assetIds?.length ? new Set(assetIds) : null

  return snapshot.assets
    .filter((asset) => !assetIdSet || assetIdSet.has(asset.id))
    .map((asset) => {
      const review = snapshot.reviews.find((item) => item.assetId === asset.id)
      return buildExportItem(asset, review)
    })
}

export function buildProjectExportPayload(
  snapshot: ReviewProjectSnapshot,
  scope: 'project' | 'filtered',
  items: ExportItem[],
  options?: {
    filterDescription?: string
    summary?: Record<string, number>
  }
): ExportPayload {
  return {
    projectId: snapshot.project.id,
    projectName: snapshot.project.name,
    scope,
    exportedAt: new Date().toISOString(),
    filterDescription: options?.filterDescription,
    summary: options?.summary,
    items
  }
}

function buildExportItem(asset: ImageAsset, review?: AssetReview): ExportItem {
  return {
    assetId: asset.id,
    fileName: asset.fileName,
    filePath: asset.filePath,
    decision: review?.decision ?? 'unreviewed',
    decisionText: REVIEW_DECISION_TEXT[review?.decision ?? 'unreviewed'],
    category: review?.category,
    categoryText: review?.category ? ASSET_CATEGORY_TEXT[review.category] : '',
    favorite: review?.favorite ?? false,
    resolution: asset.width && asset.height ? `${asset.width} × ${asset.height}` : '',
    fileSize: asset.fileSize,
    comment: review?.comment ?? '',
    reviewedAt: review?.reviewedAt,
    updatedAt: review?.updatedAt ?? ''
  }
}
