import React, { useState } from 'react';
import { X, Sparkles, Loader2, Calendar, FileCheck, Plus, Trash2, ListTodo, Users, Paperclip, FileText } from 'lucide-react';
import { User, Priority, Task, Subtask } from '../types';
import { analyzeTask } from '../services/geminiService';

interface TaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: User[];
  currentUser: User;
  onSave: (task: Partial<Task>) => void;
}

const TaskModal: React.FC<TaskModalProps> = ({ isOpen, onClose, users, currentUser, onSave }) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  
  // Asignación de Usuarios (1 o 2)
  const [primaryAssignee, setPrimaryAssignee] = useState('');
  const [secondaryAssignee, setSecondaryAssignee] = useState('');

  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Subtasks State
  const [subtasks, setSubtasks] = useState<Subtask[]>([]);
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('');

  // New features state
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [requiresEvidence, setRequiresEvidence] = useState(false);
  
  // Attachment state
  const [attachment, setAttachment] = useState<File | null>(null);

  const DAYS = [
    { label: 'D', value: 0 },
    { label: 'L', value: 1 },
    { label: 'M', value: 2 },
    { label: 'M', value: 3 },
    { label: 'J', value: 4 },
    { label: 'V', value: 5 },
    { label: 'S', value: 6 },
  ];

  if (!isOpen) return null;

  const handleAIAnalysis = async () => {
    if (!title || !description) return;
    setIsAnalyzing(true);
    try {
      const result = await analyzeTask(title, description);
      setPriority(result.priority);
      
      // Convert suggested steps into subtasks automatically
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
      // Basic validation by extension (backend would validate MIME type)
      if (file.name.endsWith('.pdf') || file.name.endsWith('.xls') || file.name.endsWith('.xlsx')) {
        setAttachment(file);
      } else {
        alert("Solo se permiten archivos PDF o Excel.");
        e.target.value = ''; // Reset input
      }
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const assignedTo = [primaryAssignee];
    if (secondaryAssignee && secondaryAssignee !== primaryAssignee) {
      assignedTo.push(secondaryAssignee);
    }

    onSave({
      title,
      description,
      assignedTo, // Array de IDs
      dueDate: new Date(dueDate).toISOString(),
      priority,
      createdBy: currentUser.id,
      isRecurring,
      recurringDays: isRecurring ? selectedDays : [],
      requiresEvidence,
      subtasks,
      attachmentName: attachment ? attachment.name : undefined,
      // In a real app, upload file here and get URL. We pass a dummy URL or object URL.
      attachmentUrl: attachment ? URL.createObjectURL(attachment) : undefined
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[95vh] border border-gray-300">
        <div className="p-4 border-b border-gray-200 flex justify-between items-center bg-gray-100">
          <h2 className="text-lg font-black text-gray-900">Nueva Tarea Operativa</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          <form id="task-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">Título de la Tarea</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 outline-none bg-gray-50 text-gray-900 transition-colors placeholder-gray-400"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Inventario de Pinturas"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-800 mb-1">Descripción</label>
              <textarea
                required
                rows={3}
                className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 outline-none bg-gray-50 text-gray-900 transition-colors placeholder-gray-400"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalles de la operación..."
              />
            </div>

             {/* Attachment Section */}
             <div className="bg-gray-50 p-3 rounded-lg border-2 border-gray-200">
               <div className="flex items-center gap-2 mb-2 text-sm font-bold text-gray-800">
                  <Paperclip size={16} />
                  <span>Adjuntar Archivo (Opcional)</span>
               </div>
               <div className="relative">
                  <input
                    type="file"
                    accept=".pdf, .xls, .xlsx"
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-600
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-xs file:font-bold
                      file:bg-blue-100 file:text-blue-800
                      hover:file:bg-blue-200
                      file:cursor-pointer
                    "
                  />
                  <p className="text-[10px] text-gray-500 mt-1 ml-1 font-medium">Solo PDF y Excel permitidos.</p>
               </div>
             </div>

            {/* AI Assistant Button */}
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
                  {isAnalyzing ? <span className="flex items-center gap-1"><Loader2 className="animate-spin" size={12}/> Analizando...</span> : 'Sugerir Subtareas y Prioridad'}
                </button>
              </div>
              <p className="text-[10px] text-indigo-500 font-medium">La IA generará automáticamente las subtareas.</p>
            </div>

             {/* Subtasks Section */}
             <div className="space-y-2">
               <label className="block text-sm font-bold text-gray-800 mb-1 flex items-center gap-2">
                 <ListTodo size={16} /> Subtareas
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
                 <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200">
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

            <div className="bg-gray-50 p-3 rounded-lg border-2 border-gray-200 space-y-3">
              <label className="block text-sm font-bold text-gray-800 flex items-center gap-2">
                <Users size={16} /> Asignación de Personal
              </label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-1 font-bold">Responsable Principal *</label>
                  <select
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 bg-white text-gray-900 outline-none text-sm font-medium"
                    value={primaryAssignee}
                    onChange={(e) => setPrimaryAssignee(e.target.value)}
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

            <div className="grid grid-cols-2 gap-4">
               <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1">
                    {isRecurring ? 'Fecha Límite' : 'Fecha Vencimiento'}
                  </label>
                  <input
                    type="datetime-local"
                    required
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 bg-gray-50 text-gray-900 outline-none text-sm"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
               </div>
               <div>
                  <label className="block text-sm font-bold text-gray-800 mb-1">Prioridad</label>
                  <select
                    className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-blue-600 bg-gray-50 text-gray-900 outline-none font-medium"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value as Priority)}
                  >
                    {Object.values(Priority).map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
               </div>
            </div>

            {/* Recurring Task Section */}
            <div className="p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
               <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                     <Calendar size={16} className="text-gray-600" />
                     <span>Tarea Repetitiva</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-700"></div>
                  </label>
               </div>
               
               {isRecurring && (
                 <div className="mt-2">
                    <p className="text-xs text-gray-600 mb-2 font-medium">
                       Se generarán tareas individuales los días seleccionados hasta la fecha límite.
                    </p>
                    <div className="flex gap-2 justify-between">
                       {DAYS.map((day) => (
                         <button
                           key={day.value}
                           type="button"
                           onClick={() => toggleDay(day.value)}
                           className={`w-8 h-8 rounded-full text-xs font-bold transition-colors ${selectedDays.includes(day.value) ? 'bg-blue-700 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                         >
                           {day.label}
                         </button>
                       ))}
                    </div>
                 </div>
               )}
            </div>

             {/* Evidence Request Section */}
             <div className="p-3 bg-gray-50 rounded-lg border-2 border-gray-200">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-800">
                     <FileCheck size={16} className="text-gray-600" />
                     <span>Solicitar Evidencia (Foto/PDF)</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={requiresEvidence} onChange={e => setRequiresEvidence(e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
               </div>
               {requiresEvidence && <p className="text-xs text-gray-600 mt-2 pl-6 font-medium">El usuario deberá subir una imagen o archivo PDF para completar la tarea.</p>}
            </div>

          </form>
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-bold transition-colors"
          >
            Cancelar
          </button>
          <button
            form="task-form"
            type="submit"
            className="px-4 py-2 bg-blue-700 text-white hover:bg-blue-800 rounded-lg text-sm font-bold shadow-sm transition-colors"
          >
            Crear Tarea
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;