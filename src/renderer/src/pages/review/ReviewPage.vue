<template>
  <div class="app-layout">
    <header class="app-header">
      <div>
        <h1 class="page-title">{{ projectStore.currentProject?.name ?? '审核页' }}</h1>
        <p class="page-subtitle">
          当前 {{ currentIndex }} / {{ projectAssets.length }} · 已处理
          {{ projectStore.currentSummary.reviewedCount }} /
          {{ projectStore.currentSummary.totalCount }}
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
        </div>
        <div ref="thumbListRef" class="thumb-list" @scroll="handleThumbListScroll">
          <button
            v-for="item in visibleReviewItems"
            :key="item.asset.id"
            class="thumb-row"
            :data-asset-id="item.asset.id"
            :class="{ active: item.asset.id === assetStore.currentAssetId }"
            @click="assetStore.selectAsset(item.asset.id)"
          >
            <img
              class="thumb-box"
              :src="getThumbnailSrc(item.asset.thumbnailPath, item.asset.filePath)"
              alt=""
              loading="lazy"
            />
            <span class="thumb-meta">
              <strong>{{ item.asset.fileName }}</strong>
              <small>
                {{ item.decisionText }} · {{ item.categoryText
                }}{{ item.review.favorite ? ' · 已收藏' : '' }}
              </small>
            </span>
          </button>
        </div>
      </section>

      <section class="page-card review-card review-card-preview">
        <div class="section-header">
          <h2>当前图片</h2>
          <a-space wrap>
            <a-button size="middle" :disabled="!currentReview" @click="toggleCurrentFavorite">
              {{ currentReview?.favorite ? '取消收藏' : '加入收藏' }}
            </a-button>
            <a-button
              size="middle"
              :disabled="!canAddCurrentToCompare"
              @click="addCurrentToCompare"
            >
              {{ isCurrentInCompare ? '已加入对比' : '加入对比' }}
            </a-button>
            <a-button size="middle" :disabled="compareItems.length < 2" @click="openCompareModal">
              打开对比（{{ compareItems.length }}）
            </a-button>
          </a-space>
        </div>
        <div v-if="currentItem?.asset.filePath" class="preview-stage">
          <a-image
            class="preview-box"
            :src="getOriginalSrc(currentItem?.asset.filePath)"
            alt=""
            :preview="{
              visible: detailPreviewVisible,
              onVisibleChange: handleDetailPreviewVisibleChange
            }"
            @click="openDetailPreview"
          />
        </div>
        <div v-else class="preview-empty">
          <strong>暂无图片</strong>
        </div>
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

        </div>

        <div class="review-panel-body">
          <div class="field-block">
            <div class="compare-inline-header">
              <label class="field-label">对比列表</label>
            </div>
            <div v-if="compareItems.length" class="compare-chip-list">
              <button
                v-for="item in compareItems"
                :key="item.asset.id"
                type="button"
                class="compare-chip"
                :class="{ active: item.asset.id === assetStore.currentAssetId }"
                @click="assetStore.selectAsset(item.asset.id)"
              >
                <span class="compare-chip-text" :title="item.asset.fileName">{{
                  item.asset.fileName
                }}</span>
                <span class="compare-chip-remove" @click.stop="removeFromCompare(item.asset.id)">
                  ×
                </span>
              </button>
            </div>
            <div v-else class="compare-empty">暂无对比图片</div>
          </div>

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
                v-for="option in categoryOptions"
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
          <a-button size="large" :disabled="isPreviousDisabled" @click="selectPrevious"
            >上一张</a-button
          >
          <a-button
            type="primary"
            size="large"
            :disabled="isNextDisabled"
            @click="handlePrimaryAction"
          >
            {{ primaryActionText }}
          </a-button>
        </div>
      </section>
    </main>
  </div>

  <a-modal
    v-model:open="compareModalOpen"
    title="图片对比"
    width="94vw"
    wrap-class-name="compare-modal"
    :footer="null"
  >
    <div class="compare-modal-body">
      <div class="compare-selector-bar">
        <div>
          <strong>选择两张图</strong>
        </div>
        <a-button danger ghost @click="clearCompareList">清空对比列表</a-button>
      </div>

      <div class="compare-selector-list">
        <button
          v-for="item in compareItems"
          :key="item.asset.id"
          type="button"
          class="compare-selector-card"
          :class="{ active: selectedCompareAssetIds.includes(item.asset.id) }"
          @click="toggleCompareSelection(item.asset.id)"
        >
          <img
            class="compare-selector-cover"
            :src="getThumbnailSrc(item.asset.thumbnailPath, item.asset.filePath)"
            alt=""
            loading="lazy"
          />
          <span class="compare-selector-name" :title="item.asset.fileName">{{
            item.asset.fileName
          }}</span>
          <span class="compare-selector-meta">
            {{ item.decisionText }} · {{ item.categoryText }}
          </span>
        </button>
      </div>

      <div v-if="selectedCompareItems.length === 2" class="compare-preview-grid">
        <article
          v-for="item in selectedCompareItems"
          :key="item.asset.id"
          class="compare-preview-card"
        >
          <div class="compare-preview-head">
            <strong :title="item.asset.fileName">{{ item.asset.fileName }}</strong>
            <span>{{ item.resolutionText }} · {{ formatFileSize(item.asset.fileSize) }}</span>
          </div>
          <div class="compare-preview-stage">
            <a-image
              class="compare-preview-image"
              :src="getOriginalSrc(item.asset.filePath)"
              alt=""
            />
          </div>
        </article>
      </div>
      <div v-else class="compare-preview-empty">
        <strong>请选择两张图</strong>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'

import {
  buildCategoryOptions,
  getCategoryText,
  REVIEW_DECISION_OPTIONS,
  REVIEW_DECISION_TEXT
} from '@renderer/app/constants/review'
import { useAssetStore } from '@renderer/app/store/asset.store'
import { useCompareStore } from '@renderer/app/store/compare.store'
import { useProjectStore } from '@renderer/app/store/project.store'
import { useReviewStore } from '@renderer/app/store/review.store'
import { toFileUrl } from '@renderer/app/utils/file'
import { persistProjectById } from '@renderer/app/utils/project-persist'
import type { AssetViewModel, ReviewDecision } from '@renderer/app/types/review'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const assetStore = useAssetStore()
const compareStore = useCompareStore()
const reviewStore = useReviewStore()
const thumbListRef = ref<HTMLElement | null>(null)
const visibleThumbCount = ref(60)
const detailPreviewVisible = ref(false)
const compareModalOpen = ref(false)
const selectedCompareAssetIds = ref<string[]>([])
let reviewScrollSaveTimer: ReturnType<typeof setTimeout> | undefined

const projectAssets = computed(() =>
  assetStore.assets.filter((asset) => asset.projectId === projectStore.currentProjectId)
)

const categoryOptions = computed(() =>
  buildCategoryOptions(projectStore.currentProject?.categories)
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
      categoryText: getCategoryText(review.category)
    }
  })
)

const visibleReviewItems = computed(() => reviewItems.value.slice(0, visibleThumbCount.value))

const currentItem = computed(
  () => reviewItems.value.find((item) => item.asset.id === assetStore.currentAssetId) ?? null
)

const currentReview = computed(() =>
  assetStore.currentAssetId
    ? (reviewStore.getReviewByAssetId(assetStore.currentAssetId) ?? null)
    : null
)

const compareItems = computed(() => {
  const compareAssetIds = compareStore.getProjectCompareAssetIds(projectStore.currentProjectId)
  return compareAssetIds
    .map((assetId) => reviewItems.value.find((item) => item.asset.id === assetId) ?? null)
    .filter((item): item is AssetViewModel => Boolean(item))
})

const selectedCompareItems = computed(() =>
  selectedCompareAssetIds.value
    .map((assetId) => compareItems.value.find((item) => item.asset.id === assetId) ?? null)
    .filter((item): item is AssetViewModel => Boolean(item))
)

const isCurrentInCompare = computed(() =>
  assetStore.currentAssetId
    ? compareStore.hasAsset(projectStore.currentProjectId, assetStore.currentAssetId)
    : false
)

const canAddCurrentToCompare = computed(() =>
  Boolean(currentItem.value && !isCurrentInCompare.value)
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
    if (projectStore.currentProjectId) {
      projectStore.updateUiState(projectStore.currentProjectId, {
        lastRoute: 'review',
        lastSelectedAssetId: assetId
      })
      void persistProjectById(projectStore.currentProjectId, projectStore, assetStore, reviewStore)
    }
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

watch(
  () => projectStore.currentProjectId,
  async () => {
    visibleThumbCount.value = 60
    detailPreviewVisible.value = false
    compareModalOpen.value = false
    selectedCompareAssetIds.value = []
    await nextTick()
    const scrollTop = projectStore.currentUiState.reviewThumbScrollTop ?? 0
    if (thumbListRef.value) {
      thumbListRef.value.scrollTop = scrollTop
    }
  }
)

watchEffect(() => {
  if (!projectAssets.value.length) {
    if (assetStore.currentAssetId) {
      assetStore.selectAsset('')
    }
    return
  }

  const currentAssetBelongsToProject = projectAssets.value.some(
    (asset) => asset.id === assetStore.currentAssetId
  )

  if (!currentAssetBelongsToProject) {
    assetStore.selectAsset(projectAssets.value[0].id)
  }
})

watch(
  compareItems,
  (items) => {
    const nextSelected = selectedCompareAssetIds.value.filter((assetId) =>
      items.some((item) => item.asset.id === assetId)
    )

    if (!nextSelected.length && items.length >= 2) {
      selectedCompareAssetIds.value = items.slice(0, 2).map((item) => item.asset.id)
      return
    }

    if (nextSelected.length > 2) {
      selectedCompareAssetIds.value = nextSelected.slice(0, 2)
      return
    }

    selectedCompareAssetIds.value = nextSelected
  },
  { immediate: true }
)

function updateDecision(value: ReviewDecision): void {
  if (!assetStore.currentAssetId) return
  reviewStore.updateDecision(assetStore.currentAssetId, value)
}

function updateCategory(value: string): void {
  if (!assetStore.currentAssetId) return
  reviewStore.updateCategory(assetStore.currentAssetId, value)
}

function onCommentChange(value: string): void {
  if (!assetStore.currentAssetId) return
  reviewStore.updateComment(assetStore.currentAssetId, value)
}

function toggleCurrentFavorite(): void {
  if (!assetStore.currentAssetId) return
  const nextFavorite = !currentReview.value?.favorite
  reviewStore.toggleFavorite(assetStore.currentAssetId)
  message.success(nextFavorite ? '已加入收藏' : '已取消收藏')
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

function openDetailPreview(): void {
  if (!currentItem.value) return
  detailPreviewVisible.value = true
}

function handleDetailPreviewVisibleChange(visible: boolean): void {
  detailPreviewVisible.value = visible
}

function addCurrentToCompare(): void {
  if (!assetStore.currentAssetId) return
  compareStore.addAsset(projectStore.currentProjectId, assetStore.currentAssetId)
  if (compareItems.value.length >= 2 && selectedCompareAssetIds.value.length < 2) {
    selectedCompareAssetIds.value = compareItems.value.slice(0, 2).map((item) => item.asset.id)
  }
  message.success('已加入对比列表')
}

function removeFromCompare(assetId: string): void {
  compareStore.removeAsset(projectStore.currentProjectId, assetId)
}

function openCompareModal(): void {
  if (compareItems.value.length < 2) return
  if (selectedCompareAssetIds.value.length < 2) {
    selectedCompareAssetIds.value = compareItems.value.slice(0, 2).map((item) => item.asset.id)
  }
  compareModalOpen.value = true
}

function toggleCompareSelection(assetId: string): void {
  if (selectedCompareAssetIds.value.includes(assetId)) {
    selectedCompareAssetIds.value = selectedCompareAssetIds.value.filter((id) => id !== assetId)
    return
  }

  if (selectedCompareAssetIds.value.length >= 2) {
    selectedCompareAssetIds.value = [selectedCompareAssetIds.value[1], assetId]
    return
  }

  selectedCompareAssetIds.value = [...selectedCompareAssetIds.value, assetId]
}

function clearCompareList(): void {
  compareStore.clearProject(projectStore.currentProjectId)
  selectedCompareAssetIds.value = []
}

function goHome(): void {
  router.push({ name: 'home' })
}

function goFilter(): void {
  if (projectStore.currentProjectId) {
    projectStore.updateUiState(projectStore.currentProjectId, { lastRoute: 'filter' })
    void persistProjectById(projectStore.currentProjectId, projectStore, assetStore, reviewStore)
  }
  router.push({ name: 'filter', params: { projectId: projectStore.currentProjectId } })
}

function goResult(): void {
  if (projectStore.currentProjectId) {
    projectStore.updateUiState(projectStore.currentProjectId, { lastRoute: 'result' })
    void persistProjectById(projectStore.currentProjectId, projectStore, assetStore, reviewStore)
  }
  router.push({ name: 'result', params: { projectId: projectStore.currentProjectId } })
}

function formatFileSize(value?: number): string {
  if (!value) return '-'
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

function handleThumbListScroll(event: Event): void {
  const target = event.target as HTMLElement | null
  if (!target) return

  if (projectStore.currentProjectId) {
    projectStore.updateUiState(projectStore.currentProjectId, {
      lastRoute: 'review',
      reviewThumbScrollTop: target.scrollTop
    })
    if (reviewScrollSaveTimer) {
      clearTimeout(reviewScrollSaveTimer)
    }
    reviewScrollSaveTimer = setTimeout(() => {
      void persistProjectById(projectStore.currentProjectId, projectStore, assetStore, reviewStore)
    }, 180)
  }

  const remaining = target.scrollHeight - target.scrollTop - target.clientHeight
  if (remaining > 240) return
  if (visibleThumbCount.value >= reviewItems.value.length) return

  visibleThumbCount.value = Math.min(visibleThumbCount.value + 60, reviewItems.value.length)
}

function getThumbnailSrc(thumbnailPath?: string, filePath?: string): string {
  return toFileUrl(thumbnailPath || filePath)
}

function getOriginalSrc(filePath?: string): string {
  return toFileUrl(filePath)
}
</script>
