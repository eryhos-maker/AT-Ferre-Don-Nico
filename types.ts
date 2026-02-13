import React from 'react';

export enum Role {
  GERENTE = 'Gerente',
  JEFE_ADMIN = 'Jefe Administrativo',
  SUPERVISOR_OPS = 'Supervisor de Operaciones',
  SUPERVISOR_COM = 'Supervisor Comercial',
  ENCARGADO_BEREL = 'Encargado Berel',
  COORDINADOR_BEREL = 'Coordinador Berel'
}

export enum TaskStatus {
  PENDING = 'Pendiente',
  IN_PROGRESS = 'En Progreso',
  COMPLETED = 'Completada',
  OVERDUE = 'Vencida'
}

export enum Priority {
  LOW = 'Baja',
  MEDIUM = 'Media',
  HIGH = 'Alta',
  CRITICAL = 'Crítica'
}

export interface Branch {
  id: string;
  name: string;
  address?: string;
}

export interface User {
  id: string;
  payrollId: string; // Número de Nómina
  name: string;
  role: Role;
  avatar: string;
  email: string;
  branch?: string; // Sucursal
  password?: string; // Nuevo campo opcional
}

export interface Subtask {
  id: string;
  title: string;
  isCompleted: boolean;
}

export interface Task {
  id: string;
  folio: string; // Nuevo campo: Folio único para seguimiento
  title: string;
  description: string;
  assignedTo: string[]; // Actualizado: Array de IDs para permitir 1 o 2 usuarios
  createdBy: string; // User ID
  dueDate: string; // ISO String
  status: TaskStatus;
  priority: Priority;
  createdAt: string;
  aiSuggestion?: string;
  
  // New fields
  subtasks?: Subtask[]; // Array de subtareas
  isRecurring?: boolean;
  recurringDays?: number[]; // 0 = Sunday, 1 = Monday, etc.
  requiresEvidence?: boolean;
  evidenceUrl?: string; // URL de la evidencia (foto/pdf) subida al completar
  attachmentUrl?: string; // Archivo adjunto al crear la tarea (PDF/Excel)
  attachmentName?: string;
  
  // Notification flags
  upcomingNotificationSent?: boolean; // Flag para saber si ya se avisó 24h antes
}

export interface Stat {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
}