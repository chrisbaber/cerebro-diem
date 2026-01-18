import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import {
  Home,
  Users,
  FolderKanban,
  Lightbulb,
  CheckSquare,
  Calendar,
  FileDown,
  Settings,
  LogOut,
  Mail,
  Menu,
  X,
  Search,
  Sparkles,
  Plug
} from 'lucide-react';
import { useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import CaptureInput from './CaptureInput';

const navItems = [
  { to: '/', icon: Home, label: 'Home' },
  { to: '/search', icon: Search, label: 'Search' },
  { to: '/people', icon: Users, label: 'People' },
  { to: '/projects', icon: FolderKanban, label: 'Projects' },
  { to: '/ideas', icon: Lightbulb, label: 'Ideas' },
  { to: '/tasks', icon: CheckSquare, label: 'Tasks' },
  { to: '/patterns', icon: Sparkles, label: 'Patterns' },
  { to: '/calendar', icon: Calendar, label: 'Calendar' },
  { to: '/digest', icon: Mail, label: 'Digest' },
  { to: '/import', icon: FileDown, label: 'Import' },
  { to: '/integrations', icon: Plug, label: 'Integrations' },
];

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { signOut, user } = useAuthStore();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile menu button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-surface shadow-lg"
        onClick={() => setSidebarOpen(!sidebarOpen)}
      >
        {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-40 w-64 bg-surface shadow-xl transform transition-transform duration-200 ease-in-out
          lg:relative lg:translate-x-0
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center gap-3 px-6 py-5 border-b border-surface-variant">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
              <span className="text-white font-bold text-lg">CD</span>
            </div>
            <div>
              <h1 className="font-bold text-lg text-on-surface">Cerebro Diem</h1>
              <p className="text-xs text-on-surface-variant">Seize Your Thoughts</p>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navItems.map(({ to, icon: Icon, label }) => (
              <NavLink
                key={to}
                to={to}
                onClick={() => setSidebarOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors ${
                    isActive
                      ? 'bg-primary-container text-primary'
                      : 'text-on-surface-variant hover:bg-surface-variant'
                  }`
                }
              >
                <Icon size={20} />
                <span className="font-medium">{label}</span>
              </NavLink>
            ))}
          </nav>

          {/* Bottom section */}
          <div className="p-4 border-t border-surface-variant">
            <NavLink
              to="/settings"
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-3 rounded-xl transition-colors mb-2 ${
                  isActive
                    ? 'bg-primary-container text-primary'
                    : 'text-on-surface-variant hover:bg-surface-variant'
                }`
              }
            >
              <Settings size={20} />
              <span className="font-medium">Settings</span>
            </NavLink>

            <div className="flex items-center gap-3 px-4 py-2 text-sm text-on-surface-variant">
              <div className="w-8 h-8 rounded-full bg-primary-container flex items-center justify-center">
                <span className="text-primary font-medium">
                  {user?.email?.[0].toUpperCase()}
                </span>
              </div>
              <span className="flex-1 truncate">{user?.email}</span>
            </div>

            <button
              onClick={handleSignOut}
              className="flex items-center gap-3 px-4 py-3 w-full rounded-xl text-error hover:bg-error/10 transition-colors"
            >
              <LogOut size={20} />
              <span className="font-medium">Sign Out</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Capture input header */}
        <header className="bg-surface border-b border-surface-variant px-6 py-4">
          <CaptureInput />
        </header>

        {/* Page content */}
        <div className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
