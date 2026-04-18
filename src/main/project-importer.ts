import { dialog, BrowserWindow } from 'electron'
import { access, readFile } from 'fs/promises'
import { isAbsolute, join } from 'path'

import { hydrateSnapshotThumbnails, type ReviewProjectSnapshot } from './project-scanner'

const DEFAULT_PROJECT_CATEGORIES = ['AI 生成图', '设计稿截图', '活动素材', '参考图'] as const
const LEGACY_CATEGORY_TEXT_MAP: Record<string, string> = {
  'ai-generated': 'AI 生成图',
  'design-screenshot': '设计稿截图',
  'campaign-material': '活动素材',
  reference: '参考图'
}

type ImportedManifestAsset = ReviewProjectSnapshot['assets'][number] & {
  exportedFileName?: string
  exportedRelativePath?: string
}

interface ImportedProjectManifest {
  exportedAt: string
  mode: 'full-project'
  project: ReviewProjectSnapshot['project']
  assets: ImportedManifestAsset[]
  reviews: ReviewProjectSnapshot['reviews']
  uiState?: ReviewProjectSnapshot['uiState']
}

export async function importFullProjectBundle(
  thumbnailBaseDir: string
): Promise<ReviewProjectSnapshot | null> {
  const browserWindow = BrowserWindow.getFocusedWindow()
  const dialogOptions = {
    title: '导入完整项目',
    properties: ['openDirectory'] as Array<'openDirectory'>
  }
  const result = browserWindow
    ? await dialog.showOpenDialog(browserWindow, dialogOptions)
    : await dialog.showOpenDialog(dialogOptions)

  if (result.canceled || !result.filePaths.length) {
    return null
  }

  const bundleDir = result.filePaths[0]
  const manifestPath = join(bundleDir, 'project-manifest.json')

  try {
    await access(manifestPath)
  } catch {
    throw new Error('IMPORT_MANIFEST_NOT_FOUND')
  }

  const content = await readFile(manifestPath, 'utf8')
  const manifest = JSON.parse(content) as ImportedProjectManifest

  if (manifest.mode !== 'full-project') {
    throw new Error('IMPORT_MANIFEST_INVALID')
  }

  const assets = await Promise.all(
    manifest.assets.map(async (asset) => {
      const filePath = resolveImportedAssetPath(bundleDir, asset)
      await access(filePath)

      return {
        ...asset,
        filePath,
        thumbnailPath: undefined
      }
    })
  )

  const snapshot: ReviewProjectSnapshot = {
    project: {
      ...manifest.project,
      sourceFolder: bundleDir,
      categories: normalizeCategoryNames(manifest.project.categories),
      assetCount: assets.length,
      updatedAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString()
    },
    assets,
    reviews: manifest.reviews.map((review) => ({
      ...review,
      category: normalizeCategoryName(review.category),
      favorite: Boolean(review.favorite)
    })),
    uiState: manifest.uiState
  }

  return hydrateSnapshotThumbnails(snapshot, thumbnailBaseDir)
}

function normalizeCategoryName(value?: string): string | undefined {
  if (!value) return undefined
  const normalized = LEGACY_CATEGORY_TEXT_MAP[value] ?? value
  const trimmed = normalized.trim()
  return trimmed || undefined
}

function normalizeCategoryNames(values?: string[]): string[] {
  const source = values?.length ? values : [...DEFAULT_PROJECT_CATEGORIES]
  return Array.from(
    new Set(
      source
        .map((value) => normalizeCategoryName(value))
        .filter((value): value is string => Boolean(value))
    )
  )
}

function resolveImportedAssetPath(bundleDir: string, asset: ImportedManifestAsset): string {
  if (asset.exportedRelativePath) {
    return join(bundleDir, asset.exportedRelativePath)
  }
  if (asset.exportedFileName) {
    return join(bundleDir, 'assets', asset.exportedFileName)
  }
  if (isAbsolute(asset.filePath)) {
    return asset.filePath
  }
  return join(bundleDir, asset.filePath)
}
