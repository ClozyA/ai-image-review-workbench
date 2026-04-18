import { BrowserWindow, dialog, type OpenDialogOptions } from 'electron'
import { access, readFile } from 'fs/promises'
import { dirname } from 'path'

import { hydrateSnapshotThumbnails, type ReviewProjectSnapshot } from './project-scanner'
import { ExportPayload } from './export-service'

const DEFAULT_PROJECT_CATEGORIES = ['AI 生成图', '设计稿截图', '活动素材', '参考图'] as const
const LEGACY_CATEGORY_TEXT_MAP: Record<string, string> = {
  'ai-generated': 'AI 生成图',
  'design-screenshot': '设计稿截图',
  'campaign-material': '活动素材',
  reference: '参考图'
}

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
      favorite: Boolean(item.favorite),
      comment: item.comment ?? '',
      reviewedAt: item.reviewedAt,
      updatedAt: item.updatedAt || payload.exportedAt
    }))

  const snapshot: ReviewProjectSnapshot = {
    project: {
      id: payload.projectId,
      name: payload.projectName,
      sourceFolder: dirname(resolvedAssets[0].filePath),
      categories: normalizeCategoryNames(
        payload.items
          .map((item) => item.category)
          .filter((item): item is string => typeof item === 'string')
      ),
      coverAssetId: resolvedAssets[0]?.id,
      createdAt: payload.exportedAt,
      updatedAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString(),
      assetCount: resolvedAssets.length,
      version: 1
    },
    assets: resolvedAssets,
    reviews,
    uiState: normalizeUiState(payload.uiState)
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
  if (!value) return undefined
  const normalized = LEGACY_CATEGORY_TEXT_MAP[value] ?? value
  const trimmed = normalized.trim()
  return trimmed || undefined
}

function normalizeUiState(
  value?: ExportPayload['uiState']
): ReviewProjectSnapshot['uiState'] | undefined {
  if (!value) return undefined

  return {
    lastRoute: value.lastRoute,
    lastSelectedAssetId: value.lastSelectedAssetId,
    reviewThumbScrollTop: value.reviewThumbScrollTop,
    filterResultScrollTop: value.filterResultScrollTop,
    filter: value.filter
      ? {
          decisions: value.filter.decisions
            .map((item) => normalizeDecision(item))
            .filter((item, index, arr) => arr.indexOf(item) === index),
          categories: value.filter.categories
            .map((item) => normalizeCategory(item))
            .filter(
              (item): item is NonNullable<ReviewProjectSnapshot['reviews'][number]['category']> =>
                Boolean(item)
            ),
          hasComment: value.filter.hasComment,
          keyword: value.filter.keyword
        }
      : undefined
  }
}

function normalizeCategoryNames(values?: string[]): string[] {
  const source = values?.length ? values : [...DEFAULT_PROJECT_CATEGORIES]
  return Array.from(
    new Set(
      source
        .map((value) => normalizeCategory(value))
        .filter((value): value is string => Boolean(value))
    )
  )
}
