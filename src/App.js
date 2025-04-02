import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

// Helper function to format a date string to EST
const formatEST = (dateStr) => {
  if (!dateStr) return 'N/A';
  return new Date(dateStr).toLocaleString('en-US', { timeZone: 'America/New_York' });
};

const getApiBaseUrl = () => {
  return process.env.REACT_APP_API_BASE_URL || 'https://product-assignment-server.onrender.com/api';
};

const API_BASE_URL = getApiBaseUrl();

function App() {
  // Theme & Menu state
  const [darkMode, setDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleTheme = () => setDarkMode((prev) => !prev);
  const toggleMenu = () => setMenuOpen((prev) => !prev);

  // Data states
  const [agents, setAgents] = useState([]);
  const [products, setProducts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [previouslyAssigned, setPreviouslyAssigned] = useState([]);

  // System status
  const [totalAgents, setTotalAgents] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalAssignments, setTotalAssignments] = useState(0);

  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading data...');
  const [searchTerm, setSearchTerm] = useState('');

  // View state: "agents", "completed", "available", "queue", "unassigned", "agent-dashboard"
  const [view, setView] = useState('agents');
  const [selectedAgent, setSelectedAgent] = useState(null);

  // Confirmation dialog state (if needed)
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  // --- Render Confirm Dialog ---
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

  // --- Data Loading ---
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
      setTotalAgents(agentsData.length);
      setTotalProducts(productsData.length);
      setTotalAssignments(assignmentsData.length);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load previously assigned tasks (for "unassigned" view)
  const loadPreviouslyAssigned = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/previously-assigned`);
      if (!res.ok) throw new Error('Failed to load unassigned tasks');
      const data = await res.json();
      // Filter out tasks that don't have an unassignedTime (i.e. not manually unassigned)
      const filtered = data.filter(task => task.unassignedTime);
      setPreviouslyAssigned(filtered);
    } catch (error) {
      console.error('Error loading unassigned tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDataFromServer();
  }, [loadDataFromServer]);

  // --- CSV Upload ---
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

  // --- Refresh Data ---
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

  // --- Workload Calculation ---
  const getAgentWorkloadCount = (agentId) => {
    const agentAssignments = assignments.filter(
      (a) => a.agentId === agentId && !a.completed && !a.unassignedTime
    );
    let sum = 0;
    agentAssignments.forEach((assign) => {
      const product = products.find((p) => p.id === assign.productId);
      const count = product && product.count ? parseInt(product.count, 10) : 1;
      sum += count;
    });
    return sum;
  };

  // --- Updated Request Task with SLA Logic ---
  const requestTask = async (agentId) => {
    // Get available products (not yet assigned)
    const availableProducts = products.filter(p => !p.assigned);
    if (availableProducts.length === 0) {
      alert("No available products.");
      return;
    }
    const now = new Date();
    // For each available product, determine its SLA in milliseconds based on priority
    const productsWithSlaDiff = availableProducts.map(p => {
      let slaHours = 24; // default SLA
      if (p.priority === 'P1') {
        slaHours = 2;
      } else if (p.priority === 'P2') {
        slaHours = 12;
      } else if (p.priority === 'P3') {
        slaHours = 24;
      }
      const slaMs = slaHours * 60 * 60 * 1000;
      const created = new Date(p.createdOn);
      const timePassed = now - created;
      // diff > 0 means remaining time, diff < 0 means overdue.
      const diff = slaMs - timePassed;
      return { ...p, slaDiff: diff };
    });
    // If any products are within SLA (diff > 0), select the one with the smallest positive diff.
    // If all are overdue (diff <= 0), select the one that is most overdue (largest negative diff).
    const withinSla = productsWithSlaDiff.filter(p => p.slaDiff > 0);
    let selectedProduct;
    if (withinSla.length > 0) {
      selectedProduct = withinSla.reduce((prev, curr) => (prev.slaDiff < curr.slaDiff ? prev : curr));
    } else {
      selectedProduct = productsWithSlaDiff.reduce((prev, curr) => (prev.slaDiff < curr.slaDiff ? prev : curr));
    }
    // Check capacity
    const workloadCount = getAgentWorkloadCount(agentId);
    if (workloadCount >= 30) {
      alert("Please complete or unassign some tasks before requesting new ones (max capacity = 30).");
      return;
    }
    setIsLoading(true);
    try {
      await fetch(`${API_BASE_URL}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, productId: selectedProduct.id }),
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
      console.error('Error completing all tasks for agent:', error);
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

  // --- CSV Download Functions ---
  const downloadCompletedCSV = () => {
    window.open(`${API_BASE_URL}/download/completed-assignments`, '_blank');
  };
  const downloadUnassignedCSV = () => {
    window.open(`${API_BASE_URL}/download/unassigned-products`, '_blank');
  };

  // --- View Switching ---
  const handleViewChange = (newView) => {
    setSelectedAgent(null);
    if (newView === 'unassigned') {
      loadPreviouslyAssigned();
    }
    setView(newView);
    setMenuOpen(false);
  };

  // --- Render Functions for Views ---

  const renderHeader = () => (
    <header className={`app-header ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="header-left">
        <button className="hamburger-btn" onClick={toggleMenu} style={{ marginLeft: '10px' }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill={darkMode ? '#fff' : '#000'}>
            <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
          </svg>
        </button>
        <h1 className="brand-title">Product Assignment</h1>
      </div>
      <div className="header-right"></div>
    </header>
  );

  const renderSideMenu = () => (
    <div className={`side-menu ${menuOpen ? 'open' : ''} ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <button className="close-menu-btn" onClick={() => setMenuOpen(false)}>
        ✕
      </button>
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
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={darkMode ? '#fff' : '#0d6efd'}>
            <path d="M5 20h14v-2H5v2zm7-18L5.33 9h3.84v4h6.66v-4h3.84L12 2z" />
          </svg>
          <span>Upload CSV</span>
        </label>
        <input type="file" id="output-csv" accept=".csv" onChange={handleFileUpload} disabled={isLoading} className="file-input" />
      </div>
    </div>
  );

  const renderQueue = () => (
    <div className="view-section">
      <h2>Queue</h2>
      {products.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <table className="assignments-table">
          <thead>
            <tr>
              <th className="product-id">Abstract ID</th>
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
                <td className="product-id">{p.id}</td>
                <td>{p.name || 'N/A'}</td>
                <td>{p.count || 1}</td>
                <td>{p.tenantId || 'N/A'}</td>
                <td>{p.priority || 'N/A'}</td>
                <td>{formatEST(p.createdOn)}</td>
                <td>{p.assigned ? 'Yes' : 'No'}</td>
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
        <input type="text" placeholder="Search agents..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
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
            {agents.filter(agent => agent.name.toLowerCase().includes(searchTerm.toLowerCase())).map((agent) => {
              const workloadCount = getAgentWorkloadCount(agent.id);
              return (
                <tr key={agent.id}>
                  <td>{agent.name}</td>
                  <td>{agent.role}</td>
                  <td>{workloadCount}/30</td>
                  <td>
                    <button className="view-dashboard-btn" onClick={() => { setSelectedAgent(agent.id); setView('agent-dashboard'); }}>
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

  const renderAgentDashboard = () => {
    const agent = agents.find(a => a.id === selectedAgent);
    if (!agent) return <p>Agent not found.</p>;
    const agentAssignments = assignments.filter(a => a.agentId === agent.id && !a.completed && !a.unassignedTime);
    return (
      <div className="view-section">
        <h2>{agent.name} - Dashboard</h2>
        <p>{agent.role} • {getAgentWorkloadCount(agent.id)}/30 tasks</p>
        <div className="dashboard-actions">
          <button className="request-task-btn" onClick={() => requestTask(agent.id)} disabled={isLoading}>
            Request Task
          </button>
          <button className="unassign-all-btn" onClick={() => unassignAgentTasks(agent.id)} disabled={isLoading || agentAssignments.length === 0}>
            Unassign Tasks
          </button>
          <button className="complete-all-btn" onClick={() => completeAllTasksForAgent(agent.id)} disabled={isLoading || agentAssignments.length === 0}>
            Complete All
          </button>
          <button
            className="copy-ids-btn"
            onClick={() => {
              const ids = agentAssignments.map(a => a.productId).join(', ');
              navigator.clipboard.writeText(ids)
                .then(() => alert('Product IDs copied!'))
                .catch(() => alert('Failed to copy product IDs.'));
            }}
            disabled={agentAssignments.length === 0}
          >
            Copy Product IDs
          </button>
        </div>
        {agentAssignments.length === 0 ? (
          <p>No tasks assigned.</p>
        ) : (
          <table className="assignments-table">
            <thead>
              <tr>
                <th className="product-id">Product ID</th>
                <th>Count</th>
                <th>Tenant ID</th>
                <th>Priority</th>
                <th>Created On</th>
                <th>Assigned On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agentAssignments.map((assign) => {
                const product = products.find(p => p.id === assign.productId);
                return (
                  <tr key={assign.id}>
                    <td className="product-id">{assign.productId}</td>
                    <td>{product?.count || 1}</td>
                    <td>{product?.tenantId || 'N/A'}</td>
                    <td>{product?.priority || 'N/A'}</td>
                    <td>{formatEST(product?.createdOn)}</td>
                    <td>{formatEST(assign.assignedOn)}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="complete-task-btn" onClick={() => completeTask(agent.id, assign.productId)} disabled={isLoading}>
                          Complete
                        </button>
                        <button className="unassign-task-btn" onClick={() => unassignProduct(assign.productId, agent.id)} disabled={isLoading}>
                          Unassign
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <button className="back-button" onClick={() => { setSelectedAgent(null); setView('agents'); }}>
          Back to Directory
        </button>
      </div>
    );
  };

  // Render Completed Tasks View (grouped by Product ID and using SLA formatted dates)
  const renderCompletedTasks = () => {
    const completed = assignments.filter(a => a.completed);
    // Group completed tasks by productId
    const grouped = {};
    completed.forEach(c => {
      const key = c.productId;
      if (!grouped[key]) {
        const product = products.find(p => p.id === key);
        grouped[key] = {
          count: product && product.count ? parseInt(product.count, 10) : 1,
          createdOn: product?.createdOn || 'N/A',
          priority: product?.priority || 'N/A',
          tenantId: product?.tenantId || 'N/A',
          completedTime: c.completedOn,
          agentNames: new Set(),
        };
      } else {
        const product = products.find(p => p.id === key);
        const additional = product && product.count ? parseInt(product.count, 10) : 1;
        grouped[key].count += additional;
      }
      const agent = agents.find(a => a.id === c.agentId);
      grouped[key].agentNames.add(agent ? agent.name : 'Unknown');
    });
    return (
      <div className="view-section">
        <h2>Completed Tasks</h2>
        <button className="download-completed-btn" onClick={downloadCompletedCSV}>
          Download Completed CSV
        </button>
        {Object.keys(grouped).length === 0 ? (
          <p>No completed tasks found.</p>
        ) : (
          <table className="assignments-table">
            <thead>
              <tr>
                <th className="product-id">Product ID</th>
                <th>Completed By</th>
                <th>Task Count</th>
                <th>Tenant ID</th>
                <th>Priority</th>
                <th>Created On</th>
                <th>Completed Time (EST)</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([prodId, data]) => (
                <tr key={prodId}>
                  <td className="product-id">{prodId}</td>
                  <td>{Array.from(data.agentNames).join(', ')}</td>
                  <td>{data.count}</td>
                  <td>{data.tenantId}</td>
                  <td>{data.priority}</td>
                  <td>{formatEST(data.createdOn)}</td>
                  <td>{formatEST(data.completedTime)}</td>
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

  // Render Available Products View (no CSV download button here)
  const renderAvailableProducts = () => {
    const unassigned = products.filter(p => !p.assigned);
    return (
      <div className="view-section">
        <h2>Available Products</h2>
        {unassigned.length === 0 ? (
          <p>No available products found.</p>
        ) : (
          <table className="assignments-table">
            <thead>
              <tr>
                <th className="product-id">Abstract ID</th>
                <th>Count</th>
                <th>Tenant ID</th>
                <th>Priority</th>
                <th>Created On</th>
              </tr>
            </thead>
            <tbody>
              {unassigned.map((p) => (
                <tr key={p.id}>
                  <td className="product-id">{p.id}</td>
                  <td>{p.count || 1}</td>
                  <td>{p.tenantId || 'N/A'}</td>
                  <td>{p.priority || 'N/A'}</td>
                  <td>{formatEST(p.createdOn)}</td>
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

  // Render Unassigned Tasks View
  const renderPreviouslyAssigned = () => {
    return (
      <div className="view-section">
        <h2>Unassigned Tasks</h2>
        <button className="download-completed-btn" onClick={downloadUnassignedCSV}>
          Download Unassigned CSV
        </button>
        {previouslyAssigned.length === 0 ? (
          <p>No unassigned tasks found.</p>
        ) : (
          <table className="assignments-table">
            <thead>
              <tr>
                <th className="product-id">Abstract ID</th>
                <th>Count</th>
                <th>Tenant ID</th>
                <th>Priority</th>
                <th>Created On</th>
                <th>Unassigned Time (EST)</th>
                <th>Unassigned By</th>
              </tr>
            </thead>
            <tbody>
              {previouslyAssigned.map((p) => (
                <tr key={p.id}>
                  <td className="product-id">{p.id}</td>
                  <td>{p.count || 1}</td>
                  <td>{p.tenantId || 'N/A'}</td>
                  <td>{p.priority || 'N/A'}</td>
                  <td>{formatEST(p.createdOn)}</td>
                  <td>{formatEST(p.unassignedTime)}</td>
                  <td>{p.unassignedBy || 'N/A'}</td>
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

  // --- Main Dashboard Switch ---
  const renderDashboard = () => {
    if (view === 'completed') return renderCompletedTasks();
    if (view === 'available') return renderAvailableProducts();
    if (view === 'queue') return renderQueue();
    if (view === 'unassigned') return renderPreviouslyAssigned();
    if (view === 'agent-dashboard' && selectedAgent) return renderAgentDashboard();
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
