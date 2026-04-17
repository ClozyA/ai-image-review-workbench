<template>
  <div class="app-layout">
    <header class="app-header">
      <div>
        <h1 class="page-title">AI 图片筛选与评审工作台</h1>
      </div>
      <a-space>
        <a-button type="primary" :loading="opening" @click="openFolder">打开文件夹</a-button>
        <a-button :loading="importingBackup" @click="importLocalBackup">导入本地备份</a-button>
        <a-button :loading="importing" @click="importProjectBundle">导入完整项目</a-button>
      </a-space>
    </header>

    <main class="page-section">
      <section class="page-card home-shelf-card">
        <div class="section-header">
          <h2>项目书架</h2>
          <span class="section-tip">点击项目进入审核，书架内容可滚动</span>
        </div>

        <div class="project-shelf-scroll">
          <div class="project-grid">
            <article class="project-tile project-tile-add" @click="openFolder">
              <div class="project-tile-mark">+</div>
              <strong>打开文件夹</strong>
              <span>从图片文件夹创建项目</span>
            </article>

            <article
              v-for="project in projectStore.projects"
              :key="project.id"
              class="project-tile"
            >
              <div class="project-tile-top" @click="goReview(project.id)">
                <img
                  class="project-cover"
                  :src="getProjectCover(project.id, project.coverAssetId)"
                  alt=""
                  loading="lazy"
                />
                <strong>{{ project.name }}</strong>
                <span>{{ project.assetCount }} 张图片</span>
                <span class="section-tip">最近打开：{{ formatDate(project.lastOpenedAt) }}</span>
              </div>
              <a-space wrap>
                <a-button @click.stop="renameProject(project.id)">重命名项目</a-button>
                <a-button danger @click.stop="removeProject(project.id)">从书架移除</a-button>
              </a-space>
            </article>
          </div>
        </div>
      </section>
    </main>
  </div>
  <a-modal
    v-model:open="renameModalOpen"
    title="重命名项目"
    ok-text="确定"
    cancel-text="取消"
    @ok="handleRenameConfirm"
    @cancel="handleRenameCancel"
  >
    <a-input
      v-model:value="renameInput"
      placeholder="请输入新的项目名称"
      :maxlength="100"
      @pressEnter="handleRenameConfirm"
    />
  </a-modal>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { message, Modal } from 'ant-design-vue'

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
const importingBackup = ref(false)
const importing = ref(false)

const renameModalOpen = ref(false)
const renameInput = ref('')
const renamingProjectId = ref<string | null>(null)

function goReview(projectId: string): void {
  projectStore.selectProject(projectId)
  router.push({ name: 'review', params: { projectId } })
}

function formatDate(value?: string): string {
  if (!value) return '未打开'
  return new Date(value).toLocaleString('zh-CN')
}

function isNoImagesFoundError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('NO_IMAGES_FOUND')
  }
  if (typeof error === 'string') {
    return error.includes('NO_IMAGES_FOUND')
  }
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    return typeof message === 'string' && message.includes('NO_IMAGES_FOUND')
  }
  return false
}

function isImportManifestNotFoundError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('IMPORT_MANIFEST_NOT_FOUND')
  }
  return false
}

function isImportManifestInvalidError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('IMPORT_MANIFEST_INVALID')
  }
  return false
}

function isImportBackupInvalidError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('IMPORT_BACKUP_INVALID')
  }
  return false
}

function isImportBackupNoLocalAssetsError(error: unknown): boolean {
  if (error instanceof Error) {
    return error.message.includes('IMPORT_BACKUP_NO_LOCAL_ASSETS')
  }
  return false
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
    if (isNoImagesFoundError(error)) {
      Modal.error({
        title: '文件夹中没有可用图片',
        content: '请选择包含 jpg、jpeg、png、webp、bmp 或 gif 图片的文件夹。'
      })
      return
    }
    message.error('打开文件夹失败，请稍后重试')
  } finally {
    opening.value = false
  }
}

async function importProjectBundle(): Promise<void> {
  importing.value = true
  try {
    const snapshot = (await window.api.importFullProjectBundle()) as ReviewProjectSnapshot | null
    if (!snapshot) return
    projectStore.upsertProject(snapshot)
    assetStore.replaceBySnapshot(snapshot)
    reviewStore.replaceBySnapshot(snapshot)
    await router.push({ name: 'review', params: { projectId: snapshot.project.id } })
    message.success(`已导入完整项目：${snapshot.project.name}`)
  } catch (error) {
    console.error(error)
    if (isImportManifestNotFoundError(error)) {
      Modal.error({
        title: '没有找到完整项目清单',
        content: '请选择包含 project-manifest.json 的完整项目导出目录。'
      })
      return
    }
    if (isImportManifestInvalidError(error)) {
      Modal.error({
        title: '完整项目清单无效',
        content: '当前目录中的 project-manifest.json 无法识别，请确认它来自本工具的完整项目导出。'
      })
      return
    }
    message.error('导入完整项目失败，请稍后重试')
  } finally {
    importing.value = false
  }
}

async function importLocalBackup(): Promise<void> {
  importingBackup.value = true
  try {
    const snapshot = (await window.api.importLocalBackup()) as ReviewProjectSnapshot | null
    if (!snapshot) return
    projectStore.upsertProject(snapshot)
    assetStore.replaceBySnapshot(snapshot)
    reviewStore.replaceBySnapshot(snapshot)
    await router.push({ name: 'review', params: { projectId: snapshot.project.id } })
    message.success(`已导入本地备份：${snapshot.project.name}`)
  } catch (error) {
    console.error(error)
    if (isImportBackupInvalidError(error)) {
      Modal.error({
        title: '本地备份文件无效',
        content: '请选择本工具导出的 JSON 备份文件。'
      })
      return
    }
    if (isImportBackupNoLocalAssetsError(error)) {
      Modal.error({
        title: '没有找到可恢复的本地图片',
        content: '这个 JSON 备份里记录的图片路径在当前电脑上不可用，所以无法恢复项目。'
      })
      return
    }
    message.error('导入本地备份失败，请稍后重试')
  } finally {
    importingBackup.value = false
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
    await new Promise<void>((resolve, reject) => {
      Modal.confirm({
        title: '确认从书架移除项目？',
        content: '这会移除本地书架记录，但不会删除原始图片文件夹。',
        okText: '移除',
        okButtonProps: { danger: true },
        cancelText: '取消',
        onOk: () => resolve(),
        onCancel: () => reject(new Error('CANCEL_REMOVE_PROJECT'))
      })
    })

    await window.api.removeProjectSnapshot(projectId)
    projectStore.removeProject(projectId)
    assetStore.removeProjectAssets(projectId)
    reviewStore.removeProjectReviews(projectId)
    message.success('已从书架移除项目')
  } catch (error) {
    if (error instanceof Error && error.message === 'CANCEL_REMOVE_PROJECT') {
      return
    }
    console.error(error)
    message.error('移除项目失败，请稍后重试')
  }
}

function renameProject(projectId: string): void {
  const project = projectStore.projects.find((item) => item.id === projectId)
  if (!project) return

  renamingProjectId.value = projectId
  renameInput.value = project.name
  renameModalOpen.value = true
}

async function handleRenameConfirm(): Promise<void> {
  const projectId = renamingProjectId.value
  if (!projectId) return

  const project = projectStore.projects.find((item) => item.id === projectId)
  if (!project) {
    renameModalOpen.value = false
    renamingProjectId.value = null
    renameInput.value = ''
    return
  }

  const nextName = renameInput.value.trim()
  if (!nextName) {
    message.warning('项目名称不能为空')
    return
  }

  if (nextName === project.name) {
    renameModalOpen.value = false
    renamingProjectId.value = null
    renameInput.value = ''
    return
  }

  try {
    project.name = nextName
    project.updatedAt = new Date().toISOString()

    // Electron IPC uses structured clone, so send plain objects instead of Vue proxies.
    const assets = assetStore.assets
      .filter((asset) => asset.projectId === projectId)
      .map((asset) => ({ ...asset }))
    const reviews = reviewStore.reviews
      .filter((review) => review.projectId === projectId)
      .map((review) => ({ ...review }))

    await window.api.saveProjectSnapshot({
      project: {
        ...project,
        assetCount: assets.length,
        lastOpenedAt: new Date().toISOString()
      },
      assets,
      reviews
    })

    message.success('项目名称已更新')
    renameModalOpen.value = false
    renamingProjectId.value = null
    renameInput.value = ''
  } catch (error) {
    console.error(error)
    message.error('重命名项目失败，请稍后重试')
  }
}

function handleRenameCancel(): void {
  renameModalOpen.value = false
  renamingProjectId.value = null
  renameInput.value = ''
}
</script>
