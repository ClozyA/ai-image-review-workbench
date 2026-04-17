<template>
  <div class="app-layout">
    <header class="app-header">
      <div>
        <h1 class="page-title">结果筛选</h1>
        <p class="page-subtitle">只围绕结论、分类和备注进行筛选。</p>
      </div>
      <a-space>
        <a-button @click="goReview">返回审核页</a-button>
        <a-button @click="goResult">结果页</a-button>
      </a-space>
    </header>

    <main class="page-section filter-page-grid">
      <section class="page-card">
        <div class="section-header">
          <h2>筛选条件</h2>
          <a-button size="small" @click="filterStore.reset">重置</a-button>
        </div>

        <div class="field-block">
          <label class="field-label">处理结论</label>
          <a-space wrap>
            <a-button
              v-for="option in REVIEW_DECISION_OPTIONS"
              :key="option.value"
              :type="filter.decisions.includes(option.value) ? 'primary' : 'default'"
              @click="filterStore.toggleDecision(option.value)"
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
              :type="filter.categories.includes(option.value) ? 'primary' : 'default'"
              @click="filterStore.toggleCategory(option.value)"
            >
              {{ option.label }}
            </a-button>
          </a-space>
        </div>

        <div class="field-block">
          <label class="field-label">备注</label>
          <a-space wrap>
            <a-button
              :type="filter.hasComment === true ? 'primary' : 'default'"
              @click="filterStore.setHasComment(true)"
            >
              仅看有备注
            </a-button>
            <a-button
              :type="filter.hasComment === false ? 'primary' : 'default'"
              @click="filterStore.setHasComment(false)"
            >
              仅看无备注
            </a-button>
            <a-button
              :type="filter.hasComment === undefined ? 'primary' : 'default'"
              @click="filterStore.setHasComment(undefined)"
            >
              全部
            </a-button>
          </a-space>
        </div>

        <div class="field-block">
          <label class="field-label">关键词</label>
          <a-input
            :value="filter.keyword"
            placeholder="搜索文件名或备注"
            @update:value="(value) => filterStore.setKeyword(value)"
          />
        </div>
      </section>

      <section class="page-card">
        <div class="section-header">
          <h2>筛选结果</h2>
          <span class="section-tip">共 {{ filteredItems.length }} 张</span>
        </div>

        <div class="result-list">
          <article v-for="item in filteredItems" :key="item.asset.id" class="result-item">
            <img
              class="result-item-cover"
              :src="getThumbnailSrc(item.asset.thumbnailPath, item.asset.filePath)"
              alt=""
              loading="lazy"
            />
            <div class="result-item-main">
              <strong>{{ item.asset.fileName }}</strong>
              <span>
                {{ REVIEW_DECISION_TEXT[item.review.decision] }} ·
                {{ item.review.category ? ASSET_CATEGORY_TEXT[item.review.category] : '未分类' }}
              </span>
              <small>{{ item.review.comment || '无备注' }}</small>
            </div>
          </article>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  ASSET_CATEGORY_OPTIONS,
  ASSET_CATEGORY_TEXT,
  REVIEW_DECISION_OPTIONS,
  REVIEW_DECISION_TEXT
} from '@renderer/app/constants/review'
import { useAssetStore } from '@renderer/app/store/asset.store'
import { useFilterStore } from '@renderer/app/store/filter.store'
import { useProjectStore } from '@renderer/app/store/project.store'
import { useReviewStore } from '@renderer/app/store/review.store'
import { toFileUrl } from '@renderer/app/utils/file'
import type { AssetViewModel } from '@renderer/app/types/review'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const assetStore = useAssetStore()
const reviewStore = useReviewStore()
const filterStore = useFilterStore()

const filter = computed(() => filterStore.filter)

const projectItems = computed<AssetViewModel[]>(() =>
  assetStore.assets
    .filter((asset) => asset.projectId === projectStore.currentProjectId)
    .map((asset) => {
      const review = reviewStore.getReviewByAssetId(asset.id)!
      return {
        asset,
        review,
        displayName: asset.fileName,
        resolutionText: asset.width && asset.height ? `${asset.width} × ${asset.height}` : '-',
        hasComment: Boolean(review.comment.trim())
      }
    })
)

const filteredItems = computed(() =>
  projectItems.value.filter((item) => {
    if (filter.value.decisions.length && !filter.value.decisions.includes(item.review.decision))
      return false
    if (filter.value.categories.length) {
      if (!item.review.category || !filter.value.categories.includes(item.review.category))
        return false
    }
    if (filter.value.hasComment === true && !item.review.comment.trim()) return false
    if (filter.value.hasComment === false && item.review.comment.trim()) return false
    if (filter.value.keyword) {
      const keyword = filter.value.keyword.trim().toLowerCase()
      const haystack = `${item.asset.fileName} ${item.review.comment}`.toLowerCase()
      if (!haystack.includes(keyword)) return false
    }
    return true
  })
)

watchEffect(() => {
  const routeProjectId = String(route.params.projectId || '')
  if (routeProjectId && routeProjectId !== projectStore.currentProjectId) {
    projectStore.selectProject(routeProjectId)
  }
})

function goReview(): void {
  router.push({ name: 'review', params: { projectId: projectStore.currentProjectId } })
}

function goResult(): void {
  router.push({ name: 'result', params: { projectId: projectStore.currentProjectId } })
}

function getThumbnailSrc(thumbnailPath?: string, filePath?: string): string {
  return toFileUrl(thumbnailPath || filePath)
}
</script>
