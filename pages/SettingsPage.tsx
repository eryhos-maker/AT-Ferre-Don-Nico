import React, { useState, useEffect } from 'react';
import { User, Branch, Role } from '../types';
import { Plus, Users, Building2, Trash2, Edit2, X, Hash, MapPin, Lock, Save } from 'lucide-react';

interface SettingsPageProps {
  currentUser: User;
  users: User[];
  branches: Branch[];
  onAddUser: (user: User) => void;
  onUpdateUser: (user: User) => void;
  onRemoveUser: (id: string) => void; 
  onAddBranch: (branch: Branch) => void;
  onUpdateBranch: (branch: Branch) => void;
  onRemoveBranch: (id: string) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({ 
  currentUser,
  users, 
  branches, 
  onAddUser, 
  onUpdateUser,
  onAddBranch, 
  onUpdateBranch,
  onRemoveBranch, 
  onRemoveUser 
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'branches'>('users');
  
  // User Modal State
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);

  // Branch Modal State
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);

  // Logic to determine if current user can delete other users
  const canDeleteUsers = currentUser.role === Role.GERENTE || currentUser.payrollId === 'ADMIN';

  const handleOpenUserModal = (user?: User) => {
    if (user) {
      setEditingUser(user);
    } else {
      setEditingUser(null);
    }
    setIsUserModalOpen(true);
  };

  const handleOpenBranchModal = (branch?: Branch) => {
    if (branch) {
      setEditingBranch(branch);
    } else {
      setEditingBranch(null);
    }
    setIsBranchModalOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Configuración</h2>
          <p className="text-gray-600 font-medium">Administración de catálogo de usuarios y sucursales.</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-300">
         <button
           onClick={() => setActiveTab('users')}
           className={`px-6 py-3 text-sm font-bold flex items-center gap-2 border-b-4 transition-colors ${activeTab === 'users' ? 'border-blue-800 text-blue-900' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
         >
           <Users size={18} />
           Miembros del Equipo
         </button>
         <button
           onClick={() => setActiveTab('branches')}
           className={`px-6 py-3 text-sm font-bold flex items-center gap-2 border-b-4 transition-colors ${activeTab === 'branches' ? 'border-blue-800 text-blue-900' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
         >
           <Building2 size={18} />
           Sucursales
         </button>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-md border border-gray-200 min-h-[500px]">
        
        {/* USERS TAB */}
        {activeTab === 'users' && (
           <div className="p-6">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Directorio de Personal</h3>
                <button onClick={() => handleOpenUserModal()} className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-md transition-colors">
                   <Plus size={16} /> Agregar Miembro
                </button>
             </div>
             
             <div className="overflow-x-auto">
               <table className="w-full text-left border-collapse">
                 <thead className="bg-gray-100 text-gray-800 text-xs uppercase tracking-wider border-b-2 border-gray-300">
                    <tr>
                      <th className="px-4 py-3 font-bold">Empleado</th>
                      <th className="px-4 py-3 font-bold">Nómina</th>
                      <th className="px-4 py-3 font-bold">Rol</th>
                      <th className="px-4 py-3 font-bold">Sucursal</th>
                      <th className="px-4 py-3 font-bold text-right">Acciones</th>
                    </tr>
                 </thead>
                 <tbody className="divide-y divide-gray-200">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-blue-50 transition-colors">
                         <td className="px-4 py-3 flex items-center gap-3">
                            <img src={u.avatar} alt="" className="w-8 h-8 rounded-full bg-gray-300 border border-gray-400" />
                            <div>
                               <p className="text-sm font-bold text-gray-900">{u.name}</p>
                               <p className="text-xs text-gray-600 font-medium">{u.email}</p>
                            </div>
                         </td>
                         <td className="px-4 py-3 text-sm text-gray-800 font-mono font-bold">{u.payrollId}</td>
                         <td className="px-4 py-3">
                            <span className="text-xs px-2 py-1 rounded-full bg-blue-100 text-blue-900 font-bold border border-blue-200">
                               {u.role}
                            </span>
                         </td>
                         <td className="px-4 py-3 text-sm text-gray-800 font-medium">{u.branch || '-'}</td>
                         <td className="px-4 py-3 text-right">
                            <button 
                              onClick={() => handleOpenUserModal(u)}
                              className="text-gray-500 hover:text-blue-700 p-1 transition-colors"
                              title="Editar Usuario"
                            >
                              <Edit2 size={16}/>
                            </button>
                            {canDeleteUsers && (
                              <button 
                                onClick={() => onRemoveUser(u.id)}
                                className="text-gray-500 hover:text-red-700 p-1 ml-2 transition-colors"
                                title="Eliminar Usuario"
                              >
                                <Trash2 size={16}/>
                              </button>
                            )}
                         </td>
                      </tr>
                    ))}
                 </tbody>
               </table>
             </div>
           </div>
        )}

        {/* BRANCHES TAB */}
        {activeTab === 'branches' && (
          <div className="p-6">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-900">Catálogo de Sucursales</h3>
                <button onClick={() => handleOpenBranchModal()} className="bg-blue-800 hover:bg-blue-900 text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 shadow-md transition-colors">
                   <Plus size={16} /> Nueva Sucursal
                </button>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {branches.map(branch => (
                  <div key={branch.id} className="bg-white border-2 border-gray-200 rounded-xl p-4 hover:shadow-lg hover:border-blue-300 transition-all group relative">
                     <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-indigo-100 text-indigo-800 rounded-lg">
                           <Building2 size={24} />
                        </div>
                        <div className="flex gap-1">
                          <button 
                            onClick={() => handleOpenBranchModal(branch)} 
                            className="text-gray-400 hover:text-blue-600 transition-colors p-1"
                            title="Editar Sucursal"
                          >
                             <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={() => onRemoveBranch(branch.id)} 
                            className="text-gray-400 hover:text-red-600 transition-colors p-1"
                            title="Eliminar Sucursal"
                          >
                             <Trash2 size={16} />
                          </button>
                        </div>
                     </div>
                     <h4 className="font-bold text-gray-900 text-lg">{branch.nombre_sucursal}</h4>
                     <div className="flex items-center gap-2 text-sm text-gray-600 font-medium mt-1">
                        <MapPin size={14} />
                        {branch.direccion || 'Sin dirección registrada'}
                     </div>
                  </div>
                ))}
             </div>
          </div>
        )}
      </div>

      {/* ADD/EDIT USER MODAL */}
      {isUserModalOpen && (
        <UserModal 
           isOpen={isUserModalOpen} 
           onClose={() => setIsUserModalOpen(false)} 
           onSave={(data) => {
             if (editingUser) {
               onUpdateUser({...data, id: editingUser.id});
             } else {
               onAddUser(data);
             }
           }}
           branches={branches}
           initialData={editingUser}
        />
      )}

      {/* ADD/EDIT BRANCH MODAL */}
      {isBranchModalOpen && (
        <BranchModal 
           isOpen={isBranchModalOpen} 
           onClose={() => setIsBranchModalOpen(false)}
           onSave={(data) => {
             if (editingBranch) {
               onUpdateBranch({...data, id: editingBranch.id});
             } else {
               onAddBranch(data);
             }
           }}
           initialData={editingBranch}
        />
      )}

    </div>
  );
};

// --- Sub-Components for Modals ---

const UserModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (u: User) => void; 
  branches: Branch[];
  initialData?: User | null;
}> = ({ isOpen, onClose, onSave, branches, initialData }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<Role>(Role.ENCARGADO_BEREL);
  const [branch, setBranch] = useState('');
  const [payrollId, setPayrollId] = useState('');
  const [password, setPassword] = useState('');

  // Load initial data for editing
  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setEmail(initialData.email);
      setRole(initialData.role);
      setBranch(initialData.branch || '');
      setPayrollId(initialData.payrollId);
      setPassword(initialData.password || '');
    }
  }, [initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      id: initialData ? initialData.id : `u${Date.now()}`, // ID is ignored on update service usually if handled by wrapper
      payrollId, name, email, role, branch, password,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
       <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-300">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-100 rounded-t-xl">
             <h3 className="font-black text-gray-900 text-lg">{initialData ? 'Editar Miembro' : 'Nuevo Miembro'}</h3>
             <button onClick={onClose}><X className="text-gray-500 hover:text-red-600" /></button>
          </div>
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
             <div>
                <label className="text-sm font-bold text-gray-800 block mb-1">Nombre Completo</label>
                <input required className="w-full border-2 border-gray-300 bg-gray-50 text-gray-900 rounded-lg px-3 py-2 focus:border-blue-600 focus:bg-white outline-none transition-colors" value={name} onChange={e => setName(e.target.value)} />
             </div>
             
             <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="text-sm font-bold text-gray-800 block mb-1">Nómina</label>
                  <input required className="w-full border-2 border-gray-300 bg-gray-50 text-gray-900 rounded-lg px-3 py-2 focus:border-blue-600 focus:bg-white outline-none transition-colors" value={payrollId} onChange={e => setPayrollId(e.target.value)} />
               </div>
               <div>
                  <label className="text-sm font-bold text-gray-800 block mb-1">Email</label>
                  <input required type="email" className="w-full border-2 border-gray-300 bg-gray-50 text-gray-900 rounded-lg px-3 py-2 focus:border-blue-600 focus:bg-white outline-none transition-colors" value={email} onChange={e => setEmail(e.target.value)} />
               </div>
             </div>

             <div>
                <label className="text-sm font-bold text-gray-800 block mb-1">Contraseña de Acceso</label>
                <div className="relative">
                   <input required={!initialData} type="password" className="w-full border-2 border-gray-300 bg-gray-50 text-gray-900 rounded-lg pl-10 pr-3 py-2 focus:border-blue-600 focus:bg-white outline-none transition-colors" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" />
                   <Lock size={16} className="absolute left-3 top-3 text-gray-500" />
                </div>
             </div>

             <div>
               <label className="text-sm font-bold text-gray-800 block mb-1">Rol</label>
               <select className="w-full border-2 border-gray-400 bg-gray-50 text-gray-900 font-medium rounded-lg px-3 py-2 focus:border-blue-600 outline-none transition-colors" value={role} onChange={e => setRole(e.target.value as Role)}>
                 {Object.values(Role).map(r => <option key={r} value={r}>{r}</option>)}
               </select>
             </div>

             <div>
               <label className="text-sm font-bold text-gray-800 block mb-1">Sucursal</label>
               <select className="w-full border-2 border-gray-400 bg-gray-50 text-gray-900 font-medium rounded-lg px-3 py-2 focus:border-blue-600 outline-none transition-colors" value={branch} onChange={e => setBranch(e.target.value)}>
                 <option value="">Seleccionar...</option>
                 {branches.map(b => <option key={b.id} value={b.nombre_sucursal}>{b.nombre_sucursal}</option>)}
               </select>
             </div>

             <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 mt-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 font-bold hover:bg-gray-200 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-800 text-white font-bold rounded-lg hover:bg-blue-900 transition-colors shadow-sm">{initialData ? 'Actualizar' : 'Guardar'}</button>
             </div>
          </form>
       </div>
    </div>
  )
}

const BranchModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (b: Branch) => void;
  initialData?: Branch | null; 
}> = ({ isOpen, onClose, onSave, initialData }) => {
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');

  useEffect(() => {
    if (initialData) {
      setName(initialData.nombre_sucursal);
      setAddress(initialData.direccion || '');
    }
  }, [initialData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
       <div className="bg-white rounded-xl shadow-2xl w-full max-w-md border border-gray-300">
          <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-100 rounded-t-xl">
             <h3 className="font-black text-gray-900 text-lg">{initialData ? 'Editar Sucursal' : 'Nueva Sucursal'}</h3>
             <button onClick={onClose}><X className="text-gray-500 hover:text-red-600" /></button>
          </div>
          <form onSubmit={(e) => { 
              e.preventDefault(); 
              onSave({ 
                id: initialData ? initialData.id : `b${Date.now()}`, 
                nombre_sucursal: name, 
                direccion: address 
              }); 
              onClose(); 
            }} className="p-6 space-y-4">
             <div>
                <label className="text-sm font-bold text-gray-800 block mb-1">Nombre Sucursal</label>
                <input required className="w-full border-2 border-gray-300 bg-gray-50 text-gray-900 rounded-lg px-3 py-2 focus:border-blue-600 focus:bg-white outline-none transition-colors" value={name} onChange={e => setName(e.target.value)} />
             </div>
             <div>
                <label className="text-sm font-bold text-gray-800 block mb-1">Dirección</label>
                <input className="w-full border-2 border-gray-300 bg-gray-50 text-gray-900 rounded-lg px-3 py-2 focus:border-blue-600 focus:bg-white outline-none transition-colors" value={address} onChange={e => setAddress(e.target.value)} />
             </div>
             <div className="flex justify-end gap-2 pt-4 border-t border-gray-100 mt-2">
                <button type="button" onClick={onClose} className="px-4 py-2 text-gray-700 font-bold hover:bg-gray-200 rounded-lg transition-colors">Cancelar</button>
                <button type="submit" className="px-4 py-2 bg-blue-800 text-white font-bold rounded-lg hover:bg-blue-900 transition-colors shadow-sm">{initialData ? 'Actualizar' : 'Guardar'}</button>
             </div>
          </form>
       </div>
    </div>
  )
}

export default SettingsPage;