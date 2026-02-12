import React from 'react';
import { USERS } from '../constants';
import { User, Role } from '../types';
import { ArrowRight } from 'lucide-react';
import Logo from '../components/Logo';

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px]">
        {/* Left Side - Brand - Background Blue #1e3a8a */}
        <div className="w-full md:w-1/2 bg-[#1e3a8a] p-12 text-white flex flex-col justify-between relative overflow-hidden">
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

        {/* Right Side - Login Simulation */}
        <div className="w-full md:w-1/2 p-12 flex flex-col justify-center">
          <h3 className="text-2xl font-bold text-gray-800 mb-2">Iniciar Sesión</h3>
          <p className="text-gray-500 mb-8">Selecciona un perfil para ingresar al sistema:</p>

          <div className="space-y-3">
            {USERS.map((user) => (
              <button
                key={user.id}
                onClick={() => onLogin(user)}
                className="w-full flex items-center p-3 rounded-xl border border-gray-200 hover:border-[#1e3a8a] hover:bg-blue-50 transition-all group text-left"
              >
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  className="w-10 h-10 rounded-full mr-4 border border-gray-100"
                />
                <div className="flex-1">
                  <p className="font-semibold text-gray-800 group-hover:text-[#1e3a8a]">{user.name}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">{user.role}</p>
                </div>
                <ArrowRight className="text-gray-300 group-hover:text-[#dc2626] transform group-hover:translate-x-1 transition-all" size={20} />
              </button>
            ))}
          </div>

          <div className="mt-8 pt-8 border-t border-gray-100 text-center text-sm text-gray-400">
            &copy; 2024 AT Ferre Don Nico
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;