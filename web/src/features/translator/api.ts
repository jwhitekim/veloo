import { translate } from '@/shared/i18n'

const BASE = '/translate'

export interface DictDefinition {
  pos: string
  level: string
  value: string
  exampleOri?: string
  exampleTrans?: string
}

export interface DictExample {
  pos: string
  ori: string
  trans: string
}

export interface DictResult {
  query: string
  phonetic?: string
  audioUrl?: string
  definitions?: DictDefinition[]
  examples?: DictExample[]
  synonyms?: string[]
}

export async function naverDict(query: string): Promise<DictResult> {
  const res = await fetch(`${BASE}/api/naver-dict?query=${encodeURIComponent(query)}`)
  if (!res.ok) throw new Error(translate('translator.errors.dictionaryFailed'))
  return res.json()
}

export interface TranslationHistoryItem {
  id: number
  source_text: string
  translated_text: string
  type: 'sentence'
  created_at: string
}

export async function getTranslationCount(): Promise<number> {
  try {
    const res = await fetch(`${BASE}/api/history?count=true`)
    if (!res.ok) return 0
    const data = await res.json()
    return data.count ?? 0
  } catch {
    return 0
  }
}

export async function getTranslationHistory(): Promise<TranslationHistoryItem[]> {
  try {
    const res = await fetch(`${BASE}/api/history`)
    if (!res.ok) return []
    const data = await res.json()
    return data.items ?? []
  } catch {
    return []
  }
}
