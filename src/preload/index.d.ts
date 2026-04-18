import { ElectronAPI } from '@electron-toolkit/preload'
import type { ExportFormat, ExportPayload, ExportResult } from '@renderer/app/types/export'

interface ReviewProjectSnapshot {
  project: {
    id: string
    name: string
    sourceFolder: string
    categories: string[]
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
    category?: string
    favorite: boolean
    comment: string
    reviewedAt?: string
    updatedAt: string
  }>
  uiState?: {
    lastRoute?: 'review' | 'filter' | 'result'
    lastSelectedAssetId?: string
    reviewThumbScrollTop?: number
    filterResultScrollTop?: number
    filter?: {
      decisions: Array<'approved' | 'pending' | 'rejected' | 'unreviewed'>
      categories: string[]
      hasComment?: boolean
      keyword: string
    }
  }
}

interface RendererApi {
  openProjectFolder: () => Promise<ReviewProjectSnapshot | null>
  importLocalBackup: () => Promise<ReviewProjectSnapshot | null>
  importFullProjectBundle: () => Promise<ReviewProjectSnapshot | null>
  listProjectSnapshots: () => Promise<ReviewProjectSnapshot[]>
  saveProjectSnapshot: (snapshot: ReviewProjectSnapshot) => Promise<boolean>
  removeProjectSnapshot: (projectId: string) => Promise<boolean>
  exportProjectResults: (payload: ExportPayload, format: ExportFormat) => Promise<ExportResult>
  exportFullProjectBundle: (snapshot: ReviewProjectSnapshot) => Promise<ExportResult>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: RendererApi
  }
}
