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
  const [message, setMessage] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading data...');
  const [confirmDialog, setConfirmDialog] = useState({ show: false, title: '', message: '', onConfirm: null });
  
  // Load data from server
  const loadDataFromServer = useCallback(async () => {
    setIsLoading(true);
    setLoadingMessage('Loading data from server...');
    
    try {
      console.log('Fetching products from:', `${API_BASE_URL}/products`);
      const productsResponse = await fetch(`${API_BASE_URL}/products`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('Products Response Status:', productsResponse.status);
      if (!productsResponse.ok) {
        const errorText = await productsResponse.text();
        console.error('Products Fetch Error:', errorText);
        throw new Error(`Failed to load products: ${errorText}`);
      }
      const productsData = await productsResponse.json();
      console.log('Products Loaded:', productsData.length);
      setProducts(productsData);
      
      const agentsResponse = await fetch(`${API_BASE_URL}/agents`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      
      console.log('Agents Response Status:', agentsResponse.status);
      if (!agentsResponse.ok) {
        const errorText = await agentsResponse.text();
        console.error('Agents Fetch Error:', errorText);
        throw new Error(`Failed to load agents: ${errorText}`);
      }
      const agentsData = await agentsResponse.json();
      console.log('Agents Loaded:', agentsData.length);
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
      loadSampleData();
    }
  }, []);
  
  // Fallback sample data
  const loadSampleData = () => {
    console.log('Loading sample data as fallback...');
    setAgents([
      { id: 1, name: "Aaron Dale Yaeso Bandong", role: "Item Review", capacity: 10, currentAssignments: [] },
      { id: 2, name: "Aaron Marx Lenin Tuban Oriola", role: "Item Review", capacity: 10, currentAssignments: [] },
      { id: 3, name: "Abel Alicaya Cabugnason", role: "Item Review", capacity: 10, currentAssignments: [] },
      { id: 4, name: "Adam Paul Medina Baliguat", role: "Item Review", capacity: 10, currentAssignments: [] },
      { id: 5, name: "Aileen Punsalan Dionisio", role: "Item Review", capacity: 10, currentAssignments: [] }
    ]);
    
    setProducts([
      { id: "6TBLDVZTR0H4", itemId: 15847619937, name: "Girl's Hoodie Long Sleeve Soft Sweatshirt", priority: "P3", createdOn: "2025-03-31 00:00:03", assigned: false, count: 5, tenantId: "SAMPLE1" },
      { id: "7AV4W07EGKBV", itemId: 15895965957, name: "Cute Hoodies For Teen Girls Trendy Preppy", priority: "P3", createdOn: "2025-03-31 00:00:05", assigned: false, count: 3, tenantId: "SAMPLE2" },
      { id: "9KLTW5Z8MQPX", itemId: 15847689402, name: "Winter Jacket Men Warm Padded Parka", priority: "P2", createdOn: "2025-03-31 00:00:07", assigned: false, count: 2, tenantId: "SAMPLE3" }
    ]);
  };
  
  useEffect(() => {
    loadDataFromServer();
  }, [loadDataFromServer]);
  
  const assignTask = async (agentId) => {
    setIsLoading(true);
    setLoadingMessage('Assigning task...');
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
      console.error('Error assigning task:', error);
      setMessage(`Error assigning task: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const completeTask = async (agentId, productId) => {
    setIsLoading(true);
    setLoadingMessage('Completing task...');
    try {
      const response = await fetch(`${API_BASE_URL}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, productId })
      });
      const result = await response.json();
      if (!response.ok) {
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

  const unassignAllTasks = async () => {
    setIsLoading(true);
    setLoadingMessage('Unassigning all tasks...');
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
      setConfirmDialog({ show: false, title: '', message: '', onConfirm: null });
    }
  };

  const unassignAgentTasks = async (agentId) => {
    setIsLoading(true);
    setLoadingMessage('Unassigning agent tasks...');
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
      setConfirmDialog({ show: false, title: '', message: '', onConfirm: null });
    }
  };

  const unassignProduct = async (productId) => {
    setIsLoading(true);
    setLoadingMessage('Unassigning product...');
    try {
      const response = await fetch(`${API_BASE_URL}/unassign-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || 'Failed to unassign product');
      }
      await loadDataFromServer();
      setMessage(result.message);
    } catch (error) {
      console.error('Error unassigning product:', error);
      setMessage(`Error unassigning product: ${error.message}`);
    } finally {
      setIsLoading(false);
      setConfirmDialog({ show: false, title: '', message: '', onConfirm: null });
    }
  };

  // Updated Refresh Data Handler
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
        console.error('Refresh Fetch Error:', errorText);
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

  const showConfirmDialog = (title, message, onConfirm) => {
    setConfirmDialog({ show: true, title, message, onConfirm });
  };

  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
            <button 
              onClick={confirmDialog.onConfirm}
              className="confirm-button"
            >
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderAgentDashboard = () => {
    const agent = agents.find(a => a.id === selectedAgent);
    if (!agent) return <div>Select an agent to view their dashboard</div>;
    return (
      <div className="agent-dashboard">
        <div className="agent-header">
          <h2>{agent.name}</h2>
          <p>{agent.role} • {agent.currentAssignments.length}/{agent.capacity} tasks</p>
        </div>
        <div className="dashboard-grid">
          <div className="request-section">
            <h3>Request Task</h3>
            <button 
              onClick={() => assignTask(agent.id)}
              disabled={agent.currentAssignments.length >= agent.capacity || isLoading}
              className="request-button"
            >
              {isLoading ? "Processing..." : 
                agent.currentAssignments.length >= agent.capacity ? "Queue Full" : "Request Task"}
            </button>
            {agent.currentAssignments.length > 0 && (
              <button 
                onClick={() => showConfirmDialog(
                  "Unassign All Tasks", 
                  `Are you sure you want to unassign all tasks from ${agent.name}?`,
                  () => unassignAgentTasks(agent.id)
                )}
                className="unassign-button"
                disabled={isLoading}
              >
                Unassign All Tasks
              </button>
            )}
          </div>
          <div className="status-section">
            <h3>Current Status</h3>
            <div>
              <div className="status-row">
                <span>Task Queue</span>
                <span>{agent.currentAssignments.length}/{agent.capacity}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill"
                  style={{ width: `${(agent.currentAssignments.length / agent.capacity) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
        <div className="assignments-section">
          <h3>Current Assignments</h3>
          {agent.currentAssignments.length > 0 ? (
            <table className="assignments-table">
              <thead>
                <tr>
                  <th>Abstract Product ID</th>
                  <th>Priority</th>
                  <th>Tenant ID</th>
                  <th>Created Date</th>
                  <th>Count</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agent.currentAssignments.map(task => (
                  <tr key={task.productId}>
                    <td>{task.productId}</td>
                    <td>
                      <span className={`priority-tag priority-${task.priority}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td>{task.tenantId || 'N/A'}</td>
                    <td>{task.createdOn || 'N/A'}</td>
                    <td>{task.count || 1}</td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          onClick={() => completeTask(agent.id, task.productId)}
                          className="complete-button"
                          disabled={isLoading}
                          title="Complete this task"
                        >
                          {isLoading ? "..." : "Complete"}
                        </button>
                        <button 
                          onClick={() => showConfirmDialog(
                            "Unassign Task", 
                            `Are you sure you want to unassign Abstract ID ${task.productId}?`,
                            () => unassignProduct(task.productId)
                          )}
                          className="unassign-task-button"
                          disabled={isLoading}
                          title="Unassign this task"
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
            <p className="no-tasks">No tasks assigned yet</p>
          )}
        </div>
      </div>
    );
  };

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
              <span>Unassigned Products:</span>
              <span>{products.filter(p => !p.assigned).length}</span>
            </div>
            <div className="status-item">
              <span>Total Assignments:</span>
              <span>{assignments.length}</span>
            </div>
            <div className="button-group">
              <button 
                onClick={handleRefreshData} 
                className="refresh-button"
                disabled={isLoading}
              >
                {isLoading ? "Refreshing..." : "Refresh Data"}
              </button>
              {assignments.length > 0 && (
                <button 
                  onClick={() => showConfirmDialog(
                    "Unassign All Tasks", 
                    "Are you sure you want to unassign ALL tasks from ALL agents?",
                    unassignAllTasks
                  )}
                  className="unassign-all-button"
                  disabled={isLoading}
                >
                  Unassign All Tasks
                </button>
              )}
            </div>
          </div>
          <div className="status-card">
            <h3>Server Information</h3>
            <div className="status-item">
              <span>Server Status:</span>
              <span className={isLoading ? "status-loading" : "status-online"}>
                {isLoading ? "Loading..." : "Online"}
              </span>
            </div>
            <div className="status-item">
              <span>Auto Updates:</span>
              <span>Daily at 1:00 AM</span>
            </div>
            <div className="status-item">
              <span>Data Source:</span>
              <span>Network Drive</span>
            </div>
            <div className="info-message">
              <p>The system automatically loads product data and agent roster.</p>
            </div>
          </div>
        </div>
        {selectedAgent ? (
          <div>
            <button 
              onClick={() => setSelectedAgent(null)}
              className="back-button"
            >
              Back to agent list
            </button>
            {renderAgentDashboard()}
          </div>
        ) : (
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
                {filteredAgents.map((agent) => (
                  <tr key={agent.id}>
                    <td>{agent.name}</td>
                    <td>{agent.role}</td>
                    <td>
                      <div className="workload-bar">
                        <div 
                          className="workload-fill"
                          style={{ width: `${(agent.currentAssignments.length / agent.capacity) * 100}%` }}
                        ></div>
                      </div>
                      <span className="workload-text">
                        {agent.currentAssignments.length}/{agent.capacity}
                      </span>
                    </td>
                    <td>
                      <div className="agent-action-buttons">
                        <button 
                          onClick={() => setSelectedAgent(agent.id)} 
                          className="view-button"
                        >
                          View Dashboard
                        </button>
                        {agent.currentAssignments.length > 0 && (
                          <button 
                            onClick={() => showConfirmDialog(
                              "Unassign All Tasks", 
                              `Are you sure you want to unassign all tasks from ${agent.name}?`,
                              () => unassignAgentTasks(agent.id)
                            )}
                            className="unassign-button"
                            disabled={isLoading}
                          >
                            Unassign All
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Product ID Assignment System</h1>
        {message && (
          <div className="message">{message}</div>
        )}
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
