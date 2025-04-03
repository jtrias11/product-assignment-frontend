import React, { useState, useEffect, useCallback } from 'react';
import './styles/App.css'; // Updated import path

// Helper function to format a date string to EST.
const formatEST = (dateStr) => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + ' UTC');
  return date.toLocaleString('en-US', { 
    timeZone: 'America/New_York', 
    hour12: true, 
    year: 'numeric', 
    month: 'numeric', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

// Determine API base URL
const getApiBaseUrl = () => {
  return process.env.REACT_APP_API_BASE_URL || 'https://product-assignment-server.onrender.com/api';
};

const API_BASE_URL = getApiBaseUrl();

// Error Boundary Component
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-state">
          <h2>Something Went Wrong</h2>
          <p>{this.state.error.toString()}</p>
          <button onClick={() => window.location.reload()} className="retry-button">
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function App() {
  // Existing code remains the same...

  // Note: You'll need to add the existing method implementations here
  // Such as renderHeader(), renderSideMenu(), renderDashboard(), etc.
  // These were in your original App.js but not included in the previous artifact

  return (
    <ErrorBoundary>
      <div className={`app ${darkMode ? 'dark-mode' : 'light-mode'}`}>
        {renderHeader()}
        {renderSideMenu()}
        <main className="app-content">
          {error ? (
            <div className="error-state">
              <h2>Error Loading Data</h2>
              <p>{error}</p>
              <button onClick={loadDataFromServer} className="retry-button">
                Retry Loading
              </button>
            </div>
          ) : (
            <>
              {isLoading && (
                <div className="loading-overlay">
                  <div className="loading-content">
                    <div className="spinner-large"></div>
                    <p>{loadingMessage}</p>
                  </div>
                </div>
              )}
              {renderDashboard()}
              {renderConfirmDialog()}
            </>
          )}
        </main>
      </div>
    </ErrorBoundary>
  );
}

export default App;