import type { ProjectSummary, ReviewDecision, ReviewFilter } from '@renderer/app/types/review'

export const REVIEW_DECISION_OPTIONS: Array<{ label: string; value: ReviewDecision; color: string }> = [
  { label: '通过', value: 'approved', color: 'green' },
  { label: '待定', value: 'pending', color: 'gold' },
  { label: '淘汰', value: 'rejected', color: 'red' }
]

export const REVIEW_DECISION_TEXT: Record<ReviewDecision, string> = {
  approved: '通过',
  pending: '待定',
  rejected: '淘汰',
  unreviewed: '未处理'
}

export const ASSET_CATEGORY_OPTIONS = [
  { label: 'AI 生成图', value: 'ai-generated' },
  { label: '设计稿截图', value: 'design-screenshot' },
  { label: '活动素材', value: 'campaign-material' },
  { label: '参考图', value: 'reference' }
] as const

export const ASSET_CATEGORY_TEXT = {
  'ai-generated': 'AI 生成图',
  'design-screenshot': '设计稿截图',
  'campaign-material': '活动素材',
  reference: '参考图'
} as const

export const EMPTY_PROJECT_SUMMARY: ProjectSummary = {
  totalCount: 0,
  reviewedCount: 0,
  approvedCount: 0,
  pendingCount: 0,
  rejectedCount: 0,
  commentedCount: 0,
  categoryCounts: {
    'ai-generated': 0,
    'design-screenshot': 0,
    'campaign-material': 0,
    reference: 0
  }
}

export const DEFAULT_FILTER: ReviewFilter = {
  decisions: [],
  categories: [],
  keyword: ''
}
