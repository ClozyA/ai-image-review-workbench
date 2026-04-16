<template>
  <div class="app-layout">
    <header class="app-header">
      <div>
        <h1 class="page-title">{{ projectStore.currentProject?.name ?? '审核页' }}</h1>
        <p class="page-subtitle">
          当前 {{ currentIndex }} / {{ projectAssets.length }} · 已处理 {{ projectStore.currentSummary.reviewedCount }}
          / {{ projectStore.currentSummary.totalCount }}
        </p>
      </div>
      <a-space>
        <a-button @click="goHome">返回首页</a-button>
        <a-button @click="goFilter">结果筛选</a-button>
        <a-button @click="goResult">结果页</a-button>
      </a-space>
    </header>

    <main class="review-layout">
      <section class="page-card review-card review-card-list">
        <div class="section-header">
          <h2>图片列表</h2>
          <span class="section-tip">批量浏览与快速切换</span>
        </div>
        <div ref="thumbListRef" class="thumb-list">
          <button
            v-for="item in reviewItems"
            :key="item.asset.id"
            class="thumb-row"
            :data-asset-id="item.asset.id"
            :class="{ active: item.asset.id === assetStore.currentAssetId }"
            @click="assetStore.selectAsset(item.asset.id)"
          >
            <img class="thumb-box" :src="getThumbnailSrc(item.asset.thumbnailPath, item.asset.filePath)" alt="" />
            <span class="thumb-meta">
              <strong>{{ item.asset.fileName }}</strong>
              <small>{{ item.decisionText }} · {{ item.categoryText }}</small>
            </span>
          </button>
        </div>
      </section>

      <section class="page-card review-card review-card-preview">
        <div class="section-header">
          <h2>当前图片</h2>
          <span class="section-tip">中间只负责看图</span>
        </div>
        <img class="preview-box" :src="getOriginalSrc(currentItem?.asset.filePath)" alt="" />
        <div class="meta-grid">
          <div class="meta-card">
            <span>文件名</span>
            <strong class="meta-file-name" :title="currentItem?.asset.fileName ?? '-'">
              {{ currentItem?.asset.fileName ?? '-' }}
            </strong>
          </div>
          <div class="meta-card">
            <span>分辨率</span>
            <strong>{{ currentItem?.resolutionText ?? '-' }}</strong>
          </div>
          <div class="meta-card">
            <span>大小</span>
            <strong>{{ formatFileSize(currentItem?.asset.fileSize) }}</strong>
          </div>
        </div>
      </section>

      <section class="page-card review-card review-card-panel">
        <div class="section-header">
          <h2>审核面板</h2>
          <span class="section-tip">结论、分类、备注</span>
        </div>

        <div class="review-panel-body">
          <div class="field-block">
            <label class="field-label">处理结论</label>
            <a-space wrap>
              <a-button
                v-for="option in REVIEW_DECISION_OPTIONS"
                :key="option.value"
                :type="currentReview?.decision === option.value ? 'primary' : 'default'"
                @click="updateDecision(option.value)"
              >
                {{ option.label }}
              </a-button>
            </a-space>
          </div>

          <div class="field-block">
            <label class="field-label">分类</label>
            <a-space wrap>
              <a-button
                v-for="option in ASSET_CATEGORY_OPTIONS"
                :key="option.value"
                :type="currentReview?.category === option.value ? 'primary' : 'default'"
                @click="updateCategory(option.value)"
              >
                {{ option.label }}
              </a-button>
            </a-space>
          </div>

          <div class="field-block">
            <label class="field-label">备注</label>
            <a-textarea
              :value="currentReview?.comment"
              :rows="10"
              placeholder="补充为什么通过、为什么待定，或者记录后续处理说明。"
              @update:value="onCommentChange"
            />
          </div>
        </div>

        <div class="review-actions">
          <a-button size="large" :disabled="isPreviousDisabled" @click="selectPrevious">上一张</a-button>
          <a-button type="primary" size="large" :disabled="isNextDisabled" @click="handlePrimaryAction">
            {{ primaryActionText }}
          </a-button>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  ASSET_CATEGORY_OPTIONS,
  ASSET_CATEGORY_TEXT,
  REVIEW_DECISION_OPTIONS,
  REVIEW_DECISION_TEXT
} from '@renderer/app/constants/review'
import { useAssetStore } from '@renderer/app/store/asset.store'
import { useProjectStore } from '@renderer/app/store/project.store'
import { useReviewStore } from '@renderer/app/store/review.store'
import { toFileUrl } from '@renderer/app/utils/file'
import type { AssetCategory, AssetViewModel, ReviewDecision } from '@renderer/app/types/review'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const assetStore = useAssetStore()
const reviewStore = useReviewStore()
const thumbListRef = ref<HTMLElement | null>(null)

const projectAssets = computed(() =>
  assetStore.assets.filter((asset) => asset.projectId === projectStore.currentProjectId)
)

const reviewItems = computed<AssetViewModel[]>(() =>
  projectAssets.value.map((asset) => {
    const review = reviewStore.getReviewByAssetId(asset.id)!
    return {
      asset,
      review,
      displayName: asset.fileName,
      resolutionText: asset.width && asset.height ? `${asset.width} × ${asset.height}` : '-',
      hasComment: Boolean(review.comment.trim()),
      decisionText: REVIEW_DECISION_TEXT[review.decision],
      categoryText: review.category ? ASSET_CATEGORY_TEXT[review.category] : '未分类'
    }
  })
)

const currentItem = computed(
  () => reviewItems.value.find((item) => item.asset.id === assetStore.currentAssetId) ?? null
)

const currentReview = computed(() =>
  assetStore.currentAssetId ? reviewStore.getReviewByAssetId(assetStore.currentAssetId) ?? null : null
)

const currentIndex = computed(() => {
  const index = projectAssets.value.findIndex((asset) => asset.id === assetStore.currentAssetId)
  return index >= 0 ? index + 1 : 0
})

const isLastAsset = computed(() => currentIndex.value === projectAssets.value.length)
const isPreviousDisabled = computed(() => currentIndex.value <= 1)

const isAllReviewed = computed(
  () =>
    projectStore.currentSummary.totalCount > 0 &&
    projectStore.currentSummary.reviewedCount === projectStore.currentSummary.totalCount
)

const primaryActionText = computed(() => {
  if (isLastAsset.value && isAllReviewed.value) return '查看结果'
  if (isLastAsset.value) return '已是最后一张'
  return '下一张'
})

const isNextDisabled = computed(() => isLastAsset.value && !isAllReviewed.value)

watch(
  () => assetStore.currentAssetId,
  async (assetId) => {
    if (!assetId) return
    await nextTick()
    const list = thumbListRef.value
    if (!list) return
    const row = list.querySelector<HTMLElement>(`[data-asset-id="${assetId}"]`)
    row?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
  }
)

watchEffect(() => {
  const routeProjectId = String(route.params.projectId || '')
  if (routeProjectId && routeProjectId !== projectStore.currentProjectId) {
    projectStore.selectProject(routeProjectId)
  }
})

function updateDecision(value: ReviewDecision): void {
  if (!assetStore.currentAssetId) return
  reviewStore.updateDecision(assetStore.currentAssetId, value)
}

function updateCategory(value: AssetCategory): void {
  if (!assetStore.currentAssetId) return
  reviewStore.updateCategory(assetStore.currentAssetId, value)
}

function onCommentChange(value: string): void {
  if (!assetStore.currentAssetId) return
  reviewStore.updateComment(assetStore.currentAssetId, value)
}

function selectNext(): void {
  assetStore.selectNextAsset()
}

function selectPrevious(): void {
  assetStore.selectPreviousAsset()
}

function handlePrimaryAction(): void {
  if (isLastAsset.value && isAllReviewed.value) {
    goResult()
    return
  }
  if (!isLastAsset.value) {
    selectNext()
  }
}

function goHome(): void {
  router.push({ name: 'home' })
}

function goFilter(): void {
  router.push({ name: 'filter', params: { projectId: projectStore.currentProjectId } })
}

function goResult(): void {
  router.push({ name: 'result', params: { projectId: projectStore.currentProjectId } })
}

function formatFileSize(value?: number): string {
  if (!value) return '-'
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function getThumbnailSrc(thumbnailPath?: string, filePath?: string): string {
  return toFileUrl(thumbnailPath || filePath)
}

function getOriginalSrc(filePath?: string): string {
  return toFileUrl(filePath)
}
</script>
