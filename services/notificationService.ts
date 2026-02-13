import { Task, User, Role } from '../types';

export const sendOverdueNotification = (task: Task, allUsers: User[]) => {
  // Roles to notify: Gerente, Jefe Administrativo, Coordinador Berel
  const targetRoles = [Role.GERENTE, Role.JEFE_ADMIN, Role.COORDINADOR_BEREL];
  
  const recipients = allUsers.filter(u => targetRoles.includes(u.role));
  const recipientEmails = recipients.map(u => u.email).join(', ');

  console.group(`📧 [SIMULACIÓN CORREO] Tarea Vencida: ${task.folio}`);
  console.log(`To: ${recipientEmails}`);
  console.log(`Subject: ALERTA - Tarea Vencida: ${task.title}`);
  console.log(`----------------------------------------`);
  console.log(`Estimados,`);
  console.log(`\nLa tarea "${task.title}" ha excedido su fecha límite.`);
  console.log(`\nDetalles:`);
  console.log(`- Folio: ${task.folio}`);
  console.log(`- Descripción: ${task.description}`);
  console.log(`- Asignada a: ${task.assignedTo.join(', ')}`);
  console.log(`- Fecha Vencimiento: ${new Date(task.dueDate).toLocaleString()}`);
  console.log(`\nPor favor tomar las medidas necesarias.`);
  console.log(`----------------------------------------`);
  console.groupEnd();
};

export const sendUpcomingDeadlineNotification = (task: Task, allUsers: User[]) => {
  // Requerimiento: Notificar a Supervisor Comercial y Encargado Berel
  // SOLO si están asignados a la tarea específica y faltan 24h o menos.
  
  const targetRoles = [Role.SUPERVISOR_COM, Role.ENCARGADO_BEREL];

  const recipients = allUsers.filter(u => 
    task.assignedTo.includes(u.id) && targetRoles.includes(u.role)
  );

  // Si no hay usuarios con esos roles asignados a esta tarea, no enviamos correo.
  if (recipients.length === 0) return;

  const recipientEmails = recipients.map(u => u.email).join(', ');

  console.group(`📧 [SIMULACIÓN CORREO] Próximo Vencimiento (24h): ${task.folio}`);
  console.log(`To: ${recipientEmails}`);
  console.log(`Subject: ⚠️ RECORDATORIO - Tarea por vencer: ${task.title}`);
  console.log(`----------------------------------------`);
  console.log(`Estimado colaborador,`);
  console.log(`\nLa tarea "${task.title}" vence en menos de 24 horas.`);
  console.log(`\nEsta notificación es exclusiva para Supervisores y Encargados asignados.`);
  console.log(`\nDetalles:`);
  console.log(`- Folio: ${task.folio}`);
  console.log(`- Fecha Vencimiento: ${new Date(task.dueDate).toLocaleString()}`);
  console.log(`\nPor favor asegurar su cumplimiento a tiempo.`);
  console.log(`----------------------------------------`);
  console.groupEnd();
};