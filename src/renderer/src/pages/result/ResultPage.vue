<template>
  <div class="app-layout">
    <header class="app-header">
      <div>
        <div class="page-title-row">
          <h1 class="page-title">结果页</h1>
          <a-tag v-if="currentProject?.name" color="blue"
            >当前项目：{{ currentProject.name }}</a-tag
          >
        </div>
        <p class="page-subtitle">
          完整项目导出适合发给别人，JSON 备份可在当前电脑重新导入，CSV 更适合作为查看和流转记录。
        </p>
      </div>
      <a-space>
        <a-button :loading="exportingBundle" type="primary" @click="exportCompleteProject">
          导出完整项目
        </a-button>
        <a-button :loading="exportingJson" @click="exportProjectResults('json')"
          >备份 JSON</a-button
        >
        <a-button :loading="exportingCsv" @click="exportProjectResults('csv')">备份 CSV</a-button>
        <a-button @click="goHome">返回首页</a-button>
        <a-button @click="goFilter">返回筛选页</a-button>
        <a-button @click="goReview">继续审核</a-button>
      </a-space>
    </header>

    <main class="page-section result-page-section">
      <section class="page-card result-hero-card">
        <div class="section-header">
          <h2>结果概览</h2>
          <span class="section-tip">当前项目的整体处理情况</span>
        </div>

        <div class="result-hero-grid">
          <a-card :bordered="false" class="result-progress-card">
            <a-statistic title="完成进度" :value="progressPercent" suffix="%" />
            <a-progress :percent="progressPercent" size="small" :show-info="false" />
            <div class="result-progress-meta">{{ summary.reviewedCount }} / {{ summary.totalCount }} 已处理</div>
          </a-card>
          <a-card :bordered="false" class="result-stat-card">
            <a-statistic title="总图片数" :value="summary.totalCount" />
          </a-card>
          <a-card :bordered="false" class="result-stat-card">
            <a-statistic title="已处理" :value="summary.reviewedCount" />
          </a-card>
          <a-card :bordered="false" class="result-stat-card">
            <a-statistic title="通过" :value="summary.approvedCount" />
          </a-card>
          <a-card :bordered="false" class="result-stat-card">
            <a-statistic title="待定" :value="summary.pendingCount" />
          </a-card>
          <a-card :bordered="false" class="result-stat-card">
            <a-statistic title="淘汰" :value="summary.rejectedCount" />
          </a-card>
          <a-card :bordered="false" class="result-stat-card">
            <a-statistic title="收藏" :value="favoriteItems.length" />
          </a-card>
          <a-card :bordered="false" class="result-stat-card">
            <a-statistic title="有备注" :value="summary.commentedCount" />
          </a-card>
        </div>
      </section>

      <section class="page-card result-panel-card result-list-panel">
        <div class="section-header">
          <h2>图片结果</h2>
        </div>
        <div v-if="resultItems.length" class="result-list result-scroll-list">
          <article v-for="item in resultItems" :key="item.asset.id" class="result-item">
            <img
              class="result-item-cover"
              :src="getThumbnailSrc(item.asset.thumbnailPath, item.asset.filePath)"
              alt=""
              loading="lazy"
            />
            <div class="result-item-main">
              <strong>{{ item.asset.fileName }}</strong>
              <span>
                {{ item.review.decision ? decisionText(item.review.decision) : '未处理' }} ·
                {{ item.review.category ? categoryText(item.review.category) : '未分类' }}
              </span>
              <small>{{ item.review.comment || '无备注' }}</small>
            </div>
          </article>
        </div>
        <div v-else class="filter-empty-state">
          <strong>暂无结果</strong>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'

import { ASSET_CATEGORY_TEXT, REVIEW_DECISION_TEXT } from '@renderer/app/constants/review'
import { useAssetStore } from '@renderer/app/store/asset.store'
import { useProjectStore } from '@renderer/app/store/project.store'
import { useReviewStore } from '@renderer/app/store/review.store'
import {
  buildExportItems,
  buildProjectExportPayload,
  buildProjectSnapshotForExport
} from '@renderer/app/utils/export'
import { toFileUrl } from '@renderer/app/utils/file'
import { persistProjectById } from '@renderer/app/utils/project-persist'
import type { ExportFormat } from '@renderer/app/types/export'
import type { AssetCategory } from '@renderer/app/types/review'

const route = useRoute()
const router = useRouter()
const assetStore = useAssetStore()
const projectStore = useProjectStore()
const reviewStore = useReviewStore()
const exportingBundle = ref(false)
const exportingJson = ref(false)
const exportingCsv = ref(false)

const summary = computed(() => projectStore.currentSummary)
const currentProject = computed(() => projectStore.currentProject)
const progressPercent = computed(() => {
  if (!summary.value.totalCount) return 0
  return Math.round((summary.value.reviewedCount / summary.value.totalCount) * 100)
})

const resultItems = computed(() =>
  assetStore.assets
    .filter((asset) => asset.projectId === projectStore.currentProjectId)
    .map((asset) => ({
      asset,
      review: reviewStore.getReviewByAssetId(asset.id)!
    }))
)

const favoriteItems = computed(() => resultItems.value.filter((item) => item.review.favorite))

watchEffect(() => {
  const routeProjectId = String(route.params.projectId || '')
  if (routeProjectId && routeProjectId !== projectStore.currentProjectId) {
    projectStore.selectProject(routeProjectId)
  }
  if (projectStore.currentProjectId) {
    projectStore.updateUiState(projectStore.currentProjectId, { lastRoute: 'result' })
    void persistProjectById(projectStore.currentProjectId, projectStore, assetStore, reviewStore)
  }
})

function goFilter(): void {
  if (projectStore.currentProjectId) {
    projectStore.updateUiState(projectStore.currentProjectId, { lastRoute: 'filter' })
    void persistProjectById(projectStore.currentProjectId, projectStore, assetStore, reviewStore)
  }
  router.push({ name: 'filter', params: { projectId: projectStore.currentProjectId } })
}

function goHome(): void {
  router.push({ name: 'home' })
}

function goReview(): void {
  if (projectStore.currentProjectId) {
    projectStore.updateUiState(projectStore.currentProjectId, { lastRoute: 'review' })
    void persistProjectById(projectStore.currentProjectId, projectStore, assetStore, reviewStore)
  }
  router.push({ name: 'review', params: { projectId: projectStore.currentProjectId } })
}

function getThumbnailSrc(thumbnailPath?: string, filePath?: string): string {
  return toFileUrl(thumbnailPath || filePath)
}

function categoryText(category: AssetCategory): string {
  return ASSET_CATEGORY_TEXT[category]
}

function decisionText(decision: keyof typeof REVIEW_DECISION_TEXT): string {
  return REVIEW_DECISION_TEXT[decision]
}

async function exportProjectResults(format: ExportFormat): Promise<void> {
  const snapshot = buildProjectSnapshotForExport(
    currentProject.value,
    assetStore.assets,
    reviewStore.reviews,
    projectStore.getProjectUiState(projectStore.currentProjectId)
  )
  if (!snapshot) {
    message.warning('当前没有可导出的项目')
    return
  }

  const loadingRef = format === 'json' ? exportingJson : exportingCsv
  loadingRef.value = true

  try {
    const items = buildExportItems(snapshot)
    const payload = buildProjectExportPayload(snapshot, 'project', items, {
      summary: {
        totalCount: summary.value.totalCount,
        reviewedCount: summary.value.reviewedCount,
        approvedCount: summary.value.approvedCount,
        pendingCount: summary.value.pendingCount,
        rejectedCount: summary.value.rejectedCount,
        commentedCount: summary.value.commentedCount
      }
    })

    const result = await window.api.exportProjectResults(payload, format)
    if (result.canceled) return
    message.success(`已导出本机备份：${result.filePath}`)
  } catch (error) {
    console.error(error)
    message.error('导出审核结果失败，请稍后重试')
  } finally {
    loadingRef.value = false
  }
}

async function exportCompleteProject(): Promise<void> {
  const snapshot = buildProjectSnapshotForExport(
    currentProject.value,
    assetStore.assets,
    reviewStore.reviews,
    projectStore.getProjectUiState(projectStore.currentProjectId)
  )
  if (!snapshot) {
    message.warning('当前没有可导出的项目')
    return
  }

  exportingBundle.value = true

  try {
    const result = await window.api.exportFullProjectBundle(snapshot)
    if (result.canceled) return
    message.success(`已导出完整项目：${result.filePath}`)
  } catch (error) {
    console.error(error)
    message.error('导出完整项目失败，请稍后重试')
  } finally {
    exportingBundle.value = false
  }
}
</script>
