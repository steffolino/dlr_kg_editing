export type FeedbackCategory =
  | 'dataset-quality'
  | 'ui-ux'
  | 'workflow'
  | 'bug'
  | 'feature-request'
  | 'other'

export interface FeedbackEntry {
  id: string
  createdAt: string
  pagePath: string
  category: FeedbackCategory
  title: string
  message: string
  referenceId: string | null
  contact: string | null
}

const STORAGE_KEY = 'kg-feedback-entries'
const MAX_STORED_ENTRIES = 30

export function useFeedbackStore() {
  function loadFeedback(): FeedbackEntry[] {
    if (!process.client) return []
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return []
      return JSON.parse(raw) as FeedbackEntry[]
    } catch {
      return []
    }
  }

  function saveFeedback(entries: FeedbackEntry[]): void {
    if (!process.client) return
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_STORED_ENTRIES)))
  }

  function addFeedback(entry: FeedbackEntry): FeedbackEntry[] {
    const next = [entry, ...loadFeedback()].slice(0, MAX_STORED_ENTRIES)
    saveFeedback(next)
    return next
  }

  function clearFeedback(): void {
    if (!process.client) return
    localStorage.removeItem(STORAGE_KEY)
  }

  function categoryLabel(value: FeedbackCategory): string {
    const labels: Record<FeedbackCategory, string> = {
      'dataset-quality': 'Dataset quality',
      'ui-ux': 'UI / UX',
      'workflow': 'Workflow',
      'bug': 'Bug',
      'feature-request': 'Feature request',
      'other': 'Other'
    }
    return labels[value]
  }

  return {
    loadFeedback,
    addFeedback,
    clearFeedback,
    categoryLabel
  }
}
