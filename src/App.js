import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://product-assignment-server.onrender.com/api';

function App() {
  // Global UI states
  const [darkMode, setDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading data...');
  const [searchTerm, setSearchTerm] = useState('');

  // Data states
  const [agents, setAgents] = useState([]);
  const [products, setProducts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [previouslyAssigned, setPreviouslyAssigned] = useState([]);

  // View and selection states
  // Allowed views: "agents", "agent-dashboard", "completed", "available", "queue", "unassigned"
  const [view, setView] = useState('agents');
  const [selectedAgent, setSelectedAgent] = useState(null);

  // Toggle functions
  const toggleTheme = useCallback(() => setDarkMode(prev => !prev), []);
  const toggleMenu = useCallback(() => setMenuOpen(prev => !prev), []);

  // --------------------- Data Loading ---------------------
  const loadDataFromServer = useCallback(async () => {
    setIsLoading(true);
    setLoadingMessage('Loading data from server...');
    try {
      const [agentsRes, productsRes, assignmentsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/agents`),
        fetch(`${API_BASE_URL}/products`),
        fetch(`${API_BASE_URL}/assignments`)
      ]);
      if (!agentsRes.ok || !productsRes.ok || !assignmentsRes.ok) {
        throw new Error('One or more fetch requests failed');
      }
      const agentsData = await agentsRes.json();
      const productsData = await productsRes.json();
      const assignmentsData = await assignmentsRes.json();
      setAgents(agentsData);
      setProducts(productsData);
      setAssignments(assignmentsData);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const loadPreviouslyAssigned = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/previously-assigned`);
      if (!res.ok) throw new Error('Failed to load unassigned tasks');
      const data = await res.json();
      const filtered = data.filter(task => task.unassignedTime);
      setPreviouslyAssigned(filtered);
    } catch (error) {
      console.error('Error loading unassigned tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDataFromServer();
  }, [loadDataFromServer]);

  // --------------------- Action Functions ---------------------
  const handleRefreshData = useCallback(async () => {
    setIsLoading(true);
    setLoadingMessage('Refreshing data...');
    try {
      const res = await fetch(`${API_BASE_URL}/refresh`, { method: 'POST' });
      if (!res.ok) throw new Error(await res.text());
      await loadDataFromServer();
    } catch (error) {
      console.error('Error refreshing data:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [loadDataFromServer]);

  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = null;
    setIsLoading(true);
    setLoadingMessage('Uploading CSV...');
    const formData = new FormData();
    formData.append('outputFile', file);
    try {
      const res = await fetch(`${API_BASE_URL}/upload-output`, { method: 'POST', body: formData });
      if (!res.ok) throw new Error(await res.text());
      await loadDataFromServer();
    } catch (error) {
      console.error('Error uploading CSV:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [loadDataFromServer]);

  const requestTask = useCallback(async (agentId) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await loadDataFromServer();
    } catch (error) {
      console.error('Error requesting task:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [loadDataFromServer]);

  const completeTask = useCallback(async (agentId, productId) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, productId })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await loadDataFromServer();
    } catch (error) {
      console.error('Error completing task:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [loadDataFromServer]);

  const unassignTask = useCallback(async (agentId, productId) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/unassign-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, productId })
      });
      if (!res.ok) throw new Error((await res.json()).error);
      await loadDataFromServer();
    } catch (error) {
      console.error('Error unassigning task:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [loadDataFromServer]);

  // --------------------- Navigation ---------------------
  const switchView = useCallback((newView) => {
    setSelectedAgent(null);
    if (newView === 'unassigned') {
      loadPreviouslyAssigned();
    }
    setView(newView);
  }, [loadPreviouslyAssigned]);

  // --------------------- View Renderers ---------------------
  const renderAgentDirectory = () => (
    <div className="view-container">
      <h2>Agent Directory</h2>
      <div className="status-cards">
        <p>Total Agents: {agents.length}</p>
        <p>Total Products: {products.length}</p>
        <p>Total Assignments: {assignments.length}</p>
      </div>
      <div className="search-box">
        <input type="text" placeholder="Search agents..." value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)} />
        <button className="refresh-button" onClick={handleRefreshData}>Refresh</button>
      </div>
      <table className="agents-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {agents.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(agent => (
              <tr key={agent._id}>
                <td>{agent.name}</td>
                <td>{agent.role}</td>
                <td>
                  <button className="view-dashboard-btn"
                    onClick={() => { setSelectedAgent(agent._id); switchView('agent-dashboard'); }}>
                    View Dashboard
                  </button>
                </td>
              </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderAgentDashboard = () => {
    const agent = agents.find(a => a._id === selectedAgent);
    if (!agent) return <p>Agent not found.</p>;
    const activeAssignments = assignments.filter(a => a.agentId === agent._id && !a.completed && !a.unassignedTime);
    return (
      <div className="view-container">
        <h2>{agent.name} - Dashboard</h2>
        <div className="dashboard-actions">
          <button className="action-btn request-btn" onClick={() => requestTask(agent._id)} disabled={isLoading}>
            Request Task
          </button>
          <button className="action-btn complete-btn" onClick={() => {
            if (activeAssignments.length === 0) { alert('No tasks to complete.'); return; }
            completeTask(agent._id, activeAssignments[0].productId);
          }} disabled={isLoading || activeAssignments.length === 0}>
            Complete Task
          </button>
          <button className="action-btn unassign-btn" onClick={() => {
            if (activeAssignments.length === 0) { alert('No tasks to unassign.'); return; }
            unassignTask(agent._id, activeAssignments[0].productId);
          }} disabled={isLoading || activeAssignments.length === 0}>
            Unassign Task
          </button>
        </div>
        <div className="assignment-table-container">
          {activeAssignments.length === 0 ? (
            <p>No tasks assigned.</p>
          ) : (
            <table className="assignments-table">
              <thead>
                <tr>
                  <th>Product ID</th>
                  <th>Count</th>
                </tr>
              </thead>
              <tbody>
                {activeAssignments.map(a => (
                  <tr key={a._id}>
                    <td>{a.productId}</td>
                    <td>{/* Optionally display count if available */}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <button className="action-btn back-btn" onClick={() => switchView('agents')}>
          Back to Directory
        </button>
      </div>
    );
  };

  const renderCompletedTasks = () => {
    const completed = assignments.filter(a => a.completed);
    // Group completed tasks by productId
    const grouped = {};
    completed.forEach(a => {
      const key = a.productId;
      if (!grouped[key]) {
        grouped[key] = { count: 0, completedOn: a.completedOn, agentNames: new Set() };
      }
      grouped[key].count += 1;
      const agent = agents.find(agent => agent._id === a.agentId);
      grouped[key].agentNames.add(agent ? agent.name : 'Unknown');
    });
    return (
      <div className="view-container">
        <h2>Completed Tasks</h2>
        <button className="refresh-button" onClick={() => switchView('agents')}>
          Back to Directory
        </button>
        {Object.keys(grouped).length === 0 ? (
          <p>No completed tasks found.</p>
        ) : (
          <table className="assignments-table">
            <thead>
              <tr>
                <th>Product ID</th>
                <th>Task Count</th>
                <th>Completed By</th>
                <th>Completed On</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(grouped).map(([productId, data]) => (
                <tr key={productId}>
                  <td>{productId}</td>
                  <td>{data.count}</td>
                  <td>{Array.from(data.agentNames).join(', ')}</td>
                  <td>{data.completedOn || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  const renderAvailableProducts = () => {
    const unassigned = products.filter(p => !p.assigned);
    return (
      <div className="view-container">
        <h2>Available Products</h2>
        <button className="refresh-button" onClick={() => switchView('agents')}>
          Back to Directory
        </button>
        {unassigned.length === 0 ? (
          <p>No available products found.</p>
        ) : (
          <table className="assignments-table">
            <thead>
              <tr>
                <th>Abstract ID</th>
                <th>Priority</th>
                <th>Tenant ID</th>
                <th>Created On</th>
                <th>Count</th>
                <th>Assigned</th>
              </tr>
            </thead>
            <tbody>
              {unassigned.map(p => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.priority || 'N/A'}</td>
                  <td>{p.tenantId || 'N/A'}</td>
                  <td>{p.createdOn || 'N/A'}</td>
                  <td>{p.count || 1}</td>
                  <td>{p.assigned ? 'Yes' : 'No'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    );
  };

  const renderQueue = () => (
    <div className="view-container">
      <h2>Product Queue</h2>
      <button className="refresh-button" onClick={() => switchView('agents')}>
        Back to Directory
      </button>
      {products.length === 0 ? (
        <p>No products in queue.</p>
      ) : (
        <table className="assignments-table">
          <thead>
            <tr>
              <th>Abstract ID</th>
              <th>Priority</th>
              <th>Tenant ID</th>
              <th>Created On</th>
              <th>Count</th>
              <th>Assigned</th>
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.priority || 'N/A'}</td>
                <td>{p.tenantId || 'N/A'}</td>
                <td>{p.createdOn || 'N/A'}</td>
                <td>{p.count || 1}</td>
                <td>{p.assigned ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderPreviouslyAssigned = () => (
    <div className="view-container">
      <h2>Unassigned Tasks</h2>
      <button className="refresh-button" onClick={() => switchView('agents')}>
        Back to Directory
      </button>
      {previouslyAssigned.length === 0 ? (
        <p>No unassigned tasks found.</p>
      ) : (
        <table className="assignments-table">
          <thead>
            <tr>
              <th>Abstract ID</th>
              <th>Priority</th>
              <th>Tenant ID</th>
              <th>Created On</th>
              <th>Count</th>
              <th>Unassigned Time</th>
              <th>Unassigned By</th>
            </tr>
          </thead>
          <tbody>
            {previouslyAssigned.map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.priority || 'N/A'}</td>
                <td>{p.tenantId || 'N/A'}</td>
                <td>{p.createdOn || 'N/A'}</td>
                <td>{p.count || 1}</td>
                <td>{p.unassignedTime || 'N/A'}</td>
                <td>{p.unassignedBy || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );

  const renderContent = () => {
    switch (view) {
      case 'agents':
        return renderAgentDirectory();
      case 'agent-dashboard':
        return renderAgentDashboard();
      case 'completed':
        return renderCompletedTasks();
      case 'available':
        return renderAvailableProducts();
      case 'queue':
        return renderQueue();
      case 'unassigned':
        return renderPreviouslyAssigned();
      default:
        return <p>View not implemented.</p>;
    }
  };

  return (
    <div className={`app ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>{loadingMessage}</p>
        </div>
      )}
      <header className="app-header">
        <button className="hamburger-btn" onClick={toggleMenu}>☰</button>
        <h1>Product Assignment</h1>
        <button className="theme-btn" onClick={toggleTheme}>{darkMode ? 'Light Mode' : 'Dark Mode'}</button>
      </header>
      <aside className={`side-menu ${menuOpen ? 'open' : ''}`}>
        <button className="close-menu-btn" onClick={() => setMenuOpen(false)}>✕</button>
        <nav>
          <button onClick={() => switchView('agents')}>Directory</button>
          <button onClick={() => switchView('completed')}>Completed Tasks</button>
          <button onClick={() => switchView('available')}>Available Products</button>
          <button onClick={() => switchView('queue')}>Queue</button>
          <button onClick={() => switchView('unassigned')}>Unassigned Tasks</button>
        </nav>
        <div className="upload-section">
          <label htmlFor="output-csv" className="upload-label">Upload CSV</label>
          <input type="file" id="output-csv" accept=".csv" onChange={handleFileUpload} disabled={isLoading} />
        </div>
      </aside>
      <main className="app-content">
        {renderContent()}
      </main>
    </div>
  );
}

export default App;
