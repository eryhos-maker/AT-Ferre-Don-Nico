import React, { useState, useEffect } from 'react';
import { X, Sparkles, Loader2, Calendar, FileCheck, Plus, Trash2, ListTodo, Users, Paperclip, Clock, Zap, ArrowRight, Sun, Moon, Briefcase, MapPin, History, UserCircle2, MessageSquare } from 'lucide-react';
import { User, Priority, Task, Subtask, Branch, AuditLog } from '../types';
import { analyzeTask } from '../services/geminiService';
import { fetchAuditLogs } from '../services/supabaseService';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  branches?: Branch[]; // Para el selector de sucursales
  currentUser: User;
  onSave: (task: Partial<Task>, attachmentFile?: File) => void;
  initialData?: Task | null; // Data si estamos editando
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, users, branches = [], currentUser, onSave, initialData }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
  
  // Details State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [primaryAssignee, setPrimaryAssignee] = useState('');
  const [secondaryAssignee, setSecondaryAssignee] = useState('');
  const [selectedBranch, setSelectedBranch] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [requiresEvidence, setRequiresEvidence] = useState(false);
  const [attachment, setAttachment] = useState<File | null>(null);

  // History State
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  const DAYS = [
    { label: 'D', value: 0 },
    { label: 'L', value: 1 },
    { label: 'M', value: 2 },
    { label: 'M', value: 3 },
    { label: 'J', value: 4 },
    { label: 'V', value: 5 },
    { label: 'S', value: 6 },
  ];

  // Load initialData
  useEffect(() => {
    if (initialData) {
        setTitle(initialData.title);
        setDescription(initialData.description);
        
        if (initialData.assignedTo && initialData.assignedTo.length > 0) {
            setPrimaryAssignee(initialData.assignedTo[0]);
            if (initialData.assignedTo.length > 1) {
                setSecondaryAssignee(initialData.assignedTo[1]);
            } else {
                setSecondaryAssignee('');
            }
        }
        
        if (initialData.dueDate) {
            try {
                const dateObj = new Date(initialData.dueDate);
                const offset = dateObj.getTimezoneOffset() * 60000;
                const localISOTime = (new Date(dateObj.getTime() - offset)).toISOString().slice(0, 16);
                setDueDate(localISOTime);
            } catch (e) {
                setDueDate('');
            }
        }

        setPriority(initialData.priority);
        setSubtasks(initialData.subtasks || []);
        setIsRecurring(!!initialData.isRecurring);
        setSelectedDays(initialData.recurringDays || []);
        setRequiresEvidence(!!initialData.requiresEvidence);
        
        if (initialData.branch) {
            const match = branches.find(b => b.id === initialData.branch || b.nombre_sucursal === initialData.branch);
            if (match) setSelectedBranch(match.nombre_sucursal);
            else setSelectedBranch(initialData.branch); 
        }

        // Load logs
        loadLogs(initialData.id);

    } else {
        // Reset fields
        setTitle('');
        setDescription('');
        setPrimaryAssignee('');
        setSecondaryAssignee('');
        setDueDate('');
        setPriority(Priority.MEDIUM);
        setSubtasks([]);
        setIsRecurring(false);
        setSelectedDays([]);
        setRequiresEvidence(false);
        setSelectedBranch(currentUser.branch || ''); 
        setAttachment(null);
        setLogs([]);
    }
    
    // Reset tab to details on open
    setActiveTab('details');

  }, [initialData, isOpen, currentUser, branches]);

  const loadLogs = async (taskId: string) => {
    setLoadingLogs(true);
    try {
      const data = await fetchAuditLogs(taskId);
      setLogs(data);
    } catch (e) {
      console.error("Failed to load logs", e);
    } finally {
      setLoadingLogs(false);
    }
  };

  if (!isOpen) return null;

  const handleAIAnalysis = async () => {
    if (!title || !description) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeTask(title, description);
      setPriority(result.priority);
      const aiSubtasks: Subtask[] = result.suggestedSteps.map((step, index) => ({
        id: `ai-${Date.now()}-${index}`,
        title: step,
        isCompleted: false
      }));
      setSubtasks(prev => [...prev, ...aiSubtasks]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAddSubtask = () => {
    if (!newSubtaskTitle.trim()) return;
    const newSubtask: Subtask = {
      id: `st-${Date.now()}`,
      title: newSubtaskTitle,
      isCompleted: false
    };
    setSubtasks([...subtasks, newSubtask]);
    setNewSubtaskTitle('');
  };

  const handleRemoveSubtask = (id: string) => {
    setSubtasks(subtasks.filter(st => st.id !== id));
  };

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedExtensions = ['pdf', 'xls', 'xlsx', 'jpg', 'jpeg', 'png', 'webp'];
      const fileExt = file.name.split('.').pop()?.toLowerCase();
      if (fileExt && allowedExtensions.includes(fileExt)) {
        setAttachment(file);
      } else {
        alert("Formato no soportado. Use: PDF, Excel, o Imágenes (JPG/PNG).");
        e.target.value = ''; 
      }
    }
  };

  const setQuickDate = (type: 'today_end' | 'tomorrow_morning' | 'tomorrow_end' | 'next_monday') => {
    const now = new Date();
    const target = new Date(now);
    switch (type) {
        case 'today_end': target.setHours(18, 0, 0, 0); break;
        case 'tomorrow_morning': target.setDate(now.getDate() + 1); target.setHours(9, 0, 0, 0); break;
        case 'tomorrow_end': target.setDate(now.getDate() + 1); target.setHours(18, 0, 0, 0); break;
        case 'next_monday':
            const day = now.getDay();
            const diff = now.getDate() - day + (day === 0 ? -6 : 1) + 7;
            target.setDate(diff); target.setHours(9, 0, 0, 0); break;
    }
    const offset = target.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(target.getTime() - offset)).toISOString().slice(0, 16);
    setDueDate(localISOTime);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const assignedTo = [primaryAssignee];
    if (secondaryAssignee && secondaryAssignee !== primaryAssignee) {
      assignedTo.push(secondaryAssignee);
    }
    onSave({
      id: initialData?.id, 
      title,
      description,
      assignedTo,
      dueDate: new Date(dueDate).toISOString(),
      priority,
      createdBy: initialData ? initialData.createdBy : currentUser.id, 
      isRecurring,
      recurringDays: isRecurring ? selectedDays : [],
      requiresEvidence,
      subtasks,
      attachmentName: attachment ? attachment.name : (initialData?.attachmentName),
      branch: selectedBranch 
    }, attachment || undefined);
    onClose();
  };

  const getUserName = (userId: string) => {
    const u = users.find(user => user.id === userId);
    return u ? u.name : 'Usuario Desconocido';
  };
  
  const getUserAvatar = (userId: string) => {
    const u = users.find(user => user.id === userId);
    return u ? u.avatar : null;
  }

  const formatLogDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh] border border-gray-300">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-100">
          <h2 className="text-lg font-black text-gray-900 flex items-center gap-2">
            {initialData ? <div className="text-orange-600"><Briefcase size={24} /></div> : <div className="text-blue-700"><Plus size={24} /></div>}
            {initialData ? 'Editar Tarea' : 'Nueva Tarea Operativa'}
          </h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors bg-gray-200 hover:bg-gray-300 rounded-full p-1">
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation */}
        {initialData && (
          <div className="flex border-b border-gray-200 bg-white">
            <button
              onClick={() => setActiveTab('details')}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'details' ? 'border-blue-700 text-blue-800' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              Detalles
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 py-3 text-sm font-bold border-b-2 transition-colors ${activeTab === 'history' ? 'border-blue-700 text-blue-800' : 'border-transparent text-gray-500 hover:text-gray-800'}`}
            >
              Historial de Auditoría
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar">
          
          {/* --- DETAILS TAB --- */}
          {activeTab === 'details' && (
            <div className="p-6">
                <form id="task-form" onSubmit={handleSubmit} className="space-y-6">
                    {/* Title & Description Group */}
                    <div className="space-y-4">
                        <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1">Título de la Tarea</label>
                        <input
                            type="text"
                            required
                            className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-blue-600 outline-none bg-gray-50 text-gray-900 transition-colors placeholder-gray-400 font-bold text-lg"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="Ej. Inventario de Pinturas"
                        />
                        </div>

                        <div>
                        <label className="block text-sm font-bold text-gray-800 mb-1">Descripción</label>
                        <textarea
                            required
                            rows={2}
                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 outline-none bg-gray-50 text-gray-900 transition-colors placeholder-gray-400 resize-none"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Detalles de la operación..."
                        />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Left Column */}
                        <div className="space-y-4">
                            <div className="bg-blue-50/50 p-4 rounded-xl border border-blue-100">
                                <label className="block text-sm font-black text-blue-900 mb-3 flex items-center gap-2">
                                    <Clock size={16} /> Planificación
                                </label>
                                
                                <div className="grid grid-cols-2 gap-2 mb-3">
                                    <button type="button" onClick={() => setQuickDate('today_end')} className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"><ArrowRight size={12} /> Hoy 6 PM</button>
                                    <button type="button" onClick={() => setQuickDate('tomorrow_morning')} className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"><Sun size={12} /> Mañana 9 AM</button>
                                    <button type="button" onClick={() => setQuickDate('tomorrow_end')} className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"><Moon size={12} /> Mañana 6 PM</button>
                                    <button type="button" onClick={() => setQuickDate('next_monday')} className="flex items-center justify-center gap-1.5 px-2 py-1.5 bg-white border border-blue-200 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100 transition-colors"><Briefcase size={12} /> Prox. Lunes</button>
                                </div>

                                <div className="space-y-3">
                                    <div>
                                        <label className="text-xs font-bold text-gray-600 mb-1 block">{isRecurring ? 'Fecha Límite' : 'Vencimiento Exacto'}</label>
                                        <div className="relative">
                                            <input
                                                type="datetime-local"
                                                required
                                                className="w-full pl-9 pr-3 py-2 border-2 border-blue-200 rounded-lg focus:border-blue-600 bg-white text-gray-900 outline-none text-sm font-bold shadow-sm"
                                                value={dueDate}
                                                onChange={(e) => setDueDate(e.target.value)}
                                            />
                                            <Calendar className="absolute left-2.5 top-1/2 -translate-y-1/2 text-blue-500" size={16} />
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="text-xs font-bold text-gray-600 mb-1 block">Nivel de Prioridad</label>
                                        <select
                                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 bg-white text-gray-900 outline-none font-bold text-sm"
                                            value={priority}
                                            onChange={(e) => setPriority(e.target.value as Priority)}
                                        >
                                            {Object.values(Priority).map(p => (
                                            <option key={p} value={p}>{p}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                                <div className="flex justify-between items-center mb-1">
                                    <span className="text-xs font-bold text-indigo-900 uppercase flex items-center gap-1">
                                    <Sparkles size={14} /> Asistente IA
                                    </span>
                                    <button
                                    type="button"
                                    onClick={handleAIAnalysis}
                                    disabled={isAnalyzing || !title}
                                    className="text-xs bg-indigo-700 text-white px-3 py-1 rounded-md hover:bg-indigo-800 disabled:opacity-50 transition-colors font-bold"
                                    >
                                    {isAnalyzing ? <span className="flex items-center gap-1"><Loader2 className="animate-spin" size={12}/> Analizando...</span> : 'Sugerir Subtareas'}
                                    </button>
                                </div>
                                <p className="text-[10px] text-indigo-500 font-medium">La IA definirá prioridad y pasos automáticamente.</p>
                            </div>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-4">
                            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3">
                                <label className="block text-sm font-black text-gray-800 flex items-center gap-2">
                                    <Users size={16} /> Asignación
                                </label>
                                <div className="space-y-3">
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1 font-bold">Responsable Principal *</label>
                                        <select
                                            required
                                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 bg-white text-gray-900 outline-none text-sm font-medium"
                                            value={primaryAssignee}
                                            onChange={(e) => {
                                            const userId = e.target.value;
                                            setPrimaryAssignee(userId);
                                            const user = users.find(u => u.id === userId);
                                            if (user && user.branch) {
                                                setSelectedBranch(user.branch);
                                            }
                                            }}
                                        >
                                            <option value="">Seleccionar...</option>
                                            {users.map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs text-gray-600 mb-1 font-bold">Apoyo / Secundario</label>
                                        <select
                                            className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 bg-white text-gray-900 outline-none text-sm font-medium"
                                            value={secondaryAssignee}
                                            onChange={(e) => setSecondaryAssignee(e.target.value)}
                                        >
                                            <option value="">Ninguno</option>
                                            {users.filter(u => u.id !== primaryAssignee).map(u => (
                                            <option key={u.id} value={u.id}>{u.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 p-3 rounded-lg border-2 border-gray-200">
                                <label className="block text-xs font-bold text-gray-700 mb-1 flex items-center gap-1">
                                    <MapPin size={12} /> Sucursal / Ubicación
                                </label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:border-blue-600 bg-white text-gray-900 outline-none text-sm font-medium"
                                    value={selectedBranch}
                                    onChange={(e) => setSelectedBranch(e.target.value)}
                                >
                                    <option value="">General / Sin Especificar</option>
                                    {branches.map(b => (
                                        <option key={b.id} value={b.nombre_sucursal}>{b.nombre_sucursal}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-gray-50 p-3 rounded-lg border-2 border-gray-200">
                                <div className="flex items-center gap-2 mb-2 text-sm font-bold text-gray-800">
                                    <Paperclip size={16} />
                                    <span>Adjuntar Soporte {initialData?.attachmentName && '(Reemplazar)'}</span>
                                </div>
                                <div className="relative">
                                    <input
                                        type="file"
                                        accept=".pdf, .xls, .xlsx, .jpg, .jpeg, .png"
                                        onChange={handleFileChange}
                                        className="block w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-blue-100 file:text-blue-800 hover:file:bg-blue-200 file:cursor-pointer"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                                        <FileCheck size={14} className="text-gray-500" />
                                        <span>Solicitar Evidencia</span>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" className="sr-only peer" checked={requiresEvidence} onChange={e => setRequiresEvidence(e.target.checked)} />
                                        <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-green-600"></div>
                                    </label>
                                </div>

                                <div className="p-2 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2 text-xs font-bold text-gray-700">
                                            <Calendar size={14} className="text-gray-500" />
                                            <span>Tarea Repetitiva</span>
                                        </div>
                                        <label className="relative inline-flex items-center cursor-pointer">
                                            <input type="checkbox" className="sr-only peer" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
                                            <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-700"></div>
                                        </label>
                                    </div>
                                    {isRecurring && (
                                        <div className="mt-2 pt-2 border-t border-gray-200">
                                            <div className="flex gap-1 justify-between">
                                            {DAYS.map((day) => (
                                                <button
                                                key={day.value}
                                                type="button"
                                                onClick={() => toggleDay(day.value)}
                                                className={`w-6 h-6 rounded-full text-[10px] font-bold transition-colors ${selectedDays.includes(day.value) ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                                                >
                                                {day.label}
                                                </button>
                                            ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-gray-200">
                    <label className="block text-sm font-bold text-gray-800 mb-1 flex items-center gap-2">
                        <ListTodo size={16} /> Subtareas / Lista de Pasos
                    </label>
                    <div className="flex gap-2 mb-2">
                        <input 
                        type="text" 
                        value={newSubtaskTitle}
                        onChange={(e) => setNewSubtaskTitle(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSubtask())}
                        placeholder="Agregar nuevo paso..."
                        className="flex-1 px-3 py-2 border-2 border-gray-300 rounded-lg text-sm focus:border-blue-600 bg-gray-50 text-gray-900 outline-none"
                        />
                        <button 
                        type="button" 
                        onClick={handleAddSubtask}
                        className="bg-gray-200 hover:bg-gray-300 text-gray-800 p-2 rounded-lg transition-colors"
                        >
                        <Plus size={20} />
                        </button>
                    </div>

                    {subtasks.length > 0 && (
                        <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200 max-h-32 overflow-y-auto">
                        {subtasks.map((st) => (
                            <div key={st.id} className="p-2 flex justify-between items-center group">
                            <span className="text-sm text-gray-800 pl-1 font-medium">{st.title}</span>
                            <button 
                                type="button" 
                                onClick={() => handleRemoveSubtask(st.id)}
                                className="text-gray-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                            >
                                <Trash2 size={14} />
                            </button>
                            </div>
                        ))}
                        </div>
                    )}
                    </div>
                </form>
            </div>
          )}

          {/* --- HISTORY TAB --- */}
          {activeTab === 'history' && (
             <div className="p-6">
                {loadingLogs ? (
                    <div className="flex items-center justify-center h-48 text-gray-500">
                        <Loader2 className="animate-spin mr-2" /> Cargando historial...
                    </div>
                ) : logs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-48 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
                        <History size={32} className="mb-2 opacity-50"/>
                        <p className="text-sm font-medium">No hay registros de auditoría aún.</p>
                    </div>
                ) : (
                    <div className="relative border-l-2 border-gray-200 ml-4 space-y-8 py-2">
                        {logs.map((log) => (
                            <div key={log.id} className="relative pl-6">
                                <div className={`absolute -left-[9px] top-0 w-4 h-4 rounded-full border-2 border-white shadow-sm ${
                                    log.action === 'CREATE' ? 'bg-green-500' :
                                    log.action === 'UPDATE_STATUS' ? 'bg-blue-500' :
                                    log.action === 'UPLOAD_EVIDENCE' ? 'bg-purple-500' : 'bg-gray-400'
                                }`}></div>
                                
                                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 shadow-sm">
                                    <div className="flex justify-between items-start mb-1">
                                       <div className="flex items-center gap-2">
                                            {getUserAvatar(log.userId) ? (
                                                <img src={getUserAvatar(log.userId)!} className="w-5 h-5 rounded-full" />
                                            ) : (
                                                <UserCircle2 size={16} className="text-gray-400"/>
                                            )}
                                            <span className="text-xs font-bold text-gray-900">{getUserName(log.userId)}</span>
                                       </div>
                                       <span className="text-[10px] text-gray-500 font-medium">{formatLogDate(log.createdAt)}</span>
                                    </div>
                                    <p className="text-sm text-gray-700 font-medium">{log.details}</p>
                                    <span className="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-500 mt-2 inline-block font-mono">
                                        {log.action}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
             </div>
          )}

        </div>

        {activeTab === 'details' && (
            <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
            <button
                type="button"
                onClick={onClose}
                className="px-6 py-2 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-bold transition-colors"
            >
                Cancelar
            </button>
            <button
                form="task-form"
                type="submit"
                className="px-6 py-2 bg-blue-700 text-white hover:bg-blue-800 rounded-lg text-sm font-bold shadow-lg shadow-blue-700/20 transition-all hover:scale-105 active:scale-95"
            >
                {initialData ? 'Guardar Cambios' : 'Crear Tarea'}
            </button>
            </div>
        )}
        {activeTab === 'history' && (
             <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
                <button onClick={onClose} className="px-6 py-2 text-gray-700 font-bold hover:bg-gray-200 rounded-lg text-sm">Cerrar</button>
             </div>
        )}
      </div>
    </div>
  );
};

export default TaskModal;