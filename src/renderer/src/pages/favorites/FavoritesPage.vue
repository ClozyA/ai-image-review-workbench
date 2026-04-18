<template>
  <div class="app-layout">
    <header class="app-header">
      <div>
        <h1 class="page-title">收藏夹</h1>
        <p class="page-subtitle">集中查看所有已收藏图片，快速回到对应项目继续处理。</p>
      </div>
      <a-space>
        <a-button @click="goHome">返回首页</a-button>
      </a-space>
    </header>

    <main class="page-section">
      <section class="page-card favorites-card">
        <div class="section-header">
          <h2>收藏图片</h2>
        </div>

        <div v-if="favoriteItems.length" class="result-list favorites-list">
          <article
            v-for="item in favoriteItems"
            :key="item.asset.id"
            class="result-item favorites-item"
          >
            <img
              class="result-item-cover"
              :src="getThumbnailSrc(item.asset.thumbnailPath, item.asset.filePath)"
              alt=""
              loading="lazy"
            />
            <div class="result-item-main">
              <strong>{{ item.asset.fileName }}</strong>
              <span>{{ item.projectName }}</span>
              <small> {{ item.decisionText }} · {{ item.categoryText }} </small>
              <a-space wrap>
                <a-button size="middle" @click="openProject(item.projectId, item.asset.id)">
                  打开项目
                </a-button>
                <a-button size="middle" @click="toggleFavorite(item.asset.id)">取消收藏</a-button>
              </a-space>
            </div>
          </article>
        </div>
        <div v-else class="filter-empty-state">
          <strong>暂无收藏</strong>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'

import { getCategoryText, REVIEW_DECISION_TEXT } from '@renderer/app/constants/review'
import { useAssetStore } from '@renderer/app/store/asset.store'
import { useProjectStore } from '@renderer/app/store/project.store'
import { useReviewStore } from '@renderer/app/store/review.store'
import { toFileUrl } from '@renderer/app/utils/file'
import type { ImageAsset } from '@renderer/app/types/review'

const router = useRouter()
const assetStore = useAssetStore()
const projectStore = useProjectStore()
const reviewStore = useReviewStore()

interface FavoriteViewItem {
  asset: ImageAsset
  projectId: string
  projectName: string
  decisionText: string
  categoryText: string
}

const favoriteItems = computed<FavoriteViewItem[]>(() =>
  assetStore.assets
    .map((asset) => {
      const review = reviewStore.getReviewByAssetId(asset.id)
      const project = projectStore.projects.find((item) => item.id === asset.projectId)
      if (!review?.favorite || !project) return null

      return {
        asset,
        projectId: asset.projectId,
        projectName: project.name,
        decisionText: REVIEW_DECISION_TEXT[review.decision],
        categoryText: getCategoryText(review.category)
      }
    })
    .filter((item): item is FavoriteViewItem => item !== null)
)

function goHome(): void {
  router.push({ name: 'home' })
}

function openProject(projectId: string, assetId: string): void {
  projectStore.selectProject(projectId)
  assetStore.selectAsset(assetId)
  router.push({ name: 'review', params: { projectId } })
}

function toggleFavorite(assetId: string): void {
  reviewStore.toggleFavorite(assetId)
}

function getThumbnailSrc(thumbnailPath?: string, filePath?: string): string {
  return toFileUrl(thumbnailPath || filePath)
}
</script>
