import type { CSSProperties } from 'react'

// TodoItem/FocusPanel이 공유하는 우선순위 배지 스타일 — 앱 전역 흑백 톤(--selected-bg 등)에 맞춤.
export const priorityStyle: Record<string, CSSProperties> = {
  urgent: { background: 'var(--selected-bg)', color: 'var(--selected-text)' },
  mid: { background: 'var(--bg-additive)', color: 'var(--text-primary)' },
  normal: { background: 'var(--bg-additive)', color: 'var(--text-secondary)' },
}

// 라벨은 언어별로 달라지므로 상수가 아니라 t()를 받아 만드는 함수로 제공.
export function priorityLabels(t: (key: string) => string): Record<string, string> {
  return {
    urgent: t('todo.priority.urgent'),
    mid: t('todo.priority.mid'),
    normal: t('todo.priority.normal'),
  }
}

// Calendar처럼 배지(배경+글자 쌍)가 아니라 점/텍스트/막대 하나로만 우선순위를
// 나타낼 때 쓰는 대표 스와치 색. priorityStyle과 별도로 두는 이유는 priorityStyle의
// mid(옅은 회색 배경)·normal(투명)이 단독 색상표시용으로 쓰면 거의 안 보이기 때문.
export const priorityAccent: Record<string, string> = {
  urgent: '#a32d2d',
  mid: '#854f0b',
  normal: 'var(--accent)',
}
