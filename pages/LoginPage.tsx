import React, { useState } from 'react';
import { User } from '../types';
import { ArrowRight, Lock, Hash, AlertCircle, Loader2, Database, Check } from 'lucide-react';
import Logo from '../components/Logo';
import { supabase } from '../lib/supabaseClient';
import { Role } from '../types';
import { ensureAdminUser } from '../services/supabaseService';

interface LoginPageProps {
  onLogin: (user: User) => void;
  users: User[]; // Not used for auth logic anymore, but kept for interface compatibility
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [formData, setFormData] = useState({
    payrollId: '',
    password: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  
  // State for admin creation feedback
  const [isAdminCreating, setIsAdminCreating] = useState(false);
  const [adminCreatedMsg, setAdminCreatedMsg] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null); 
  };

  const handleCreateAdmin = async () => {
    setIsAdminCreating(true);
    setAdminCreatedMsg(null);
    try {
      const created = await ensureAdminUser();
      if (created) {
        setAdminCreatedMsg("Usuario 'ADMIN' creado exitosamente.");
        setFormData({ payrollId: 'ADMIN', password: 'Donnico1' }); // Autofill
      } else {
        setAdminCreatedMsg("El usuario 'ADMIN' ya existe.");
        setFormData({ payrollId: 'ADMIN', password: '' }); 
      }
    } catch (e) {
      setError("Error al crear usuario admin en Supabase.");
    } finally {
      setIsAdminCreating(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Query 'empleados' table directly based on prompt schema
      const { data, error } = await supabase
        .from('empleados')
        .select('*')
        .eq('nomina', formData.payrollId)
        .eq('contrasena', formData.password)
        .single();

      if (error || !data) {
        setError('Credenciales inválidas. Verifica nómina y contraseña.');
      } else {
        // Map DB user to App User type
        const appUser: User = {
          id: data.id,
          payrollId: data.nomina,
          name: data.nombre,
          role: data.rol as Role, // Assumes strict match on Enum strings
          email: data.correo,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(data.nombre)}&background=0D8ABC&color=fff`,
          branch: 'General' // Default
        };
        onLogin(appUser);
      }
    } catch (err) {
      setError('Error de conexión al servidor.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* Left Side - Brand - Background Blue #1e3a8a */}
        <div className="w-full md:w-1/2 bg-[#1e3a8a] p-12 text-white flex flex-col justify-between relative overflow-hidden bg-tools-pattern">
          <div className="relative z-10">
            <div className="mb-8 -ml-4">
              <Logo className="h-32 w-auto" />
            </div>
            <h2 className="text-4xl font-bold mb-4 leading-tight">
              Administrador de Tareas
            </h2>
            <p className="text-blue-200 text-lg">
              Control de inventario, personal y tareas operativas para sucursales y corporativo.
            </p>
          </div>
          
          <div className="absolute top-0 right-0 w-64 h-64 bg-[#dc2626] rounded-full mix-blend-multiply filter blur-3xl opacity-40 -translate-y-1/2 translate-x-1/2"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500 rounded-full mix-blend-screen filter blur-3xl opacity-20 translate-y-1/2 -translate-x-1/2"></div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full md:w-1/2 p-12 flex flex-col justify-center">
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Iniciar Sesión</h3>
          <p className="text-gray-500 mb-6">Ingresa tu número de nómina y contraseña.</p>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2 text-sm border border-red-100">
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {adminCreatedMsg && (
             <div className="mb-4 p-3 bg-green-50 text-green-700 rounded-lg flex items-center gap-2 text-sm border border-green-100">
               <Check size={16} />
               {adminCreatedMsg}
             </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            
            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 ml-1">Número de Nómina</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Hash size={18} />
                </div>
                <input
                  type="text"
                  name="payrollId"
                  required
                  placeholder="Ej. 1001"
                  value={formData.payrollId}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-gray-700 ml-1">Contraseña</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock size={18} />
                </div>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 bg-[#1e3a8a] text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 transition-all flex items-center justify-center gap-2 group disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="animate-spin" size={20} /> Verificando...
                </>
              ) : (
                <>
                  Ingresar al Sistema
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                </>
              )}
            </button>

          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center space-y-2">
             <button 
               onClick={handleCreateAdmin}
               disabled={isAdminCreating}
               className="text-xs text-blue-600 hover:text-blue-800 hover:underline flex items-center justify-center gap-1 w-full"
             >
               {isAdminCreating ? <Loader2 size={12} className="animate-spin" /> : <Database size={12} />}
               Inicializar Admin (Dev)
             </button>
            <p className="text-sm text-gray-400">¿Olvidaste tu contraseña?</p>
            <p className="text-xs text-gray-400 mt-4">&copy; 2024 AT Ferre Don Nico</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;