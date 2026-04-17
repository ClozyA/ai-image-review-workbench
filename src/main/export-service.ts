import { BrowserWindow, dialog, type OpenDialogOptions } from 'electron'
import { cp, mkdir, writeFile } from 'fs/promises'
import { join } from 'path'
import type { ReviewProjectSnapshot } from './project-scanner'

export type ExportFormat = 'json' | 'csv'

export interface ExportItem {
  assetId: string
  fileName: string
  filePath: string
  decision: string
  decisionText: string
  category?: string
  categoryText?: string
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

export async function exportReviewData(
  payload: ExportPayload,
  format: ExportFormat
): Promise<ExportResult> {
  const browserWindow = BrowserWindow.getFocusedWindow()
  const defaultName = buildDefaultFileName(payload, format)
  const dialogOptions = {
    title: '导出审核结果',
    defaultPath: join(getDefaultExportDir(), defaultName),
    filters: [
      format === 'json'
        ? { name: 'JSON 文件', extensions: ['json'] }
        : { name: 'CSV 文件', extensions: ['csv'] }
    ]
  }
  const result = browserWindow
    ? await dialog.showSaveDialog(browserWindow, dialogOptions)
    : await dialog.showSaveDialog(dialogOptions)

  if (result.canceled || !result.filePath) {
    return { canceled: true }
  }

  const content = format === 'json' ? buildJsonContent(payload) : buildCsvContent(payload)
  await writeFile(result.filePath, content, 'utf8')

  return {
    canceled: false,
    filePath: result.filePath
  }
}

export async function exportFullProjectBundle(
  snapshot: ReviewProjectSnapshot
): Promise<ExportResult> {
  const browserWindow = BrowserWindow.getFocusedWindow()
  const exportFolderName = buildBundleFolderName(snapshot.project.name)
  const dialogOptions: OpenDialogOptions = {
    title: '导出完整项目',
    properties: ['openDirectory', 'createDirectory']
  }
  const result = browserWindow
    ? await dialog.showOpenDialog(browserWindow, dialogOptions)
    : await dialog.showOpenDialog(dialogOptions)

  if (result.canceled || !result.filePaths.length) {
    return { canceled: true }
  }

  const targetRootDir = join(result.filePaths[0], exportFolderName)
  const assetsDir = join(targetRootDir, 'assets')

  await mkdir(assetsDir, { recursive: true })

  const exportedAssets: Array<
    ReviewProjectSnapshot['assets'][number] & {
      exportedFileName: string
      exportedRelativePath: string
    }
  > = []
  for (const asset of snapshot.assets) {
    const targetFileName = buildExportAssetFileName(asset.id, asset.fileName)
    const targetFilePath = join(assetsDir, targetFileName)
    await cp(asset.filePath, targetFilePath, { force: true })

    exportedAssets.push({
      ...asset,
      exportedFileName: targetFileName,
      exportedRelativePath: join('assets', targetFileName)
    })
  }

  const manifest = {
    exportedAt: new Date().toISOString(),
    mode: 'full-project',
    project: snapshot.project,
    assets: exportedAssets,
    reviews: snapshot.reviews
  }

  await writeFile(
    join(targetRootDir, 'project-manifest.json'),
    JSON.stringify(manifest, null, 2),
    'utf8'
  )

  return {
    canceled: false,
    filePath: targetRootDir
  }
}

function buildDefaultFileName(payload: ExportPayload, format: ExportFormat): string {
  const safeProjectName = sanitizeFileName(payload.projectName || 'review-export')
  const scopeText = payload.scope === 'filtered' ? '筛选结果' : '审核结果'
  const dateText = payload.exportedAt.slice(0, 19).replace(/[:T]/g, '-')
  return `${safeProjectName}-${scopeText}-${dateText}.${format}`
}

function buildJsonContent(payload: ExportPayload): string {
  return JSON.stringify(payload, null, 2)
}

function buildCsvContent(payload: ExportPayload): string {
  const headers = [
    '项目ID',
    '项目名称',
    '导出范围',
    '图片ID',
    '文件名',
    '原图路径',
    '处理结论',
    '处理结论文本',
    '分类',
    '分类文本',
    '分辨率',
    '文件大小',
    '备注',
    '审核时间',
    '更新时间'
  ]

  const rows = payload.items.map((item) => [
    payload.projectId,
    payload.projectName,
    payload.scope,
    item.assetId,
    item.fileName,
    item.filePath,
    item.decision,
    item.decisionText,
    item.category ?? '',
    item.categoryText ?? '',
    item.resolution,
    String(item.fileSize),
    item.comment,
    item.reviewedAt ?? '',
    item.updatedAt
  ])

  const csvText = [headers, ...rows]
    .map((row) => row.map((cell) => escapeCsvCell(cell)).join(','))
    .join('\n')

  // 为 Excel 补 BOM，避免中文乱码。
  return `\uFEFF${csvText}`
}

function escapeCsvCell(value: string): string {
  const normalized = String(value ?? '')
  if (!/[",\n]/.test(normalized)) return normalized
  return `"${normalized.replace(/"/g, '""')}"`
}

function sanitizeFileName(value: string): string {
  return value.replace(/[\\/:*?"<>|]/g, '-').trim()
}

function buildBundleFolderName(projectName: string): string {
  const safeProjectName = sanitizeFileName(projectName || 'review-project')
  const dateText = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')
  return `${safeProjectName}-完整项目-${dateText}`
}

function buildExportAssetFileName(assetId: string, fileName: string): string {
  return `${assetId}-${sanitizeFileName(fileName)}`
}

function getDefaultExportDir(): string {
  return process.env['USERPROFILE'] || process.cwd()
}
