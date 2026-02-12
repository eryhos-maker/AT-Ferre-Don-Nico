import React, { useState } from 'react';
import { User, Role } from '../types';
import { Mail, Shield, MapPin, UserPlus, X } from 'lucide-react';

interface TeamPageProps {
  users: User[];
  onAddUser?: (user: User) => void;
}

const UserCard: React.FC<{ user: User; isCompact?: boolean; variant?: 'primary' | 'secondary' }> = ({ 
  user, 
  isCompact,
  variant = 'primary'
}) => (
  <div className={`bg-white rounded-xl shadow-sm border ${variant === 'primary' ? 'border-gray-200' : 'border-blue-100 bg-blue-50/30'} hover:shadow-md transition-shadow flex flex-col items-center p-4 w-60 z-10 relative ${isCompact ? 'scale-95' : ''}`}>
    <div className="relative mb-3">
        <img 
            src={user.avatar} 
            alt={user.name} 
            className="w-16 h-16 rounded-full border-2 border-white shadow-sm object-cover"
        />
        <div className={`absolute -bottom-1 -right-1 rounded-full p-1 border border-white ${variant === 'primary' ? 'bg-blue-100 text-blue-600' : 'bg-indigo-100 text-indigo-600'}`}>
            <Shield size={12} />
        </div>
    </div>
    
    <h3 className="text-sm font-bold text-gray-800 text-center">{user.name}</h3>
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full mb-1 text-center ${variant === 'primary' ? 'text-blue-600 bg-blue-50' : 'text-indigo-600 bg-indigo-50'}`}>
        {user.role}
    </span>
    {user.branch && (
      <div className="flex items-center gap-1 text-[10px] text-gray-500 mb-2">
        <MapPin size={10} />
        <span className="truncate max-w-[150px]">{user.branch}</span>
      </div>
    )}
    
    <div className="w-full pt-3 border-t border-gray-100 flex flex-col gap-1.5">
        <div className="flex items-center gap-2 text-xs text-gray-500 justify-center">
            <Mail size={12} />
            <span className="truncate max-w-[180px]">{user.email}</span>
        </div>
    </div>
  </div>
);

// Helper component for tree branches
const TreeBranch: React.FC<{ 
  children: React.ReactNode; 
  isFirst?: boolean; 
  isLast?: boolean; 
  isSingle?: boolean;
}> = ({ children, isFirst, isLast, isSingle }) => {
  return (
    <div className="flex flex-col items-center relative px-4 pt-8">
      {/* Vertical Stem from parent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-8 w-px bg-slate-300"></div>
      
      {/* Horizontal Connector */}
      {!isSingle && (
        <>
          {isFirst && <div className="absolute top-0 left-1/2 w-1/2 h-px bg-slate-300"></div>}
          {isLast && <div className="absolute top-0 right-1/2 w-1/2 h-px bg-slate-300"></div>}
          {!isFirst && !isLast && <div className="absolute top-0 left-0 w-full h-px bg-slate-300"></div>}
        </>
      )}
      
      {children}
    </div>
  );
};

const AddMemberModal: React.FC<{ isOpen: boolean; onClose: () => void; onSave: (u: User) => void }> = ({ isOpen, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>(Role.ENCARGADO_BEREL);
  const [branch, setBranch] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: `u${Date.now()}`,
      name,
      email,
      role,
      branch,
      avatar: `https://picsum.photos/seed/${Date.now()}/200/200`
    };
    onSave(newUser);
    onClose();
    setName('');
    setEmail('');
    setBranch('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">Agregar Nuevo Miembro</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
            <input required type="text" className="w-full px-3 py-2 border rounded-lg" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email Corporativo</label>
            <input required type="email" className="w-full px-3 py-2 border rounded-lg" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal / Ubicación</label>
            <input required type="text" className="w-full px-3 py-2 border rounded-lg" value={branch} onChange={e => setBranch(e.target.value)} placeholder="Ej. Berel Centro" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rol / Puesto</label>
            <select className="w-full px-3 py-2 border rounded-lg" value={role} onChange={e => setRole(e.target.value as Role)}>
              {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Guardar Miembro</button>
          </div>
        </form>
      </div>
    </div>
  );
};

const TeamPage: React.FC<TeamPageProps> = ({ users, onAddUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const getUsersByRole = (role: Role) => users.filter(u => u.role === role);

  const gerentes = getUsersByRole(Role.GERENTE);
  const jefesAdmin = getUsersByRole(Role.JEFE_ADMIN);
  const supsOps = getUsersByRole(Role.SUPERVISOR_OPS);
  const supsCom = getUsersByRole(Role.SUPERVISOR_COM);
  const coordsBerel = getUsersByRole(Role.COORDINADOR_BEREL);
  const encargadosBerel = getUsersByRole(Role.ENCARGADO_BEREL);

  // Groups for the second level of hierarchy
  const level2Groups = [
    { users: jefesAdmin, key: 'admin' },
    { users: supsOps, key: 'ops' },
    { users: supsCom, key: 'com' },
    { users: coordsBerel, key: 'coord', hasChildren: true }
  ].filter(group => group.users.length > 0 || group.hasChildren); 

  return (
    <div className="space-y-8 min-h-[calc(100vh-100px)]">
      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Organigrama</h2>
          <p className="text-gray-500">Estructura jerárquica del equipo operativo</p>
        </div>
        {onAddUser && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-700 transition-colors shadow-sm"
          >
            <UserPlus size={18} />
            Nuevo Miembro
          </button>
        )}
      </div>

      <div className="overflow-x-auto pb-12 px-4">
        <div className="min-w-[1024px] flex flex-col items-center">
          
          {/* Level 1: Gerente */}
          <div className="relative z-20 mb-2">
            {gerentes.map(u => (
              <UserCard key={u.id} user={u} variant="secondary" />
            ))}
            {gerentes.length === 0 && (
               <div className="w-60 h-24 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-400 text-sm">
                 Sin Gerente Asignado
               </div>
            )}
          </div>

          {/* Vertical Line from Gerente */}
          <div className="h-8 w-px bg-slate-300 mb-0"></div>

          {/* Level 2 Container */}
          <div className="flex justify-center items-start gap-4">
            {level2Groups.map((group, index) => (
              <TreeBranch 
                key={group.key} 
                isFirst={index === 0} 
                isLast={index === level2Groups.length - 1}
                isSingle={level2Groups.length === 1}
              >
                <div className="flex flex-col gap-4 items-center">
                   {group.users.map(u => (
                     <UserCard key={u.id} user={u} />
                   ))}

                   {/* Level 3: Specifically for Coordinador Berel group */}
                   {group.key === 'coord' && encargadosBerel.length > 0 && (
                     <div className="flex flex-col items-center w-full pt-2">
                        {/* Connector from Coord to Encargado */}
                        <div className="h-8 w-px bg-slate-300"></div>
                        
                        <div className="relative pt-4">
                          {encargadosBerel.map((u, i) => (
                             <div key={u.id} className="relative">
                                <UserCard user={u} isCompact />
                                {i < encargadosBerel.length - 1 && <div className="h-4 w-px bg-slate-300 mx-auto"></div>}
                             </div>
                          ))}
                        </div>
                     </div>
                   )}
                </div>
              </TreeBranch>
            ))}
          </div>

        </div>
      </div>

      <AddMemberModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={(u) => { onAddUser?.(u); }} 
      />
    </div>
  );
};

export default TeamPage;