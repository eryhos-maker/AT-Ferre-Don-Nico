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
  // Roles específicos solicitados: Supervisor Comercial y Encargado Berel
  // SOLO si están asignados a la tarea o si son responsables generales (aquí asumimos responsables generales por rol)
  // Ajuste: Notificar a usuarios con estos roles, independientemente de si están asignados explícitamente, 
  // O filtrar solo si están en assignedTo. 
  // Interpretación: "cuando una tarea asignada a ellos" -> Filtrar por asignación + Rol.

  const assignedUsersIds = task.assignedTo;
  
  const targetUsers = allUsers.filter(u => 
    assignedUsersIds.includes(u.id) && 
    (u.role === Role.SUPERVISOR_COM || u.role === Role.ENCARGADO_BEREL)
  );

  if (targetUsers.length === 0) return; // No hay destinatarios que cumplan la condición

  const recipientEmails = targetUsers.map(u => u.email).join(', ');

  console.group(`📧 [SIMULACIÓN CORREO] Próximo Vencimiento (24h): ${task.folio}`);
  console.log(`To: ${recipientEmails}`);
  console.log(`Subject: RECORDATORIO - Tarea por vencer: ${task.title}`);
  console.log(`----------------------------------------`);
  console.log(`Estimado colaborador,`);
  console.log(`\nLa tarea "${task.title}" vence en menos de 24 horas.`);
  console.log(`\nDetalles:`);
  console.log(`- Folio: ${task.folio}`);
  console.log(`- Fecha Vencimiento: ${new Date(task.dueDate).toLocaleString()}`);
  console.log(`\nPor favor asegurar su cumplimiento.`);
  console.log(`----------------------------------------`);
  console.groupEnd();
};