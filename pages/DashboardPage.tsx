import React, { useEffect, useState } from 'react';
import { Task, User, TaskStatus, Priority } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { AlertCircle, CheckCircle2, Clock, PlayCircle, Sparkles, FileText, Download, Paperclip, Eye } from 'lucide-react';
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
      icon: <CheckCircle2 className="text-blue-600" size={24} />,
      bg: 'bg-blue-100'
    },
    {
      label: 'Pendientes',
      value: tasks.filter(t => t.status === TaskStatus.PENDING).length,
      icon: <Clock className="text-yellow-600" size={24} />,
      bg: 'bg-yellow-100'
    },
    {
      label: 'En Progreso',
      value: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      icon: <PlayCircle className="text-indigo-600" size={24} />,
      bg: 'bg-indigo-100'
    },
    {
      label: 'Vencidas',
      value: tasks.filter(t => t.status === TaskStatus.OVERDUE).length,
      icon: <AlertCircle className="text-red-600" size={24} />,
      bg: 'bg-red-100'
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

  const completedTasks = tasks.filter(t => t.status === TaskStatus.COMPLETED).sort((a,b) => new Date(b.dueDate).getTime() - new Date(a.dueDate).getTime());

  return (
    <div className="space-y-6 pb-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Panel de Control</h2>
          <p className="text-gray-600 font-medium">Bienvenido de nuevo, {currentUser.name}</p>
        </div>
        {/* Brand Colors Gradient: Blue to Red with Tool Pattern */}
        <div className="bg-gradient-to-r from-[#1e3a8a] to-[#dc2626] text-white p-4 rounded-xl shadow-lg max-w-md w-full bg-tools-pattern relative overflow-hidden border border-blue-900">
           <div className="relative z-10">
               <div className="flex items-center gap-2 mb-2">
                 <Sparkles size={16} className="text-yellow-300" />
                 <span className="text-xs font-bold uppercase tracking-wider text-white/90">Resumen Inteligente</span>
               </div>
               <p className="text-sm leading-relaxed font-medium">{summary}</p>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex justify-between items-start">
              <div>
                <p className="text-sm font-bold text-gray-500">{stat.label}</p>
                <p className="text-3xl font-black text-gray-900 mt-2">{stat.value}</p>
              </div>
              <div className={`p-3 rounded-lg ${stat.bg}`}>
                {stat.icon}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-black text-gray-900 mb-6">Estado de Tareas</h3>
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
          <div className="flex justify-center gap-4 text-sm text-gray-700 font-bold mt-4">
            {statusData.map((entry, index) => (
              <div key={index} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></div>
                <span>{entry.name}: {entry.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-black text-gray-900 mb-6">Distribución por Prioridad</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={priorityData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 12, fill: '#374151', fontWeight: 'bold'}} />
                <YAxis tick={{fill: '#374151'}} />
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

      {/* Historial de Tareas Completadas */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200 bg-gray-50">
           <h3 className="text-lg font-black text-gray-900">Historial de Tareas Completadas</h3>
           <p className="text-sm text-gray-600 font-medium">Visualiza y descarga la evidencia de las operaciones finalizadas.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-100 text-gray-700 text-xs uppercase tracking-wider border-b border-gray-300">
               <tr>
                 <th className="px-6 py-3 font-bold">Folio</th>
                 <th className="px-6 py-3 font-bold">Tarea</th>
                 <th className="px-6 py-3 font-bold">Fecha Venc.</th>
                 <th className="px-6 py-3 font-bold">Adjunto Original</th>
                 <th className="px-6 py-3 font-bold text-right">Evidencia Final</th>
               </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {completedTasks.length > 0 ? (
                completedTasks.map(task => (
                  <tr key={task.id} className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4 text-xs font-mono font-bold text-gray-600">{task.folio}</td>
                    <td className="px-6 py-4">
                       <p className="text-sm font-bold text-gray-900">{task.title}</p>
                       <span className={`text-[10px] px-1.5 py-0.5 rounded border font-bold ${task.priority === Priority.HIGH || task.priority === Priority.CRITICAL ? 'bg-red-50 text-red-700 border-red-200' : 'bg-blue-50 text-blue-700 border-blue-200'}`}>
                         {task.priority}
                       </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-800 font-medium">
                       {new Date(task.dueDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                       {task.attachmentName ? (
                         <a href={task.attachmentUrl} download className="flex items-center gap-1.5 text-blue-700 hover:text-blue-900 text-xs font-bold">
                            <Paperclip size={14} />
                            {task.attachmentName}
                         </a>
                       ) : (
                         <span className="text-xs text-gray-400 font-medium">-</span>
                       )}
                    </td>
                    <td className="px-6 py-4 text-right">
                       {task.evidenceUrl ? (
                         <div className="flex items-center justify-end gap-2">
                           <a 
                             href={task.evidenceUrl} 
                             target="_blank" 
                             rel="noreferrer"
                             className="inline-flex items-center gap-1.5 bg-green-50 text-green-700 px-3 py-1.5 rounded-lg border border-green-200 hover:bg-green-100 transition-colors text-xs font-bold"
                             title="Ver Evidencia"
                           >
                             <Eye size={14} />
                             Ver
                           </a>
                           <a 
                             href={task.evidenceUrl} 
                             download={`Evidencia_${task.folio}`}
                             target="_blank"
                             rel="noreferrer"
                             className="inline-flex items-center gap-1.5 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors text-xs font-bold"
                             title="Descargar Evidencia"
                           >
                             <Download size={14} />
                             Descargar
                           </a>
                         </div>
                       ) : (
                         <span className="text-xs text-gray-400 italic font-medium">Sin evidencia digital</span>
                       )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                   <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm font-medium">
                      No hay tareas completadas registradas.
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;