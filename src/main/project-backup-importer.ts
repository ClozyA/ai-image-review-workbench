import { BrowserWindow, dialog, type OpenDialogOptions } from 'electron'
import { access, readFile } from 'fs/promises'
import { dirname } from 'path'

import { hydrateSnapshotThumbnails, type ReviewProjectSnapshot } from './project-scanner'
import { ExportPayload } from './export-service'


export async function importLocalBackupJson(
  thumbnailBaseDir: string
): Promise<ReviewProjectSnapshot | null> {
  const browserWindow = BrowserWindow.getFocusedWindow()
  const dialogOptions: OpenDialogOptions = {
    title: '导入本地备份',
    properties: ['openFile'],
    filters: [{ name: 'JSON 文件', extensions: ['json'] }]
  }
  const result = browserWindow
    ? await dialog.showOpenDialog(browserWindow, dialogOptions)
    : await dialog.showOpenDialog(dialogOptions)

  if (result.canceled || !result.filePaths.length) {
    return null
  }

  const backupPath = result.filePaths[0]
  const content = await readFile(backupPath, 'utf8')
  const payload = JSON.parse(content) as ExportPayload

  if (!isValidExportPayload(payload)) {
    throw new Error('IMPORT_BACKUP_INVALID')
  }

  const resolvedAssets: ReviewProjectSnapshot['assets'] = []
  for (const item of payload.items) {
    try {
      await access(item.filePath)
    } catch {
      continue
    }

    const { width, height } = parseResolution(item.resolution)
    resolvedAssets.push({
      id: item.assetId,
      projectId: payload.projectId,
      filePath: item.filePath,
      fileName: item.fileName,
      fileSize: item.fileSize,
      width,
      height
    })
  }

  if (!resolvedAssets.length) {
    throw new Error('IMPORT_BACKUP_NO_LOCAL_ASSETS')
  }

  const assetIdSet = new Set(resolvedAssets.map((asset) => asset.id))
  const reviews: ReviewProjectSnapshot['reviews'] = payload.items
    .filter((item) => assetIdSet.has(item.assetId))
    .map((item) => ({
      assetId: item.assetId,
      projectId: payload.projectId,
      decision: normalizeDecision(item.decision),
      category: normalizeCategory(item.category),
      comment: item.comment ?? '',
      reviewedAt: item.reviewedAt,
      updatedAt: item.updatedAt || payload.exportedAt
    }))

  const snapshot: ReviewProjectSnapshot = {
    project: {
      id: payload.projectId,
      name: payload.projectName,
      sourceFolder: dirname(resolvedAssets[0].filePath),
      coverAssetId: resolvedAssets[0]?.id,
      createdAt: payload.exportedAt,
      updatedAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString(),
      assetCount: resolvedAssets.length,
      version: 1
    },
    assets: resolvedAssets,
    reviews
  }

  return hydrateSnapshotThumbnails(snapshot, thumbnailBaseDir)
}

function isValidExportPayload(value: unknown): value is ExportPayload {
  if (!value || typeof value !== 'object') return false
  const payload = value as Partial<ExportPayload>
  return Boolean(
    typeof payload.projectId === 'string' &&
    typeof payload.projectName === 'string' &&
    typeof payload.exportedAt === 'string' &&
    Array.isArray(payload.items)
  )
}

function parseResolution(value: string): { width?: number; height?: number } {
  const match = value.match(/(\d+)\s*[×x]\s*(\d+)/)
  if (!match) return {}

  return {
    width: Number(match[1]),
    height: Number(match[2])
  }
}

function normalizeDecision(value: string): ReviewProjectSnapshot['reviews'][number]['decision'] {
  if (
    value === 'approved' ||
    value === 'pending' ||
    value === 'rejected' ||
    value === 'unreviewed'
  ) {
    return value
  }
  return 'unreviewed'
}

function normalizeCategory(
  value?: string
): ReviewProjectSnapshot['reviews'][number]['category'] | undefined {
  if (
    value === 'ai-generated' ||
    value === 'design-screenshot' ||
    value === 'campaign-material' ||
    value === 'reference'
  ) {
    return value
  }
  return undefined
}
