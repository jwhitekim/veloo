import { Navigate, Route, Routes } from 'react-router-dom'
import LoginPage from '@/pages/LoginPage'
import LandingPage from '@/pages/LandingPage'
import ProtectedWorkspace from './ProtectedWorkspace'
import WorkspaceLayout from './WorkspaceLayout'
import { PaperAnalyzerPage } from '@/features/paper-analyzer'
import { TranslatorPage } from '@/features/translator'
import { ArchTrainerPage } from '@/features/model-review'
import { TodoPage } from '@/features/todos'
import { ContextorPage } from '@/features/contextor'
import { CalendarPage, WeeklyReviewPage } from '@/features/calendar'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage mode="login" />} />
      <Route path="/signup" element={<LoginPage mode="signup" />} />
      <Route path="/register" element={<Navigate to="/signup" replace />} />

      {/* /:username은 인증 확인만 담당(ProtectedWorkspace) — 화면 선택은
          WorkspaceLayout 아래 자식 라우트가 URL로 결정한다. */}
      <Route path="/:username" element={<ProtectedWorkspace />}>
        <Route element={<WorkspaceLayout />}>
          <Route index element={<Navigate to="tasks" replace />} />
          <Route path="tasks" element={<TodoPage />} />
          <Route path="tasks/:taskId" element={<TodoPage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="calendar/review" element={<WeeklyReviewPage />} />
          <Route path="papers" element={<PaperAnalyzerPage />} />
          <Route path="translate" element={<TranslatorPage />} />
          <Route path="models" element={<ArchTrainerPage />} />
          <Route path="concepts" element={<ContextorPage />} />
        </Route>
      </Route>
    </Routes>
  )
}
