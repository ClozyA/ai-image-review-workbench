import { ElectronAPI } from '@electron-toolkit/preload'

interface ReviewProjectSnapshot {
  project: {
    id: string
    name: string
    sourceFolder: string
    coverAssetId?: string
    createdAt: string
    updatedAt: string
    lastOpenedAt?: string
    assetCount: number
    version: number
  }
  assets: Array<{
    id: string
    projectId: string
    filePath: string
    fileName: string
    fileSize: number
    width?: number
    height?: number
    createdAt?: string
    modifiedAt?: string
    thumbnailPath?: string
  }>
  reviews: Array<{
    assetId: string
    projectId: string
    decision: 'approved' | 'pending' | 'rejected' | 'unreviewed'
    category?: 'ai-generated' | 'design-screenshot' | 'campaign-material' | 'reference'
    comment: string
    reviewedAt?: string
    updatedAt: string
  }>
}

interface RendererApi {
  openProjectFolder: () => Promise<ReviewProjectSnapshot | null>
  listProjectSnapshots: () => Promise<ReviewProjectSnapshot[]>
  saveProjectSnapshot: (snapshot: ReviewProjectSnapshot) => Promise<boolean>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: RendererApi
  }
}
