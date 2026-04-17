<template>
  <div class="app-layout">
    <header class="app-header">
      <div>
        <div class="page-title-row">
          <h1 class="page-title">结果页</h1>
          <a-tag v-if="currentProject?.name" color="blue">当前项目：{{ currentProject.name }}</a-tag>
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

    <main class="page-section">
      <section class="page-card">
        <div class="section-header">
          <h2>结果概览</h2>
          <span class="section-tip">来自统一的项目统计对象</span>
        </div>

        <div class="summary-grid">
          <article class="summary-card">
            <span>总图片数</span>
            <strong>{{ summary.totalCount }}</strong>
          </article>
          <article class="summary-card">
            <span>已处理</span>
            <strong>{{ summary.reviewedCount }}</strong>
          </article>
          <article class="summary-card">
            <span>通过</span>
            <strong>{{ summary.approvedCount }}</strong>
          </article>
          <article class="summary-card">
            <span>待定</span>
            <strong>{{ summary.pendingCount }}</strong>
          </article>
        </div>
      </section>

      <section class="result-dashboard">
        <article class="page-card">
          <div class="section-header">
            <h2>分类统计</h2>
            <span class="section-tip">用于验证分类体系是否够用</span>
          </div>
          <ul class="info-list">
            <li v-for="option in ASSET_CATEGORY_OPTIONS" :key="option.value">
              {{ option.label }}：{{ summary.categoryCounts[option.value] }}
            </li>
          </ul>
        </article>

        <article class="page-card">
          <div class="section-header">
            <h2>备注概览</h2>
            <span class="section-tip">后续可以扩展成导出摘要</span>
          </div>
          <div class="result-list">
            <article v-for="item in commentedItems" :key="item.asset.id" class="result-item">
              <img
                class="result-item-cover"
                :src="getThumbnailSrc(item.asset.thumbnailPath, item.asset.filePath)"
                alt=""
                loading="lazy"
              />
              <div class="result-item-main">
                <strong>{{ item.asset.fileName }}</strong>
                <span>{{
                  item.review.category ? categoryText(item.review.category) : '未分类'
                }}</span>
                <small>{{ item.review.comment }}</small>
              </div>
            </article>
          </div>
        </article>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'

import { ASSET_CATEGORY_OPTIONS, ASSET_CATEGORY_TEXT } from '@renderer/app/constants/review'
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

const commentedItems = computed(() =>
  assetStore.assets
    .filter((asset) => asset.projectId === projectStore.currentProjectId)
    .map((asset) => ({
      asset,
      review: reviewStore.getReviewByAssetId(asset.id)!
    }))
    .filter((item) => item.review.comment.trim())
)

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
