import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { AppLayout } from './components/layout/AppLayout.jsx';
import { LandingPage } from './pages/LandingPage.jsx';
import { ChatPage } from './pages/ChatPage.jsx';
import { DatasetsPage } from './pages/DatasetsPage.jsx';
import { DashboardPage } from './pages/DashboardPage.jsx';
import { AuthPage } from './pages/AuthPage.jsx';

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Landing Page */}
            <Route path="/" element={<LandingPage />} />

            {/* Authentication */}
            <Route path="/auth" element={<AuthPage />} />

            {/* Authenticated Workspace App Layout */}
            <Route element={<AppLayout />}>
              <Route path="/chat" element={<ChatPage />} />
              <Route path="/datasets" element={<DatasetsPage />} />
              <Route path="/dashboard" element={<DashboardPage />} />
            </Route>

            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
