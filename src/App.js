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
  const [previouslyAssigned, setPreviouslyAssigned] = useState([]); // For "Unassigned Tasks" data

  // System Status
  const [totalAgents, setTotalAgents] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalAssignments, setTotalAssignments] = useState(0);

  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading data...');
  const [searchTerm, setSearchTerm] = useState('');

  // Agent selection & view
  // Possible views: "agents", "completed", "available", "queue", "unassigned", "agent-dashboard"
  const [view, setView] = useState('agents');
  const [selectedAgent, setSelectedAgent] = useState(null);

  // Load data from server
  const loadDataFromServer = useCallback(async () => {
    setIsLoading(true);
    setLoadingMessage('Loading data from server...');
    try {
      const [prodRes, agentsRes, assignRes] = await Promise.all([
        fetch(`${API_BASE_URL}/products`),
        fetch(`${API_BASE_URL}/agents`),
        fetch(`${API_BASE_URL}/assignments`),
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

      // System status
      setTotalAgents(agentsData.length);
      setTotalProducts(productsData.length);
      setTotalAssignments(assignmentsData.length);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load previously assigned (unassigned) tasks
  const loadPreviouslyAssigned = async () => {
    setIsLoading(true);
    setLoadingMessage('Loading unassigned tasks...');
    try {
      const res = await fetch(`${API_BASE_URL}/previously-assigned`);
      if (!res.ok) {
        throw new Error('Failed to load unassigned tasks');
      }
      const data = await res.json();
      setPreviouslyAssigned(data);
    } catch (error) {
      console.error('Error loading previously assigned tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDataFromServer();
  }, [loadDataFromServer]);

  // CSV upload
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
    setLoadingMessage('Refreshing data...');
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

  // Summation of "count" for an agent's assigned tasks
  const getAgentWorkloadCount = (agentId) => {
    // Find all active assignments for that agent
    const agentAssignments = assignments.filter(a =>
      a.agentId === agentId && !a.completed && !a.unassignedTime
    );
    let sum = 0;
    agentAssignments.forEach(assign => {
      const product = products.find(p => p.id === assign.productId);
      const c = product?.count ? parseInt(product.count, 10) : 1;
      sum += c;
    });
    return sum;
  };

  // Action Functions
  const requestTask = async (agentId) => {
    // Check if sum of assigned "count" >= 30
    const workloadCount = getAgentWorkloadCount(agentId);
    if (workloadCount >= 30) {
      alert("You must complete or unassign some tasks before requesting new ones. (Max capacity = 30)");
      return;
    }
    setIsLoading(true);
    try {
      await fetch(`${API_BASE_URL}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });
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
      await fetch(`${API_BASE_URL}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, productId }),
      });
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
      await fetch(`${API_BASE_URL}/complete-all-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });
      await loadDataFromServer();
    } catch (error) {
      console.error('Error completing all tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const unassignProduct = async (productId, agentId) => {
    setIsLoading(true);
    try {
      await fetch(`${API_BASE_URL}/unassign-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, agentId }),
      });
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
      await fetch(`${API_BASE_URL}/unassign-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });
      await loadDataFromServer();
    } catch (error) {
      console.error('Error unassigning agent tasks:', error);
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

  // Load "Unassigned Tasks" (previously assigned)
  const handleLoadUnassignedView = async () => {
    await loadPreviouslyAssigned();
    setView('unassigned');
    setSelectedAgent(null);
    setMenuOpen(false);
  };

  // Side menu navigation
  const handleViewChange = (newView) => {
    setSelectedAgent(null);
    setMenuOpen(false);
    if (newView === 'unassigned') {
      handleLoadUnassignedView();
    } else {
      setView(newView);
    }
  };

  // Rendering the side menu
  const renderSideMenu = () => (
    <div className={`side-menu ${menuOpen ? 'open' : ''} ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <button className="close-menu-btn" onClick={() => setMenuOpen(false)}>✕</button>
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
        <button onClick={() => handleViewChange('unassigned')} disabled={isLoading}>
          Unassigned Tasks
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
               fill={darkMode ? '#fff' : '#0d6efd'}>
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

  // Header
  const renderHeader = () => (
    <header className={`app-header ${darkMode ? 'dark-mode' : ''}`}>
      <div className="header-left">
        <button className="hamburger-btn" onClick={() => setMenuOpen(true)}>
          <svg width="24" height="24"
               viewBox="0 0 24 24"
               fill={darkMode ? '#fff' : '#000'}>
            <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
          </svg>
        </button>
        <h1 className="brand-title">Product Assignment</h1>
      </div>
      <div className="header-right"></div>
    </header>
  );

  // Agent Directory
  const renderAgentDirectory = () => (
    <div className="agent-list-section">
      <h2>Agent Directory</h2>
      <div className="system-status-cards">
        <div className="status-card">
          <h3>System Status</h3>
          <p>Total Agents: {totalAgents}</p>
          <p>Total Products: {totalProducts}</p>
          <p>Total Assignments: {totalAssignments}</p>
        </div>
      </div>
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
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents
              .filter(agent =>
                agent.name.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map(agent => {
                const workloadCount = getAgentWorkloadCount(agent.id);
                return (
                  <tr key={agent.id}>
                    <td>{agent.name}</td>
                    <td>{agent.role}</td>
                    <td>{workloadCount}/30</td>
                    <td>
                      <button
                        className="view-dashboard-btn"
                        onClick={() => {
                          setSelectedAgent(agent.id);
                          setView('agent-dashboard');
                        }}
                      >
                        View Dashboard
                      </button>
                    </td>
                  </tr>
                );
              })}
          </tbody>
        </table>
      )}
    </div>
  );

  // Agent Dashboard
  const renderAgentDashboard = () => {
    const agent = agents.find(a => a.id === selectedAgent);
    if (!agent) return <p>Agent not found.</p>;

    // Get active assignments
    const agentAssignments = assignments.filter(a =>
      a.agentId === agent.id && !a.completed && !a.unassignedTime
    );

    return (
      <div className="view-section">
        <h2>{agent.name} - Dashboard</h2>
        <p>{agent.role} • {getAgentWorkloadCount(agent.id)}/30 tasks</p>
        <div className="dashboard-actions">
          <button
            className="request-task-btn"
            onClick={() => requestTask(agent.id)}
            disabled={isLoading}
          >
            Request Task
          </button>
          <button
            className="unassign-all-btn"
            onClick={() => unassignAgentTasks(agent.id)}
            disabled={isLoading || agentAssignments.length === 0}
          >
            Unassign Tasks
          </button>
          <button
            className="complete-all-btn"
            onClick={() => completeAllTasksForAgent(agent.id)}
            disabled={isLoading || agentAssignments.length === 0}
          >
            Complete All
          </button>
        </div>
        {agentAssignments.length === 0 ? (
          <p>No tasks assigned.</p>
        ) : (
          <table className="assignments-table">
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Count</th>
                <th>Tenant ID</th>
                <th>Priority</th>
                <th>Created On</th>
                <th>Assigned On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agentAssignments.map(assign => {
                const product = products.find(p => p.id === assign.productId);
                return (
                  <tr key={assign.id}>
                    <td>{assign.productId}</td>
                    <td>{product?.count || 1}</td>
                    <td>{product?.tenantId || 'N/A'}</td>
                    <td>{product?.priority || 'N/A'}</td>
                    <td>{product?.createdOn || 'N/A'}</td>
                    <td>{assign.assignedOn || 'N/A'}</td>
                    <td>
                      <button
                        className="complete-task-btn"
                        onClick={() => completeTask(agent.id, assign.productId)}
                        disabled={isLoading}
                      >
                        Complete
                      </button>
                      <button
                        className="unassign-task-btn"
                        onClick={() => unassignProduct(assign.productId, agent.id)}
                        disabled={isLoading}
                      >
                        Unassign
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <button
          className="back-button"
          onClick={() => {
            setSelectedAgent(null);
            setView('agents');
          }}
        >
          Back to Directory
        </button>
      </div>
    );
  };

  // Completed Tasks
  const renderCompletedTasks = () => {
    const completed = assignments.filter(a => a.completed);
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
                <th>Product ID</th>
                <th>Assigned On</th>
                <th>Completed On</th>
              </tr>
            </thead>
            <tbody>
              {completed.map(c => (
                <tr key={c.id}>
                  <td>{c.id}</td>
                  <td>{c.agentId}</td>
                  <td>{c.productId}</td>
                  <td>{c.assignedOn || 'N/A'}</td>
                  <td>{c.completedOn || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button className="back-button" onClick={() => setView('agents')}>
          Back to Directory
        </button>
      </div>
    );
  };

  // Available Products (Unassigned)
  const renderAvailableProducts = () => {
    const unassigned = products.filter(p => !p.assigned);
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
              {unassigned.map(p => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.count || 1}</td>
                  <td>{p.tenantId || 'N/A'}</td>
                  <td>{p.priority || 'N/A'}</td>
                  <td>{p.createdOn || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button className="back-button" onClick={() => setView('agents')}>
          Back to Directory
        </button>
      </div>
    );
  };

  // Unassigned Tasks (Previously Assigned)
  const renderUnassignedTasks = () => {
    if (previouslyAssigned.length === 0) {
      return (
        <div className="view-section">
          <h2>Unassigned Tasks</h2>
          <p>No unassigned tasks found.</p>
          <button className="back-button" onClick={() => setView('agents')}>
            Back to Directory
          </button>
        </div>
      );
    }
    return (
      <div className="view-section">
        <h2>Unassigned Tasks</h2>
        <table className="assignments-table">
          <thead>
            <tr>
              <th>Abstract ID</th>
              <th>Count</th>
              <th>Tenant ID</th>
              <th>Priority</th>
              <th>Created On</th>
              <th>Unassigned Time</th>
              <th>Unassigned By</th>
            </tr>
          </thead>
          <tbody>
            {previouslyAssigned.map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.count || 1}</td>
                <td>{p.tenantId || 'N/A'}</td>
                <td>{p.priority || 'N/A'}</td>
                <td>{p.createdOn || 'N/A'}</td>
                <td>{p.unassignedTime || 'N/A'}</td>
                <td>{p.unassignedBy || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <button className="back-button" onClick={() => setView('agents')}>
          Back to Directory
        </button>
      </div>
    );
  };

  // Main content switch
  const renderDashboard = () => {
    if (view === 'completed') return renderCompletedTasks();
    if (view === 'available') return renderAvailableProducts();
    if (view === 'queue') return renderQueue();
    if (view === 'unassigned') return renderUnassignedTasks();
    if (view === 'agent-dashboard' && selectedAgent) return renderAgentDashboard();
    return renderAgentDirectory(); // default
  };

  return (
    <div className={`app ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      {/* Header */}
      <header className={`app-header ${darkMode ? 'dark-mode' : ''}`}>
        <div className="header-left">
          <button className="hamburger-btn" onClick={() => setMenuOpen(true)}>
            <svg width="24" height="24"
                 viewBox="0 0 24 24"
                 fill={darkMode ? '#fff' : '#000'}>
              <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
            </svg>
          </button>
          <h1 className="brand-title">Product Assignment</h1>
        </div>
        <div className="header-right"></div>
      </header>

      {/* Side Menu */}
      <div className={`side-menu ${menuOpen ? 'open' : ''} ${darkMode ? 'dark-mode' : 'light-mode'}`}>
        <button className="close-menu-btn" onClick={() => setMenuOpen(false)}>✕</button>
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
          <button onClick={() => handleViewChange('unassigned')} disabled={isLoading}>
            Unassigned Tasks
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
                 fill={darkMode ? '#fff' : '#0d6efd'}>
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

      {/* Main Content */}
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
        {confirmDialog.show && (
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
        )}
      </main>
    </div>
  );
}

export default App;
