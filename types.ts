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

export interface User {
  id: string;
  name: string;
  role: Role;
  avatar: string;
  email: string;
  branch?: string; // Sucursal
}

export interface Task {
  id: string;
  title: string;
  description: string;
  assignedTo: string; // User ID
  createdBy: string; // User ID
  dueDate: string; // ISO String
  status: TaskStatus;
  priority: Priority;
  createdAt: string;
  aiSuggestion?: string;
  
  // New fields
  isRecurring?: boolean;
  recurringDays?: number[]; // 0 = Sunday, 1 = Monday, etc.
  requiresEvidence?: boolean;
}

export interface Stat {
  label: string;
  value: string | number;
  change?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon?: React.ReactNode;
}