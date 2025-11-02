import React, { createContext, useContext, useReducer } from 'react';

const NotificationContext = createContext();

const notificationReducer = (state, action) => {
  switch (action.type) {
    case 'ADD_NOTIFICATION':
      return [...state, action.payload];
    case 'REMOVE_NOTIFICATION':
      return state.filter(notification => notification.id !== action.payload);
    case 'CLEAR_ALL':
      return [];
    default:
      return state;
  }
};

export const NotificationProvider = ({ children }) => {
  const [notifications, dispatch] = useReducer(notificationReducer, []);

  const addNotification = (notification) => {
    const id = Date.now() + Math.random();
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: { ...notification, id }
    });
  };

  const removeNotification = (id) => {
    dispatch({
      type: 'REMOVE_NOTIFICATION',
      payload: id
    });
  };

  const clearAllNotifications = () => {
    dispatch({ type: 'CLEAR_ALL' });
  };

  // Convenience methods for different notification types
  const showSuccess = (title, message, duration = 5000) => {
    addNotification({ type: 'success', title, message, duration });
  };

  const showError = (title, message, duration = 7000) => {
    addNotification({ type: 'error', title, message, duration });
  };

  const showWarning = (title, message, duration = 6000) => {
    addNotification({ type: 'warning', title, message, duration });
  };

  const showInfo = (title, message, duration = 5000) => {
    addNotification({ type: 'info', title, message, duration });
  };

  const value = {
    notifications,
    addNotification,
    removeNotification,
    clearAllNotifications,
    showSuccess,
    showError,
    showWarning,
    showInfo
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};
