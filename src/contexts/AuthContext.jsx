
import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing user in localStorage
    const savedUser = localStorage.getItem('inklink_user');
    if (savedUser) {
      setUser(JSON.parse(savedUser));
    }
    setLoading(false);
  }, []);

  const login = (userData) => {
    setUser(userData);
    localStorage.setItem('inklink_user', JSON.stringify(userData));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('inklink_user');
  };

  const updateUser = (updatedData) => {
    const updatedUser = { ...user, ...updatedData };
    setUser(updatedUser);
    localStorage.setItem('inklink_user', JSON.stringify(updatedUser));
    
    // Update in users storage
    const users = JSON.parse(localStorage.getItem('inklink_users') || '[]');
    const userIndex = users.findIndex(u => u.id === updatedUser.id);
    if (userIndex !== -1) {
      users[userIndex] = updatedUser;
      localStorage.setItem('inklink_users', JSON.stringify(users));
    }
  };

  const value = {
    user,
    login,
    logout,
    updateUser,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
