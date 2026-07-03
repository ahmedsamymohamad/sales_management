'use client';

import React, { useState, useEffect } from 'react';
import Login from '../components/Login';
import AdminDashboard from '../components/AdminDashboard';
import EmployeeDashboard from '../components/EmployeeDashboard';
import Toast from '../components/Toast';

export default function Home() {
  const [user, setUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [toasts, setToasts] = useState([]);

  // Toast Helper
  const showToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type }]);
    
    // Auto-remove toast after 4 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const handleCloseToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load session from localStorage on mount
  useEffect(() => {
    const savedSession = localStorage.getItem('aura_sales_session');
    if (savedSession) {
      try {
        const cachedUser = JSON.parse(savedSession);
        setUser(cachedUser);
        setUserProfile(cachedUser);
      } catch (err) {
        console.error('Failed to parse cached session:', err);
        localStorage.removeItem('aura_sales_session');
      }
    }
    setLoading(false);
  }, []);

  const handleAuthSuccess = (profile) => {
    setUser(profile);
    setUserProfile(profile);
    localStorage.setItem('aura_sales_session', JSON.stringify(profile));
  };

  const handleLogout = () => {
    setLoading(true);
    localStorage.removeItem('aura_sales_session');
    setUser(null);
    setUserProfile(null);
    showToast('Signed out successfully.', 'success');
    setLoading(false);
  };

  if (loading) {
    return (
      <div className="page-loader">
        <div className="loader"></div>
        <p>Loading application state...</p>
        <Toast toasts={toasts} onClose={handleCloseToast} />
      </div>
    );
  }

  return (
    <>
      <Toast toasts={toasts} onClose={handleCloseToast} />
      
      {!user || !userProfile ? (
        <Login onAuthSuccess={handleAuthSuccess} showToast={showToast} />
      ) : userProfile.role === 'admin' ? (
        <AdminDashboard user={user} onLogout={handleLogout} showToast={showToast} />
      ) : (
        <EmployeeDashboard user={user} onLogout={handleLogout} showToast={showToast} />
      )}
    </>
  );
}
