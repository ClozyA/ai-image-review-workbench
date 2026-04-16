<template>
  <div class="app-layout">
    <header class="app-header">
      <div>
        <h1 class="page-title">AI 图片筛选与评审工作台</h1>
        <p class="page-subtitle">基础骨架已就位，后续页面将围绕统一模型持续落地。</p>
      </div>
      <a-space>
        <a-button type="primary" :loading="opening" @click="openFolder">打开文件夹</a-button>
        <a-button>导入结果</a-button>
      </a-space>
    </header>

    <main class="page-section">
      <div class="page-card">
        <div class="section-header">
          <h2>项目书架</h2>
          <span class="section-tip">当前先用假数据承接页面开发</span>
        </div>

        <div class="project-grid">
          <article class="project-tile project-tile-add">
            <div class="project-tile-mark">+</div>
            <strong>新建项目</strong>
            <span>从图片文件夹创建项目</span>
          </article>

          <article
            v-for="project in projectStore.projects"
            :key="project.id"
            class="project-tile"
          >
            <div class="project-tile-top" @click="goReview(project.id)">
              <img class="project-cover" :src="getProjectCover(project.id, project.coverAssetId)" alt="" />
              <strong>{{ project.name }}</strong>
              <span>{{ project.assetCount }} 张图片</span>
              <span class="section-tip">最近打开：{{ formatDate(project.lastOpenedAt) }}</span>
            </div>
            <a-button danger @click.stop="removeProject(project.id)">从书架移除</a-button>
          </article>
        </div>
      </div>

      <div class="page-card">
        <div class="section-header">
          <h2>当前基线</h2>
          <span class="section-tip">先把结构定稳，再继续接真实数据</span>
        </div>
        <ul class="info-list">
          <li>已接入 `Vue Router`，4 个核心页面路径已建立。</li>
          <li>已建立 `Project / Asset / Review / Summary` 四个基础对象。</li>
          <li>已建立 `Pinia` 基础 store，可承接后续真实业务状态。</li>
        </ul>
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { message } from 'ant-design-vue'

import { useProjectStore } from '@renderer/app/store/project.store'
import { useAssetStore } from '@renderer/app/store/asset.store'
import { useReviewStore } from '@renderer/app/store/review.store'
import { toFileUrl } from '@renderer/app/utils/file'
import type { ReviewProjectSnapshot } from '@renderer/app/types/review'

const router = useRouter()
const projectStore = useProjectStore()
const assetStore = useAssetStore()
const reviewStore = useReviewStore()
const opening = ref(false)

function goReview(projectId: string): void {
  projectStore.selectProject(projectId)
  router.push({ name: 'review', params: { projectId } })
}

function formatDate(value?: string): string {
  if (!value) return '未打开'
  return new Date(value).toLocaleString('zh-CN')
}

async function openFolder(): Promise<void> {
  opening.value = true
  try {
    const snapshot = (await window.api.openProjectFolder()) as ReviewProjectSnapshot | null
    if (!snapshot) return
    projectStore.upsertProject(snapshot)
    assetStore.replaceBySnapshot(snapshot)
    reviewStore.replaceBySnapshot(snapshot)
    await router.push({ name: 'review', params: { projectId: snapshot.project.id } })
    message.success(`已导入项目：${snapshot.project.name}`)
  } catch (error) {
    console.error(error)
    message.error('打开文件夹失败，请稍后重试')
  } finally {
    opening.value = false
  }
}

function getProjectCover(projectId: string, coverAssetId?: string): string {
  const asset =
    assetStore.assets.find((item) => item.id === coverAssetId) ??
    assetStore.assets.find((item) => item.projectId === projectId)
  return toFileUrl(asset?.thumbnailPath || asset?.filePath)
}

async function removeProject(projectId: string): Promise<void> {
  try {
    await window.api.removeProjectSnapshot(projectId)
    projectStore.removeProject(projectId)
    assetStore.removeProjectAssets(projectId)
    reviewStore.removeProjectReviews(projectId)
    message.success('已从书架移除项目')
  } catch (error) {
    console.error(error)
    message.error('移除项目失败，请稍后重试')
  }
}
</script>
