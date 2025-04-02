import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const getApiBaseUrl = () => {
  const baseUrl = process.env.REACT_APP_API_BASE_URL || 'https://product-assignment-server.onrender.com/api';
  return baseUrl;
};

const API_BASE_URL = getApiBaseUrl();

function App() {
  // Light/Dark mode
  const [darkMode, setDarkMode] = useState(false);
  const toggleTheme = () => setDarkMode(!darkMode);

  // Hamburger menu
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = () => setMenuOpen(!menuOpen);

  // States for data
  const [agents, setAgents] = useState([]);
  const [products, setProducts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading data...');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [view, setView] = useState('agents'); // "agents", "completed", "available", "unassigned", "queue"
  const [completedTasks, setCompletedTasks] = useState([]);
  const [unassignedProducts, setUnassignedProducts] = useState([]);
  const [previouslyAssigned, setPreviouslyAssigned] = useState([]);
  const [queueProducts, setQueueProducts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ show: false, title: '', message: '', onConfirm: null });

  // Load data
  const loadDataFromServer = useCallback(async () => {
    setIsLoading(true);
    setLoadingMessage('Loading data from server...');
    try {
      const [productsRes, agentsRes, assignmentsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/products`),
        fetch(`${API_BASE_URL}/agents`),
        fetch(`${API_BASE_URL}/assignments`)
      ]);
      if (!productsRes.ok || !agentsRes.ok || !assignmentsRes.ok) {
        throw new Error('One or more fetch requests failed');
      }
      const productsData = await productsRes.json();
      const agentsData = await agentsRes.json();
      const assignmentsData = await assignmentsRes.json();
      setProducts(productsData);
      setAgents(agentsData);
      setAssignments(assignmentsData);
      setMessage('Data loaded successfully');
      setIsLoading(false);
    } catch (error) {
      setMessage(`Error loading data: ${error.message}`);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDataFromServer();
  }, [loadDataFromServer]);

  // File upload (icon)
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = null;
    setIsLoading(true);
    setLoadingMessage('Uploading CSV file...');
    const formData = new FormData();
    formData.append('outputFile', file);
    
    try {
      const response = await fetch(`${API_BASE_URL}/upload-output`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Upload failed: ${errorText}`);
      }
      const result = await response.json();
      setMessage(result.message);
      await loadDataFromServer();
    } catch (error) {
      setMessage(`Error uploading file: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Refresh data
  const handleRefreshData = async () => {
    setIsLoading(true);
    setLoadingMessage('Refreshing data from server...');
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/refresh`, { method: 'POST' });
      if (!refreshRes.ok) {
        const errText = await refreshRes.text();
        throw new Error(`Failed to refresh data: ${errText}`);
      }
      await loadDataFromServer();
      setMessage('Data refreshed successfully');
    } catch (error) {
      setMessage(`Error refreshing data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Other actions (requestTask, completeTask, unassign, etc.)
  const requestTask = async (agentId) => { /* same logic as before */ };
  const completeTask = async (agentId, productId) => { /* same logic as before */ };
  const completeAllTasksForAgent = async (agentId) => { /* same logic as before */ };
  const unassignProduct = async (productId, agentId) => { /* same logic as before */ };
  const unassignAgentTasks = async (agentId) => { /* same logic as before */ };
  const unassignAllTasks = async () => { /* same logic as before */ };

  // Loaders for completed, available, unassigned, queue
  const loadCompletedTasks = async () => { /* same logic as before */ };
  const loadUnassignedProducts = async () => { /* same logic as before */ };
  const loadPreviouslyAssigned = async () => { /* same logic as before */ };
  const loadQueue = async () => { /* same logic as before */ };

  // CSV downloads
  const downloadCompletedCSV = () => { /* same logic as before */ };
  const downloadUnassignedCSV = () => { /* same logic as before */ };
  const downloadPreviouslyAssignedCSV = () => { /* same logic as before */ };
  const downloadQueueCSV = () => { /* same logic as before */ };

  // Switch view
  const handleViewChange = (newView) => {
    setView(newView);
    setMenuOpen(false); // close menu after selecting an item
    if (newView === 'completed') loadCompletedTasks();
    else if (newView === 'available') loadUnassignedProducts();
    else if (newView === 'unassigned') loadPreviouslyAssigned();
    else if (newView === 'queue') loadQueue();
  };

  // Confirmation dialog
  const showConfirmDialog = (title, message, onConfirm) => {
    setConfirmDialog({ show: true, title, message, onConfirm });
  };

  const renderConfirmDialog = () => {
    if (!confirmDialog.show) return null;
    return (
      <div className="confirm-overlay">
        <div className="confirm-dialog">
          <h3>{confirmDialog.title}</h3>
          <p>{confirmDialog.message}</p>
          <div className="confirm-buttons">
            <button 
              onClick={() => setConfirmDialog({ show: false, title: '', message: '', onConfirm: null })}
              className="cancel-button"
            >
              Cancel
            </button>
            <button 
              onClick={confirmDialog.onConfirm}
              className="confirm-button"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Hamburger menu: left side bar with nav items
  const renderSideMenu = () => (
    <div className={`side-menu ${menuOpen ? 'open' : ''} ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <button className="close-menu-btn" onClick={toggleMenu}>✕</button>
      <nav className="side-menu-nav">
        <button onClick={() => handleViewChange('completed')} disabled={isLoading}>Completed Tasks</button>
        <button onClick={() => handleViewChange('available')} disabled={isLoading}>Available Products</button>
        <button onClick={() => handleViewChange('unassigned')} disabled={isLoading}>Unassigned Tasks</button>
        <button onClick={() => handleViewChange('queue')} disabled={isLoading}>Queue</button>
        <hr />
        <button onClick={toggleTheme} className="theme-toggle-button">
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </nav>
      <div className="menu-upload-section">
        <label htmlFor="output-csv" className="upload-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#fff" viewBox="0 0 24 24">
            <path d="M5 20h14v-2H5v2zm7-18L5.33 9h3.84v4h6.66v-4h3.84L12 2z"/>
          </svg>
          <span>Upload CSV</span>
        </label>
        <input
          type="file"
          id="output-csv"
          accept=".csv"
          onChange={handleFileUpload}
          disabled={isLoading}
          className="file-input"
        />
      </div>
    </div>
  );

  // Top header: hamburger icon, system status or brand
  const renderHeader = () => (
    <header className={`app-header ${darkMode ? 'dark-mode' : ''}`}>
      <div className="header-left">
        <button className="hamburger-btn" onClick={toggleMenu}>
          {/* Three vertical lines (hamburger) */}
          <svg width="24" height="24" fill="#fff" viewBox="0 0 24 24">
            <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
          </svg>
        </button>
      </div>
      <div className="header-center">
        {/* Could put brand name or system status snippet here */}
      </div>
      <div className="header-right">
        {/* We can show a short message or status here if desired */}
      </div>
      {message && <div className="message">{message}</div>}
    </header>
  );

  // Renders agent dashboard, completed tasks, etc. (same logic as before)
  const renderAgentDashboard = () => { /* ... same as your existing code ... */};
  const renderAgentList = () => { /* ... same as your existing code ... */};
  const renderCompletedTasks = () => { /* ... same as your existing code ... */};
  const renderUnassignedProducts = () => { /* ... same as your existing code ... */};
  const renderPreviouslyAssigned = () => { /* ... same as your existing code ... */};
  const renderQueue = () => { /* ... same as your existing code ... */};

  const renderDashboard = () => {
    if (view === 'completed') return renderCompletedTasks();
    if (view === 'available') return renderUnassignedProducts();
    if (view === 'unassigned') return renderPreviouslyAssigned();
    if (view === 'queue') return renderQueue();

    // Default (agents)
    return (
      <div className="dashboard">
        <div className="status-cards">
          <div className="status-card">
            <h3>System Status</h3>
            <div className="status-item">
              <span>Total Agents:</span>
              <span>{agents.length}</span>
            </div>
            <div className="status-item">
              <span>Total Products:</span>
              <span>{products.length}</span>
            </div>
            <div className="status-item">
              <span>Total Assignments:</span>
              <span>{assignments.length}</span>
            </div>
            <div className="button-group">
              <button className="refresh-button action-btn" onClick={handleRefreshData} disabled={isLoading}>
                {isLoading ? "Refreshing..." : "Refresh Data"}
              </button>
              {assignments.filter(a => !a.completed && !a.unassignedTime).length > 0 && (
                <button 
                  className="unassign-all-button action-btn" 
                  onClick={() => showConfirmDialog(
                    "Unassign All Tasks", 
                    "Are you sure you want to unassign ALL tasks from ALL agents?",
                    unassignAllTasks
                  )}
                  disabled={isLoading}
                >
                  Unassign All Tasks
                </button>
              )}
            </div>
          </div>
        </div>
        {selectedAgent ? renderAgentDashboard() : renderAgentList()}
      </div>
    );
  };

  return (
    <div className={`app ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      {renderHeader()}
      {renderSideMenu()}
      <main className="app-content">
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
      </main>
    </div>
  );
}

export default App;
