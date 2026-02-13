import React, { useState } from 'react';
import { User } from '../types';
import { ArrowRight, Lock, Hash, AlertCircle } from 'lucide-react';
import Logo from '../components/Logo';

interface LoginPageProps {
  onLogin: (user: User) => void;
  users: User[]; // Pass users to validate credentials
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, users }) => {
  const [formData, setFormData] = useState({
    payrollId: '',
    password: ''
  });
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError(null); // Clear error on typing
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación de Credenciales
    const foundUser = users.find(u => u.payrollId === formData.payrollId);

    if (foundUser) {
      if (formData.password.length > 0) {
        // En una app real, aquí se validaría el hash de la contraseña
        onLogin(foundUser);
      } else {
        setError('Por favor ingresa tu contraseña.');
      }
    } else {
      setError('Número de nómina no encontrado. Verifica tus datos.');
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
          
          {/* Decorative blobs - Red and lighter Blue */}
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

          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Número de Nómina */}
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

            {/* Contraseña */}
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
              className="w-full mt-6 bg-[#1e3a8a] text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:bg-blue-800 focus:ring-4 focus:ring-blue-300 transition-all flex items-center justify-center gap-2 group"
            >
              Ingresar al Sistema
              <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
            </button>

          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-sm text-gray-400">¿Olvidaste tu contraseña?</p>
            <p className="text-xs text-gray-300 mt-1">Contacta a Soporte IT</p>
            <p className="text-xs text-gray-400 mt-4">&copy; 2024 AT Ferre Don Nico</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;