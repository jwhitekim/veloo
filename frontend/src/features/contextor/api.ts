import { translate } from '@/shared/i18n'

const BASE = '/contextor'

export interface ContextCase {
  label: string
  term: string
  meaning: string
  exampleEn: string
  exampleKo: string
}

export interface ContextorResult {
  query: string
  hasMlUsage: boolean
  cases: ContextCase[]
  note?: string
}

export interface ContextorHistoryItem {
  id: number
  query: string
  result: ContextorResult
  created_at: string
}

export async function lookup(text: string): Promise<ContextorResult> {
  const res = await fetch(`${BASE}/api/lookup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.error ?? translate('contextor.errors.lookupFailed', { status: res.status }))
  }
  return res.json()
}

export async function getContextorCount(): Promise<number> {
  try {
    const res = await fetch(`${BASE}/api/history?count=true`)
    if (!res.ok) return 0
    const data = await res.json()
    return data.count ?? 0
  } catch {
    return 0
  }
}

export async function getContextorHistory(): Promise<ContextorHistoryItem[]> {
  try {
    const res = await fetch(`${BASE}/api/history`)
    if (!res.ok) return []
    const data = await res.json()
    return data.items ?? []
  } catch {
    return []
  }
}
