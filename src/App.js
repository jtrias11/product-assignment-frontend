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
  const [view, setView] = useState('agents'); // "agents", "completed", or "unassigned"

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
      console.error('Error loading data:', error);
      setMessage(`Error loading data: ${error.message}`);
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDataFromServer();
  }, [loadDataFromServer]);

  // Refresh
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
      console.error('Error refreshing data:', error);
      setMessage(`Error refreshing data: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Request a new task for an agent
  const requestTask = async (agentId) => {
    setIsLoading(true);
    setLoadingMessage('Requesting task...');
    try {
      const res = await fetch(`${API_BASE_URL}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      });
      const result = await res.json();
      if (!res.ok) {
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

  // Complete a task
  const completeTask = async (agentId, productId) => {
    setIsLoading(true);
    setLoadingMessage('Completing task...');
    try {
      const res = await fetch(`${API_BASE_URL}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, productId })
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to complete task');
      }
      await loadDataFromServer();
      setMessage(result.message);
    } catch (error) {
      console.error('Error completing task:', error);
      setMessage(`Error completing task: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Unassign a single product
  const unassignProduct = async (productId) => {
    setIsLoading(true);
    setLoadingMessage('Unassigning product...');
    try {
      const res = await fetch(`${API_BASE_URL}/unassign-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to unassign product');
      }
      await loadDataFromServer();
      setMessage(result.message);
    } catch (error) {
      console.error('Error unassigning product:', error);
      setMessage(`Error unassigning product: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Unassign all tasks from an agent
  const unassignAgentTasks = async (agentId) => {
    setIsLoading(true);
    setLoadingMessage('Unassigning agent tasks...');
    try {
      const res = await fetch(`${API_BASE_URL}/unassign-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      });
      const result = await res.json();
      if (!res.ok) {
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

  // Unassign all tasks from all agents
  const unassignAllTasks = async () => {
    setIsLoading(true);
    setLoadingMessage('Unassigning all tasks...');
    try {
      const res = await fetch(`${API_BASE_URL}/unassign-all`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const result = await res.json();
      if (!res.ok) {
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

  // Completed tasks dashboard
  const [completedTasks, setCompletedTasks] = useState([]);
  const loadCompletedTasks = async () => {
    setIsLoading(true);
    setLoadingMessage('Loading completed tasks...');
    try {
      const res = await fetch(`${API_BASE_URL}/completed-assignments`);
      if (!res.ok) {
        throw new Error('Failed to load completed tasks');
      }
      const data = await res.json();
      setCompletedTasks(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading completed tasks:', error);
      setMessage(`Error loading completed tasks: ${error.message}`);
      setIsLoading(false);
    }
  };
  const downloadCompletedCSV = () => {
    window.open(`${API_BASE_URL}/download/completed-assignments`, '_blank');
  };

  // Unassigned products dashboard
  const [unassignedProducts, setUnassignedProducts] = useState([]);
  const loadUnassignedProducts = async () => {
    setIsLoading(true);
    setLoadingMessage('Loading unassigned products...');
    try {
      const res = await fetch(`${API_BASE_URL}/unassigned-products`);
      if (!res.ok) {
        throw new Error('Failed to load unassigned products');
      }
      const data = await res.json();
      setUnassignedProducts(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading unassigned products:', error);
      setMessage(`Error loading unassigned products: ${error.message}`);
      setIsLoading(false);
    }
  };
  const downloadUnassignedCSV = () => {
    window.open(`${API_BASE_URL}/download/unassigned-products`, '_blank');
  };

  // Switch dashboard views
  const handleViewChange = (newView) => {
    setView(newView);
    if (newView === 'completed') {
      loadCompletedTasks();
    } else if (newView === 'unassigned') {
      loadUnassignedProducts();
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
            Unassign All (Agent)
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
                <th>Created On</th>
                <th>Assigned On</th>
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
                  <td>{task.createdOn || 'N/A'}</td>
                  <td>{task.assignedOn || 'N/A'}</td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="complete-button"
                        onClick={() => completeTask(agent.id, task.productId)}
                        disabled={isLoading}
                      >
                        Complete
                      </button>
                      <button
                        className="unassign-task-button"
                        onClick={() => unassignProduct(task.productId)}
                        disabled={isLoading}
                      >
                        Unassign
                      </button>
                    </div>
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
                    <div
                      className="workload-fill"
                      style={{ width: `${(agent.currentAssignments.length / agent.capacity) * 100}%` }}
                    />
                  </div>
                  <span className="workload-text">
                    {agent.currentAssignments.length}/{agent.capacity}
                  </span>
                </td>
                <td>
                  <button
                    className="view-button"
                    onClick={() => setSelectedAgent(agent.id)}
                    disabled={isLoading}
                  >
                    View Dashboard
                  </button>
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );

  // Render Completed Tasks
  const renderCompletedTasks = () => (
    <div className="agent-dashboard">
      <h2>Completed Tasks</h2>
      <button onClick={downloadCompletedCSV} disabled={isLoading} className="unassign-button">
        Download CSV
      </button>
      {completedTasks.length > 0 ? (
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
            {completedTasks.map(task => (
              <tr key={task.id}>
                <td>{task.id}</td>
                <td>{task.agentId}</td>
                <td>{task.productId}</td>
                <td>{task.assignedOn}</td>
                <td>{task.completedOn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="no-tasks">No completed tasks found.</p>
      )}
    </div>
  );

  // Render Unassigned Products
  const renderUnassignedProducts = () => (
    <div className="agent-dashboard">
      <h2>Unassigned Products</h2>
      <button onClick={downloadUnassignedCSV} disabled={isLoading} className="unassign-button">
        Download CSV
      </button>
      {unassignedProducts.length > 0 ? (
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
            {unassignedProducts.map(p => (
              <tr key={p.id}>
                <td>{p.id}</td>
                <td>{p.count}</td>
                <td>{p.tenantId}</td>
                <td>{p.priority}</td>
                <td>{p.createdOn}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="no-tasks">No unassigned products found.</p>
      )}
    </div>
  );

  // Render the main dashboard
  const renderDashboard = () => {
    if (view === 'completed') {
      return renderCompletedTasks();
    }
    if (view === 'unassigned') {
      return renderUnassignedProducts();
    }
    // default "agents" view
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
              <button className="refresh-button" onClick={handleRefreshData} disabled={isLoading}>
                {isLoading ? "Refreshing..." : "Refresh Data"}
              </button>
              <button className="unassign-all-button" onClick={unassignAllTasks} disabled={isLoading}>
                Unassign All Tasks
              </button>
            </div>
            <div className="button-group" style={{ marginTop: '15px' }}>
              <button onClick={() => handleViewChange('completed')} className="view-button" disabled={isLoading}>
                View Completed Tasks
              </button>
              <button onClick={() => handleViewChange('unassigned')} className="view-button" disabled={isLoading}>
                View Unassigned Products
              </button>
            </div>
          </div>
        </div>
        {selectedAgent ? renderAgentDashboard() : renderAgentList()}
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
      </main>
    </div>
  );
}

export default App;
