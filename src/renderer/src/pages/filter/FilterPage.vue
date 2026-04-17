<template>
  <div class="app-layout">
    <header class="app-header">
      <div>
        <h1 class="page-title">结果筛选</h1>
      </div>
      <a-space>
        <a-button @click="goHome">返回首页</a-button>
        <a-button @click="goReview">返回审核页</a-button>
        <a-button @click="goResult">结果页</a-button>
      </a-space>
    </header>

    <main class="page-section filter-page-grid">
      <section class="page-card project-context-card filter-page-span">
        <div class="section-header">
          <h2>当前项目</h2>
        </div>
        <div class="project-context-grid">
          <div class="meta-card">
            <span>项目名称</span>
            <strong class="meta-file-name" :title="currentProject?.name ?? '-'">
              {{ currentProject?.name ?? '未选择项目' }}
            </strong>
          </div>
          <div class="meta-card">
            <span>图片数量</span>
            <strong>{{ currentProject?.assetCount ?? 0 }}</strong>
          </div>
        </div>
      </section>

      <section class="page-card filter-card filter-card-sidebar">
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

      <section class="page-card filter-card filter-card-results">
        <div class="section-header">
          <h2>筛选结果</h2>
          <a-space>
            <span class="section-tip">共 {{ filteredItems.length }} 张</span>
            <a-button size="small" :loading="exportingJson" @click="exportFilteredResults('json')">
              导出 JSON
            </a-button>
            <a-button size="small" :loading="exportingCsv" @click="exportFilteredResults('csv')">
              导出 CSV
            </a-button>
          </a-space>
        </div>

        <div
          v-if="filteredItems.length"
          ref="filterResultListRef"
          class="result-list filter-result-list"
          @scroll="handleFilterResultScroll"
        >
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
        <div v-else class="filter-empty-state">
          <strong>没有找到符合条件的图片</strong>
          <span>可以试试放宽结论、分类或备注条件，或者直接点“重置”恢复全部结果。</span>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch, watchEffect } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { message } from 'ant-design-vue'

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
import {
  buildExportItems,
  buildProjectExportPayload,
  buildProjectSnapshotForExport
} from '@renderer/app/utils/export'
import { toFileUrl } from '@renderer/app/utils/file'
import { persistProjectById } from '@renderer/app/utils/project-persist'
import type { ExportFormat } from '@renderer/app/types/export'
import type { AssetViewModel } from '@renderer/app/types/review'

const route = useRoute()
const router = useRouter()
const projectStore = useProjectStore()
const assetStore = useAssetStore()
const reviewStore = useReviewStore()
const filterStore = useFilterStore()
const exportingJson = ref(false)
const exportingCsv = ref(false)
const filterResultListRef = ref<HTMLElement | null>(null)
let filterScrollSaveTimer: ReturnType<typeof setTimeout> | undefined

const filter = computed(() => filterStore.filter)
const currentProject = computed(() => projectStore.currentProject)

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

watch(
  () => projectStore.currentProjectId,
  async (projectId) => {
    if (!projectId) return
    projectStore.updateUiState(projectId, { lastRoute: 'filter' })
    const savedFilter = projectStore.currentUiState.filter
    if (savedFilter) {
      filterStore.replaceFilter(savedFilter)
    } else {
      filterStore.reset()
    }
    await nextTick()
    if (filterResultListRef.value) {
      filterResultListRef.value.scrollTop = projectStore.currentUiState.filterResultScrollTop ?? 0
    }
    void persistProjectById(projectId, projectStore, assetStore, reviewStore)
  },
  { immediate: true }
)

watch(
  () => filter.value,
  (nextFilter) => {
    if (!projectStore.currentProjectId) return
    projectStore.updateUiState(projectStore.currentProjectId, {
      lastRoute: 'filter',
      filter: {
        decisions: [...nextFilter.decisions],
        categories: [...nextFilter.categories],
        hasComment: nextFilter.hasComment,
        keyword: nextFilter.keyword
      }
    })
    void persistProjectById(projectStore.currentProjectId, projectStore, assetStore, reviewStore)
  },
  { deep: true }
)

function goReview(): void {
  if (projectStore.currentProjectId) {
    projectStore.updateUiState(projectStore.currentProjectId, { lastRoute: 'review' })
    void persistProjectById(projectStore.currentProjectId, projectStore, assetStore, reviewStore)
  }
  router.push({ name: 'review', params: { projectId: projectStore.currentProjectId } })
}

function goHome(): void {
  router.push({ name: 'home' })
}

function goResult(): void {
  if (projectStore.currentProjectId) {
    projectStore.updateUiState(projectStore.currentProjectId, { lastRoute: 'result' })
    void persistProjectById(projectStore.currentProjectId, projectStore, assetStore, reviewStore)
  }
  router.push({ name: 'result', params: { projectId: projectStore.currentProjectId } })
}

function getThumbnailSrc(thumbnailPath?: string, filePath?: string): string {
  return toFileUrl(thumbnailPath || filePath)
}

async function exportFilteredResults(format: ExportFormat): Promise<void> {
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
    const items = buildExportItems(
      snapshot,
      filteredItems.value.map((item) => item.asset.id)
    )
    const payload = buildProjectExportPayload(snapshot, 'filtered', items, {
      filterDescription: buildFilterDescription(),
      summary: {
        filteredCount: items.length
      }
    })

    const result = await window.api.exportProjectResults(payload, format)
    if (result.canceled) return
    message.success(`已导出筛选结果：${result.filePath}`)
  } catch (error) {
    console.error(error)
    message.error('导出筛选结果失败，请稍后重试')
  } finally {
    loadingRef.value = false
  }
}

function buildFilterDescription(): string {
  const parts: string[] = []

  if (filter.value.decisions.length) {
    parts.push(
      `结论：${filter.value.decisions.map((value) => REVIEW_DECISION_TEXT[value]).join('、')}`
    )
  }
  if (filter.value.categories.length) {
    parts.push(
      `分类：${filter.value.categories.map((value) => ASSET_CATEGORY_TEXT[value]).join('、')}`
    )
  }
  if (filter.value.hasComment === true) {
    parts.push('备注：仅看有备注')
  }
  if (filter.value.hasComment === false) {
    parts.push('备注：仅看无备注')
  }
  if (filter.value.keyword.trim()) {
    parts.push(`关键词：${filter.value.keyword.trim()}`)
  }

  return parts.join('；') || '全部结果'
}

function handleFilterResultScroll(event: Event): void {
  const target = event.target as HTMLElement | null
  if (!target || !projectStore.currentProjectId) return

  projectStore.updateUiState(projectStore.currentProjectId, {
    lastRoute: 'filter',
    filterResultScrollTop: target.scrollTop
  })

  if (filterScrollSaveTimer) {
    clearTimeout(filterScrollSaveTimer)
  }

  filterScrollSaveTimer = setTimeout(() => {
    void persistProjectById(projectStore.currentProjectId, projectStore, assetStore, reviewStore)
  }, 180)
}
</script>
