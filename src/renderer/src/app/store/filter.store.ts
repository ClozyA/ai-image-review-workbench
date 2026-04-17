import { ref } from 'vue'
import { defineStore } from 'pinia'

import { DEFAULT_FILTER } from '@renderer/app/constants/review'
import type { ReviewFilter } from '@renderer/app/types/review'

export const useFilterStore = defineStore('filter', () => {
  const filter = ref<ReviewFilter>({ ...DEFAULT_FILTER })

  function toggleDecision(decision: ReviewFilter['decisions'][number]): void {
    if (filter.value.decisions.includes(decision)) {
      filter.value.decisions = filter.value.decisions.filter((item) => item !== decision)
      return
    }
    filter.value.decisions = [...filter.value.decisions, decision]
  }

  function toggleCategory(category: ReviewFilter['categories'][number]): void {
    if (filter.value.categories.includes(category)) {
      filter.value.categories = filter.value.categories.filter((item) => item !== category)
      return
    }
    filter.value.categories = [...filter.value.categories, category]
  }

  function setHasComment(value?: boolean): void {
    filter.value.hasComment = value
  }

  function setKeyword(keyword: string): void {
    filter.value.keyword = keyword
  }

  function replaceFilter(nextFilter: ReviewFilter): void {
    filter.value = {
      decisions: [...nextFilter.decisions],
      categories: [...nextFilter.categories],
      hasComment: nextFilter.hasComment,
      keyword: nextFilter.keyword
    }
  }

  function reset(): void {
    filter.value = { ...DEFAULT_FILTER }
  }

  return {
    filter,
    toggleDecision,
    toggleCategory,
    setHasComment,
    setKeyword,
    replaceFilter,
    reset
  }
})
