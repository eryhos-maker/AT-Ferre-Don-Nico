import { Role, TaskStatus, Priority, User, Task } from './types';

export const USERS: User[] = [
  {
    id: 'u1',
    name: 'Carlos Rodríguez',
    role: Role.GERENTE,
    email: 'gerencia@empresa.com',
    avatar: 'https://picsum.photos/id/1/200/200',
    branch: 'Corporativo Central'
  },
  {
    id: 'u2',
    name: 'Ana García',
    role: Role.JEFE_ADMIN,
    email: 'admin@empresa.com',
    avatar: 'https://picsum.photos/id/5/200/200',
    branch: 'Corporativo Central'
  },
  {
    id: 'u3',
    name: 'Roberto Méndez',
    role: Role.SUPERVISOR_OPS,
    email: 'ops@empresa.com',
    avatar: 'https://picsum.photos/id/3/200/200',
    branch: 'Planta Principal'
  },
  {
    id: 'u4',
    name: 'Lucía Fernández',
    role: Role.SUPERVISOR_COM,
    email: 'ventas@empresa.com',
    avatar: 'https://picsum.photos/id/4/200/200',
    branch: 'Sucursal Norte'
  },
  {
    id: 'u6',
    name: 'Sofia Ramírez',
    role: Role.COORDINADOR_BEREL,
    email: 'coordinacion.berel@empresa.com',
    avatar: 'https://picsum.photos/id/9/200/200',
    branch: 'Zona Centro'
  },
  {
    id: 'u5',
    name: 'Miguel Torres',
    role: Role.ENCARGADO_BEREL,
    email: 'sucursal@empresa.com',
    avatar: 'https://picsum.photos/id/8/200/200',
    branch: 'Berel Centro'
  }
];

export const MOCK_TASKS: Task[] = [
  {
    id: 't1',
    title: 'Revisión de Inventario Mensual',
    description: 'Realizar el conteo físico de existencias en la sucursal Berel Norte y conciliar con sistema.',
    assignedTo: 'u5',
    createdBy: 'u3',
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
    status: TaskStatus.IN_PROGRESS,
    priority: Priority.HIGH,
    createdAt: new Date().toISOString(),
    requiresEvidence: true
  },
  {
    id: 't2',
    title: 'Reporte de Ventas Q3',
    description: 'Consolidar las cifras de ventas del tercer trimestre y preparar presentación para gerencia.',
    assignedTo: 'u4',
    createdBy: 'u1',
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(),
    status: TaskStatus.PENDING,
    priority: Priority.MEDIUM,
    createdAt: new Date().toISOString(),
    isRecurring: true,
    recurringDays: [1] // Monday
  },
  {
    id: 't3',
    title: 'Mantenimiento de Montacargas',
    description: 'Coordinar el servicio preventivo del montacargas de almacén central.',
    assignedTo: 'u3',
    createdBy: 'u2',
    dueDate: new Date(Date.now() - 86400000).toISOString(), // Yesterday (Overdue)
    status: TaskStatus.OVERDUE,
    priority: Priority.CRITICAL,
    createdAt: new Date().toISOString()
  },
  {
    id: 't4',
    title: 'Capacitación de Personal Nuevo',
    description: 'Onboarding para los 3 nuevos ejecutivos de ventas.',
    assignedTo: 'u4',
    createdBy: 'u2',
    dueDate: new Date(Date.now() + 86400000 * 10).toISOString(),
    status: TaskStatus.COMPLETED,
    priority: Priority.LOW,
    createdAt: new Date().toISOString()
  }
];

export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/' },
  { label: 'Tareas', path: '/tasks' },
  { label: 'Equipo', path: '/team' },
  { label: 'Arquitectura (Docs)', path: '/docs' },
];