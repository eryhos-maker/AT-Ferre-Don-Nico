import React, { useState } from 'react';
import { Task, User, TaskStatus, Priority, Role, Branch } from '../types';
import { Plus, Search, Filter, Calendar, AlertTriangle, CheckCircle, Clock, ListTodo, Hash, Upload, FileText, X, ExternalLink, MapPin, MoreVertical, HelpCircle, Download, Trash2, Eye, Paperclip, Edit2 } from 'lucide-react';
import TaskModal from '../components/TaskModal';

interface TasksPageProps {
  tasks: Task[];
  users: User[];
  branches: Branch[];
  currentUser: User;
  onCreateTask: (task: Partial<Task>, attachment?: File) => void;
  onUpdateTask: (task: Partial<Task>, attachment?: File) => void;
  onUpdateStatus: (taskId: string, status: TaskStatus) => void;
  onDeleteTask: (taskId: string) => void;
  onSaveEvidence: (taskId: string, file: File) => void;
}

const EvidenceModal: React.FC<{ 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (file: File) => void; 
  taskTitle: string 
}> = ({ isOpen, onClose, onSave, taskTitle }) => {
  const [isUploading, setIsUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Permitir: Imagenes, PDF y Excel
      const validMimeTypes = [
          'application/pdf', 
          'image/jpeg', 
          'image/png', 
          'image/jpg', 
          'image/webp',
          'application/vnd.ms-excel',
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      ];
      
      const fileExt = selectedFile.name.split('.').pop()?.toLowerCase();
      const validExtensions = ['pdf', 'jpg', 'jpeg', 'png', 'xls', 'xlsx', 'webp'];

      // Verificación robusta por extensión y tipo si es posible
      const isValid = validMimeTypes.includes(selectedFile.type) || (fileExt && validExtensions.includes(fileExt));

      if (!isValid) {
         setErrorMsg("⚠️ Formato no permitido. Solo se aceptan Imágenes, PDF o Excel.");
         setFile(null);
         e.target.value = ''; // Reset input
         return;
      }

      setFile(selectedFile);
      setErrorMsg(null);
    }
  };

  const handleUploadAndSave = () => {
    if (!file) {
      setErrorMsg("⚠️ Acción bloqueada: No se ha subido ningún archivo para completar esta tarea.");
      return;
    }

    setIsUploading(true);
    // Directly save the file through the prop callback (logic moved to App.tsx)
    onSave(file);
    // Note: We close immediately or handle loading state if parent supports it, 
    // for now we set simulate uploading locally then close.
    // In a real app, 'onSave' should probably return a Promise.
    setTimeout(() => {
        setIsUploading(false);
        onClose();
    }, 1000);
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
            La tarea <strong>"{taskTitle}"</strong> requiere evidencia visual o documento para completarse.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-red-100 border border-red-200 text-red-700 rounded-lg text-sm font-bold flex items-center gap-2 animate-pulse shadow-sm">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 transition-colors group relative ${errorMsg ? 'border-red-300 bg-red-50' : 'border-gray-400 bg-gray-50 hover:bg-gray-100'}`}>
          <input 
            type="file" 
            accept=".pdf, .xls, .xlsx, .jpg, .jpeg, .png, .webp"
            onChange={handleFileChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />
          <div className="p-4 bg-white rounded-full shadow-md group-hover:scale-110 transition-transform border border-gray-200">
             {file ? <FileText className="text-green-600" size={24} /> : <Upload className="text-blue-600" size={24} />}
          </div>
          <div className="text-center">
             <p className="text-sm font-bold text-gray-800">
                {file ? file.name : "Haga clic para seleccionar archivo"}
             </p>
             <p className="text-xs text-gray-500 font-medium">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : "PDF, Excel, JPG, PNG"}
             </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2 border-t border-gray-100 pt-4">
           <button onClick={onClose} className="px-4 py-2 text-gray-700 font-bold hover:bg-gray-200 rounded-lg text-sm transition-colors">Cancelar</button>
           <button 
             onClick={handleUploadAndSave} 
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

const ConfirmationModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  isDestructive?: boolean;
}> = ({ isOpen, onClose, onConfirm, title, message, isDestructive }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 border border-gray-300 transform transition-all scale-100">
        <div className="flex flex-col items-center text-center">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mb-4 ${isDestructive ? 'bg-red-100 text-red-600' : 'bg-yellow-100 text-yellow-600'}`}>
             {isDestructive ? <Trash2 size={24} /> : <HelpCircle size={28} />}
          </div>
          <h3 className="text-lg font-black text-gray-900 mb-2">{title}</h3>
          <p className="text-sm text-gray-600 mb-6 font-medium leading-relaxed">
            {message}
          </p>
          
          <div className="flex w-full gap-3">
            <button 
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-bold transition-colors"
            >
              Cancelar
            </button>
            <button 
              onClick={onConfirm}
              className={`flex-1 px-4 py-2 rounded-lg text-sm font-bold shadow-sm transition-colors text-white ${isDestructive ? 'bg-red-600 hover:bg-red-700' : 'bg-blue-700 hover:bg-blue-800'}`}
            >
              Confirmar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const TasksPage: React.FC<TasksPageProps> = ({ tasks, users, branches, currentUser, onCreateTask, onUpdateTask, onUpdateStatus, onDeleteTask, onSaveEvidence }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>(TaskStatus.PENDING);
  const [filterBranch, setFilterBranch] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  
  // Modals state
  const [evidenceTask, setEvidenceTask] = useState<Task | null>(null);
  const [confirmationData, setConfirmationData] = useState<{task: Task, newStatus: TaskStatus} | null>(null);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);
  const [taskToEdit, setTaskToEdit] = useState<Task | null>(null);

  // Authorization checks
  const canCreateTask = ![Role.SUPERVISOR_COM, Role.ENCARGADO_BEREL].includes(currentUser.role);
  // Only Gerente or specific ADMIN payroll/role users can delete
  const canDeleteTask = currentUser.role === Role.GERENTE || currentUser.role === Role.JEFE_ADMIN || currentUser.payrollId === 'ADMIN';

  // Branch restriction for filter UI
  const isBranchRestricted = [Role.ENCARGADO_BEREL, Role.SUPERVISOR_COM].includes(currentUser.role);

  const availableBranches = Array.from(new Set(users.map(u => u.branch).filter(Boolean))) as string[];

  const handleOpenCreateModal = () => {
    setTaskToEdit(null);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (task: Task) => {
    setTaskToEdit(task);
    setIsModalOpen(true);
  };

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

  const getTaskCardStyles = (status: TaskStatus) => {
    switch (status) {
        case TaskStatus.COMPLETED:
            return 'border-l-green-500 bg-green-50/40 border-green-200/60 hover:shadow-green-100';
        case TaskStatus.OVERDUE:
            return 'border-l-red-500 bg-red-50/60 border-red-200/60 hover:shadow-red-100';
        case TaskStatus.IN_PROGRESS:
            return 'border-l-blue-500 bg-blue-50/40 border-blue-200/60 hover:shadow-blue-100';
        default: // PENDING
            return 'border-l-gray-400 bg-white border-gray-200 hover:shadow-gray-100';
    }
  };

  const filteredTasks = tasks.filter(task => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          task.folio?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
    
    // If restricted, filterBranch is ignored (handled by parent props), or forced to user branch.
    // If not restricted, use the dropdown value.
    const matchesBranch = isBranchRestricted ? true : (filterBranch === 'all' || task.branch === filterBranch);

    return matchesSearch && matchesStatus && matchesBranch;
  });

  const getAssignedNames = (userIds: string[]) => {
    if (!userIds || userIds.length === 0) return 'Sin asignar';
    return userIds.map(id => {
        const u = users.find(user => user.id === id);
        // Changed to return full name instead of splitting
        return u ? u.name : 'Desconocido';
    }).join(', ');
  };

  const getFirstAssigneeInitial = (userIds: string[]) => {
      if (!userIds || userIds.length === 0) return '?';
      const u = users.find(user => user.id === userIds[0]);
      return u ? u.name.charAt(0) : '?';
  };

  const handleStatusChangeAttempt = (task: Task, newStatusStr: string) => {
    const newStatus = newStatusStr as TaskStatus;

    // 1. Check if Evidence is required first
    if (newStatus === TaskStatus.COMPLETED && task.requiresEvidence && !task.evidenceUrl) {
      setEvidenceTask(task);
      return;
    }

    // 2. If marking as Completed (and evidence already there or not needed), ask for confirmation
    if (newStatus === TaskStatus.COMPLETED) {
      setConfirmationData({ task, newStatus });
      return;
    }

    // 3. For other statuses (Pending, In Progress), update immediately
    onUpdateStatus(task.id, newStatus);
  };

  const confirmStatusChange = () => {
    if (confirmationData) {
      onUpdateStatus(confirmationData.task.id, confirmationData.newStatus);
      setConfirmationData(null);
    }
  };

  const handleDeleteClick = (task: Task) => {
    setTaskToDelete(task);
  };

  const confirmDelete = () => {
    if (taskToDelete) {
      onDeleteTask(taskToDelete.id);
      setTaskToDelete(null);
    }
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
            onClick={handleOpenCreateModal}
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
           
           {/* Branch Filter - Disabled for restricted users */}
           <div className="relative min-w-[200px]">
             <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-600" size={18} />
             <select 
               disabled={isBranchRestricted}
               className={`w-full pl-10 pr-8 py-2 border-2 border-gray-400 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-600 outline-none appearance-none font-bold transition-colors ${isBranchRestricted ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-50 text-gray-900 cursor-pointer hover:bg-gray-100'}`}
               value={isBranchRestricted ? currentUser.branch : filterBranch}
               onChange={(e) => setFilterBranch(e.target.value)}
             >
               {isBranchRestricted ? (
                 <option value={currentUser.branch}>{currentUser.branch || 'Mi Sucursal'}</option>
               ) : (
                 <>
                    <option value="all">Todas las Sucursales</option>
                    {availableBranches.map(branch => (
                        <option key={branch} value={branch}>{branch}</option>
                    ))}
                 </>
               )}
             </select>
             {!isBranchRestricted && <Filter className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-600 pointer-events-none" size={14} />}
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
            
            // Branch Display Logic: Use task branch, or fallback to assignee's branch
            const firstAssignee = users.find(u => u.id === task.assignedTo?.[0]);
            const displayBranch = task.branch || firstAssignee?.branch;

            return (
          <div key={task.id} className={`relative p-5 rounded-xl border border-l-4 shadow-sm transition-all duration-200 hover:shadow-lg hover:scale-[1.01] hover:-translate-y-1 ${cardStyles} group`}>
            
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="flex-1">
                {/* Header Row: Folio, Priority, Evidence Badge, Buttons */}
                <div className="flex items-center justify-between mb-3">
                   <div className="flex items-center flex-wrap gap-2">
                    <span className="flex items-center gap-1 bg-white/50 text-gray-700 text-[10px] px-2 py-1 rounded-md font-mono border border-gray-200/50 font-bold tracking-tight shadow-sm" title="Folio de Seguimiento">
                        <Hash size={10} /> {task.folio}
                    </span>
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border shadow-sm ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                    {task.requiresEvidence && (
                        <span className="flex items-center gap-1 bg-orange-100/80 text-orange-800 text-[10px] px-2 py-0.5 rounded-md font-bold border border-orange-200/50">
                          <FileText size={10} /> Evidencia
                        </span>
                    )}
                   </div>
                   
                   <div className="flex items-center gap-1">
                      {/* Edit Button - Enabled for creators */}
                      {canCreateTask && (
                        <button
                          onClick={() => handleOpenEditModal(task)}
                          className="text-gray-400 hover:text-blue-600 transition-colors p-1 rounded-full hover:bg-blue-50"
                          title="Editar Tarea"
                        >
                          <Edit2 size={16} />
                        </button>
                      )}
                      
                      {/* Delete Button - Only for Admin/Gerente */}
                      {canDeleteTask && (
                          <button 
                            onClick={() => handleDeleteClick(task)}
                            className="text-gray-400 hover:text-red-600 transition-colors p-1 rounded-full hover:bg-red-50"
                            title="Eliminar Tarea (Admin)"
                          >
                            <Trash2 size={16} />
                          </button>
                      )}
                   </div>
                </div>
                
                {/* Title & Description */}
                <h3 className="text-lg font-bold text-gray-900 mb-1 leading-tight group-hover:text-blue-800 transition-colors">{task.title}</h3>
                <p className="text-gray-700 text-sm mb-4 line-clamp-2 font-medium leading-relaxed">{task.description}</p>
                
                {/* Progress Bar (if subtasks exist) */}
                {totalSubtasks > 0 && (
                    <div className="mb-4 bg-white/50 p-2 rounded-lg border border-gray-200/50">
                        <div className="flex items-center justify-between text-xs text-gray-700 font-bold mb-1">
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

                {/* Footer: Split into Left (Assignee/Branch) and Right (Date/Action) */}
                <div className="flex flex-col xl:flex-row items-start xl:items-center justify-between gap-4 pt-2 border-t border-gray-200/40 mt-auto">
                  
                  {/* Left Side: Assignee and Branch */}
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2 pr-3">
                      <div className="w-6 h-6 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-700 text-xs font-black shadow-sm shrink-0">
                        {getFirstAssigneeInitial(task.assignedTo)}
                      </div>
                      <span className="text-xs text-gray-800 font-bold">{getAssignedNames(task.assignedTo)}</span>
                    </div>

                    {displayBranch && (
                      <div className="flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border bg-gray-50 border-gray-200 text-gray-600 w-fit">
                          <MapPin size={12} />
                          <span className="truncate max-w-[200px]" title={displayBranch}>Sucursal: {displayBranch}</span>
                      </div>
                    )}
                  </div>

                  {/* Right Side: Due Date, Attachment, Evidence */}
                  <div className="flex flex-wrap items-center gap-2 xl:justify-end w-full xl:w-auto">
                     
                     <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-md border ${new Date(task.dueDate) < new Date() && task.status !== TaskStatus.COMPLETED ? 'bg-red-100 text-red-800 border-red-200' : 'bg-white/60 text-gray-700 border-gray-200/60'}`}>
                        <Calendar size={14} />
                        <span className="font-bold mr-1">Vence:</span>
                        <span>{new Date(task.dueDate).toLocaleDateString()} <span className="opacity-60">|</span> {new Date(task.dueDate).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                      </div>

                      {task.attachmentUrl && (
                        <a 
                          href={task.attachmentUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-indigo-700 hover:text-indigo-900 hover:underline text-xs bg-indigo-50 px-2 py-1 rounded border border-indigo-200 font-bold transition-colors"
                          title="Descargar Archivo Adjunto (Soporte)"
                        >
                          <Download size={12} /> 
                          <span>Descargar {task.attachmentName || "Adjunto"}</span>
                        </a>
                      )}

                      {task.evidenceUrl && (
                        <a 
                          href={task.evidenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 text-blue-800 hover:text-blue-900 hover:underline text-xs bg-blue-100/50 px-2 py-1 rounded border border-blue-200/50 font-bold transition-colors"
                        >
                          <Eye size={12} /> Ver Evidencia
                        </a>
                      )}
                  </div>

                </div>
              </div>

              {/* Status Action Column */}
              <div className="flex md:flex-col items-center justify-between md:justify-start gap-3 border-t md:border-t-0 md:border-l border-gray-200/40 pt-4 md:pt-0 md:pl-6 min-w-[180px]">
                 <div className="flex items-center gap-2 w-full md:w-auto justify-center md:justify-start">
                    {getStatusIcon(task.status)}
                    <span className={`text-sm font-bold capitalize ${
                        task.status === TaskStatus.COMPLETED ? 'text-green-800' :
                        task.status === TaskStatus.OVERDUE ? 'text-red-800' :
                        task.status === TaskStatus.IN_PROGRESS ? 'text-blue-800' : 'text-gray-800'
                    }`}>
                        {task.status.replace('_', ' ')}
                    </span>
                 </div>

                 <div className="relative w-full">
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChangeAttempt(task, e.target.value)}
                      className="w-full appearance-none px-3 py-2 bg-white/80 backdrop-blur-sm border-2 border-gray-300 rounded-lg text-sm text-gray-800 font-bold focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none cursor-pointer hover:border-gray-400 transition-colors shadow-sm"
                    >
                      {Object.values(TaskStatus).map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <MoreVertical size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 pointer-events-none" />
                 </div>
                 
                 <p className="text-[10px] text-center text-gray-500 leading-tight hidden md:block mt-auto font-medium">
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
        onClose={() => { setIsModalOpen(false); setTaskToEdit(null); }}
        users={users}
        branches={branches}
        currentUser={currentUser}
        onSave={(data, file) => {
            if (taskToEdit) {
                onUpdateTask(data, file);
            } else {
                onCreateTask(data, file);
            }
        }}
        initialData={taskToEdit}
      />
      
      {/* Evidence Modal (Existing) */}
      {evidenceTask && (
        <EvidenceModal 
          isOpen={true}
          taskTitle={evidenceTask.title}
          onClose={() => {
            setEvidenceTask(null);
          }}
          onSave={(file) => {
             onSaveEvidence(evidenceTask.id, file);
             setEvidenceTask(null);
          }}
        />
      )}

      {/* Confirmation Modal (Status Change) */}
      {confirmationData && (
        <ConfirmationModal
          isOpen={true}
          title="¿Confirmar Finalización?"
          message={`Estás a punto de marcar la tarea "${confirmationData.task.title}" como Completada. Esta acción quedará registrada en el historial.`}
          onClose={() => setConfirmationData(null)}
          onConfirm={confirmStatusChange}
        />
      )}

      {/* Delete Confirmation Modal (New) */}
      {taskToDelete && (
        <ConfirmationModal
          isOpen={true}
          title="¿Eliminar Tarea?"
          message={`¿Estás seguro que deseas eliminar la tarea "${taskToDelete.title}"? Esta acción no se puede deshacer.`}
          onClose={() => setTaskToDelete(null)}
          onConfirm={confirmDelete}
          isDestructive={true}
        />
      )}
    </div>
  );
};

export default TasksPage;