import React, { useState } from 'react';
import { Task, User, TaskStatus, Priority, Role } from '../types';
import { Plus, Search, Filter, Calendar, AlertTriangle, CheckCircle, Clock } from 'lucide-react';
import TaskModal from '../components/TaskModal';

interface TasksPageProps {
  tasks: Task[];
  users: User[];
  currentUser: User;
  onCreateTask: (task: Partial<Task>) => void;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
}

const TasksPage: React.FC<TasksPageProps> = ({ tasks, users, currentUser, onCreateTask, onUpdateStatus }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Permission Logic: Supervisor Comercial and Encargado Berel cannot create tasks
  const canCreateTask = ![Role.SUPERVISOR_COM, Role.ENCARGADO_BEREL].includes(currentUser.role);

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.CRITICAL: return 'bg-red-100 text-red-700 border-red-200';
      case Priority.HIGH: return 'bg-orange-100 text-orange-700 border-orange-200';
      case Priority.MEDIUM: return 'bg-blue-100 text-blue-700 border-blue-200';
      case Priority.LOW: return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED: return <CheckCircle size={16} className="text-green-500" />;
      case TaskStatus.OVERDUE: return <AlertTriangle size={16} className="text-red-500" />;
      case TaskStatus.IN_PROGRESS: return <Clock size={16} className="text-blue-500" />;
      default: return <div className="w-4 h-4 rounded-full border-2 border-gray-300" />;
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          task.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'all' || task.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getUserName = (id: string) => users.find(u => u.id === id)?.name || 'Desconocido';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Gestión de Tareas</h2>
          <p className="text-gray-500">Administra y asigna operaciones diarias</p>
        </div>
        {canCreateTask && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus size={20} />
            Nueva Tarea
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Buscar tarea..."
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 w-full md:w-auto overflow-x-auto">
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${filterStatus === 'all' ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
          >
            Todas
          </button>
          {Object.values(TaskStatus).map(status => (
             <button
             key={status}
             onClick={() => setFilterStatus(status)}
             className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap ${filterStatus === status ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
           >
             {status}
           </button>
          ))}
        </div>
      </div>

      {/* Task List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredTasks.map((task) => (
          <div key={task.id} className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all group">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    <h3 className="text-lg font-bold text-gray-800">{task.title}</h3>
                  </div>
                  <div className="md:hidden">
                    {/* Mobile status select could go here, simplified for now */}
                  </div>
                </div>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2">{task.description}</p>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 text-xs font-bold">
                       {getUserName(task.assignedTo).charAt(0)}
                    </div>
                    <span>Asignado a: <span className="text-gray-700 font-medium">{getUserName(task.assignedTo)}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={16} />
                    <span>Vence: <span className={`${new Date(task.dueDate) < new Date() && task.status !== TaskStatus.COMPLETED ? 'text-red-600 font-bold' : ''}`}>
                      {new Date(task.dueDate).toLocaleString()}
                    </span></span>
                  </div>
                </div>
              </div>

              <div className="flex md:flex-col items-center justify-between border-t md:border-t-0 md:border-l border-gray-100 pt-4 md:pt-0 md:pl-6 min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                   {getStatusIcon(task.status)}
                   <span className="text-sm font-semibold text-gray-700">{task.status}</span>
                </div>
                
                <select
                  value={task.status}
                  onChange={(e) => onUpdateStatus(task.id, e.target.value as TaskStatus)}
                  className="w-full md:w-auto px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  {Object.values(TaskStatus).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        ))}
        {filteredTasks.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-100 border-dashed">
            <Filter className="mx-auto text-gray-300 mb-2" size={48} />
            <p className="text-gray-500">No se encontraron tareas con los filtros actuales.</p>
          </div>
        )}
      </div>

      <TaskModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        users={users}
        currentUser={currentUser}
        onSave={onCreateTask}
      />
    </div>
  );
};

export default TasksPage;