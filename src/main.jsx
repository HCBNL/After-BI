import React from 'react';
import ReactDOM from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { AppProvider } from './lib/app.jsx';
import Shell from './components/Shell.jsx';
import Landing from './pages/Landing.jsx';
import { SignIn, SignUp } from './pages/Auth.jsx';
import Home from './pages/Home.jsx';
import Journey from './pages/Journey.jsx';
import Play from './pages/World.jsx';
import Leaderboard from './pages/Leaderboard.jsx';
import Certificates from './pages/Certificates.jsx';
import Verify from './pages/Verify.jsx';
import Premium from './pages/Premium.jsx';
import FarmHome, { FarmPlay } from './pages/Farm.jsx';
import './styles.css';

// A data router, so the game can ask before you leave it.
const router = createBrowserRouter([
  { path: '/', element: <Landing /> },
  { path: '/signin', element: <SignIn /> },
  { path: '/signup', element: <SignUp /> },
  { path: '/verify/:code', element: <Verify /> },
  {
    path: '/app',
    element: <Shell />,
    children: [
      { index: true, element: <Home /> },
      { path: 'journey/entrepreneur', element: <Journey /> },
      { path: 'play/:key', element: <Play /> },
      { path: 'farm', element: <FarmHome /> },
      { path: 'farm/play', element: <FarmPlay /> },
      { path: 'leaderboard', element: <Leaderboard /> },
      { path: 'certificates', element: <Certificates /> },
      { path: 'premium', element: <Premium /> },
    ],
  },
  { path: '*', element: <Navigate to="/" replace /> },
]);

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AppProvider>
      <RouterProvider router={router} />
    </AppProvider>
  </React.StrictMode>
);
