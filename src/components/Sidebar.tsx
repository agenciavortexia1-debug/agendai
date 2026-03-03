import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Calendar as CalendarIcon, 
  Settings, 
  Clock, 
  LogOut, 
  ChevronLeft, 
  ChevronRight,
  Palette,
  Briefcase
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const navItems = [
    { path: '/dashboard', icon: CalendarIcon, label: 'Agenda' },
    { path: '/dashboard/hours', icon: Clock, label: 'Horários' },
    { path: '/dashboard/services', icon: Briefcase, label: 'Serviços' },
    { path: '/dashboard/personalization', icon: Palette, label: 'Personalização' },
    { path: '/dashboard/settings', icon: Settings, label: 'Configurações' },
  ];

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
            {!isCollapsed && <span className="text-xl font-display font-bold tracking-tight whitespace-nowrap text-zinc-900">Agendai</span>}
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link 
                key={item.path}
                to={item.path} 
                className={cn(
                  "flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-all group relative",
                  isActive 
                    ? "bg-zinc-50 text-primary" 
                    : "text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50",
                  isCollapsed && "justify-center"
                )}
                title={isCollapsed ? item.label : ''}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!isCollapsed && <span>{item.label}</span>}
                {isCollapsed && isActive && (
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
              "flex items-center px-4 py-3 w-full text-zinc-400 hover:text-zinc-900 hover:bg-zinc-50 rounded-xl font-medium transition-all",
              isCollapsed ? "justify-center gap-0" : "justify-start gap-3"
            )}
          >
            {isCollapsed ? <ChevronRight className="w-5 h-5" /> : <><ChevronLeft className="w-5 h-5" /> Recolher</>}
          </button>
          <button 
            onClick={handleLogout}
            className={cn(
              "flex items-center gap-3 px-4 py-3 w-full text-red-500 hover:bg-red-50 rounded-xl font-medium transition-all",
              isCollapsed && "justify-center"
            )}
          >
            <LogOut className="w-5 h-5 flex-shrink-0" />
            {!isCollapsed && <span>Sair</span>}
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-zinc-100 px-6 py-3 flex justify-between items-center z-50">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link 
              key={item.path}
              to={item.path} 
              className={cn(
                "flex flex-col items-center gap-1 transition-all",
                isActive ? "text-primary" : "text-zinc-300"
              )}
            >
              <item.icon className="w-6 h-6" />
              <span className="text-[10px] font-sans font-semibold uppercase tracking-widest">{item.label.split(' ')[0]}</span>
            </Link>
          );
        })}
        <button 
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 text-red-400"
        >
          <LogOut className="w-6 h-6" />
          <span className="text-[10px] font-sans font-semibold uppercase tracking-widest">Sair</span>
        </button>
      </nav>
    </>
  );
}
