export type ProjectId = string
export type AssetId = string

export type ReviewDecision = 'approved' | 'pending' | 'rejected' | 'unreviewed'

export type AssetCategory =
  | 'ai-generated'
  | 'design-screenshot'
  | 'campaign-material'
  | 'reference'

export interface ReviewProject {
  id: ProjectId
  name: string
  sourceFolder: string
  coverAssetId?: AssetId
  createdAt: string
  updatedAt: string
  lastOpenedAt?: string
  assetCount: number
  version: number
}

export interface ImageAsset {
  id: AssetId
  projectId: ProjectId
  filePath: string
  fileName: string
  fileSize: number
  width?: number
  height?: number
  createdAt?: string
  modifiedAt?: string
  thumbnailPath?: string
}

export interface AssetReview {
  assetId: AssetId
  projectId: ProjectId
  decision: ReviewDecision
  category?: AssetCategory
  favorite: boolean
  comment: string
  reviewedAt?: string
  updatedAt: string
}

export interface ProjectSummary {
  totalCount: number
  reviewedCount: number
  approvedCount: number
  pendingCount: number
  rejectedCount: number
  commentedCount: number
  categoryCounts: Record<AssetCategory, number>
}

export interface AssetViewModel {
  asset: ImageAsset
  review: AssetReview
  displayName: string
  resolutionText: string
  hasComment: boolean
  decisionText?: string
  categoryText?: string
}

export interface ReviewFilter {
  decisions: ReviewDecision[]
  categories: AssetCategory[]
  hasComment?: boolean
  keyword: string
}

export interface ProjectUiState {
  lastRoute?: 'review' | 'filter' | 'result'
  lastSelectedAssetId?: AssetId
  reviewThumbScrollTop?: number
  filterResultScrollTop?: number
  filter?: ReviewFilter
}

export interface ReviewProjectSnapshot {
  project: ReviewProject
  assets: ImageAsset[]
  reviews: AssetReview[]
  uiState?: ProjectUiState
}
