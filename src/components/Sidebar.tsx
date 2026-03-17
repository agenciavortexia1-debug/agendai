import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  Settings,
  Clock,
  LogOut,
  ChevronRight,
  ChevronLeft,
  BarChart3,
  LayoutGrid,
  MessageSquare,
  CreditCard
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import { Professional } from '../types';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const [currentUser, setCurrentUser] = useState<Professional | null>(null);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    async function loadUser() {
      const staffLocal = localStorage.getItem('staff_session');
      if (staffLocal) {
        try {
          const parsed = JSON.parse(staffLocal);
          setCurrentUser(parsed);
          return;
        } catch (e) { }
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: profData } = await supabase
        .from('professionals')
        .select('*')
        .eq('user_id', session.user.id)
        .single();

      if (profData) {
        setCurrentUser(profData);
      } else {
        setCurrentUser({ role: 'owner', access_screens: [] } as any);
      }
    }
    loadUser();
  }, []);

  const handleLogout = async () => {
    const isStaff = currentUser && currentUser.role !== 'owner';
    localStorage.removeItem('staff_session');
    await supabase.auth.signOut();
    navigate(isStaff ? '/staff/login' : '/');
  };

  const allNavItems = [
    { path: '/dashboard', icon: CalendarIcon, label: 'Agenda' },
    { path: '/dashboard/analytics', icon: BarChart3, label: 'Análises' },
    { path: '/dashboard/hours', icon: Clock, label: 'Horários' },
    { path: '/dashboard/management', icon: LayoutGrid, label: 'Gestão' },
    { path: '/dashboard/whatsapp', icon: MessageSquare, label: 'WhatsApp' },
    { path: '/dashboard/payment', icon: CreditCard, label: 'Pagamento' },
    { path: '/dashboard/settings', icon: Settings, label: 'Configurações' },
  ];

  const navItems = allNavItems.filter(item => {
    if (!currentUser || currentUser.role === 'owner') return true;
    return item.path === '/dashboard';
  });

  return (
    <>
      {/* Desktop Sidebar — compact icon bar, expands on hover */}
      <aside
        className={cn(
          "hidden md:flex bg-white border-r border-zinc-100 flex-col sticky top-0 h-screen transition-all duration-200 z-10",
          isCollapsed ? "w-16" : "w-56"
        )}
      >
        {/* Logo */}
        <div className={cn("h-14 flex items-center border-b border-zinc-100 flex-shrink-0", isCollapsed ? "justify-center px-2" : "px-4 gap-3")}>
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center flex-shrink-0 shadow shadow-primary/20">
            <CalendarIcon className="w-4 h-4 text-white" />
          </div>
          {!isCollapsed && <span className="text-base font-display font-bold tracking-tight text-zinc-900 whitespace-nowrap">Agendai</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 py-3 px-2 space-y-1 overflow-hidden">
          {navItems.map((item) => {
            const isExact = item.path === '/dashboard' && location.pathname === '/dashboard';
            const isNested = item.path !== '/dashboard' && location.pathname.startsWith(item.path);
            const isCurrent = isExact || isNested;

            return (
              <Link
                key={item.path}
                to={item.path}
                title={item.label}
                className={cn(
                  "flex items-center rounded-lg transition-all duration-150 group relative",
                  isCollapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2.5",
                  isCurrent
                    ? "bg-primary/5 text-primary"
                    : "text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50"
                )}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>}
                {isCollapsed && isCurrent && (
                  <div className="absolute left-0 w-0.5 h-5 bg-primary rounded-r-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-2 border-t border-zinc-100 space-y-1">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            title={isCollapsed ? 'Expandir' : 'Recolher'}
            className={cn(
              "flex items-center w-full rounded-lg p-2.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50 transition-all",
              isCollapsed ? "justify-center" : "gap-3 px-3"
            )}
          >
            {isCollapsed
              ? <ChevronRight className="w-4 h-4" />
              : <><ChevronLeft className="w-4 h-4" /><span className="text-sm font-medium">Recolher</span></>
            }
          </button>
          <button
            onClick={handleLogout}
            title="Sair"
            className={cn(
              "flex items-center w-full rounded-lg p-2.5 text-red-400 hover:bg-red-50 transition-all",
              isCollapsed ? "justify-center" : "gap-3 px-3"
            )}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span className="text-sm font-medium">Sair</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 px-2 py-2 flex justify-around items-center z-[100] pb-[env(safe-area-inset-bottom)]">
        {navItems.map((item) => {
          const isExact = item.path === '/dashboard' && location.pathname === '/dashboard';
          const isNested = item.path !== '/dashboard' && location.pathname.startsWith(item.path);
          const isCurrent = isExact || isNested;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex-1 flex flex-col items-center justify-center p-2 transition-all",
                isCurrent ? "text-primary" : "text-zinc-300"
              )}
            >
              <item.icon className="w-5 h-5" />
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex-1 flex flex-col items-center justify-center p-2 text-red-300"
        >
          <LogOut className="w-5 h-5" />
        </button>
      </nav>
    </>
  );
}
