import { translate } from '@/shared/i18n'

const BASE = '/model-review'

export interface ExplanationModule {
  name: string
  role: string
  operation: string
}

export interface ExplanationFlowStep {
  step: number
  description: string
}

export interface ExplanationJSON {
  overview: string
  modules: ExplanationModule[]
  data_flow: ExplanationFlowStep[]
  contribution: string
}

export interface FeedbackJSON {
  correct: string[]
  missing: string[]
  incorrect: string[]
  suggestion: string
}

export interface ArchHistoryItem {
  id: number
  image_name: string | null
  explanation: ExplanationJSON
  created_at: string
}

export async function explain(image: File): Promise<{ explanation: ExplanationJSON; history_id: number | null }> {
  const fd = new FormData()
  fd.append('image', image)
  const res = await fetch(`${BASE}/api/explain`, { method: 'POST', body: fd })
  if (!res.ok) throw new Error(translate('reviewer.errors.explainFailed', { status: res.status }))
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

export async function feedback(
  aiExplanation: ExplanationJSON,
  userExplanation: string,
  historyId?: number | null,
): Promise<{ feedback: FeedbackJSON }> {
  const res = await fetch(`${BASE}/api/feedback`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ai_explanation: aiExplanation,
      user_explanation: userExplanation,
      history_id: historyId ?? null,
    }),
  })
  if (!res.ok) throw new Error(translate('reviewer.errors.feedbackFailed', { status: res.status }))
  const data = await res.json()
  if (data.error) throw new Error(data.error)
  return data
}

export async function getArchCount(): Promise<number> {
  try {
    const res = await fetch(`${BASE}/api/history?count=true`)
    if (!res.ok) return 0
    const data = await res.json()
    return data.count ?? 0
  } catch {
    return 0
  }
}

export async function getArchHistory(): Promise<ArchHistoryItem[]> {
  try {
    const res = await fetch(`${BASE}/api/history`)
    if (!res.ok) return []
    const data = await res.json()
    return data.items ?? []
  } catch {
    return []
  }
}
