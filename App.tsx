import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import DocsPage from './pages/DocsPage';
import TeamPage from './pages/TeamPage';
import SettingsPage from './pages/SettingsPage';
import { User, Task, TaskStatus, Role, Branch, Priority } from './types';
import { sendOverdueNotification, sendUpcomingDeadlineNotification, requestNotificationPermission } from './services/notificationService';
import { supabase } from './lib/supabaseClient';
import { 
  fetchUsers, 
  fetchBranches, 
  fetchTasks, 
  createTask as apiCreateTask, 
  updateTask as apiUpdateTask, 
  createUser as apiCreateUser,
  updateUser as apiUpdateUser,
  deleteUser as apiDeleteUser,
  createBranch as apiCreateBranch,
  updateBranch as apiUpdateBranch,
  deleteBranch as apiDeleteBranch,
  updateTaskStatus as apiUpdateStatus,
  updateTaskEvidence as apiUpdateEvidence,
  uploadFile,
  deleteTask as apiDeleteTask,
  mapTaskFromDB
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

    // --- REALTIME SUBSCRIPTION ---
    // This allows all roles to see updates immediately without refreshing
    const channel = supabase
      .channel('tasks_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload) => {
         // payload.new contains the raw DB row. We map it to our App Interface.
         
         if (payload.eventType === 'INSERT') {
            const newTask = mapTaskFromDB(payload.new);
            // Append new task - Check for duplicates to avoid double add from optimistic update
            setTasks(prev => {
                if (prev.find(t => t.id === newTask.id)) return prev;
                return [newTask, ...prev];
            });
         } else if (payload.eventType === 'UPDATE') {
            const updatedTask = mapTaskFromDB(payload.new);
            // Replace existing task
            setTasks(prev => prev.map(t => t.id === updatedTask.id ? updatedTask : t));
         } else if (payload.eventType === 'DELETE') {
            // Remove task
            setTasks(prev => prev.filter(t => t.id !== payload.old.id));
         }
      })
      .subscribe();

    // Cleanup subscription on unmount
    return () => {
       supabase.removeChannel(channel);
    }
  }, []);

  // Permission Logic
  const FULL_ACCESS_ROLES = [Role.GERENTE, Role.JEFE_ADMIN, Role.SUPERVISOR_OPS];
  const hasManagementAccess = currentUser && FULL_ACCESS_ROLES.includes(currentUser.role);
  const isGerente = currentUser?.role === Role.GERENTE;

  // VISIBILITY FILTER:
  // Encargados Berel and Supervisor Comercial usually see tasks from their own branch.
  // UPDATE: They must ALSO see tasks assigned to them (Primary or Secondary) regardless of branch.
  const getVisibleTasks = () => {
    if (!currentUser) return [];

    const RESTRICTED_ROLES = [Role.ENCARGADO_BEREL, Role.SUPERVISOR_COM];
    
    if (RESTRICTED_ROLES.includes(currentUser.role)) {
       return tasks.filter(t => {
         const isAssignedToMe = t.assignedTo && t.assignedTo.includes(currentUser.id);
         const isMyBranch = t.branch === currentUser.branch;
         return isAssignedToMe || isMyBranch;
       });
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

  const handleCreateTask = async (newTask: Partial<Task>, attachmentFile?: File) => {
    try {
      let attachmentUrl = undefined;

      // 1. Upload Attachment if present
      if (attachmentFile) {
         const url = await uploadFile(attachmentFile, 'attachments');
         if (url) {
            attachmentUrl = url;
         } else {
           console.warn("Upload failed, cancelling task creation");
           return; 
         }
      }

      // Determine Branch logic
      let taskBranch = newTask.branch;
      if (!taskBranch && newTask.assignedTo && newTask.assignedTo.length > 0) {
         const assignee = users.find(u => u.id === newTask.assignedTo![0]);
         if (assignee && assignee.branch) {
            taskBranch = assignee.branch; 
         }
      }
      if (!taskBranch) taskBranch = 'General';

      // Basic Task Structure
      const baseTask: Partial<Task> = {
        title: newTask.title || '',
        description: newTask.description || '', 
        assignedTo: newTask.assignedTo || [],
        dueDate: newTask.dueDate,
        status: TaskStatus.PENDING,
        priority: newTask.priority || Priority.MEDIUM,
        requiresEvidence: newTask.requiresEvidence || false,
        attachmentUrl: attachmentUrl || newTask.attachmentUrl,
        evidenceUrl: '', 
        branch: taskBranch 
      };

      if (newTask.isRecurring && newTask.recurringDays && newTask.recurringDays.length > 0 && newTask.dueDate) {
         const startDate = new Date();
         startDate.setDate(startDate.getDate() + 1); 
         startDate.setHours(0,0,0,0);
         
         const endDate = new Date(newTask.dueDate);
         endDate.setHours(23,59,59,999); 

         const loopDate = new Date(startDate);
         const promises = [];
         const createdTasks: Task[] = [];

         while (loopDate <= endDate) {
           if (newTask.recurringDays.includes(loopDate.getDay())) {
              const specificDueDate = new Date(loopDate);
              specificDueDate.setHours(18, 0, 0, 0);

              const taskToCreate = {
                 ...baseTask,
                 folio: generateFolio(loopDate),
                 dueDate: specificDueDate.toISOString(),
              };
              
              promises.push(apiCreateTask(taskToCreate, currentUser?.id).then(t => { if(t) createdTasks.push(t); }));
           }
           loopDate.setDate(loopDate.getDate() + 1);
         }
         await Promise.all(promises);
         
         // Optimistic Update for Recurring
         setTasks(prev => [...createdTasks, ...prev]);

      } else {
         // Single Task
         const taskToCreate = {
          ...baseTask,
          folio: generateFolio(new Date()),
          dueDate: newTask.dueDate || new Date().toISOString(),
        };
        const result = await apiCreateTask(taskToCreate, currentUser?.id);
        
        if (result) {
            // Optimistic Update for Single Task
            setTasks(prev => [result, ...prev]);
        }
      }
      
    } catch (e) {
      console.error("Error creating task in App.tsx", e);
      alert("Hubo un error inesperado al crear la tarea.");
    }
  };

  const handleUpdateTask = async (taskToUpdate: Partial<Task>, attachmentFile?: File) => {
    let attachmentUrl = taskToUpdate.attachmentUrl;

    // 1. Upload new Attachment if present
    if (attachmentFile) {
       const url = await uploadFile(attachmentFile, 'attachments');
       if (url) {
          attachmentUrl = url;
       }
    }

    const updatedTaskData = {
        ...taskToUpdate,
        attachmentUrl
    };

    // Optimistic Update for Details
    // We construct a "complete enough" task object to update the UI immediately
    setTasks(prev => prev.map(t => {
        if (t.id === updatedTaskData.id) {
            return { ...t, ...updatedTaskData } as Task;
        }
        return t;
    }));

    // Call API (Realtime will confirm sync later)
    await apiUpdateTask(updatedTaskData, currentUser?.id);
  };

  const handleUpdateStatus = async (taskId: string, status: TaskStatus) => {
    // Optimistic Update for immediate feedback
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status } : t));
    // Pass currentUser.id for logging
    await apiUpdateStatus(taskId, status, currentUser?.id);
  };

  const handleDeleteTask = async (taskId: string) => {
    // Optimistic Update
    setTasks(tasks.filter(t => t.id !== taskId));
    await apiDeleteTask(taskId, currentUser?.id);
  };

  const handleSaveEvidence = async (taskId: string, file: File) => {
    try {
      // 1. Upload to Supabase Storage
      const publicUrl = await uploadFile(file, 'evidence');
      
      if (!publicUrl) return;

      // 2. Update Database (Realtime will sync state for others)
      // Local optimistic update
      setTasks(tasks.map(t => t.id === taskId ? { 
        ...t, 
        evidenceUrl: publicUrl, 
        status: TaskStatus.COMPLETED 
      } : t));

      // Pass currentUser.id for logging
      await apiUpdateEvidence(taskId, publicUrl, currentUser?.id);

    } catch (error) {
      console.error("Error saving evidence:", error);
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
           // Alert handled in service
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
                  branches={branches} // Pass branches
                  currentUser={currentUser} 
                  onCreateTask={handleCreateTask}
                  onUpdateTask={handleUpdateTask} // Pass update handler
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
                  currentUser={currentUser}
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