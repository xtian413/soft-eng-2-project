import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import AppShell from './layouts/AppShell'
import AuthLayout from './layouts/AuthLayout'
import DashboardPage from './pages/DashboardPage'
import LiftPage from './pages/LiftPage'
import FoodHubPage from './pages/FoodHubPage'
import CoachChatPage from './pages/CoachChatPage'
import ProfilePage from './pages/ProfilePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'

const router = createBrowserRouter([
  {
    path: '/',
    element: <AuthLayout />,
    children: [
      { index: true, element: <LoginPage /> },
      { path: 'register', element: <RegisterPage /> },
    ],
  },
  {
    path: '/app',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'lift', element: <LiftPage /> },
      { path: 'food', element: <FoodHubPage /> },
      { path: 'coach', element: <CoachChatPage /> },
      { path: 'profile', element: <ProfilePage /> },
    ],
  },
])

function App() {
  return <RouterProvider router={router} />
}

export default App
