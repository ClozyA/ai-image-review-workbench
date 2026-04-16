<template>
  <router-view />
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

import { useAssetStore } from '@renderer/app/store/asset.store'
import { useProjectStore } from '@renderer/app/store/project.store'
import { useReviewStore } from '@renderer/app/store/review.store'
import type { ReviewProjectSnapshot } from '@renderer/app/types/review'

const projectStore = useProjectStore()
const assetStore = useAssetStore()
const reviewStore = useReviewStore()

onMounted(async () => {
  try {
    const snapshots = (await window.api.listProjectSnapshots()) as ReviewProjectSnapshot[]
    if (!snapshots.length) return
    projectStore.replaceBySnapshots(snapshots)
    assetStore.replaceBySnapshots(snapshots)
    reviewStore.replaceBySnapshots(snapshots)
  } catch (error) {
    console.error('加载本地项目失败', error)
  }
})
</script>
