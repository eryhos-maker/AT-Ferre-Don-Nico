import React, { useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import TasksPage from './pages/TasksPage';
import DocsPage from './pages/DocsPage';
import TeamPage from './pages/TeamPage';
import { USERS, MOCK_TASKS } from './constants';
import { User, Task, TaskStatus, Role } from './types';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [users, setUsers] = useState<User[]>(USERS);
  const [currentPath, setCurrentPath] = useState('/');

  // Permission Logic
  const FULL_ACCESS_ROLES = [Role.GERENTE, Role.JEFE_ADMIN, Role.SUPERVISOR_OPS];
  const hasManagementAccess = currentUser && FULL_ACCESS_ROLES.includes(currentUser.role);
  const isGerente = currentUser?.role === Role.GERENTE;

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

  const handleCreateTask = (newTask: Partial<Task>) => {
    const task: Task = {
      id: `t${Date.now()}`,
      createdAt: new Date().toISOString(),
      status: TaskStatus.PENDING,
      ...newTask as any
    };
    setTasks([task, ...tasks]);
  };

  const handleUpdateStatus = (taskId: string, status: TaskStatus) => {
    setTasks(tasks.map(t => t.id === taskId ? { ...t, status } : t));
  };

  const handleAddUser = (newUser: User) => {
    setUsers([...users, newUser]);
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
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
                />
              } 
            />
            <Route 
              path="/team" 
              element={hasManagementAccess ? <TeamPage users={users} onAddUser={handleAddUser} /> : <Navigate to="/tasks" />} 
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