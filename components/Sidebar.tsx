import React from 'react';
import { LayoutDashboard, CheckSquare, Users, FileCode, LogOut, Hexagon, Settings } from 'lucide-react';
import { NAV_ITEMS } from '../constants';
import { User, Role } from '../types';
import Logo from './Logo';

interface SidebarProps {
  currentUser: User | null;
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentUser, currentPath, onNavigate, onLogout }) => {
  const getIcon = (label: string) => {
    switch (label) {
      case 'Dashboard': return <LayoutDashboard size={20} />;
      case 'Tareas': return <CheckSquare size={20} />;
      case 'Equipo': return <Users size={20} />;
      case 'Arquitectura (Docs)': return <FileCode size={20} />;
      case 'Configuración': return <Settings size={20} />;
      default: return <Hexagon size={20} />;
    }
  };

  // Logic to determine which menu items are visible based on role
  const getVisibleNavItems = () => {
    if (!currentUser) return [];

    const isGerente = currentUser.role === Role.GERENTE;
    const hasManagementAccess = [Role.GERENTE, Role.JEFE_ADMIN, Role.SUPERVISOR_OPS].includes(currentUser.role);

    return NAV_ITEMS.filter(item => {
      // Everyone sees Tasks
      if (item.path === '/tasks') return true;
      
      // Only Gerente sees Docs/Architecture
      if (item.path === '/docs') return isGerente;

      // Dashboard, Team, Settings are for Management roles
      if (['/', '/team', '/settings'].includes(item.path)) return hasManagementAccess;

      return false;
    });
  };

  const visibleNavItems = getVisibleNavItems();

  return (
    <div className="h-screen w-64 bg-[#1e3a8a] text-white flex flex-col fixed left-0 top-0 shadow-xl z-20 bg-tools-pattern">
      <div className="p-4 flex items-center justify-center border-b border-blue-800 bg-[#172554]/80 backdrop-blur-sm">
        <div className="w-full max-w-[180px] py-2">
           <Logo className="h-16 w-full" />
        </div>
      </div>

      <div className="p-4">
        <div className="text-xs font-semibold text-blue-300 uppercase tracking-wider mb-2 px-2">
          Menu Principal
        </div>
        <nav className="space-y-1">
          {visibleNavItems.map((item) => (
            <button
              key={item.path}
              onClick={() => onNavigate(item.path)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 text-sm font-medium ${
                currentPath === item.path
                  ? 'bg-[#dc2626] text-white shadow-md' // Active state is now "Ferre" Red
                  : 'text-blue-100 hover:bg-blue-800/50 hover:text-white'
              }`}
            >
              {getIcon(item.label)}
              {item.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-auto p-4 border-t border-blue-800/50 bg-[#1e3a8a]/50 backdrop-blur-sm">
        {currentUser && (
          <div className="flex items-center gap-3 mb-4 px-2">
            <img 
              src={currentUser.avatar} 
              alt={currentUser.name} 
              className="w-10 h-10 rounded-full border-2 border-blue-400"
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{currentUser.name}</p>
              <p className="text-xs text-blue-300 truncate">{currentUser.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-red-300 hover:bg-red-900/50 hover:text-red-100 transition-colors text-sm"
        >
          <LogOut size={18} />
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
};

export default Sidebar;