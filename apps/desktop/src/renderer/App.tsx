import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import Layout from './components/Layout';
import LoginPage from './features/auth/LoginPage';
import RegisterPage from './features/auth/RegisterPage';
import HomePage from './features/home/HomePage';
import PeoplePage from './features/browse/PeoplePage';
import ProjectsPage from './features/browse/ProjectsPage';
import IdeasPage from './features/browse/IdeasPage';
import TasksPage from './features/browse/TasksPage';
import DigestPage from './features/digest/DigestPage';
import SettingsPage from './features/settings/SettingsPage';
import ImportPage from './features/import/ImportPage';
import CalendarPage from './features/calendar/CalendarPage';
import SearchPage from './pages/SearchPage';
import PatternsPage from './pages/PatternsPage';
import IntegrationsPage from './pages/IntegrationsPage';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="people" element={<PeoplePage />} />
        <Route path="projects" element={<ProjectsPage />} />
        <Route path="ideas" element={<IdeasPage />} />
        <Route path="tasks" element={<TasksPage />} />
        <Route path="digest" element={<DigestPage />} />
        <Route path="calendar" element={<CalendarPage />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="search" element={<SearchPage />} />
        <Route path="patterns" element={<PatternsPage />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Routes>
  );
}
