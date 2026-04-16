<template>
  <div class="app-layout">
    <header class="app-header">
      <div>
        <h1 class="page-title">结果页</h1>
        <p class="page-subtitle">当前版本先聚焦结论统计、分类分布和备注概览。</p>
      </div>
      <a-space>
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
              <img class="result-item-cover" :src="getThumbnailSrc(item.asset.thumbnailPath, item.asset.filePath)" alt="" />
              <div class="result-item-main">
                <strong>{{ item.asset.fileName }}</strong>
                <span>{{ item.review.category ? categoryText(item.review.category) : '未分类' }}</span>
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
import { computed, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { ASSET_CATEGORY_OPTIONS, ASSET_CATEGORY_TEXT } from '@renderer/app/constants/review'
import { useAssetStore } from '@renderer/app/store/asset.store'
import { useProjectStore } from '@renderer/app/store/project.store'
import { useReviewStore } from '@renderer/app/store/review.store'
import { toFileUrl } from '@renderer/app/utils/file'
import type { AssetCategory } from '@renderer/app/types/review'

const route = useRoute()
const router = useRouter()
const assetStore = useAssetStore()
const projectStore = useProjectStore()
const reviewStore = useReviewStore()

const summary = computed(() => projectStore.currentSummary)

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
})

function goFilter(): void {
  router.push({ name: 'filter', params: { projectId: projectStore.currentProjectId } })
}

function goReview(): void {
  router.push({ name: 'review', params: { projectId: projectStore.currentProjectId } })
}

function getThumbnailSrc(thumbnailPath?: string, filePath?: string): string {
  return toFileUrl(thumbnailPath || filePath)
}

function categoryText(category: AssetCategory): string {
  return ASSET_CATEGORY_TEXT[category]
}
</script>
