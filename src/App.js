import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const getApiBaseUrl = () => {
  return process.env.REACT_APP_API_BASE_URL || 'https://product-assignment-server.onrender.com/api';
};

const API_BASE_URL = getApiBaseUrl();

function App() {
  // Theme & Menu
  const [darkMode, setDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleTheme = () => setDarkMode(!darkMode);
  const toggleMenu = () => setMenuOpen(!menuOpen);

  // Data states
  const [agents, setAgents] = useState([]);
  const [products, setProducts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading data from server...');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);

  // Current view: "agents", "completed", "available", "queue"
  const [view, setView] = useState('agents');

  // Confirmation dialog
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
      const [prodRes, agentsRes, assignRes] = await Promise.all([
        fetch(`${API_BASE_URL}/products`),
        fetch(`${API_BASE_URL}/agents`),
        fetch(`${API_BASE_URL}/assignments`)
      ]);
      if (!prodRes.ok || !agentsRes.ok || !assignRes.ok) {
        throw new Error('One or more fetch requests failed');
      }
      const productsData = await prodRes.json();
      const agentsData = await agentsRes.json();
      const assignmentsData = await assignRes.json();
      setProducts(productsData);
      setAgents(agentsData);
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDataFromServer();
  }, [loadDataFromServer]);

  // CSV Upload
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
      await loadDataFromServer();
    } catch (error) {
      console.error('Error uploading file:', error);
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
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Action functions (called in UI to avoid ESLint warnings)
  const requestTask = async (agentId) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      });
      await res.json();
      await loadDataFromServer();
    } catch (error) {
      console.error('Error requesting task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const completeTask = async (agentId, productId) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, productId })
      });
      await res.json();
      await loadDataFromServer();
    } catch (error) {
      console.error('Error completing task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const completeAllTasksForAgent = async (agentId) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/complete-all-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      });
      await res.json();
      await loadDataFromServer();
    } catch (error) {
      console.error('Error completing all tasks for agent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const unassignProduct = async (productId, agentId) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/unassign-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, agentId })
      });
      await res.json();
      await loadDataFromServer();
    } catch (error) {
      console.error('Error unassigning product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const unassignAgentTasks = async (agentId) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/unassign-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      });
      await res.json();
      await loadDataFromServer();
    } catch (error) {
      console.error('Error unassigning agent tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const unassignAllTasks = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/unassign-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      await res.json();
      await loadDataFromServer();
    } catch (error) {
      console.error('Error unassigning all tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // CSV Download
  const downloadCompletedCSV = () => {
    window.open(`${API_BASE_URL}/download/completed-assignments`, '_blank');
  };
  const downloadUnassignedCSV = () => {
    window.open(`${API_BASE_URL}/download/unassigned-products`, '_blank');
  };

  // Switch views
  const handleViewChange = (newView) => {
    setView(newView);
    setMenuOpen(false);
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

  // Side menu (slides from left)
  const renderSideMenu = () => (
    <div className={`side-menu ${menuOpen ? 'open' : ''} ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <button className="close-menu-btn" onClick={toggleMenu}>✕</button>
      <nav className="side-menu-nav">
        <button onClick={() => handleViewChange('agents')} disabled={isLoading}>
          Agent Directory
        </button>
        <button onClick={() => handleViewChange('completed')} disabled={isLoading}>
          Completed Tasks
        </button>
        <button onClick={() => handleViewChange('available')} disabled={isLoading}>
          Available Products
        </button>
        <button onClick={() => handleViewChange('queue')} disabled={isLoading}>
          Queue
        </button>
        <hr />
        <button onClick={toggleTheme} className="theme-toggle-button">
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </nav>
      <hr />
      <div className="menu-upload-section">
        <label htmlFor="output-csv" className="upload-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"
               viewBox="0 0 24 24"
               fill={darkMode ? '#fff' : '#0d6efd'}
          >
            <path d="M5 20h14v-2H5v2zm7-18L5.33 9h3.84v4h6.66v-4h3.84L12 2z"/>
          </svg>
          <span>Upload CSV</span>
        </label>
        <input type="file" id="output-csv" accept=".csv"
               onChange={handleFileUpload}
               disabled={isLoading}
               className="file-input" />
      </div>
    </div>
  );

  // Header (hamburger on the left)
  const renderHeader = () => (
    <header className={`app-header ${darkMode ? 'dark-mode' : ''}`}>
      <div className="header-left">
        <button className="hamburger-btn" onClick={toggleMenu}>
          <svg width="24" height="24"
               viewBox="0 0 24 24"
               fill={darkMode ? '#fff' : '#000'}>
            <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
          </svg>
        </button>
        <h1 className="brand-title">Product Assignment</h1>
      </div>
      <div className="header-right" />
    </header>
  );

  // Agent Directory
  const renderAgentDirectory = () => (
    <div className="agent-list-section">
      <h2>Agent Directory</h2>
      <div className="search-box">
        <input
          type="text"
          placeholder="Search agents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button onClick={handleRefreshData} className="refresh-button">Refresh</button>
      </div>
      {agents.length === 0 ? (
        <p>No agents found.</p>
      ) : (
        <table className="agents-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Workload</th>
            </tr>
          </thead>
          <tbody>
            {agents
              .filter((agent) =>
                agent.name.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((agent) => (
                <tr key={agent.id} onClick={() => setSelectedAgent(agent.id)}>
                  <td>{agent.name}</td>
                  <td>{agent.role}</td>
                  <td>{agent.currentAssignments.length}/{agent.capacity}</td>
                </tr>
              ))}
          </tbody>
        </table>
      )}
    </div>
  );

  // Completed Tasks View
  const renderCompletedTasks = () => {
    const completed = assignments.filter((a) => a.completed);
    return (
      <div className="view-section">
        <h2>Completed Tasks</h2>
        <button className="download-completed-btn" onClick={downloadCompletedCSV}>
          Download Completed CSV
        </button>
        {completed.length === 0 ? (
          <p>No completed tasks found.</p>
        ) : (
          <table className="assignments-table">
            <thead>
              <tr>
                <th>Assignment ID</th>
                <th>Agent ID</th>
                <th>Completed By</th>
                <th>Product ID</th>
                <th>Assigned On</th>
                <th>Completed On</th>
              </tr>
            </thead>
            <tbody>
              {completed.map((c) => {
                const agent = agents.find((ag) => ag.id === c.agentId);
                return (
                  <tr key={c.id}>
                    <td>{c.id}</td>
                    <td>{c.agentId}</td>
                    <td>{agent ? agent.name : 'Unknown'}</td>
                    <td>{c.productId}</td>
                    <td>{c.assignedOn}</td>
                    <td>{c.completedOn}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  // Available Products (Unassigned)
  const renderAvailableProducts = () => {
    const unassigned = products.filter((p) => !p.assigned);
    return (
      <div className="view-section">
        <h2>Available Products</h2>
        <button className="download-completed-btn" onClick={downloadUnassignedCSV}>
          Download Unassigned CSV
        </button>
        {unassigned.length === 0 ? (
          <p>No available products found.</p>
        ) : (
          <table className="assignments-table">
            <thead>
              <tr>
                <th>Abstract ID</th>
                <th>Count</th>
                <th>Tenant ID</th>
                <th>Priority</th>
                <th>Created On</th>
              </tr>
            </thead>
            <tbody>
              {unassigned.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.count}</td>
                  <td>{p.tenantId || 'N/A'}</td>
                  <td>{p.priority || 'N/A'}</td>
                  <td>{p.createdOn || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  // Queue View
  const renderQueue = () => (
    <div className="view-section">
      <h2>Queue</h2>
      {products.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <table className="assignments-table">
          <thead>
            <tr>
              <th>Abstract ID</th>
              <th>Name</th>
              <th>Count</th>
              <th>Tenant ID</th>
              <th>Priority</th>
              <th>Created On</th>
              <th>Assigned</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.name || 'N/A'}</td>
                <td>{p.count}</td>
                <td>{p.tenantId || 'N/A'}</td>
                <td>{p.priority || 'N/A'}</td>
                <td>{p.createdOn || 'N/A'}</td>
                <td>{p.assigned ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  // Main content switch
  const renderDashboard = () => {
    if (view === 'completed') return renderCompletedTasks();
    if (view === 'available') return renderAvailableProducts();
    if (view === 'queue') return renderQueue();
    return renderAgentDirectory();
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
