import { supabase } from '../lib/supabaseClient';
import { User, Task, Branch, Role, TaskStatus, Priority } from '../types';

// --- MAPPERS ---

// Map DB 'task_status' enum to App 'TaskStatus'
const mapStatusFromDB = (status: string): TaskStatus => {
  switch (status) {
    case 'pendiente': return TaskStatus.PENDING;
    case 'en_progreso': return TaskStatus.IN_PROGRESS;
    case 'completada': return TaskStatus.COMPLETED;
    case 'cancelada': return TaskStatus.COMPLETED; // Map cancelled to completed or handle differently
    default: return TaskStatus.PENDING;
  }
};

const mapStatusToDB = (status: TaskStatus): string => {
  switch (status) {
    case TaskStatus.PENDING: return 'pendiente';
    case TaskStatus.OVERDUE: return 'pendiente'; // DB doesn't have overdue, it's calculated by date
    case TaskStatus.IN_PROGRESS: return 'en_progreso';
    case TaskStatus.COMPLETED: return 'completada';
    default: return 'pendiente';
  }
};

// --- USERS (EMPLEADOS) ---

export const fetchUsers = async (): Promise<User[]> => {
  const { data, error } = await supabase.from('empleados').select('*');
  if (error) {
    console.error('Error fetching users:', error);
    return [];
  }
  
  return data.map((emp: any) => ({
    id: emp.id,
    payrollId: emp.nomina,
    name: emp.nombre,
    role: emp.rol as Role, // Assuming DB text matches Enum values, otherwise need mapper
    email: emp.correo,
    password: emp.contrasena,
    avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(emp.nombre)}&background=0D8ABC&color=fff`,
    branch: '' // Logic for branch relationship not in 'empleados' table definition provided, could be added if needed
  }));
};

export const createUser = async (user: User): Promise<User | null> => {
  const { data, error } = await supabase.from('empleados').insert({
    nomina: user.payrollId,
    nombre: user.name,
    contrasena: user.password || '123456',
    rol: user.role,
    correo: user.email
  }).select().single();

  if (error) {
    console.error('Error creating user:', error);
    return null;
  }

  return {
    ...user,
    id: data.id
  };
};

export const updateUser = async (user: User): Promise<User | null> => {
  const { data, error } = await supabase
    .from('empleados')
    .update({
      nomina: user.payrollId,
      nombre: user.name,
      contrasena: user.password, // Be careful updating passwords in plain text in production
      rol: user.role,
      correo: user.email
    })
    .eq('id', user.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating user:', error);
    return null;
  }
  
  return {
    ...user,
    id: data.id
  };
};

export const deleteUser = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('empleados').delete().eq('id', id);
  if (error) {
    console.error('Error deleting user:', error);
    return false;
  }
  return true;
};

// Helper for Dev: Ensure Admin exists
export const ensureAdminUser = async () => {
  // Check if admin already exists
  const { data } = await supabase.from('empleados').select('id').eq('nomina', 'ADMIN').single();
  
  if (!data) {
    console.log("Creating default admin user...");
    const { error } = await supabase.from('empleados').insert({
      nomina: 'ADMIN',
      nombre: 'Administrador Sistema',
      contrasena: 'Donnico1',
      rol: 'Gerente', // Role.GERENTE
      correo: 'admin@ferredonnico.com'
    });
    
    if (error) {
      console.error("Error creating admin:", error);
      throw error;
    }
    return true; // Created
  }
  return false; // Already existed
};

// --- BRANCHES (SUCURSALES) ---

export const fetchBranches = async (): Promise<Branch[]> => {
  const { data, error } = await supabase.from('sucursales').select('*');
  if (error) {
    console.error('Error fetching branches:', error);
    return [];
  }

  return data.map((suc: any) => ({
    id: suc.id,
    name: suc.nombre,
    address: suc.direccion
  }));
};

export const createBranch = async (branch: Branch): Promise<Branch | null> => {
  const { data, error } = await supabase.from('sucursales').insert({
    nombre: branch.name,
    direccion: branch.address
  }).select().single();

  if (error) {
    console.error('Error creating branch:', error);
    return null;
  }
  return { ...branch, id: data.id };
};

export const updateBranch = async (branch: Branch): Promise<Branch | null> => {
  const { data, error } = await supabase
    .from('sucursales')
    .update({
      nombre: branch.name,
      direccion: branch.address
    })
    .eq('id', branch.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating branch:', error);
    return null;
  }
  return { ...branch, id: data.id };
};

export const deleteBranch = async (id: string): Promise<boolean> => {
  const { error } = await supabase.from('sucursales').delete().eq('id', id);
  if (error) {
    console.error("Error deleting branch", error);
    return false;
  }
  return true;
};

// --- TASKS ---

export const fetchTasks = async (): Promise<Task[]> => {
  const { data, error } = await supabase.from('tasks').select('*');
  
  if (error) {
    console.error('Error fetching tasks:', error);
    return [];
  }

  return data.map((t: any) => ({
    id: t.id,
    folio: t.folio,
    title: t.tarea, // Mapping 'tarea' to title
    description: t.tarea, // Mapping 'tarea' to description as well since DB is simple
    assignedTo: t.asignacion ? [t.asignacion] : [],
    createdBy: '', // Not in DB
    dueDate: t.fecha_hora_vencimiento,
    status: mapStatusFromDB(t.status),
    priority: Priority.MEDIUM, // Default, not in DB
    createdAt: t.created_at,
    evidenceUrl: t.evidencia_anexa_url,
    attachmentUrl: t.archivo_anexo_url,
    attachmentName: t.archivo_anexo_url ? 'Archivo Adjunto' : undefined,
    requiresEvidence: true, // Defaulting to true or based on logic
    subtasks: [] // Not in DB
  }));
};

export const createTask = async (task: Partial<Task>): Promise<Task | null> => {
  // DB requires a single UUID for assignment
  const assigneeId = task.assignedTo && task.assignedTo.length > 0 ? task.assignedTo[0] : null;

  if (!assigneeId) {
    console.error("Cannot create task without assignment");
    return null;
  }

  const { data, error } = await supabase.from('tasks').insert({
    folio: task.folio,
    tarea: task.title, // Saving title as the main task text
    asignacion: assigneeId,
    fecha_hora_vencimiento: task.dueDate,
    status: mapStatusToDB(task.status || TaskStatus.PENDING),
    archivo_anexo_url: task.attachmentUrl,
    evidencia_anexa_url: task.evidenceUrl
  }).select().single();

  if (error) {
    console.error('Error creating task:', error);
    return null;
  }

  return {
    ...task,
    id: data.id,
    createdAt: data.created_at,
    status: mapStatusFromDB(data.status)
  } as Task;
};

export const updateTaskStatus = async (taskId: string, status: TaskStatus) => {
  const dbStatus = mapStatusToDB(status);
  const { error } = await supabase
    .from('tasks')
    .update({ status: dbStatus })
    .eq('id', taskId);
  
  if (error) console.error("Error updating status:", error);
};

export const updateTaskEvidence = async (taskId: string, url: string) => {
  const { error } = await supabase
    .from('tasks')
    .update({ 
      evidencia_anexa_url: url,
      status: 'completada'
    })
    .eq('id', taskId);
    
  if (error) console.error("Error updating evidence:", error);
};

export const deleteTask = async (taskId: string): Promise<boolean> => {
  const { error } = await supabase.from('tasks').delete().eq('id', taskId);
  if (error) {
    console.error("Error deleting task:", error);
    return false;
  }
  return true;
};