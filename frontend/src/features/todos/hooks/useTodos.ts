import { useState, useEffect, useCallback } from 'react'
import type { Todo, NavFilter } from '@/shared/types'
import * as api from '@/shared/api/client'
import { useT } from '@/shared/i18n'

export function useTodos(filter: NavFilter) {
  const t = useT()
  const [todos, setTodos] = useState<Todo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [toastError, setToastError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await api.getTodos(filter === 'all' ? undefined : filter)
      setTodos(data)
    } catch (e) {
      setError((e as Error).message)
      setTodos([])
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    load()
  }, [load])

  const refresh = (updated: Todo) => setTodos((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))

  const addTodo = async (data: { name: string; memo?: string; priority?: string; deadline?: string }) => {
    const todo = await api.createTodo(data)
    const normalized = { ...todo, steps: todo.steps ?? [] }
    setTodos((prev) => [normalized, ...prev])
    return normalized
  }

  const editTodo = async (id: number, data: Partial<Todo>) => {
    const updated = await api.updateTodo(id, data)
    refresh(updated)
    return updated
  }

  const removeTodo = async (id: number) => {
    await api.deleteTodo(id)
    setTodos((prev) => prev.filter((t) => t.id !== id))
  }

  const toggleDone = async (id: number) => {
    const original = todos.find((t) => t.id === id)
    if (!original) return
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)))
    try {
      const updated = await api.toggleTodoDone(id)
      refresh(updated)
      return updated
    } catch {
      setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: original.done } : t)))
      setToastError(t('todo.errors.toggleDoneFailed'))
    }
  }

  return {
    todos,
    loading,
    error,
    toastError,
    clearToastError: () => setToastError(null),
    reload: load,
    addTodo,
    editTodo,
    removeTodo,
    toggleDone,
    refresh,
  }
}
