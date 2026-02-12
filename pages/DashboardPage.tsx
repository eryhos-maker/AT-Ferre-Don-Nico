import React, { useEffect, useState } from 'react';
import { Task, User, TaskStatus, Priority } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertCircle, CheckCircle2, Clock, PlayCircle, Sparkles } from 'lucide-react';
import { generateExecutiveSummary } from '../services/geminiService';

interface DashboardPageProps {
  tasks: Task[];
  currentUser: User;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const DashboardPage: React.FC<DashboardPageProps> = ({ tasks, currentUser }) => {
  const [summary, setSummary] = useState<string>("Generando análisis de IA...");

  useEffect(() => {
    generateExecutiveSummary(tasks).then(setSummary);
  }, [tasks]);

  const stats = [
    {
      label: 'Total Tareas',
      value: tasks.length,
      icon: <CheckCircle2 className="text-blue-500" size={24} />,
      bg: 'bg-blue-50'
    },
    {
      label: 'Pendientes',
      value: tasks.filter(t => t.status === TaskStatus.PENDING).length,
      icon: <Clock className="text-yellow-500" size={24} />,
      bg: 'bg-yellow-50'
    },
    {
      label: 'En Progreso',
      value: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      icon: <PlayCircle className="text-indigo-500" size={24} />,
      bg: 'bg-indigo-50'
    },
    {
      label: 'Vencidas',
      value: tasks.filter(t => t.status === TaskStatus.OVERDUE).length,
      icon: <AlertCircle className="text-red-500" size={24} />,
      bg: 'bg-red-50'
    }
  ];

  const statusData = [
    { name: 'Pendiente', value: tasks.filter(t => t.status === TaskStatus.PENDING).length },
    { name: 'En Progreso', value: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length },
    { name: 'Completada', value: tasks.filter(t => t.status === TaskStatus.COMPLETED).length },
    { name: 'Vencida', value: tasks.filter(t => t.status === TaskStatus.OVERDUE).length },
  ];

  const priorityData = Object.values(Priority).map(p => ({
    name: p,
    cantidad: tasks.filter(t => t.priority === p).length
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Panel de Control</h2>
          <p className="text-gray-500">Bienvenido de nuevo, {currentUser.name}</p>
        </div>
        {/* Brand Colors Gradient: Blue to Red */}
        <div className="bg-gradient-to-r from-[#1e3a8a] to-[#dc2626] text-white p-4 rounded-xl shadow-lg max-w-md w-full">
           <div className="flex items-center gap-2 mb-2">
             <Sparkles size={16} className="text-yellow-300" />
             <span className="text-xs font-bold uppercase tracking-wider text-white/90">Resumen Inteligente</span>
           </div>
           <p className="text-sm leading-relaxed">{summary}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="text-3xl font-bold text-gray-800 mt-2">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Estado de Tareas</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#8884d8"
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 text-sm text-gray-600 mt-4">
            {statusData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                <span>{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Distribución por Prioridad</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 12}} />
                <YAxis />
                <Tooltip 
                  cursor={{fill: '#f3f4f6'}}
                  contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                />
                <Bar dataKey="cantidad" fill="#1e3a8a" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;