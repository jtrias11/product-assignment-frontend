import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const getApiBaseUrl = () => {
  const baseUrl = process.env.REACT_APP_API_BASE_URL || 'https://product-assignment-server.onrender.com/api';
  return baseUrl;
};

const API_BASE_URL = getApiBaseUrl();

function App() {
  // Theme & Menu states
  const [darkMode, setDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleTheme = () => setDarkMode(!darkMode);
  const toggleMenu = () => setMenuOpen(!menuOpen);

  // Data states
  const [agents, setAgents] = useState([]);
  const [products, setProducts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading data from server...');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);
  // Views: agents, completed, available, unassigned, queue
  const [view, setView] = useState('agents');

  // Confirm dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null
  });

  // Load data from server
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
    } catch (error) {
      setMessage(`Error loading data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDataFromServer();
  }, [loadDataFromServer]);

  // File upload handler using the upload icon
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

  // Action functions (placeholders—replace with your full implementations)
  const requestTask = async (agentId) => { /* your implementation */ };
  const completeTask = async (agentId, productId) => { /* your implementation */ };
  const completeAllTasksForAgent = async (agentId) => { /* your implementation */ };
  const unassignProduct = async (productId, agentId) => { /* your implementation */ };
  const unassignAgentTasks = async (agentId) => { /* your implementation */ };
  const unassignAllTasks = async () => { /* your implementation */ };

  // Loaders for various views
  const loadCompletedTasks = async () => { /* your implementation */ };
  const loadUnassignedProducts = async () => { /* your implementation */ };
  const loadPreviouslyAssigned = async () => { /* your implementation */ };
  const loadQueue = async () => { /* your implementation */ };

  // CSV download functions (if used in your UI, otherwise remove)
  // (For ESLint, we remove those not used in our UI)

  // Switch view and close side menu
  const handleViewChange = (newView) => {
    setView(newView);
    setMenuOpen(false);
    if (newView === 'completed') loadCompletedTasks();
    else if (newView === 'available') loadUnassignedProducts();
    else if (newView === 'unassigned') loadPreviouslyAssigned();
    else if (newView === 'queue') loadQueue();
  };

  // Confirmation dialog
  const showConfirmDialog = (title, text, onConfirm) => {
    setConfirmDialog({ show: true, title, message: text, onConfirm });
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
            <button onClick={confirmDialog.onConfirm} className="confirm-button">
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Side menu with navigation and theme toggle
  const renderSideMenu = () => (
    <div className={`side-menu ${menuOpen ? 'open' : ''} ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <button className="close-menu-btn" onClick={toggleMenu}>✕</button>
      <nav className="side-menu-nav">
        <button onClick={() => handleViewChange('completed')} disabled={isLoading}>
          Completed Tasks
        </button>
        <button onClick={() => handleViewChange('available')} disabled={isLoading}>
          Available Products
        </button>
        <button onClick={() => handleViewChange('unassigned')} disabled={isLoading}>
          Unassigned Tasks
        </button>
        <button onClick={() => handleViewChange('queue')} disabled={isLoading}>
          Queue
        </button>
        <hr />
        <button onClick={toggleTheme} className="theme-toggle-button">
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </nav>
      <div className="menu-upload-section">
        <label htmlFor="output-csv" className="upload-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="#0d6efd" viewBox="0 0 24 24">
            <path d="M5 20h14v-2H5v2zm7-18L5.33 9h3.84v4h6.66v-4h3.84L12 2z"/>
          </svg>
          <span>Upload CSV</span>
        </label>
        <input type="file" id="output-csv" accept=".csv" onChange={handleFileUpload} disabled={isLoading} className="file-input" />
      </div>
    </div>
  );

  // Header with hamburger menu
  const renderHeader = () => (
    <header className={`app-header ${darkMode ? 'dark-mode' : ''}`}>
      <div className="header-left">
        <button className="hamburger-btn" onClick={toggleMenu}>
          <svg width="24" height="24" fill="#fff" viewBox="0 0 24 24">
            <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
          </svg>
        </button>
      </div>
      <div className="header-center">{/* Optionally place a logo or title here */}</div>
      <div className="header-right">{/* Additional header info if needed */}</div>
      {message && <div className="message">{message}</div>}
    </header>
  );

  // Placeholder for view rendering – insert your actual view functions here
  const renderDashboard = () => {
    if (view === 'completed') return <div>Render Completed Tasks Here</div>;
    else if (view === 'available') return <div>Render Available Products Here</div>;
    else if (view === 'unassigned') return <div>Render Unassigned Tasks Here</div>;
    else if (view === 'queue') return <div>Render Queue Here</div>;
    else
      return (
        <div className="dashboard">
          <div className="agent-list-section">
            <h3>Agent Directory</h3>
            <div className="search-box">
              <input
                type="text"
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {/* Insert agent list table here */}
          </div>
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
