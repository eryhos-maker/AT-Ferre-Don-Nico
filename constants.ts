import { Role, TaskStatus, Priority, User, Task, Branch } from './types';

// Los datos de usuarios, ramas y tareas ahora provienen de Supabase.
// Se han eliminado MOCK_TASKS, USERS y MOCK_BRANCHES para optimizar el bundle.

export const NAV_ITEMS = [
  { label: 'Dashboard', path: '/' },
  { label: 'Tareas', path: '/tasks' },
  { label: 'Equipo', path: '/team' },
  { label: 'Arquitectura (Docs)', path: '/docs' },
  { label: 'Configuración', path: '/settings' },
];