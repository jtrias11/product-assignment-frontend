import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './App.css';

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://product-assignment-server.onrender.com/api';

function App() {
  // Theme and UI state
  const [darkMode, setDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState('Loading data...');
  const [searchTerm, setSearchTerm] = useState('');
  const [view, setView] = useState('agents'); // "agents", "agent-dashboard", "completed", "available", "queue", "unassigned"
  const [agents, setAgents] = useState([]);
  const [products, setProducts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [previouslyAssigned, setPreviouslyAssigned] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);

  // Toggle functions
  const toggleTheme = useCallback(() => setDarkMode(prev => !prev), []);
  const toggleMenu = useCallback(() => setMenuOpen(prev => !prev), []);

  // Load data from server
  const loadDataFromServer = useCallback(async () => {
    setIsLoading(true);
    setLoadingMessage('Loading data...');
    try {
      const [agentsRes, productsRes, assignmentsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/agents`),
        fetch(`${API_BASE_URL}/products`),
        fetch(`${API_BASE_URL}/assignments`)
      ]);
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

  // Refresh data handler
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

  // CSV upload handler
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

  // Task action functions
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

  // Simple view switcher
  const switchView = useCallback((newView) => {
    setSelectedAgent(null);
    setView(newView);
  }, []);

  // Filtered agents for directory view
  const filteredAgents = useMemo(() => {
    return agents.filter(a => a.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [agents, searchTerm]);

  // Render: Agent Directory
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
          {filteredAgents.map(agent => (
            <tr key={agent._id}>
              <td>{agent.name}</td>
              <td>{agent.role}</td>
              <td>
                <button className="view-dashboard-btn"
                  onClick={() => { setSelectedAgent(agent._id); setView('agent-dashboard'); }}>
                  View Dashboard
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  // Render: Agent Dashboard
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
            // For simplicity, complete the first active task
            completeTask(agent._id, activeAssignments[0].productId);
          }} disabled={isLoading || activeAssignments.length === 0}>
            Complete Task
          </button>
          <button className="action-btn unassign-btn" onClick={() => {
            if (activeAssignments.length === 0) { alert('No tasks to unassign.'); return; }
            // For simplicity, unassign the first active task
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
                    <td>{/* Optionally, show count if available */}</td>
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

  // Render based on view
  const renderContent = () => {
    if (view === 'agents') return renderAgentDirectory();
    if (view === 'agent-dashboard') return renderAgentDashboard();
    // Additional views for completed, available, queue, unassigned can be added similarly.
    return <p>View not implemented.</p>;
  };

  useEffect(() => {
    loadDataFromServer();
  }, [loadDataFromServer]);

  return (
    <div className={`app ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      {isLoading && (
        <div className="loading-overlay">
          <div className="spinner"></div>
          <p>{loadingMessage}</p>
        </div>
      )}
      <header className="app-header">
        <button className="hamburger-btn" onClick={toggleMenu}>
          ☰
        </button>
        <h1>Product Assignment</h1>
        <button className="theme-btn" onClick={toggleTheme}>
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </header>
      <aside className={`side-menu ${menuOpen ? 'open' : ''}`}>
        <button className="close-menu-btn" onClick={() => setMenuOpen(false)}>✕</button>
        <nav>
          <button onClick={() => switchView('agents')}>Directory</button>
          {/* Add other navigation buttons as needed */}
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
