export type Priority = 'urgent' | 'mid' | 'normal'

export interface Step {
  id: number
  todo_id: number
  text: string
  done: boolean
  order_index: number
}

export interface Todo {
  id: number
  name: string
  memo: string
  priority: Priority
  deadline: string
  done: boolean
  // 백엔드는 계속 채워서 내려주지만(POST /api/ai/generate-strategy), 프론트엔드 AI 전략
  // UI를 제거(2026-09-01)한 뒤로 화면에서 읽는 곳은 없음 — API 응답 형태만 반영하는 필드.
  ai_strategy: string
  created_at: string
  updated_at: string
  steps: Step[]
  start_time?: string | null
  end_time?: string | null
  remind_at?: string | null
  reminded?: boolean
  completed_at?: string
}

export interface WeeklyReview {
  week_start: string
  week_end: string
  completed: number
  created: number
  completion_rate: number
  overdue: Todo[]
  by_priority: Record<string, { done: number; todo: number }>
}

export type NavFilter = 'today' | 'week' | 'all' | 'memo'
