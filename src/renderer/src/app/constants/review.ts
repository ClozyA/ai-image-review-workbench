import type { ProjectSummary, ReviewDecision, ReviewFilter } from '@renderer/app/types/review'

export const REVIEW_DECISION_OPTIONS: Array<{
  label: string
  value: ReviewDecision
  color: string
}> = [
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

export const DEFAULT_PROJECT_CATEGORIES = ['AI 生成图', '设计稿截图', '活动素材', '参考图'] as const

export const LEGACY_CATEGORY_TEXT_MAP: Record<string, string> = {
  'ai-generated': 'AI 生成图',
  'design-screenshot': '设计稿截图',
  'campaign-material': '活动素材',
  reference: '参考图'
}

export function normalizeCategoryName(value?: string): string | undefined {
  if (!value) return undefined
  const normalized = LEGACY_CATEGORY_TEXT_MAP[value] ?? value
  const trimmed = normalized.trim()
  return trimmed || undefined
}

export function normalizeCategoryNames(values?: string[]): string[] {
  const source = values?.length ? values : [...DEFAULT_PROJECT_CATEGORIES]
  return Array.from(
    new Set(
      source
        .map((value) => normalizeCategoryName(value))
        .filter((value): value is string => Boolean(value))
    )
  )
}

export function buildCategoryOptions(categories?: string[]): Array<{ label: string; value: string }> {
  return normalizeCategoryNames(categories).map((category) => ({
    label: category,
    value: category
  }))
}

export function getCategoryText(category?: string): string {
  return normalizeCategoryName(category) ?? '未分类'
}

export const EMPTY_PROJECT_SUMMARY: ProjectSummary = {
  totalCount: 0,
  reviewedCount: 0,
  approvedCount: 0,
  pendingCount: 0,
  rejectedCount: 0,
  commentedCount: 0,
  categoryCounts: {}
}

export const DEFAULT_FILTER: ReviewFilter = {
  decisions: [],
  categories: [],
  keyword: ''
}
