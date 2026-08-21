import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RoomProvider } from './context/RoomContext';
import { ToastProvider } from './context/ToastContext';
import Navbar from './components/Navbar';
import HomePage from './pages/HomePage';
import RoomPage from './pages/RoomPage';
import { LoginPage, SignupPage } from './pages/AuthPages';
import SpotifyCallbackPage from './pages/SpotifyCallbackPage';

function App() {
  return (
    <Router>
      <AuthProvider>
        <ToastProvider>
          <RoomProvider>
            <div className="min-h-screen bg-cyber-bg text-slate-100 flex flex-col font-sans selection:bg-spotify-green selection:text-black">
              <Navbar />
              <main className="flex-1">
                <Routes>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/room/:code" element={<RoomPage />} />
                  <Route path="/login" element={<LoginPage />} />
                  <Route path="/signup" element={<SignupPage />} />
                  <Route path="/auth/spotify-callback" element={<SpotifyCallbackPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </main>
            </div>
          </RoomProvider>
        </ToastProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
