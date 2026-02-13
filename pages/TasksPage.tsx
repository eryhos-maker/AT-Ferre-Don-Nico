import React, { useState } from 'react';
import { Task, User, TaskStatus, Priority, Role } from '../types';
import { Plus, Search, Filter, Calendar, AlertTriangle, CheckCircle, Clock, ListTodo, Hash, Upload, FileText, X, ExternalLink, MapPin } from 'lucide-react';
import TaskModal from '../components/TaskModal';

interface TasksPageProps {
  tasks: Task[];
  users: User[];
  currentUser: User;
  onCreateTask: (task: Partial<Task>) => void;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onSaveEvidence: (taskId: string, evidenceUrl: string) => void;
}

const EvidenceModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (url: string) => void; 
  taskTitle: string 
}> = ({ isOpen, onClose, onSave, taskTitle }) => {
  const [isUploading, setIsUploading] = useState(false);
  
  if (!isOpen) return null;

  const handleSimulateUpload = () => {
    setIsUploading(true);
    // Simular delay de red
    setTimeout(() => {
      setIsUploading(false);
      // Simular URL generada
      const dummyUrl = "https://example.com/evidencia-" + Math.floor(Math.random() * 1000) + ".pdf";
      onSave(dummyUrl);
      onClose();
    }, 1500);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 border border-gray-300">
        <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-3">
          <h3 className="text-xl font-black text-gray-900">Evidencia Requerida</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
        </div>
        
        <div className="bg-orange-50 border border-orange-200 p-3 rounded-lg flex items-start gap-2 mb-4">
          <AlertTriangle className="text-orange-600 shrink-0 mt-0.5" size={16} />
          <p className="text-sm font-medium text-orange-800">
            La tarea <strong>"{taskTitle}"</strong> requiere evidencia visual para completarse.
          </p>
        </div>

        <div className="border-2 border-dashed border-gray-400 rounded-xl p-8 flex flex-col items-center justify-center gap-3 bg-gray-50 hover:bg-gray-100 transition-colors cursor-pointer group" onClick={handleSimulateUpload}>
          <div className="p-4 bg-white rounded-full shadow-md group-hover:scale-110 transition-transform border border-gray-200">
             <Upload className="text-blue-600" size={24} />
          </div>
          <div className="text-center">
             <p className="text-sm font-bold text-gray-800">Haga clic para subir archivo</p>
             <p className="text-xs text-gray-500 font-medium">PDF, JPG, PNG (Max 5MB)</p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
           <button onClick={onClose} className="px-4 py-2 text-gray-700 font-bold hover:bg-gray-200 rounded-lg text-sm transition-colors">Cancelar</button>
           <button 
             onClick={handleSimulateUpload} 
             disabled={isUploading}
             className="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-bold hover:bg-blue-800 disabled:opacity-50 flex items-center gap-2 shadow-sm"
           >
             {isUploading ? 'Subiendo...' : 'Subir y Completar'}
           </button>
        </div>
      </div>
    </div>
  );
};

const TasksPage: React.FC<TasksPageProps> = ({ tasks, users, currentUser, onCreateTask, onUpdateStatus, onSaveEvidence }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>(TaskStatus.PENDING);
  const [filterBranch, setFilterBranch] = useState<string>('all'); // Nuevo filtro
  const [searchTerm, setSearchTerm] = useState('');
  
  // Estado para el manejo de evidencia
  const [evidenceTask, setEvidenceTask] = useState<Task | null>(null);

  // Permission Logic: Supervisor Comercial and Encargado Berel cannot create tasks
  const canCreateTask = ![Role.SUPERVISOR_COM, Role.ENCARGADO_BEREL].includes(currentUser.role);

  // Obtener sucursales únicas de los usuarios para el filtro
  const availableBranches = Array.from(new Set(users.map(u => u.branch).filter(Boolean))) as string[];

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.CRITICAL: return 'bg-red-100 text-red-800 border-red-300 font-bold';
      case Priority.HIGH: return 'bg-orange-100 text-orange-800 border-orange-300 font-bold';
      case Priority.MEDIUM: return 'bg-blue-100 text-blue-800 border-blue-300 font-bold';
      case Priority.LOW: return 'bg-gray-100 text-gray-700 border-gray-300 font-medium';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED: return <CheckCircle size={16} className="text-green-600" />;
      case TaskStatus.OVERDUE: return <AlertTriangle size={16} className="text-red-600" />;
      case TaskStatus.IN_PROGRESS: return <Clock size={16} className="text-blue-600" />;
      default: return <div className="w-4 h-4 rounded-full border-2 border-gray-400" />;
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          task.folio?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;

    // Lógica filtro por Sucursal:
    // La tarea pertenece a una sucursal si ALGUNO de sus usuarios asignados pertenece a esa sucursal.
    const matchesBranch = filterBranch === 'all' || task.assignedTo.some(uid => {
        const user = users.find(u => u.id === uid);
        return user?.branch === filterBranch;
    });

    return matchesSearch && matchesStatus && matchesBranch;
  });

  const getAssignedNames = (userIds: string[]) => {
    if (!userIds || userIds.length === 0) return 'Sin asignar';
    return userIds.map(id => {
        const u = users.find(user => user.id === id);
        return u ? u.name.split(' ')[0] : 'Desconocido';
    }).join(', ');
  };

  const getFirstAssigneeInitial = (userIds: string[]) => {
      if (!userIds || userIds.length === 0) return '?';
      const u = users.find(user => user.id === userIds[0]);
      return u ? u.name.charAt(0) : '?';
  };

  // Intercept Status Change
  const handleStatusChangeAttempt = (task: Task, newStatus: string) => {
    // Si intenta completar y requiere evidencia Y no tiene evidencia
    if (newStatus === TaskStatus.COMPLETED && task.requiresEvidence && !task.evidenceUrl) {
      setEvidenceTask(task);
      return;
    }
    // Si no hay restricciones, actualiza normal
    onUpdateStatus(task.id, newStatus as TaskStatus);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900">Gestión de Tareas</h2>
          <p className="text-gray-600 font-medium">Administra y asigna operaciones diarias</p>
        </div>
        {canCreateTask && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-700 hover:bg-blue-800 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-md transition-colors font-bold"
          >
            <Plus size={20} />
            Nueva Tarea
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
        
        {/* Row 1: Search and Branch Filter */}
        <div className="flex flex-col md:flex-row gap-4">
           <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
             <input
               type="text"
               placeholder="Buscar por título, descripción o folio..."
               className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none text-gray-900 placeholder-gray-400 bg-gray-50"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
           
           <div className="relative min-w-[200px]">
             <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600" size={18} />
             <select 
               className="w-full pl-10 pr-8 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none appearance-none bg-gray-50 text-gray-900 font-bold cursor-pointer hover:bg-gray-100"
               value={filterBranch}
               onChange={(e) => setFilterBranch(e.target.value)}
             >
               <option value="all">Todas las Sucursales</option>
               {availableBranches.map(branch => (
                 <option key={branch} value={branch}>{branch}</option>
               ))}
             </select>
             <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 pointer-events-none" size={14} />
           </div>
        </div>

        {/* Row 2: Status Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {/* Orden Específico: Pendientes primero, luego el flujo natural */}
          {[TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.OVERDUE, TaskStatus.COMPLETED].map(status => (
             <button
             key={status}
             onClick={() => setFilterStatus(status)}
             className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors border ${filterStatus === status ? 'bg-blue-700 text-white border-blue-800 shadow-md' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 hover:border-gray-400'}`}
           >
             {status}
           </button>
          ))}
          {/* 'Todas' al final */}
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-colors border ${filterStatus === 'all' ? 'bg-gray-800 text-white border-gray-900 shadow-md' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-100 hover:border-gray-400'}`}
          >
            Todas
          </button>
        </div>
      </div>

      {/* Task List */}
      <div className="grid grid-cols-1 gap-4">
        {filteredTasks.map((task) => {
            const completedSubtasks = task.subtasks?.filter(st => st.isCompleted).length || 0;
            const totalSubtasks = task.subtasks?.length || 0;
            const subtaskProgress = totalSubtasks > 0 ? (completedSubtasks / totalSubtasks) * 100 : 0;

            return (
          <div key={task.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm hover:shadow-lg hover:border-blue-200 transition-all group">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded font-mono border border-gray-300 font-bold" title="Folio de Seguimiento">
                        <Hash size={10} /> {task.folio}
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-bold border ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    {task.requiresEvidence && (
                       <span className="flex items-center gap-1 bg-orange-100 text-orange-800 text-xs px-2 py-0.5 rounded font-bold border border-orange-200">
                         <FileText size={10} /> Evidencia Req.
                       </span>
                    )}
                  </div>
                </div>
                
                <h3 className="text-xl font-bold text-gray-900 mb-1">{task.title}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2 font-medium">{task.description}</p>
                
                {/* Subtasks Progress */}
                {totalSubtasks > 0 && (
                    <div className="mb-4">
                        <div className="flex items-center justify-between text-xs text-gray-600 font-bold mb-1">
                            <span className="flex items-center gap-1"><ListTodo size={12}/> Subtareas ({completedSubtasks}/{totalSubtasks})</span>
                            <span>{Math.round(subtaskProgress)}%</span>
                        </div>
                        <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden border border-gray-300">
                            <div 
                                className={`h-full rounded-full transition-all duration-500 ${subtaskProgress === 100 ? 'bg-green-500' : 'bg-blue-600'}`} 
                                style={{ width: `${subtaskProgress}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 font-medium">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 rounded-full bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-800 text-xs font-bold">
                       {getFirstAssigneeInitial(task.assignedTo)}
                    </div>
                    <span>Asignado a: <span className="text-gray-900 font-bold">{getAssignedNames(task.assignedTo)}</span></span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Calendar size={16} />
                    <span>Vence: <span className={`${new Date(task.dueDate) < new Date() && task.status !== TaskStatus.COMPLETED ? 'text-red-600 font-black' : 'text-gray-800 font-bold'}`}>
                      {new Date(task.dueDate).toLocaleString()}
                    </span></span>
                  </div>
                  {task.evidenceUrl && (
                    <a 
                      href="#" 
                      className="flex items-center gap-1 text-blue-700 hover:underline text-xs bg-blue-50 px-2 py-1 rounded border border-blue-200 font-bold"
                      onClick={(e) => { e.preventDefault(); alert("Abriendo evidencia: " + task.evidenceUrl); }}
                    >
                      <ExternalLink size={12} /> Ver Evidencia
                    </a>
                  )}
                </div>
              </div>

              <div className="flex md:flex-col items-center justify-between border-t md:border-t-0 md:border-l border-gray-200 pt-4 md:pt-0 md:pl-6 min-w-[200px]">
                <div className="flex items-center gap-2 mb-2">
                   {getStatusIcon(task.status)}
                   <span className="text-sm font-bold text-gray-900">{task.status}</span>
                </div>
                
                <select
                  value={task.status}
                  onChange={(e) => handleStatusChangeAttempt(task, e.target.value)}
                  className="w-full md:w-auto px-3 py-1.5 bg-gray-50 border-2 border-gray-400 rounded-lg text-sm text-gray-900 font-bold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer hover:bg-gray-100"
                >
                  {Object.values(TaskStatus).map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <p className="text-xs text-center text-gray-400 mt-2 hidden md:block font-medium">
                    Cerrar la tarea finalizará el proceso para todos los asignados.
                </p>
              </div>
            </div>
          </div>
        )})}
        {filteredTasks.length === 0 && (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200 border-dashed">
            <Filter className="mx-auto text-gray-300 mb-2" size={48} />
            <p className="text-gray-500 font-medium">No se encontraron tareas con los filtros actuales.</p>
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
      
      {/* Modal de Evidencia */}
      {evidenceTask && (
        <EvidenceModal 
          isOpen={true}
          taskTitle={evidenceTask.title}
          onClose={() => setEvidenceTask(null)}
          onSave={(url) => {
             onSaveEvidence(evidenceTask.id, url);
             setEvidenceTask(null);
          }}
        />
      )}
    </div>
  );
};

export default TasksPage;