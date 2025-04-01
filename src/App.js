// app.js
import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

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
      
      setMessage('Data loaded successfully');
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

  // Request a new task for the given agent.
  const requestTask = async (agentId) => {
    setIsLoading(true);
    setLoadingMessage('Requesting task...');
    try {
      const response = await fetch(`${API_BASE_URL}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to assign task');
      }
      await loadDataFromServer();
      setMessage(result.message);
    } catch (error) {
      console.error('Error requesting task:', error);
      setMessage(`Error requesting task: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Unassign a single task (product) from any agent.
  const unassignTask = async (productId) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/unassign-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to unassign task');
      }
      await loadDataFromServer();
      setMessage(result.message);
    } catch (error) {
      console.error('Error unassigning task:', error);
      setMessage(`Error unassigning task: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Unassign all tasks for a specific agent.
  const unassignAgentTasks = async (agentId) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/unassign-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to unassign agent tasks');
      }
      await loadDataFromServer();
      setMessage(result.message);
    } catch (error) {
      console.error('Error unassigning agent tasks:', error);
      setMessage(`Error unassigning agent tasks: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Unassign all tasks for all agents.
  const unassignAllTasks = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/unassign-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to unassign all tasks');
      }
      await loadDataFromServer();
      setMessage(result.message);
    } catch (error) {
      console.error('Error unassigning all tasks:', error);
      setMessage(`Error unassigning all tasks: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Render Agent Dashboard
  const renderAgentDashboard = () => {
    const agent = agents.find(a => a.id === selectedAgent);
    if (!agent) return <div>Select an agent to view their dashboard.</div>;
    return (
      <div className="agent-dashboard">
        <button className="back-button" onClick={() => setSelectedAgent(null)}>Back to Agent List</button>
        <h2>{agent.name} - Dashboard</h2>
        <p>{agent.role} • {agent.currentAssignments.length} / {agent.capacity} tasks</p>
        <div className="button-group">
          <button className="request-button" onClick={() => requestTask(agent.id)} disabled={isLoading}>
            {isLoading ? "Processing..." : "Request Task"}
          </button>
          <button className="unassign-button" onClick={() => unassignAgentTasks(agent.id)} disabled={isLoading}>
            Unassign All Tasks (Agent)
          </button>
        </div>
        {agent.currentAssignments.length > 0 ? (
          <table className="assignments-table">
            <thead>
              <tr>
                <th>Abstract ID</th>
                <th>Count</th>
                <th>Tenant ID</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agent.currentAssignments.map(task => (
                <tr key={task.assignmentId}>
                  <td>{task.productId}</td>
                  <td>{task.count}</td>
                  <td>{task.tenantId}</td>
                  <td>{task.priority}</td>
                  <td>{task.assignmentId ? "Assigned" : "Unassigned"}</td>
                  <td>
                    <button className="unassign-task-button" onClick={() => unassignTask(task.productId)} disabled={isLoading}>
                      Unassign Task
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-tasks">No tasks assigned yet.</p>
        )}
      </div>
    );
  };

  // Render Agent List
  const renderAgentList = () => (
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
            .filter(agent => agent.name.toLowerCase().includes(searchTerm.toLowerCase()))
            .map(agent => (
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
                  <button className="view-button" onClick={() => setSelectedAgent(agent.id)} disabled={isLoading}>
                    View Dashboard
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );

  // Global Dashboard: includes a button to unassign all tasks for all agents.
  const renderDashboard = () => (
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
            <button className="refresh-button" onClick={handleRefreshData} disabled={isLoading}>
              {isLoading ? "Refreshing..." : "Refresh Data"}
            </button>
            <button className="unassign-all-button" onClick={unassignAllTasks} disabled={isLoading}>
              Unassign All Tasks (All Agents)
            </button>
          </div>
        </div>
      </div>
      {selectedAgent ? renderAgentDashboard() : renderAgentList()}
    </div>
  );

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
      </main>
      {confirmDialog.show && (
        <div className="confirm-overlay">
          <div className="confirm-dialog">
            <h3>{confirmDialog.title}</h3>
            <p>{confirmDialog.message}</p>
            <div className="confirm-buttons">
              <button onClick={() => setConfirmDialog({ show: false, title: '', message: '', onConfirm: null })} className="cancel-button">Cancel</button>
              <button onClick={confirmDialog.onConfirm} className="confirm-button">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
