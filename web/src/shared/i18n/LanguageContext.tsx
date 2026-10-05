import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import ko from './locales/ko.json'
import en from './locales/en.json'
import zh from './locales/zh.json'

export type Language = 'ko' | 'en' | 'zh'

// 새 언어 추가 시 여기와 locales/<lang>.json만 늘리면 됨.
export const LANGUAGES: { code: Language; label: string }[] = [
  { code: 'ko', label: '한국어' },
  { code: 'en', label: 'English' },
  { code: 'zh', label: '中文' },
]

// Date.toLocaleDateString() 등에 넘길 BCP-47 태그. 날짜/시간 표시를 언어에 맞추는 용도.
export const DATE_LOCALE_TAGS: Record<Language, string> = {
  ko: 'ko-KR',
  en: 'en-US',
  zh: 'zh-CN',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Dict = { [key: string]: any }

const DICTS: Record<Language, Dict> = { ko, en, zh }
const STORAGE_KEY = 'veloo-language'

function detectInitialLanguage(): Language {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored === 'ko' || stored === 'en' || stored === 'zh') return stored
  } catch {
    /* localStorage 접근 불가 (프라이빗 모드 등) — 기본값으로 폴백 */
  }
  return 'ko'
}

function lookup(dict: Dict, key: string): unknown {
  let node: unknown = dict
  for (const part of key.split('.')) {
    if (node == null || typeof node !== 'object') return undefined
    node = (node as Dict)[part]
  }
  return node
}

function resolve(lang: Language, key: string, params?: Record<string, string | number>): string {
  // 현재 언어 → ko(원본) 순으로 폴백. 그래도 없으면 key 자체를 보여줘 누락을 눈에 띄게 함.
  const value = lookup(DICTS[lang], key) ?? lookup(DICTS.ko, key) ?? key
  let text = typeof value === 'string' ? value : key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{\\{${k}\\}\\}`, 'g'), String(v))
    }
  }
  return text
}

/**
 * api.ts 같은 React 컴포넌트/훅 바깥의 일반 모듈에서 쓰는 번역 함수.
 * localStorage를 직접 읽으므로 리렌더에 반응하지 않음 — 네트워크 에러 메시지처럼
 * 요청 시점에 한 번만 평가되면 되는 문자열에 한정해서 사용할 것.
 */
export function translate(key: string, params?: Record<string, string | number>): string {
  return resolve(detectInitialLanguage(), key, params)
}

interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  /** key: "namespace.nested.key" 형태의 dot-path. params: {{name}} 플레이스홀더 치환값. */
  t: (key: string, params?: Record<string, string | number>) => string
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(detectInitialLanguage)

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      /* 조용히 무시 */
    }
  }, [])

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => resolve(language, key, params),
    [language],
  )

  const value = useMemo(() => ({ language, setLanguage, t }), [language, setLanguage, t])

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage는 LanguageProvider 안에서만 사용할 수 있습니다.')
  return ctx
}

/** t()만 필요한 컴포넌트를 위한 축약 훅. */
export function useT() {
  return useLanguage().t
}

/** toLocaleDateString/dayjs 등에 바로 넘길 수 있는 현재 언어의 BCP-47 태그. */
export function useDateLocale() {
  return DATE_LOCALE_TAGS[useLanguage().language]
}
