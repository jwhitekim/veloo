import { useState } from 'react'
import type { Todo } from '@/shared/types'
import * as api from '@/shared/api/client'

export function useAi() {
  const [generatingSteps, setGeneratingSteps] = useState(false)

  const generateSteps = async (todo: Todo) => {
    setGeneratingSteps(true)
    try {
      return await api.generateSteps({
        todo_name: todo.name,
        memo: todo.memo,
        priority: todo.priority,
        deadline: todo.deadline,
      })
    } finally {
      setGeneratingSteps(false)
    }
  }

  return { generateSteps, generatingSteps }
}
