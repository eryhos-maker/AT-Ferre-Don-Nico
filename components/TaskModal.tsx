import React, { useState } from 'react';
import { X, Sparkles, Loader2, Calendar, FileCheck } from 'lucide-react';
import { User, Priority, Task } from '../types';
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
  const [assignedTo, setAssignedTo] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [priority, setPriority] = useState<Priority>(Priority.MEDIUM);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSteps, setAiSteps] = useState<string[]>([]);

  // New features state
  const [isRecurring, setIsRecurring] = useState(false);
  const [selectedDays, setSelectedDays] = useState<number[]>([]);
  const [requiresEvidence, setRequiresEvidence] = useState(false);

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
      setAiSteps(result.suggestedSteps);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const toggleDay = (day: number) => {
    if (selectedDays.includes(day)) {
      setSelectedDays(selectedDays.filter(d => d !== day));
    } else {
      setSelectedDays([...selectedDays, day].sort());
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      title,
      description: aiSteps.length > 0 ? `${description}\n\nPasos Sugeridos por IA:\n${aiSteps.map(s => `- ${s}`).join('\n')}` : description,
      assignedTo,
      dueDate: new Date(dueDate).toISOString(),
      priority,
      createdBy: currentUser.id,
      isRecurring,
      recurringDays: isRecurring ? selectedDays : [],
      requiresEvidence
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[95vh]">
        <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800">Nueva Tarea Operativa</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="task-form" onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título de la Tarea</label>
              <input
                type="text"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Inventario de Pinturas"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
              <textarea
                required
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detalles de la operación..."
              />
            </div>

            {/* AI Assistant Button */}
            <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-semibold text-indigo-800 uppercase flex items-center gap-1">
                  <Sparkles size={14} /> Asistente IA
                </span>
                <button
                  type="button"
                  onClick={handleAIAnalysis}
                  disabled={isAnalyzing || !title}
                  className="text-xs bg-indigo-600 text-white px-3 py-1 rounded-md hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {isAnalyzing ? <span className="flex items-center gap-1"><Loader2 className="animate-spin" size={12}/> Analizando...</span> : 'Sugerir Prioridad y Pasos'}
                </button>
              </div>
              {aiSteps.length > 0 && (
                <div className="text-sm text-indigo-900 bg-white p-2 rounded border border-indigo-100 mt-2">
                  <p className="font-medium text-xs text-indigo-500 mb-1">Pasos sugeridos:</p>
                  <ul className="list-disc list-inside space-y-1 text-xs">
                    {aiSteps.map((step, idx) => (
                      <li key={idx}>{step}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asignar a</label>
                <select
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                >
                  <option value="">Seleccionar...</option>
                  {users.map(u => (
                    <option key={u.id} value={u.id}>{u.name} - {u.role}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                <select
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as Priority)}
                >
                  {Object.values(Priority).map(p => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Vencimiento Inicial</label>
              <input
                type="datetime-local"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
            </div>

            {/* Recurring Task Section */}
            <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
               <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                     <Calendar size={16} className="text-gray-500" />
                     <span>Tarea Repetitiva</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={isRecurring} onChange={e => setIsRecurring(e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
               </div>
               
               {isRecurring && (
                 <div className="mt-2">
                    <p className="text-xs text-gray-500 mb-2">Selecciona los días de repetición:</p>
                    <div className="flex gap-2 justify-between">
                       {DAYS.map((day) => (
                         <button
                           key={day.value}
                           type="button"
                           onClick={() => toggleDay(day.value)}
                           className={`w-8 h-8 rounded-full text-xs font-bold transition-colors ${selectedDays.includes(day.value) ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-600 hover:bg-gray-300'}`}
                         >
                           {day.label}
                         </button>
                       ))}
                    </div>
                 </div>
               )}
            </div>

             {/* Evidence Request Section */}
             <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
               <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                     <FileCheck size={16} className="text-gray-500" />
                     <span>Solicitar Evidencia (Foto/PDF)</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" className="sr-only peer" checked={requiresEvidence} onChange={e => setRequiresEvidence(e.target.checked)} />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-green-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
                  </label>
               </div>
               {requiresEvidence && <p className="text-xs text-gray-500 mt-2 pl-6">El usuario deberá subir una imagen o archivo PDF para completar la tarea.</p>}
            </div>

          </form>
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            form="task-form"
            type="submit"
            className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg text-sm font-medium shadow-sm transition-colors"
          >
            Crear Tarea
          </button>
        </div>
      </div>
    </div>
  );
};

export default TaskModal;