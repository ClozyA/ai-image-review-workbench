export type ExportFormat = 'json' | 'csv'

export interface ExportItem {
  assetId: string
  fileName: string
  filePath: string
  decision: string
  decisionText: string
  category?: string
  categoryText?: string
  favorite: boolean
  resolution: string
  fileSize: number
  comment: string
  reviewedAt?: string
  updatedAt: string
}

export interface ExportPayload {
  projectId: string
  projectName: string
  scope: 'project' | 'filtered'
  exportedAt: string
  summary?: Record<string, number>
  filterDescription?: string
  items: ExportItem[]
}

export interface ExportResult {
  canceled: boolean
  filePath?: string
}
