import { Navigate, Route, Routes } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import AuthView from './views/AuthView'
import ChatAssistant from './views/ChatAssistant'
import SectionBrowser from './views/SectionBrowser'
import BookmarksView from './views/BookmarksView'

function Protected({ children }) {
  const { user } = useAuth()
  return user ? <Layout>{children}</Layout> : <Navigate to="/login" replace />
}

export default function App() {
  const { user } = useAuth()
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <AuthView mode="login" />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <AuthView mode="register" />} />
      <Route path="/" element={<Protected><ChatAssistant /></Protected>} />
      <Route path="/sections" element={<Protected><SectionBrowser /></Protected>} />
      <Route path="/bookmarks" element={<Protected><BookmarksView /></Protected>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
