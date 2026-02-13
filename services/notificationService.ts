import { Task, User, Role } from '../types';

// Solicitar permiso al usuario para mostrar notificaciones
export const requestNotificationPermission = async () => {
  if (!('Notification' in window)) {
    console.log('Este navegador no soporta notificaciones de escritorio');
    return false;
  }

  if (Notification.permission === 'granted') {
    return true;
  }

  if (Notification.permission !== 'denied') {
    const permission = await Notification.requestPermission();
    return permission === 'granted';
  }
  return false;
};

// Helper privado para lanzar la notificación nativa
const spawnNotification = (title: string, body: string) => {
  if (Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body: body,
        icon: '/favicon.ico', // Intentará usar el favicon si existe, o el default del navegador
        requireInteraction: true // La notificación se queda hasta que el usuario la cierra (en navegadores soportados)
      });
    } catch (e) {
      console.error("Error al mostrar notificación nativa:", e);
    }
  }
};

export const sendOverdueNotification = (task: Task, allUsers: User[]) => {
  // Roles to notify: Gerente, Jefe Administrativo, Coordinador Berel
  const targetRoles = [Role.GERENTE, Role.JEFE_ADMIN, Role.COORDINADOR_BEREL];
  
  const recipients = allUsers.filter(u => targetRoles.includes(u.role));
  const recipientEmails = recipients.map(u => u.email).join(', ');

  // 1. Notificación Nativa (Push Local)
  spawnNotification(
    `🚨 Tarea Vencida: ${task.folio}`,
    `La tarea "${task.title}" ha excedido su fecha límite. Asignada a: ${task.assignedTo.length} persona(s).`
  );

  // 2. Simulación de Correo (Log)
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

  // 1. Notificación Nativa (Push Local)
  // Solo mostramos push si el usuario actual es uno de los destinatarios (en un entorno real esto se filtra por sesión)
  // Como es una demo local, mostramos la alerta general.
  spawnNotification(
    `⚠️ Próximo Vencimiento: ${task.folio}`,
    `La tarea "${task.title}" vence en menos de 24 horas.`
  );

  // 2. Simulación de Correo (Log)
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