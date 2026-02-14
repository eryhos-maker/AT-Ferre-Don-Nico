import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import DocsPage from './pages/DocsPage';
import TeamPage from './pages/TeamPage';
import SettingsPage from './pages/SettingsPage';
import { User, Task, TaskStatus, Role, Branch } from './types';
import { sendOverdueNotification, sendUpcomingDeadlineNotification, requestNotificationPermission } from './services/notificationService';
import { 
  fetchUsers, 
  fetchBranches, 
  fetchTasks, 
  createTask as apiCreateTask, 
  createUser as apiCreateUser,
  updateUser as apiUpdateUser,
  deleteUser as apiDeleteUser,
  createBranch as apiCreateBranch,
  updateBranch as apiUpdateBranch,
  deleteBranch as apiDeleteBranch,
  updateTaskStatus as apiUpdateStatus,
  updateTaskEvidence as apiUpdateEvidence,
  uploadEvidenceFile,
  deleteTask as apiDeleteTask
} from './services/supabaseService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [isLoading, setIsLoading] = useState(true);

  // Load Data from Supabase
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      
      try {
        const [usersData, branchesData, tasksData] = await Promise.all([
          fetchUsers(),
          fetchBranches(),
          fetchTasks()
        ]);
        setUsers(usersData);
        setBranches(branchesData);
        setTasks(tasksData);
      } catch (error) {
        console.error("Failed to load initial data", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
    
    // Request Notification Permission on load
    requestNotificationPermission();
  }, []);

  // Permission Logic
  const FULL_ACCESS_ROLES = [Role.GERENTE, Role.JEFE_ADMIN, Role.SUPERVISOR_OPS];
  const hasManagementAccess = currentUser && FULL_ACCESS_ROLES.includes(currentUser.role);
  const isGerente = currentUser?.role === Role.GERENTE;

  // VISIBILITY FILTER:
  // Encargados Berel and Supervisor Comercial only see tasks from their own branch
  const getVisibleTasks = () => {
    if (!currentUser) return [];

    const RESTRICTED_ROLES = [Role.ENCARGADO_BEREL, Role.SUPERVISOR_COM];
    
    if (RESTRICTED_ROLES.includes(currentUser.role)) {
       // Filter by branch match
       // Note: If user has no branch set, they might see nothing or only tasks with no branch.
       return tasks.filter(t => t.branch === currentUser.branch);
    }

    // Gerentes, Admins, etc. see all tasks
    return tasks;
  };

  const visibleTasks = getVisibleTasks();

  // Check for overdue tasks notifications
  useEffect(() => {
    if (tasks.length === 0) return;

    const checkTaskStatus = () => {
      const now = new Date();
      let updatesFound = false;

      const nextTasks = tasks.map(task => {
        if (task.status === TaskStatus.COMPLETED) return task;

        const dueDate = new Date(task.dueDate);
        const timeDiff = dueDate.getTime() - now.getTime();
        const hoursRemaining = timeDiff / (1000 * 60 * 60);

        // 1. Logica de Vencimiento (Frontend calculation only as DB doesn't auto-update status)
        if (task.status !== TaskStatus.OVERDUE && dueDate < now) {
          console.log(`Detectada tarea vencida: ${task.title}`);
          sendOverdueNotification(task, users);
          updatesFound = true;
          return { ...task, status: TaskStatus.OVERDUE };
        }

        // 2. Logica de Notificación Preventiva (24h antes)
        if (hoursRemaining > 0 && hoursRemaining <= 24 && !task.upcomingNotificationSent) {
          console.log(`Detectada tarea próxima a vencer (24h): ${task.title}`);
          sendUpcomingDeadlineNotification(task, users);
          updatesFound = true;
          return { ...task, upcomingNotificationSent: true };
        }

        return task;
      });

      if (updatesFound) {
        setTasks(nextTasks);
      }
    };

    checkTaskStatus();
    const timer = setInterval(checkTaskStatus, 60000);
    return () => clearInterval(timer);
  }, [tasks, users]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    const isManager = FULL_ACCESS_ROLES.includes(user.role);
    const initialPath = isManager ? '/' : '/tasks';
    setCurrentPath(initialPath);
    window.location.hash = initialPath;
    
    // Ensure permission is requested again on login if missed
    requestNotificationPermission();
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const generateFolio = (date: Date) => {
     const dateStr = date.toISOString().slice(2,10).replace(/-/g, '');
     const randomPart = Math.floor(1000 + Math.random() * 9000);
     return `OP-${dateStr}-${randomPart}`;
  };

  const handleCreateTask = async (newTask: Partial<Task>) => {
    // Determine Branch based on Assignee
    // We look up the first assigned user to get their branch
    let taskBranch = '';
    
    // Find Branch ID if we have branches loaded
    // This logic ensures we save the ID if branches are objects, or string if simple text.
    // However, fetchTasks now joins tables, so we should try to save the ID.
    if (newTask.assignedTo && newTask.assignedTo.length > 0) {
       const assignee = users.find(u => u.id === newTask.assignedTo![0]);
       if (assignee && assignee.branch) {
          // If the 'branch' on user is just a name, we might need to find the ID.
          // Since the user list 'branch' comes from 'sucursal' column which might be an ID or name depending on DB state.
          // Assuming user.branch currently holds the Name (based on fetchUsers mapping), we need to find the ID from 'branches'.
          const foundBranch = branches.find(b => b.name === assignee.branch);
          taskBranch = foundBranch ? foundBranch.id : assignee.branch; 
       }
    }

    // Basic Task Structure
    const baseTask: Partial<Task> = {
      title: newTask.title || '',
      assignedTo: newTask.assignedTo || [],
      dueDate: newTask.dueDate,
      status: TaskStatus.PENDING,
      attachmentUrl: newTask.attachmentUrl,
      evidenceUrl: '', // Empty initially
      branch: taskBranch // Save branch ID!
    };

    const createdTasks: Task[] = [];

    // NOTE: Supabase DB schema provided does NOT support Recurring logic natively.
    // We will generate individual rows for each recurring instance immediately.
    
    if (newTask.isRecurring && newTask.recurringDays && newTask.recurringDays.length > 0 && newTask.dueDate) {
       const startDate = new Date();
       // FIX: Start recurring tasks from tomorrow (day + 1) to avoid creating a task for the current day.
       startDate.setDate(startDate.getDate() + 1); 
       startDate.setHours(0,0,0,0);
       
       const endDate = new Date(newTask.dueDate);
       endDate.setHours(23,59,59,999); 

       const loopDate = new Date(startDate);

       while (loopDate <= endDate) {
         if (newTask.recurringDays.includes(loopDate.getDay())) {
            const specificDueDate = new Date(loopDate);
            specificDueDate.setHours(18, 0, 0, 0);

            const taskToCreate = {
               ...baseTask,
               folio: generateFolio(loopDate),
               dueDate: specificDueDate.toISOString(),
            };
            
            const savedTask = await apiCreateTask(taskToCreate);
            if (savedTask) createdTasks.push(savedTask);
         }
         loopDate.setDate(loopDate.getDate() + 1);
       }
    } else {
       // Single Task
       const taskToCreate = {
        ...baseTask,
        folio: generateFolio(new Date()),
        dueDate: newTask.dueDate || new Date().toISOString(),
      };
      const savedTask = await apiCreateTask(taskToCreate);
      if (savedTask) createdTasks.push(savedTask);
    }

    if (createdTasks.length > 0) {
      setTasks(prev => [...createdTasks, ...prev]);
    }
  };

  const handleUpdateStatus = async (taskId: string, status: TaskStatus) => {
    // Optimistic Update
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status } : t));
    await apiUpdateStatus(taskId, status);
  };

  const handleDeleteTask = async (taskId: string) => {
    // Optimistic Update
    setTasks(tasks.filter(t => t.id !== taskId));
    await apiDeleteTask(taskId);
  };

  const handleSaveEvidence = async (taskId: string, file: File) => {
    try {
      // 1. Upload to Google Drive (Triggers Popup if needed)
      const publicUrl = await uploadEvidenceFile(file);
      
      if (!publicUrl) {
        // uploadEvidenceFile alerts on error already
        return;
      }

      // 2. Update Database with URL
      await apiUpdateEvidence(taskId, publicUrl);

      // 3. Update Local State
      setTasks(tasks.map(t => t.id === taskId ? { 
        ...t, 
        evidenceUrl: publicUrl, 
        status: TaskStatus.COMPLETED 
      } : t));

    } catch (error) {
      console.error("Error saving evidence:", error);
      alert("Ocurrió un error inesperado al guardar la evidencia.");
    }
  };

  // --- User Management ---
  const handleAddUser = async (newUser: User) => {
    const savedUser = await apiCreateUser(newUser);
    if (savedUser) {
      setUsers(prev => [...prev, savedUser]);
    }
  };

  const handleUpdateUser = async (updatedUser: User) => {
    const result = await apiUpdateUser(updatedUser);
    if (result) {
       setUsers(prev => prev.map(u => u.id === updatedUser.id ? result : u));
    }
  };
  
  const handleRemoveUser = async (userId: string) => {
     if (window.confirm("¿Estás seguro de eliminar este usuario?")) {
        const success = await apiDeleteUser(userId);
        if (success) {
           setUsers(prev => prev.filter(u => u.id !== userId));
        } else {
           alert("No se pudo eliminar el usuario. Verifique que no tenga tareas asignadas.");
        }
     }
  };

  // --- Branch Management ---
  const handleAddBranch = async (newBranch: Branch) => {
    const savedBranch = await apiCreateBranch(newBranch);
    if (savedBranch) {
      setBranches(prev => [...prev, savedBranch]);
    }
  };

  const handleUpdateBranch = async (updatedBranch: Branch) => {
    const result = await apiUpdateBranch(updatedBranch);
    if (result) {
       setBranches(prev => prev.map(b => b.id === updatedBranch.id ? result : b));
    }
  };

  const handleRemoveBranch = async (branchId: string) => {
    if (window.confirm("¿Eliminar esta sucursal?")) {
       const success = await apiDeleteBranch(branchId);
       if (success) {
          setBranches(prev => prev.filter(b => b.id !== branchId));
       }
    }
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} users={users} />; 
  }

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center bg-gray-100 text-blue-800 font-bold">Cargando Sistema...</div>;
  }

  return (
    <Router>
      <div className="flex min-h-screen bg-gray-50 font-sans">
        <Sidebar 
          currentUser={currentUser} 
          currentPath={currentPath}
          onNavigate={(path) => {
            setCurrentPath(path);
            window.location.hash = path;
          }}
          onLogout={handleLogout}
        />
        
        <main className="ml-64 flex-1 p-8 overflow-y-auto h-screen">
          <Routes>
            <Route 
              path="/" 
              element={hasManagementAccess ? <DashboardPage tasks={tasks} currentUser={currentUser} /> : <Navigate to="/tasks" />} 
            />
            <Route 
              path="/tasks" 
              element={
                <TasksPage 
                  tasks={visibleTasks} 
                  users={users} 
                  currentUser={currentUser} 
                  onCreateTask={handleCreateTask}
                  onUpdateStatus={handleUpdateStatus}
                  onDeleteTask={handleDeleteTask}
                  onSaveEvidence={handleSaveEvidence}
                />
              } 
            />
            <Route 
              path="/team" 
              element={hasManagementAccess ? <TeamPage users={users} /> : <Navigate to="/tasks" />} 
            />
            <Route 
              path="/settings" 
              element={
                hasManagementAccess ? 
                <SettingsPage 
                  users={users} 
                  branches={branches}
                  onAddUser={handleAddUser}
                  onUpdateUser={handleUpdateUser}
                  onRemoveUser={handleRemoveUser}
                  onAddBranch={handleAddBranch}
                  onUpdateBranch={handleUpdateBranch}
                  onRemoveBranch={handleRemoveBranch}
                /> : <Navigate to="/tasks" />
              } 
            />
            <Route 
              path="/docs" 
              element={isGerente ? <DocsPage /> : <Navigate to={hasManagementAccess ? "/" : "/tasks"} />} 
            />
            <Route 
              path="*" 
              element={<Navigate to={hasManagementAccess ? "/" : "/tasks"} />} 
            />
          </Routes>
        </main>
      </div>
    </Router>
  );
};

export default App;