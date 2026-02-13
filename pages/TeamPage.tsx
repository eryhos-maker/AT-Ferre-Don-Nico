import React, { useState } from 'react';
import { User, Role } from '../types';
import { Mail, Shield, MapPin, UserPlus, X, Hash } from 'lucide-react';

interface TeamPageProps {
  users: User[];
  onAddUser?: (user: User) => void;
}

const UserCard: React.FC<{ user: User; isCompact?: boolean; variant?: 'primary' | 'secondary' }> = ({ 
  user, 
  isCompact,
  variant = 'primary'
}) => (
  <div className={`bg-white rounded-xl shadow-sm border ${variant === 'primary' ? 'border-gray-200' : 'border-blue-200 bg-blue-50'} hover:shadow-lg hover:border-blue-300 transition-all flex flex-col items-center p-4 w-60 z-10 relative ${isCompact ? 'scale-95' : ''}`}>
    <div className="relative mb-3">
        <img 
            src={user.avatar} 
            alt={user.name} 
            className="w-16 h-16 rounded-full border-2 border-white shadow-md object-cover"
        />
        <div className={`absolute -bottom-1 -right-1 rounded-full p-1 border border-white ${variant === 'primary' ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'}`}>
            <Shield size={12} />
        </div>
    </div>
    
    <h3 className="text-sm font-black text-gray-900 text-center">{user.name}</h3>
    <span className={`text-xs font-bold px-2 py-0.5 rounded-full mb-1 text-center ${variant === 'primary' ? 'text-blue-700 bg-blue-100' : 'text-indigo-700 bg-indigo-100'}`}>
        {user.role}
    </span>
    {user.branch && (
      <div className="flex items-center gap-1 text-[10px] text-gray-600 font-medium mb-1">
        <MapPin size={10} />
        <span className="truncate max-w-[150px]">{user.branch}</span>
      </div>
    )}
    
    <div className="w-full pt-2 border-t border-gray-200 flex flex-col gap-1">
        <div className="flex items-center gap-2 text-xs text-gray-600 justify-center" title="Número de Nómina">
            <Hash size={10} className="text-gray-400" />
            <span className="font-mono bg-gray-100 px-1 rounded font-bold">{user.payrollId}</span>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-600 font-medium justify-center">
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
      <div className="absolute top-0 left-1/2 -translate-x-1/2 h-8 w-px bg-slate-400"></div>
      
      {/* Horizontal Connector */}
      {!isSingle && (
        <>
          {isFirst && <div className="absolute top-0 left-1/2 w-1/2 h-px bg-slate-400"></div>}
          {isLast && <div className="absolute top-0 right-1/2 w-1/2 h-px bg-slate-400"></div>}
          {!isFirst && !isLast && <div className="absolute top-0 left-0 w-full h-px bg-slate-400"></div>}
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
  const [payrollId, setPayrollId] = useState('');
  // Note: Password field added here too in case this modal is used, though SettingsPage has its own modal. 
  // Ideally components should be reused, but adhering to current structure.

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newUser: User = {
      id: `u${Date.now()}`,
      payrollId,
      name,
      email,
      role,
      branch,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`
    };
    onSave(newUser);
    onClose();
    setName('');
    setEmail('');
    setBranch('');
    setPayrollId('');
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-black text-gray-900">Agregar Nuevo Miembro</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">Nombre Completo</label>
            <input required type="text" className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 bg-gray-50 text-gray-900 outline-none" value={name} onChange={e => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
             <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">Nómina (ID Login)</label>
                <div className="relative">
                   <Hash size={14} className="absolute left-3 top-3 text-gray-400" />
                   <input required type="text" className="w-full pl-8 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 bg-gray-50 text-gray-900 outline-none" value={payrollId} onChange={e => setPayrollId(e.target.value)} placeholder="Ej. 1020" />
                </div>
             </div>
             <div>
                <label className="block text-sm font-bold text-gray-800 mb-1">Email Corporativo</label>
                <input required type="email" className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 bg-gray-50 text-gray-900 outline-none" value={email} onChange={e => setEmail(e.target.value)} />
             </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">Sucursal / Ubicación</label>
            <input required type="text" className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 bg-gray-50 text-gray-900 outline-none" value={branch} onChange={e => setBranch(e.target.value)} placeholder="Ej. Berel Centro" />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-800 mb-1">Rol / Puesto</label>
            <select className="w-full px-3 py-2 border-2 border-gray-400 rounded-lg focus:border-blue-600 bg-gray-50 text-gray-900 outline-none" value={role} onChange={e => setRole(e.target.value as Role)}>
              {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div className="pt-4 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 font-bold hover:bg-gray-100 rounded-lg">Cancelar</button>
            <button type="submit" className="px-4 py-2 bg-blue-700 text-white font-bold rounded-lg hover:bg-blue-800">Guardar Miembro</button>
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
          <h2 className="text-2xl font-black text-gray-900">Organigrama</h2>
          <p className="text-gray-600 font-medium">Estructura jerárquica del equipo operativo</p>
        </div>
        {onAddUser && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 transition-colors shadow-md font-bold"
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
               <div className="w-60 h-24 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center text-gray-500 font-medium text-sm">
                 Sin Gerente Asignado
               </div>
            )}
          </div>

          {/* Vertical Line from Gerente */}
          <div className="h-8 w-px bg-slate-400 mb-0"></div>

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
                        <div className="h-8 w-px bg-slate-400"></div>
                        
                        <div className="relative pt-4">
                          {encargadosBerel.map((u, i) => (
                             <div key={u.id} className="relative">
                                <UserCard user={u} isCompact />
                                {i < encargadosBerel.length - 1 && <div className="h-4 w-px bg-slate-400 mx-auto"></div>}
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