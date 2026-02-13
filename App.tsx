import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import DocsPage from './pages/DocsPage';
import TeamPage from './pages/TeamPage';
import SettingsPage from './pages/SettingsPage';
import { USERS, MOCK_TASKS, MOCK_BRANCHES } from './constants';
import { User, Task, TaskStatus, Role, Branch } from './types';
import { sendOverdueNotification, sendUpcomingDeadlineNotification } from './services/notificationService';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [users, setUsers] = useState<User[]>(USERS);
  const [branches, setBranches] = useState<Branch[]>(MOCK_BRANCHES);
  const [currentPath, setCurrentPath] = useState('/');

  // Permission Logic
  const FULL_ACCESS_ROLES = [Role.GERENTE, Role.JEFE_ADMIN, Role.SUPERVISOR_OPS];
  const hasManagementAccess = currentUser && FULL_ACCESS_ROLES.includes(currentUser.role);
  const isGerente = currentUser?.role === Role.GERENTE;

  // Cleanup effect: Delete completed cyclic tasks from previous month on the 10th of current month
  useEffect(() => {
    const checkAndCleanTasks = () => {
      const today = new Date();
      const currentDay = today.getDate();

      // Only run cleanup if today is 10th or later
      if (currentDay >= 10) {
        const currentMonth = today.getMonth(); // 0-11
        const currentYear = today.getFullYear();
        
        // Calculate Previous Month index (handle January rollover)
        let targetMonth = currentMonth - 1;
        let targetYear = currentYear;
        
        if (targetMonth < 0) {
          targetMonth = 11; // December
          targetYear = currentYear - 1;
        }

        setTasks(prevTasks => prevTasks.filter(task => {
          // Si NO es recurrente o NO está completada, la conservamos
          if (!task.isRecurring || task.status !== TaskStatus.COMPLETED) {
            return true;
          }

          // Si es recurrente y completada, verificamos la fecha
          const taskDate = new Date(task.dueDate); // Usamos dueDate para saber a qué mes pertenece operativo
          
          const taskMonth = taskDate.getMonth();
          const taskYear = taskDate.getFullYear();

          // Si la tarea es EXACTAMENTE del mes anterior, la borramos (retornamos false)
          const isFromPreviousMonth = (taskMonth === targetMonth) && (taskYear === targetYear);
          
          return !isFromPreviousMonth;
        }));
      }
    };

    checkAndCleanTasks();
  }, []); // Run once on mount

  // Check for overdue tasks and upcoming deadlines
  useEffect(() => {
    const checkTaskStatus = () => {
      const now = new Date();
      let updatesFound = false;

      const nextTasks = tasks.map(task => {
        // Ignorar tareas completadas o ya marcadas como vencidas (para lógica de vencimiento)
        // Pero debemos verificar Upcoming incluso si no está vencida
        if (task.status === TaskStatus.COMPLETED) return task;

        const dueDate = new Date(task.dueDate);
        const timeDiff = dueDate.getTime() - now.getTime();
        const hoursRemaining = timeDiff / (1000 * 60 * 60);

        // 1. Logica de Vencimiento (Overdue)
        if (task.status !== TaskStatus.OVERDUE && dueDate < now) {
          console.log(`Detectada tarea vencida: ${task.title}`);
          sendOverdueNotification(task, users);
          updatesFound = true;
          return { ...task, status: TaskStatus.OVERDUE };
        }

        // 2. Logica de Notificación Preventiva (24h antes)
        // Checamos si faltan entre 0 y 24 horas y si no hemos enviado la notificación aún
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

    // Check immediately
    checkTaskStatus();

    // Check every minute
    const timer = setInterval(checkTaskStatus, 60000);
    return () => clearInterval(timer);
  }, [tasks, users]);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    // Redirect based on role permissions
    const isManager = FULL_ACCESS_ROLES.includes(user.role);
    const initialPath = isManager ? '/' : '/tasks';
    setCurrentPath(initialPath);
    window.location.hash = initialPath;
  };

  const handleLogout = () => {
    setCurrentUser(null);
  };

  const generateFolio = (date: Date) => {
     const dateStr = date.toISOString().slice(2,10).replace(/-/g, '');
     const randomPart = Math.floor(1000 + Math.random() * 9000);
     return `OP-${dateStr}-${randomPart}`;
  };

  const handleCreateTask = (newTask: Partial<Task>) => {
    const newTasksToAdd: Task[] = [];
    
    // Base object common to all tasks
    const baseTask = {
      description: newTask.description || '',
      assignedTo: newTask.assignedTo || [],
      createdBy: newTask.createdBy || '',
      priority: newTask.priority || 0 as any,
      status: TaskStatus.PENDING,
      createdAt: new Date().toISOString(),
      isRecurring: newTask.isRecurring,
      requiresEvidence: newTask.requiresEvidence,
      subtasks: newTask.subtasks ? [...newTask.subtasks] : [], // Clone array
      // Attachment props
      attachmentUrl: newTask.attachmentUrl,
      attachmentName: newTask.attachmentName,
    };

    if (newTask.isRecurring && newTask.recurringDays && newTask.recurringDays.length > 0 && newTask.dueDate) {
       // --- RECURRING LOGIC ---
       const startDate = new Date();
       startDate.setHours(0,0,0,0);
       
       const endDate = new Date(newTask.dueDate);
       endDate.setHours(23,59,59,999); 

       const loopDate = new Date(startDate);

       while (loopDate <= endDate) {
         if (newTask.recurringDays.includes(loopDate.getDay())) {
            
            const specificDueDate = new Date(loopDate);
            specificDueDate.setHours(18, 0, 0, 0);

            const task: Task = {
               ...baseTask,
               id: `t${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
               folio: generateFolio(loopDate),
               title: newTask.title || '',
               dueDate: specificDueDate.toISOString(),
               recurringDays: newTask.recurringDays,
               subtasks: newTask.subtasks ? JSON.parse(JSON.stringify(newTask.subtasks)) : []
            };
            
            newTasksToAdd.push(task);
         }
         
         loopDate.setDate(loopDate.getDate() + 1);
       }
       
       if (newTasksToAdd.length === 0) {
           alert("No se generaron tareas. Verifique que los días seleccionados estén dentro del rango de fechas.");
           return;
       }

    } else {
       // --- SINGLE TASK LOGIC ---
       const task: Task = {
        ...baseTask,
        id: `t${Date.now()}`,
        folio: generateFolio(new Date()),
        title: newTask.title || '',
        dueDate: newTask.dueDate || new Date().toISOString(),
        recurringDays: [],
      };
      newTasksToAdd.push(task);
    }

    setTasks([...newTasksToAdd, ...tasks]);
  };

  const handleUpdateStatus = (taskId: string, status: TaskStatus) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status } : t));
  };

  const handleSaveEvidence = (taskId: string, evidenceUrl: string) => {
    setTasks(tasks.map(t => t.id === taskId ? { 
      ...t, 
      evidenceUrl, 
      status: TaskStatus.COMPLETED // Auto complete when evidence is uploaded
    } : t));
  };

  // User Management Handlers
  const handleAddUser = (newUser: User) => {
    setUsers([...users, newUser]);
  };
  
  const handleRemoveUser = (userId: string) => {
     setUsers(users.filter(u => u.id !== userId));
  };

  // Branch Management Handlers
  const handleAddBranch = (newBranch: Branch) => {
    setBranches([...branches, newBranch]);
  };

  const handleRemoveBranch = (branchId: string) => {
    setBranches(branches.filter(b => b.id !== branchId));
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} users={users} />;
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
                  tasks={tasks} 
                  users={users} 
                  currentUser={currentUser} 
                  onCreateTask={handleCreateTask}
                  onUpdateStatus={handleUpdateStatus}
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
                  onRemoveUser={handleRemoveUser}
                  onAddBranch={handleAddBranch}
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