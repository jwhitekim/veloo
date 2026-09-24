import type { ComponentType, SVGProps } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Braces, CalendarDays, FileSearch, Languages, ListTodo, Network } from 'lucide-react'
// 모바일 하단 독 5개 아이콘 전용 — lucide는 순수 스트로크(선형) 아이콘 세트라 "선택 시 면형으로
// 바뀌는" 요구를 못 채워서(2026-09-06), outline/solid 쌍을 모두 제공하는 heroicons를 이 5개
// 아이콘에 한해 추가로 쓴다. 데스크톱 사이드바(WORKSPACE_NAV)는 기존 lucide 그대로 유지.
import {
  Squares2X2Icon,
  DocumentMagnifyingGlassIcon,
  GlobeAltIcon,
  CpuChipIcon,
  LightBulbIcon,
} from '@heroicons/react/24/outline'
import {
  Squares2X2Icon as Squares2X2IconSolid,
  DocumentMagnifyingGlassIcon as DocumentMagnifyingGlassIconSolid,
  CpuChipIcon as CpuChipIconSolid,
  LightBulbIcon as LightBulbIconSolid,
} from '@heroicons/react/24/solid'
// GlobeAltIcon의 solid 버전은 그물눈처럼 작은 조각을 이어붙인 모자이크 구조라, 20px 크기에서는
// 조각 사이 틈(선)이 안티앨리어싱으로 뭉개져 그냥 민짜 원처럼 보인다("선택하면 오히려 밋밋해짐"
// — 다른 아이콘과 정반대 효과, 2026-09-06 피드백). 이 아이콘만 solid로 안 바꾸고 outline을
// 그대로 쓰되, CSS(`.shell-mobile-tab.is-active svg`)로 선만 굵게 해서 "선택됨"을 표현한다.

type HeroIcon = ComponentType<SVGProps<SVGSVGElement>>

// Primary Navigation — 서로 독립적인 제품 영역. Desktop Sidebar와 Mobile Capsule
// Navigation이 이 하나의 정보 구조를 공유한다 (route는 항상 같고, 표현 방식만 다름).
export type NavKey = 'tasks' | 'calendar' | 'papers' | 'translate' | 'models' | 'concepts'
export type NavGroupKey = 'work' | 'research' | 'knowledge'

export interface NavItem {
  key: NavKey
  path: string // /:username/ 기준 상대 경로
  labelKey: string // i18n 키 (shell.nav.*)
  Icon: LucideIcon
}

export interface NavGroup {
  group: NavGroupKey
  labelKey: string
  items: NavItem[]
}

export const WORKSPACE_NAV: NavGroup[] = [
  {
    group: 'work',
    labelKey: 'shell.navGroup.work',
    items: [
      { key: 'tasks', path: 'tasks', labelKey: 'shell.nav.todo', Icon: ListTodo },
      { key: 'calendar', path: 'calendar', labelKey: 'shell.nav.calendar', Icon: CalendarDays },
    ],
  },
  {
    group: 'research',
    labelKey: 'shell.navGroup.research',
    items: [
      { key: 'papers', path: 'papers', labelKey: 'shell.nav.paper', Icon: FileSearch },
      { key: 'translate', path: 'translate', labelKey: 'shell.nav.translate', Icon: Languages },
    ],
  },
  {
    group: 'knowledge',
    labelKey: 'shell.navGroup.knowledge',
    items: [
      { key: 'models', path: 'models', labelKey: 'shell.nav.model-review', Icon: Network },
      { key: 'concepts', path: 'concepts', labelKey: 'shell.nav.contextor', Icon: Braces },
    ],
  },
]

export const WORKSPACE_NAV_ITEMS: NavItem[] = WORKSPACE_NAV.flatMap((group) => group.items)

// Mobile Capsule Navigation은 화면이 좁아 Tasks/Calendar를 "Plan" 하나로 합친다.
// (모바일에서 하단 독 슬롯이 5개까지가 자연스럽다는 기존 결정 — docs/ios-capsule-navigation.md)
export type MobilePrimaryKey = 'plan' | 'papers' | 'translate' | 'models' | 'concepts'

export const MOBILE_NAV: { key: MobilePrimaryKey; labelKey: string; Icon: HeroIcon; IconSolid: HeroIcon }[] = [
  { key: 'plan', labelKey: 'shell.workspaceMobile.plan', Icon: Squares2X2Icon, IconSolid: Squares2X2IconSolid },
  {
    key: 'papers',
    labelKey: 'shell.navMobile.paper',
    Icon: DocumentMagnifyingGlassIcon,
    IconSolid: DocumentMagnifyingGlassIconSolid,
  },
  { key: 'translate', labelKey: 'shell.navMobile.translate', Icon: GlobeAltIcon, IconSolid: GlobeAltIcon },
  { key: 'models', labelKey: 'shell.navMobile.model-review', Icon: CpuChipIcon, IconSolid: CpuChipIconSolid },
  { key: 'concepts', labelKey: 'shell.navMobile.contextor', Icon: LightBulbIcon, IconSolid: LightBulbIconSolid },
]

export function mobilePrimaryFor(navKey: NavKey): MobilePrimaryKey {
  return navKey === 'tasks' || navKey === 'calendar' ? 'plan' : navKey
}

// 'plan' 탭이 tasks/calendar 중 어디로 갈지는 마지막 방문지를 기억한다 (기존 동작 유지).
export const LAST_PLAN_KEY = 'veloo:last-plan-app'

export function loadLastPlanNav(): 'tasks' | 'calendar' {
  return localStorage.getItem(LAST_PLAN_KEY) === 'calendar' ? 'calendar' : 'tasks'
}

export function saveLastPlanNav(key: 'tasks' | 'calendar') {
  localStorage.setItem(LAST_PLAN_KEY, key)
}
