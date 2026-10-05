import { useState, useCallback, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ListTodo } from 'lucide-react'
import dayjs from 'dayjs'
import 'dayjs/locale/ko'
import 'dayjs/locale/en'
import 'dayjs/locale/zh-cn'
import type { NavFilter, Priority, Todo } from '@/shared/types'
import { useTodos } from './hooks/useTodos'
import { useAi } from './hooks/useAi'
import { useIsMobile } from '@/shared/hooks/useIsMobile'
import { useT, useLanguage } from '@/shared/i18n'
import TodoList from './TodoList'
import FocusPanel from './FocusPanel'
import PageHeader from '@/shared/components/PageHeader'
import * as api from '@/shared/api/client'
import './Todo.css'

// dayjs 'LL' 같은 로케일 포맷에 쓰는 태그. i18n의 BCP-47 태그(ko-KR 등)와는
// 형식이 달라 별도로 매핑한다.
const DAYJS_LOCALE: Record<string, string> = { ko: 'ko', en: 'en', zh: 'zh-cn' }

// 데스크톱 전역 워크스페이스 사이드바(Tasks/Calendar/... 네비게이션)와 별개로
// 이 페이지만의 두 번째 사이드바를 두지 않기 위해, 진행률 요약은 세로 aside가
// 아니라 본문 상단의 가로 요약 바로 배치한다 (Navigation | Status Sidebar | Content
// 3단 구조를 피하기 위함 — WorkspaceLayout의 좌측 사이드바가 이미 Navigation을 담당).
function TodoSummaryBar({ todos, filter }: { todos: Todo[]; filter: NavFilter }) {
  const t = useT()
  const active = todos.filter((todo) => !todo.done)
  const urgent = active.filter((todo) => todo.priority === 'urgent')
  const completed = todos.filter((todo) => todo.done).length
  const completionRate = todos.length ? Math.round((completed / todos.length) * 100) : 0

  return (
    <div className="todo-summary-bar">
      <div className="todo-summary-bar-progress">
        <strong>{t(`todo.summary.${filter}`)}</strong>
        <div className="todo-summary-progress" aria-label={`${t('todo.overview.completionRate')} ${completionRate}%`}>
          <span style={{ width: `${completionRate}%` }} />
        </div>
        <small>
          {completed} / {todos.length} {t('todo.summary.complete')}
        </small>
      </div>
      <div className="todo-summary-bar-stats">
        <div className="todo-summary-stat">
          <span>{t('todo.overview.inProgress')}</span>
          <b>{active.length}</b>
        </div>
        <div className="todo-summary-stat">
          <span>{t('todo.overview.urgentItems')}</span>
          <b>{urgent.length}</b>
        </div>
      </div>
    </div>
  )
}

export default function TodoPage() {
  const t = useT()
  const { language } = useLanguage()
  dayjs.locale(DAYJS_LOCALE[language])
  const isMobile = useIsMobile()
  const navigate = useNavigate()
  const { username = '', taskId } = useParams()
  const [filter, setFilter] = useState<NavFilter>('all')
  const selectedId = taskId ? Number(taskId) : null

  const { todos, loading, reload, addTodo, editTodo, removeTodo, toggleDone, toastError, clearToastError } =
    useTodos(filter)

  useEffect(() => {
    if (!toastError) return
    const t = setTimeout(clearToastError, 3000)
    return () => clearTimeout(t)
  }, [toastError, clearToastError])
  const { generateSteps, generatingSteps } = useAi()

  // handleAdd의 스텝 생성 폴링(아래) 타이머 — 언마운트 시 정리하기 위해 ref로 들고 있는다.
  const pollTimersRef = useRef<{ interval?: ReturnType<typeof setInterval>; timeout?: ReturnType<typeof setTimeout> }>(
    {},
  )
  useEffect(() => {
    const pollTimers = pollTimersRef.current
    return () => {
      if (pollTimers.interval) clearInterval(pollTimers.interval)
      if (pollTimers.timeout) clearTimeout(pollTimers.timeout)
    }
  }, [])

  const selectedTodo = todos.find((t) => t.id === selectedId) ?? null

  // 목록↔상세 전환은 라우트 이동이다 (/:username/tasks ↔ /:username/tasks/:taskId).
  // 브라우저 back/forward, 새로고침, 딥링크, 스와이프 뒤로가기 모두 라우터가 기본으로
  // 처리해주므로 예전처럼 pushState/popstate를 직접 다룰 필요가 없다.
  const openTodo = useCallback(
    (id: number) => {
      navigate(`/${username}/tasks/${id}`)
    },
    [navigate, username],
  )

  const closeTodo = useCallback(() => {
    navigate(`/${username}/tasks`)
  }, [navigate, username])

  const handleAdd = async (data: { name: string; memo: string; priority: Priority; deadline: string }) => {
    const todo = await addTodo(data)
    openTodo(todo.id)
    await reload()
    // 백그라운드에서 AI 단계 생성 요청 후 steps 생길 때까지 폴링
    api
      .generateStepsAsync({
        todo_id: todo.id,
        todo_name: todo.name,
        memo: todo.memo,
        priority: todo.priority,
        deadline: todo.deadline,
      })
      .catch(() => {})
    const poll = setInterval(async () => {
      const updated = await api.getTodos()
      const t = updated.find((t: { id: number }) => t.id === todo.id)
      if (t && Array.isArray(t.steps) && t.steps.length > 0) {
        clearInterval(poll)
        await reload()
      }
    }, 3000)
    pollTimersRef.current.interval = poll
    pollTimersRef.current.timeout = setTimeout(() => clearInterval(poll), 60_000) // 1분 후 자동 중단
  }

  const handleToggleStep = useCallback(
    async (stepId: number) => {
      await api.toggleStepDone(stepId)
      await reload()
    },
    [reload],
  )

  const handleAddStep = useCallback(
    async (todoId: number, text: string, orderIndex = 999) => {
      await api.addStep(todoId, { text, order_index: orderIndex })
      await reload()
    },
    [reload],
  )

  const handleDeleteStep = useCallback(
    async (stepId: number) => {
      await api.deleteStep(stepId)
      await reload()
    },
    [reload],
  )

  const handleGenerateSteps = useCallback(async (todo: Todo) => generateSteps(todo), [generateSteps])

  const handleUpdate = useCallback(
    async (id: number, data: Partial<Todo>) => {
      await editTodo(id, data)
    },
    [editTodo],
  )

  const handleDelete = useCallback(
    async (id: number) => {
      await removeTodo(id)
      closeTodo()
    },
    [removeTodo, closeTodo],
  )

  const handleToggleDone = useCallback(
    async (id: number) => {
      await toggleDone(id)
    },
    [toggleDone],
  )

  const focusPanelProps = {
    todos,
    onUpdate: handleUpdate,
    onDelete: handleDelete,
    onToggleStep: handleToggleStep,
    onAddStep: handleAddStep,
    onDeleteStep: handleDeleteStep,
    onGenerateSteps: handleGenerateSteps,
    generatingSteps,
  }

  const toast = toastError ? (
    <div className="todo-error-toast" role="status">
      {toastError}
    </div>
  ) : null

  if (isMobile) {
    return (
      <>
        {selectedId !== null ? (
          <div className="flex flex-col h-full overflow-hidden" style={{ background: 'var(--bg-base)' }}>
            {loading && !selectedTodo ? (
              <div className="flex-1 flex items-center justify-center">
                <span style={{ fontSize: 'var(--fs-body)', color: 'var(--text-secondary)' }}>{t('todo.loading')}</span>
              </div>
            ) : (
              <FocusPanel todo={selectedTodo} {...focusPanelProps} onBack={closeTodo} />
            )}
          </div>
        ) : (
          <TodoList
            todos={todos}
            filter={filter}
            onFilter={setFilter}
            selectedId={selectedId}
            onSelect={openTodo}
            onToggle={handleToggleDone}
            onAdd={handleAdd}
          />
        )}
        {toast}
      </>
    )
  }

  return (
    <>
      <div className="todo-desktop-frame">
        <main className="todo-desktop-content">
          {loading && todos.length === 0 ? (
            <div className="todo-desktop-loading">
              <span>{t('todo.loading')}</span>
            </div>
          ) : selectedTodo ? (
            <FocusPanel todo={selectedTodo} {...focusPanelProps} onBack={closeTodo} />
          ) : (
            <>
              <div className="app-page-intro-shell app-page-intro-shell--workspace todo-page-intro">
                <PageHeader
                  kicker={t('todo.kicker')}
                  icon={<ListTodo />}
                  title={t('todo.overview.heroTitle')}
                  description={t('todo.overview.heroDescription')}
                />
              </div>
              <TodoSummaryBar todos={todos} filter={filter} />
              <TodoList
                todos={todos}
                filter={filter}
                onFilter={setFilter}
                selectedId={selectedId}
                onSelect={openTodo}
                onToggle={handleToggleDone}
                onAdd={handleAdd}
              />
            </>
          )}
        </main>
      </div>
      {toast}
    </>
  )
}
