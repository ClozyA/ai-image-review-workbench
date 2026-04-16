import type { AssetReview, ImageAsset, ReviewProject } from '@renderer/app/types/review'

export const mockProjects: ReviewProject[] = [
  {
    id: 'project-001',
    name: '春季广告图筛选',
    sourceFolder: 'D:/workspace/spring-campaign',
    coverAssetId: 'asset-001',
    createdAt: '2026-04-16T09:00:00.000Z',
    updatedAt: '2026-04-16T12:00:00.000Z',
    lastOpenedAt: '2026-04-16T12:30:00.000Z',
    assetCount: 6,
    version: 1
  }
]

export const mockAssets: ImageAsset[] = [
  {
    id: 'asset-001',
    projectId: 'project-001',
    filePath: 'D:/workspace/spring-campaign/IMG_0201.png',
    fileName: 'IMG_0201.png',
    fileSize: 8_400_000,
    width: 4096,
    height: 4096,
    modifiedAt: '2026-04-15T08:30:00.000Z'
  },
  {
    id: 'asset-002',
    projectId: 'project-001',
    filePath: 'D:/workspace/spring-campaign/IMG_0202.png',
    fileName: 'IMG_0202.png',
    fileSize: 7_100_000,
    width: 4096,
    height: 4096,
    modifiedAt: '2026-04-15T09:10:00.000Z'
  },
  {
    id: 'asset-003',
    projectId: 'project-001',
    filePath: 'D:/workspace/spring-campaign/IMG_0203.png',
    fileName: 'IMG_0203.png',
    fileSize: 7_800_000,
    width: 4096,
    height: 4096,
    modifiedAt: '2026-04-15T09:28:00.000Z'
  },
  {
    id: 'asset-004',
    projectId: 'project-001',
    filePath: 'D:/workspace/spring-campaign/IMG_0204.png',
    fileName: 'IMG_0204.png',
    fileSize: 6_900_000,
    width: 2048,
    height: 2048,
    modifiedAt: '2026-04-15T09:52:00.000Z'
  },
  {
    id: 'asset-005',
    projectId: 'project-001',
    filePath: 'D:/workspace/spring-campaign/IMG_0205.png',
    fileName: 'IMG_0205.png',
    fileSize: 5_600_000,
    width: 1920,
    height: 1080,
    modifiedAt: '2026-04-15T10:12:00.000Z'
  },
  {
    id: 'asset-006',
    projectId: 'project-001',
    filePath: 'D:/workspace/spring-campaign/IMG_0206.png',
    fileName: 'IMG_0206.png',
    fileSize: 6_200_000,
    width: 1920,
    height: 1080,
    modifiedAt: '2026-04-15T10:30:00.000Z'
  }
]

export const mockReviews: AssetReview[] = [
  { assetId: 'asset-001', projectId: 'project-001', decision: 'unreviewed', comment: '', updatedAt: '2026-04-16T12:00:00.000Z' },
  {
    assetId: 'asset-002',
    projectId: 'project-001',
    decision: 'approved',
    category: 'ai-generated',
    comment: '主体完整，适合继续进入结果页确认。',
    reviewedAt: '2026-04-16T10:20:00.000Z',
    updatedAt: '2026-04-16T10:20:00.000Z'
  },
  {
    assetId: 'asset-003',
    projectId: 'project-001',
    decision: 'pending',
    category: 'design-screenshot',
    comment: '需要再确认文字区域和边缘细节。',
    reviewedAt: '2026-04-16T10:45:00.000Z',
    updatedAt: '2026-04-16T10:45:00.000Z'
  },
  {
    assetId: 'asset-004',
    projectId: 'project-001',
    decision: 'rejected',
    category: 'campaign-material',
    comment: '',
    reviewedAt: '2026-04-16T11:10:00.000Z',
    updatedAt: '2026-04-16T11:10:00.000Z'
  },
  {
    assetId: 'asset-005',
    projectId: 'project-001',
    decision: 'approved',
    category: 'reference',
    comment: '可作为风格参考保留。',
    reviewedAt: '2026-04-16T11:32:00.000Z',
    updatedAt: '2026-04-16T11:32:00.000Z'
  },
  {
    assetId: 'asset-006',
    projectId: 'project-001',
    decision: 'pending',
    category: 'campaign-material',
    comment: '',
    reviewedAt: '2026-04-16T11:54:00.000Z',
    updatedAt: '2026-04-16T11:54:00.000Z'
  }
]
