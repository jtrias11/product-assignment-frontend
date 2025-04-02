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

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null,
  });

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

  // Load previously assigned tasks (for "Unassigned Tasks" view)
  const loadPreviouslyAssigned = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/previously-assigned`);
      if (!res.ok) throw new Error('Failed to load unassigned tasks');
      const data = await res.json();
      setPreviouslyAssigned(data);
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

  // --- Action Functions ---
  const requestTask = async (agentId) => {
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

  const unassignAllTasks = async () => {
    setIsLoading(true);
    try {
      await fetch(`${API_BASE_URL}/unassign-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      await loadDataFromServer();
    } catch (error) {
      console.error('Error unassigning all tasks:', error);
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

  // --- Confirmation Dialog ---
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
              onClick={() =>
                setConfirmDialog({ show: false, title: '', message: '', onConfirm: null })
              }
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

  // --- Render Functions for Views ---
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
                <td>{p.count || 1}</td>
                <td>{p.tenantId || 'N/A'}</td>
                <td>{p.priority || 'N/A'}</td>
                <td>{p.createdOn || 'N/A'}</td>
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
        <input
          type="text"
          placeholder="Search agents..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button onClick={handleRefreshData} className="refresh-button">
          Refresh
        </button>
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
              .filter((agent) =>
                agent.name.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((agent) => {
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

  const renderAgentDashboard = () => {
    const agent = agents.find((a) => a.id === selectedAgent);
    if (!agent) return <p>Agent not found.</p>;
    const agentAssignments = assignments.filter(
      (a) => a.agentId === agent.id && !a.completed && !a.unassignedTime
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
              {agentAssignments.map((assign) => {
                const product = products.find((p) => p.id === assign.productId);
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
                <th>Product ID</th>
                <th>Assigned On</th>
                <th>Completed On</th>
              </tr>
            </thead>
            <tbody>
              {completed.map((c) => (
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

  const renderPreviouslyAssigned = () => {
    return (
      <div className="view-section">
        <h2>Unassigned Tasks</h2>
        {previouslyAssigned.length === 0 ? (
          <p>No unassigned tasks found.</p>
        ) : (
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
              {previouslyAssigned.map((p) => (
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
        )}
        <button className="back-button" onClick={() => setView('agents')}>
          Back to Directory
        </button>
      </div>
    );
  };

  // Main dashboard switch
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
