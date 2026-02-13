import React, { useState } from 'react';
import { Task, User, TaskStatus, Priority, Role } from '../types';
import { Plus, Search, Filter, Calendar, AlertTriangle, CheckCircle, Clock, ListTodo, Hash, Upload, FileText, X, ExternalLink, MapPin, MoreVertical } from 'lucide-react';
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
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [evidenceTask, setEvidenceTask] = useState<Task | null>(null);

  const canCreateTask = ![Role.SUPERVISOR_COM, Role.ENCARGADO_BEREL].includes(currentUser.role);
  const availableBranches = Array.from(new Set(users.map(u => u.branch).filter(Boolean))) as string[];

  const getPriorityColor = (priority: Priority) => {
    switch (priority) {
      case Priority.CRITICAL: return 'bg-red-50 text-red-700 border-red-200 ring-1 ring-red-300';
      case Priority.HIGH: return 'bg-orange-50 text-orange-700 border-orange-200 ring-1 ring-orange-300';
      case Priority.MEDIUM: return 'bg-blue-50 text-blue-700 border-blue-200 ring-1 ring-blue-300';
      case Priority.LOW: return 'bg-gray-50 text-gray-600 border-gray-200 ring-1 ring-gray-300';
      default: return 'bg-gray-50 text-gray-600 border-gray-200';
    }
  };

  const getStatusIcon = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED: return <CheckCircle size={18} className="text-green-600" />;
      case TaskStatus.OVERDUE: return <AlertTriangle size={18} className="text-red-600" />;
      case TaskStatus.IN_PROGRESS: return <Clock size={18} className="text-blue-600" />;
      default: return <div className="w-4 h-4 rounded-full border-2 border-gray-400" />;
    }
  };

  // Helper para estilos de la tarjeta según estado
  const getTaskCardStyles = (status: TaskStatus) => {
    switch (status) {
        case TaskStatus.COMPLETED:
            return 'border-l-green-500 hover:shadow-green-100';
        case TaskStatus.OVERDUE:
            return 'border-l-red-500 bg-red-50/40 hover:shadow-red-100';
        case TaskStatus.IN_PROGRESS:
            return 'border-l-blue-500 bg-blue-50/30 hover:shadow-blue-100';
        default: // PENDING
            return 'border-l-gray-400 hover:shadow-gray-100';
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          task.folio?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
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

  const handleStatusChangeAttempt = (task: Task, newStatus: string) => {
    if (newStatus === TaskStatus.COMPLETED && task.requiresEvidence && !task.evidenceUrl) {
      setEvidenceTask(task);
      return;
    }
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
        <div className="flex flex-col md:flex-row gap-4">
           <div className="relative flex-1">
             <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500" size={20} />
             <input
               type="text"
               placeholder="Buscar por título, descripción o folio..."
               className="w-full pl-10 pr-4 py-2 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none text-gray-900 placeholder-gray-400 bg-gray-50 transition-colors"
               value={searchTerm}
               onChange={(e) => setSearchTerm(e.target.value)}
             />
           </div>
           
           <div className="relative min-w-[200px]">
             <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600" size={18} />
             <select 
               className="w-full pl-10 pr-8 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none appearance-none bg-gray-50 text-gray-900 font-bold cursor-pointer hover:bg-gray-100 transition-colors"
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

        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {[TaskStatus.PENDING, TaskStatus.IN_PROGRESS, TaskStatus.OVERDUE, TaskStatus.COMPLETED].map(status => (
             <button
             key={status}
             onClick={() => setFilterStatus(status)}
             className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all border ${filterStatus === status ? 'bg-blue-800 text-white border-blue-900 shadow-md transform scale-105' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400'}`}
           >
             {status}
           </button>
          ))}
          <button
            onClick={() => setFilterStatus('all')}
            className={`px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all border ${filterStatus === 'all' ? 'bg-gray-800 text-white border-gray-900 shadow-md transform scale-105' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50 hover:border-gray-400'}`}
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
            const cardStyles = getTaskCardStyles(task.status);

            return (
          <div key={task.id} className={`relative bg-white p-5 rounded-xl border border-gray-200 border-l-4 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${cardStyles} group`}>
            
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="flex-1">
                {/* Header Row: Folio, Priority, Evidence Badge */}
                <div className="flex items-center flex-wrap gap-2 mb-3">
                  <span className="flex items-center gap-1 bg-white text-gray-600 text-[10px] px-2 py-1 rounded-md font-mono border border-gray-200 font-bold tracking-tight shadow-sm" title="Folio de Seguimiento">
                      <Hash size={10} /> {task.folio}
                  </span>
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                  </span>
                  {task.requiresEvidence && (
                      <span className="flex items-center gap-1 bg-orange-50 text-orange-700 text-[10px] px-2 py-0.5 rounded-md font-bold border border-orange-200">
                        <FileText size={10} /> Evidencia
                      </span>
                  )}
                </div>
                
                {/* Title & Description */}
                <h3 className="text-lg font-bold text-gray-900 mb-1 leading-tight group-hover:text-blue-800 transition-colors">{task.title}</h3>
                <p className="text-gray-600 text-sm mb-4 line-clamp-2 font-medium leading-relaxed">{task.description}</p>
                
                {/* Progress Bar (if subtasks exist) */}
                {totalSubtasks > 0 && (
                    <div className="mb-4 bg-gray-50 p-2 rounded-lg border border-gray-100">
                        <div className="flex items-center justify-between text-xs text-gray-600 font-bold mb-1">
                            <span className="flex items-center gap-1"><ListTodo size={12}/> Progreso</span>
                            <span>{Math.round(subtaskProgress)}%</span>
                        </div>
                        <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                                className={`h-full rounded-full transition-all duration-500 ${subtaskProgress === 100 ? 'bg-green-500' : 'bg-blue-600'}`} 
                                style={{ width: `${subtaskProgress}%` }}
                            ></div>
                        </div>
                    </div>
                )}

                {/* Footer: Assignee, Date, Evidence Link */}
                <div className="flex flex-wrap items-center gap-y-2 gap-x-4 text-sm text-gray-500 font-medium pt-2 border-t border-gray-100/50">
                  <div className="flex items-center gap-2 bg-gray-50 pr-3 rounded-full border border-gray-100">
                    <div className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 text-xs font-black shadow-sm">
                       {getFirstAssigneeInitial(task.assignedTo)}
                    </div>
                    <span className="text-xs text-gray-700">{getAssignedNames(task.assignedTo)}</span>
                  </div>

                  <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border ${new Date(task.dueDate) < new Date() && task.status !== TaskStatus.COMPLETED ? 'bg-red-50 text-red-700 border-red-100' : 'bg-gray-50 text-gray-600 border-gray-100'}`}>
                    <Calendar size={14} />
                    <span>{new Date(task.dueDate).toLocaleDateString()} <span className="text-gray-400">|</span> {new Date(task.dueDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>

                  {task.evidenceUrl && (
                    <a 
                      href="#" 
                      className="flex items-center gap-1 text-blue-700 hover:text-blue-900 hover:underline text-xs bg-blue-50/50 px-2 py-1 rounded border border-blue-100 font-bold transition-colors ml-auto md:ml-0"
                      onClick={(e) => { e.preventDefault(); alert("Abriendo evidencia: " + task.evidenceUrl); }}
                    >
                      <ExternalLink size={12} /> Ver Evidencia
                    </a>
                  )}
                </div>
              </div>

              {/* Status Action Column */}
              <div className="flex md:flex-col items-center justify-between md:justify-start gap-3 border-t md:border-t-0 md:border-l border-gray-200 pt-4 md:pt-0 md:pl-6 min-w-[180px]">
                 <div className="flex items-center gap-2 w-full md:w-auto justify-center md:justify-start">
                    {getStatusIcon(task.status)}
                    <span className={`text-sm font-bold capitalize ${
                        task.status === TaskStatus.COMPLETED ? 'text-green-700' :
                        task.status === TaskStatus.OVERDUE ? 'text-red-700' :
                        task.status === TaskStatus.IN_PROGRESS ? 'text-blue-700' : 'text-gray-700'
                    }`}>
                        {task.status.replace('_', ' ')}
                    </span>
                 </div>

                 <div className="relative w-full">
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChangeAttempt(task, e.target.value)}
                      className="w-full appearance-none px-3 py-2 bg-white border-2 border-gray-300 rounded-lg text-sm text-gray-800 font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer hover:border-gray-400 transition-colors shadow-sm"
                    >
                      {Object.values(TaskStatus).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <MoreVertical size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                 </div>
                 
                 <p className="text-[10px] text-center text-gray-400 leading-tight hidden md:block mt-auto">
                    Cambiar el estado notificará a los asignados.
                 </p>
              </div>
            </div>
          </div>
        )})}
        
        {filteredTasks.length === 0 && (
          <div className="text-center py-16 bg-white rounded-xl border-2 border-gray-100 border-dashed">
            <div className="bg-gray-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Filter className="text-gray-400" size={32} />
            </div>
            <h3 className="text-lg font-bold text-gray-900 mb-1">Sin resultados</h3>
            <p className="text-gray-500 font-medium">No se encontraron tareas con los filtros actuales.</p>
            <button onClick={() => {setSearchTerm(''); setFilterStatus('all'); setFilterBranch('all');}} className="mt-4 text-blue-700 hover:text-blue-900 text-sm font-bold hover:underline">
                Limpiar filtros
            </button>
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