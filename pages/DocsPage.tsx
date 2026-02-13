import React from 'react';
import { Database, Server, Smartphone, ShieldCheck, Layers, Cpu } from 'lucide-react';

const DocsPage: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto pb-12">
      <div>
        <h2 className="text-3xl font-black text-gray-900">Documentación Técnica</h2>
        <p className="text-gray-600 mt-2 font-medium">Detalles de arquitectura, entregables y especificaciones del sistema AT Ferre Don Nico.</p>
      </div>

      {/* Architecture Diagram */}
      <section className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-blue-100 rounded-lg"><Server className="text-blue-700" size={24} /></div>
          <h3 className="text-xl font-bold text-gray-900">1. Arquitectura del Sistema</h3>
        </div>
        
        <div className="bg-[#1e3a8a] rounded-xl p-6 overflow-x-auto text-white">
          <div className="min-w-[600px] flex flex-col items-center space-y-4">
             {/* Client Layer */}
             <div className="border border-blue-400 p-4 rounded-lg w-3/4 text-center bg-blue-900/50">
                <p className="font-bold text-blue-200 mb-2">Capa Cliente (Frontend)</p>
                <div className="flex justify-center gap-4">
                  <div className="bg-blue-800 p-2 rounded text-sm flex items-center gap-2"><Smartphone size={16}/> App Móvil (PWA)</div>
                  <div className="bg-blue-800 p-2 rounded text-sm flex items-center gap-2"><Layers size={16}/> Web Dashboard (React)</div>
                </div>
             </div>
             
             {/* Arrow */}
             <div className="h-8 w-0.5 bg-blue-400"></div>

             {/* API Gateway */}
             <div className="border border-blue-400 p-3 rounded-lg w-1/2 text-center bg-blue-900/50">
               <p className="font-bold text-green-400">API Gateway / Load Balancer</p>
               <p className="text-xs text-blue-200">REST + GraphQL</p>
             </div>

             {/* Arrow */}
             <div className="h-8 w-0.5 bg-blue-400"></div>

             {/* Backend Services */}
             <div className="border border-blue-400 p-4 rounded-lg w-3/4 bg-blue-900/50">
               <p className="font-bold text-[#dc2626] text-center mb-4">Microservicios Backend (Node.js/Go)</p>
               <div className="grid grid-cols-3 gap-2 text-center text-xs">
                 <div className="bg-blue-800 p-2 rounded">Auth Service<br/>(JWT/OAuth)</div>
                 <div className="bg-blue-800 p-2 rounded">Task Engine<br/>(Core Logic)</div>
                 <div className="bg-blue-800 p-2 rounded">Notification<br/>(Push/Email)</div>
                 <div className="bg-blue-800 p-2 rounded">Reporting<br/>(Analytics)</div>
                 <div className="bg-blue-800 p-2 rounded">AI Service<br/>(Gemini Integration)</div>
               </div>
             </div>

              {/* Arrow */}
              <div className="h-8 w-0.5 bg-blue-400"></div>

             {/* Data Layer */}
             <div className="border border-blue-400 p-4 rounded-lg w-3/4 text-center bg-blue-900/50">
                <p className="font-bold text-yellow-400 mb-2">Capa de Datos</p>
                <div className="flex justify-center gap-4">
                  <div className="bg-blue-800 p-2 rounded text-sm"><Database size={14} className="inline mr-1"/> PostgreSQL (Relacional)</div>
                  <div className="bg-blue-800 p-2 rounded text-sm"><Database size={14} className="inline mr-1"/> Redis (Cache)</div>
                </div>
             </div>
          </div>
        </div>
      </section>

      {/* ER Diagram */}
      <section className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2 bg-indigo-100 rounded-lg"><Database className="text-indigo-700" size={24} /></div>
          <h3 className="text-xl font-bold text-gray-900">2. Modelo Entidad-Relación (Base de Datos)</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <div className="border rounded-lg p-4 bg-gray-50 border-gray-200">
             <h4 className="font-bold text-gray-800 border-b pb-2 mb-2">Users</h4>
             <ul className="text-sm font-mono text-gray-700 space-y-1">
               <li>PK: id (UUID)</li>
               <li>name: varchar(100)</li>
               <li>email: varchar(150)</li>
               <li>password_hash: varchar</li>
               <li>role: enum (Gerente, Supervisor...)</li>
               <li>department_id: FK</li>
             </ul>
           </div>
           
           <div className="border rounded-lg p-4 bg-gray-50 border-gray-200">
             <h4 className="font-bold text-gray-800 border-b pb-2 mb-2">Tasks</h4>
             <ul className="text-sm font-mono text-gray-700 space-y-1">
               <li>PK: id (UUID)</li>
               <li>title: varchar(200)</li>
               <li>description: text</li>
               <li>status: enum (Pending, InProgress...)</li>
               <li>priority: enum (Low, High...)</li>
               <li>due_date: timestamp</li>
               <li>assigned_to: FK (Users.id)</li>
               <li>created_by: FK (Users.id)</li>
             </ul>
           </div>

           <div className="border rounded-lg p-4 bg-gray-50 border-gray-200">
             <h4 className="font-bold text-gray-800 border-b pb-2 mb-2">Departments (Hierarchy)</h4>
             <ul className="text-sm font-mono text-gray-700 space-y-1">
               <li>PK: id (integer)</li>
               <li>name: varchar(100)</li>
               <li>parent_id: FK (Self Reference)</li>
               <li>manager_id: FK (Users.id)</li>
             </ul>
           </div>

           <div className="border rounded-lg p-4 bg-gray-50 border-gray-200">
             <h4 className="font-bold text-gray-800 border-b pb-2 mb-2">Audit_Logs</h4>
             <ul className="text-sm font-mono text-gray-700 space-y-1">
               <li>PK: id (bigint)</li>
               <li>user_id: FK</li>
               <li>action: varchar(50)</li>
               <li>entity_id: varchar</li>
               <li>timestamp: timestamp</li>
             </ul>
           </div>
        </div>
      </section>

      {/* Tech Stack & Estimation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <section className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-green-100 rounded-lg"><Cpu className="text-green-700" size={24} /></div>
            <h3 className="text-xl font-bold text-gray-900">Stack Tecnológico</h3>
          </div>
          <ul className="space-y-3 text-gray-700">
             <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> <strong>Frontend:</strong> React 18, TypeScript, Tailwind CSS, Vite.</li>
             <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> <strong>Backend:</strong> Node.js (NestJS) o Python (FastAPI).</li>
             <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> <strong>Base de Datos:</strong> PostgreSQL + Prisma ORM.</li>
             <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> <strong>AI:</strong> Gemini API (Análisis de tareas).</li>
             <li className="flex items-center gap-2"><span className="w-2 h-2 rounded-full bg-green-500"></span> <strong>Infra:</strong> AWS (ECS, RDS) o Google Cloud Run.</li>
          </ul>
        </section>

        <section className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 bg-orange-100 rounded-lg"><ShieldCheck className="text-orange-700" size={24} /></div>
            <h3 className="text-xl font-bold text-gray-900">Estimación por Fases</h3>
          </div>
          <div className="space-y-4">
             <div>
               <div className="flex justify-between text-sm font-bold text-gray-800 mb-1">
                 <span>Fase 1: MVP & Core (Auth, Tareas)</span>
                 <span className="text-gray-500">4 Semanas</span>
               </div>
               <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-orange-500 w-full"></div></div>
             </div>
             <div>
               <div className="flex justify-between text-sm font-bold text-gray-800 mb-1">
                 <span>Fase 2: Reportes & Jerarquía</span>
                 <span className="text-gray-500">3 Semanas</span>
               </div>
               <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-orange-400 w-3/4"></div></div>
             </div>
             <div>
               <div className="flex justify-between text-sm font-bold text-gray-800 mb-1">
                 <span>Fase 3: Notificaciones & AI</span>
                 <span className="text-gray-500">2 Semanas</span>
               </div>
               <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-orange-300 w-1/2"></div></div>
             </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DocsPage;