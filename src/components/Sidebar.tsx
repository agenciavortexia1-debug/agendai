import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Settings,
  Clock,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Palette,
  Briefcase,
  Users,
  BarChart3
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { Professional } from '../types';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [currentUser, setCurrentUser] = useState<Professional | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadUser() {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Check if user is an employee
      const { data: profData } = await supabase
        .from('professionals')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (profData) {
        setCurrentUser(profData);
      } else {
        // If not found in professionals, assume it's the owner for backward compatibility
        setCurrentUser({ role: 'owner', access_screens: [] } as any);
      }
    }
    loadUser();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const allNavItems = [
    { path: '/dashboard', icon: CalendarIcon, label: 'Agenda', screenKey: 'Agenda' },
    { path: '/dashboard/analytics', icon: BarChart3, label: 'Análises', screenKey: 'Análises' },
    { path: '/dashboard/hours', icon: Clock, label: 'Horários', screenKey: 'Configurações' },
    { path: '/dashboard/staff', icon: Users, label: 'Equipe', screenKey: 'Equipe' },
    { path: '/dashboard/services', icon: Briefcase, label: 'Serviços', screenKey: 'Configurações' },
    { path: '/dashboard/personalization', icon: Palette, label: 'Personalização', screenKey: 'Personalização' },
    { path: '/dashboard/settings', icon: Settings, label: 'Configurações', screenKey: 'Configurações' },
  ];

  // Filter items based on role
  const navItems = allNavItems.filter(item => {
    if (!currentUser || currentUser.role === 'owner') return true;

    // Default allowed screen for all
    if (item.screenKey === 'Agenda') return true;

    // Check if employee has access to this screen
    return currentUser.access_screens?.includes(item.screenKey);
  });

  return (
    <>
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "hidden md:flex bg-white border-r border-zinc-100 flex-col sticky top-0 h-screen transition-all duration-300",
          isCollapsed ? "w-20" : "w-72"
        )}
      >
        <div className={cn("p-8 border-b border-zinc-100 flex items-center", isCollapsed ? "justify-center" : "justify-between")}>
          <div className={cn("flex items-center overflow-hidden", isCollapsed ? "gap-0" : "gap-3")}>
            <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-primary/20">
              <CalendarIcon className="w-6 h-6 text-white" />
            </div>
            {!isCollapsed && <span className="text-xl font-display font-bold tracking-tight whitespace-nowrap text-zinc-900">Agendai</span>}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (location.pathname.startsWith(item.path) && item.path !== '/dashboard');

            // Tratativa especial para o /dashboard não marcar tudo que começa com /dashboard
            const isExactDashboard = item.path === '/dashboard' && location.pathname === '/dashboard';
            const isNotDashboard = item.path !== '/dashboard' && location.pathname.startsWith(item.path);

            const isCurrent = isExactDashboard || isNotDashboard;

            return (
              <Link
                key={item.path}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-lg font-medium transition-all group relative",
                  isCurrent
                    ? "bg-zinc-50 text-primary"
                    : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50",
                  isCollapsed && "justify-center"
                )}
                title={isCollapsed ? item.label : ''}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
                {isCollapsed && isCurrent && (
                  <div className="absolute left-0 w-1 h-6 bg-primary rounded-r-full" />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-zinc-100 space-y-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={cn(
              "flex items-center px-4 py-3 w-full text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-lg font-medium transition-all",
              isCollapsed ? "justify-center gap-0" : "justify-start gap-3"
            )}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <><ChevronLeft className="w-5 h-5" /> Recolher</>}
          </button>
          <button
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 px-4 py-3 w-full text-red-500 hover:bg-red-50 rounded-lg font-medium transition-all",
              isCollapsed && "justify-center"
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 px-2 py-3 flex justify-around items-center z-[100] pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const isExactDashboard = item.path === '/dashboard' && location.pathname === '/dashboard';
          const isNotDashboard = item.path !== '/dashboard' && location.pathname.startsWith(item.path);
          const isCurrent = isExactDashboard || isNotDashboard;

          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex-1 flex flex-col items-center justify-center transition-all p-2",
                isCurrent ? "text-primary" : "text-zinc-300"
              )}
            >
              <item.icon className="w-6 h-6" />
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center justify-center p-2 text-red-300"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </nav>
    </>
  );
}
