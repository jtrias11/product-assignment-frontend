// app.js
import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

// Configure API Base URL dynamically
const getApiBaseUrl = () => {
  const baseUrl = process.env.REACT_APP_API_BASE_URL || 'https://product-assignment-server.onrender.com/api';
  console.log('API Base URL:', baseUrl);
  return baseUrl;
};

const API_BASE_URL = getApiBaseUrl();

function App() {
  const [agents, setAgents] = useState([]);
  const [products, setProducts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading data...');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [confirmDialog, setConfirmDialog] = useState({ show: false, title: '', message: '', onConfirm: null });
  
  // Load data from backend API
  const loadDataFromServer = useCallback(async () => {
    setIsLoading(true);
    setLoadingMessage('Loading data from server...');
    try {
      const productsResponse = await fetch(`${API_BASE_URL}/products`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!productsResponse.ok) {
        const errorText = await productsResponse.text();
        throw new Error(`Failed to load products: ${errorText}`);
      }
      const productsData = await productsResponse.json();
      setProducts(productsData);
      
      const agentsResponse = await fetch(`${API_BASE_URL}/agents`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!agentsResponse.ok) {
        const errorText = await agentsResponse.text();
        throw new Error(`Failed to load agents: ${errorText}`);
      }
      const agentsData = await agentsResponse.json();
      setAgents(agentsData);
      
      const assignmentsResponse = await fetch(`${API_BASE_URL}/assignments`);
      if (!assignmentsResponse.ok) {
        throw new Error('Failed to load assignments');
      }
      const assignmentsData = await assignmentsResponse.json();
      setAssignments(assignmentsData);
      
      setMessage('Data loaded successfully from server');
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setMessage(`Error loading data: ${error.message}`);
      setIsLoading(false);
    }
  }, []);
  
  useEffect(() => {
    loadDataFromServer();
  }, [loadDataFromServer]);
  
  // Refresh data handler – calls the refresh endpoint on the backend.
  const handleRefreshData = async () => {
    setIsLoading(true);
    setLoadingMessage('Refreshing data from server...');
    try {
      const refreshResponse = await fetch(`${API_BASE_URL}/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!refreshResponse.ok) {
        const errorText = await refreshResponse.text();
        throw new Error(`Failed to refresh data: ${errorText}`);
      }
      await loadDataFromServer();
      setMessage('Data refreshed successfully');
    } catch (error) {
      console.error('Error refreshing data:', error);
      setMessage(`Error refreshing data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // (Other functions for assigning tasks, completing tasks, unassigning tasks, etc., remain unchanged.)
  
  // Render confirmation dialog if needed.
  const renderConfirmDialog = () => {
    if (!confirmDialog.show) return null;
    return (
      <div className="confirm-overlay">
        <div className="confirm-dialog">
          <h3>{confirmDialog.title}</h3>
          <p>{confirmDialog.message}</p>
          <div className="confirm-buttons">
            <button onClick={() => setConfirmDialog({ show: false, title: '', message: '', onConfirm: null })} className="cancel-button">
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

  // Render dashboard UI (simplified example)
  const renderDashboard = () => {
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
              <button onClick={handleRefreshData} className="refresh-button" disabled={isLoading}>
                {isLoading ? "Refreshing..." : "Refresh Data"}
              </button>
            </div>
          </div>
          {/* Other status cards can be added here */}
        </div>
        {/* Render agent list or selected agent dashboard here */}
        <div className="agent-list-section">
          <div className="agent-list-header">
            <h3>Agent Directory</h3>
            <div className="search-box">
              <input
                type="text"
                placeholder="Search agents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
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
                .filter((agent) => agent.name.toLowerCase().includes(searchTerm.toLowerCase()))
                .map((agent) => (
                  <tr key={agent.id}>
                    <td>{agent.name}</td>
                    <td>{agent.role}</td>
                    <td>
                      <div className="workload-bar">
                        <div className="workload-fill" style={{ width: `${(agent.currentAssignments.length / agent.capacity) * 100}%` }}></div>
                      </div>
                      <span className="workload-text">{agent.currentAssignments.length}/{agent.capacity}</span>
                    </td>
                    <td>
                      <button className="view-button" onClick={() => setSelectedAgent(agent.id)}>
                        View Dashboard
                      </button>
                      {/* Additional action buttons if needed */}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
        {selectedAgent && (
          <div className="agent-dashboard">
            <button className="back-button" onClick={() => setSelectedAgent(null)}>Back to agent list</button>
            {/* Render selected agent's dashboard here */}
            <h2>Agent Dashboard</h2>
            {/* ... */}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Product Assignment System</h1>
        {message && <div className="message">{message}</div>}
      </header>
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
