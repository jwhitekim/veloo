import type { NavFilter } from '@/shared/types'

// 필터 목록의 단일 소스. 값이 그대로 i18n 키 뒤에 붙어 쓰이므로
// (`todo.filters.${key}`, `todo.summary.${key}`), 필터를 추가/변경할 때
// 이 배열과 각 언어의 `todo.filters.*`/`todo.summary.*` 키만 맞추면 된다.
export const NAV_FILTERS: readonly NavFilter[] = ['today', 'week', 'all', 'memo']
