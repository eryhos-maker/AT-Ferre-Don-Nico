import { Role, TaskStatus, Priority, User, Task, Branch } from './types';

export const USERS: User[] = [
  {
    id: 'u1',
    payrollId: '1001',
    name: 'Carlos Rodríguez',
    role: Role.GERENTE,
    email: 'gerencia@empresa.com',
    avatar: 'https://picsum.photos/id/1/200/200',
    branch: 'Corporativo Central'
  },
  {
    id: 'u2',
    payrollId: '1002',
    name: 'Ana García',
    role: Role.JEFE_ADMIN,
    email: 'admin@empresa.com',
    avatar: 'https://picsum.photos/id/5/200/200',
    branch: 'Corporativo Central'
  },
  {
    id: 'u3',
    payrollId: '1003',
    name: 'Roberto Méndez',
    role: Role.SUPERVISOR_OPS,
    email: 'ops@empresa.com',
    avatar: 'https://picsum.photos/id/3/200/200',
    branch: 'Planta Principal'
  },
  {
    id: 'u4',
    payrollId: '1004',
    name: 'Lucía Fernández',
    role: Role.SUPERVISOR_COM,
    email: 'ventas@empresa.com',
    avatar: 'https://picsum.photos/id/4/200/200',
    branch: 'Sucursal Norte'
  },
  {
    id: 'u6',
    payrollId: '1005',
    name: 'Sofia Ramírez',
    role: Role.COORDINADOR_BEREL,
    email: 'coordinacion.berel@empresa.com',
    avatar: 'https://picsum.photos/id/9/200/200',
    branch: 'Zona Centro'
  },
  {
    id: 'u5',
    payrollId: '1006',
    name: 'Miguel Torres',
    role: Role.ENCARGADO_BEREL,
    email: 'sucursal@empresa.com',
    avatar: 'https://picsum.photos/id/8/200/200',
    branch: 'Berel Centro'
  }
];

export const MOCK_BRANCHES: Branch[] = [
  { id: 'b1', nombre_sucursal: 'Corporativo Central', direccion: 'Av. Industrial 100' },
  { id: 'b2', nombre_sucursal: 'Planta Principal', direccion: 'Carretera Nacional Km 5' },
  { id: 'b3', nombre_sucursal: 'Sucursal Norte', direccion: 'Av. Universidad 500' },
  { id: 'b4', nombre_sucursal: 'Berel Centro', direccion: 'Calle Morelos 230' },
  { id: 'b5', nombre_sucursal: 'Berel Sur', direccion: 'Av. Garza Sada 4040' },
];

export const MOCK_TASKS: Task[] = [
  {
    id: 't1',
    folio: 'OP-241001',
    title: 'Revisión de Inventario Mensual',
    description: 'Realizar el conteo físico de existencias en la sucursal Berel Norte y conciliar con sistema.',
    assignedTo: ['u5', 'u3'], // Asignación múltiple
    createdBy: 'u3',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
    status: TaskStatus.IN_PROGRESS,
    priority: Priority.HIGH,
    createdAt: new Date().toISOString(),
    requiresEvidence: true,
    subtasks: [
      { id: 'st1', title: 'Imprimir hojas de conteo', isCompleted: true },
      { id: 'st2', title: 'Conteo Pasillo A', isCompleted: true },
      { id: 'st3', title: 'Conteo Pasillo B', isCompleted: false },
      { id: 'st4', title: 'Carga en sistema', isCompleted: false },
    ]
  },
  {
    id: 't2',
    folio: 'OP-241002',
    title: 'Reporte de Ventas Q3',
    description: 'Consolidar las cifras de ventas del tercer trimestre y preparar presentación para gerencia.',
    assignedTo: ['u4'],
    createdBy: 'u1',
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    status: TaskStatus.PENDING,
    priority: Priority.MEDIUM,
    createdAt: new Date().toISOString(),
    isRecurring: true,
    recurringDays: [1], // Monday
    subtasks: []
  },
  {
    id: 't3',
    folio: 'MT-241003',
    title: 'Mantenimiento de Montacargas',
    description: 'Coordinar el servicio preventivo del montacargas de almacén central.',
    assignedTo: ['u3'],
    createdBy: 'u2',
    dueDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday (Overdue)
    status: TaskStatus.OVERDUE,
    priority: Priority.CRITICAL,
    createdAt: new Date().toISOString(),
    subtasks: []
  },
  {
    id: 't4',
    folio: 'RH-241004',
    title: 'Capacitación de Personal Nuevo',
    description: 'Onboarding para los 3 nuevos ejecutivos de ventas.',
    assignedTo: ['u4', 'u2'],
    createdBy: 'u2',
    dueDate: new Date(Date.now() + 86400000 * 10).toISOString(),
    status: TaskStatus.COMPLETED,
    priority: Priority.LOW,
    createdAt: new Date().toISOString(),
    subtasks: [],
    evidenceUrl: 'https://example.com/evidence-report.pdf',
    attachmentName: 'Manual_Onboarding_v2.pdf',
    attachmentUrl: '#'
  }
];

export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/' },
  { label: 'Tareas', path: '/tasks' },
  { label: 'Equipo', path: '/team' },
  { label: 'Arquitectura (Docs)', path: '/docs' },
  { label: 'Configuración', path: '/settings' },
];