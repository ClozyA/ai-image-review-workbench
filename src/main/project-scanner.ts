import { nativeImage } from 'electron'
import { basename, extname, join } from 'path'
import { readdir, stat } from 'fs/promises'
import { randomUUID } from 'crypto'

type ProjectId = string
type AssetId = string
type ReviewDecision = 'approved' | 'pending' | 'rejected' | 'unreviewed'
type AssetCategory = 'ai-generated' | 'design-screenshot' | 'campaign-material' | 'reference'

export interface ReviewProjectSnapshot {
  project: {
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
  assets: Array<{
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
  }>
  reviews: Array<{
    assetId: AssetId
    projectId: ProjectId
    decision: ReviewDecision
    category?: AssetCategory
    comment: string
    reviewedAt?: string
    updatedAt: string
  }>
}

const SUPPORTED_IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.bmp',
  '.gif'
])

export async function createProjectSnapshotFromFolder(
  folderPath: string
): Promise<ReviewProjectSnapshot> {
  const entries = await readdir(folderPath, { withFileTypes: true })
  const now = new Date().toISOString()
  const projectId = randomUUID()

  const files = entries
    .filter((entry) => entry.isFile())
    .filter((entry) => SUPPORTED_IMAGE_EXTENSIONS.has(extname(entry.name).toLowerCase()))
    .sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))

  const assets: ReviewProjectSnapshot['assets'] = []

  for (const file of files) {
    const filePath = join(folderPath, file.name)
    const fileStat = await stat(filePath)
    const size = readImageSize(filePath)

    assets.push({
      id: randomUUID(),
      projectId,
      filePath,
      fileName: file.name,
      fileSize: fileStat.size,
      width: size.width,
      height: size.height,
      createdAt: fileStat.birthtime?.toISOString(),
      modifiedAt: fileStat.mtime?.toISOString()
    })
  }

  const reviews: ReviewProjectSnapshot['reviews'] = assets.map((asset) => ({
    assetId: asset.id,
    projectId,
    decision: 'unreviewed',
    comment: '',
    updatedAt: now
  }))

  return {
    project: {
      id: projectId,
      name: basename(folderPath),
      sourceFolder: folderPath,
      coverAssetId: assets[0]?.id,
      createdAt: now,
      updatedAt: now,
      lastOpenedAt: now,
      assetCount: assets.length,
      version: 1
    },
    assets,
    reviews
  }
}

function readImageSize(filePath: string): { width?: number; height?: number } {
  try {
    const image = nativeImage.createFromPath(filePath)
    const size = image.getSize()
    if (!size.width || !size.height) return {}
    return size
  } catch {
    return {}
  }
}
