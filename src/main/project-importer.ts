import { dialog, BrowserWindow } from 'electron'
import { access, readFile } from 'fs/promises'
import { isAbsolute, join } from 'path'

import { hydrateSnapshotThumbnails, type ReviewProjectSnapshot } from './project-scanner'

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
      assetCount: assets.length,
      updatedAt: new Date().toISOString(),
      lastOpenedAt: new Date().toISOString()
    },
    assets,
    reviews: manifest.reviews.map((review) => ({
      ...review,
      favorite: Boolean(review.favorite)
    }))
  }

  return hydrateSnapshotThumbnails(snapshot, thumbnailBaseDir)
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
