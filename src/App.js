import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const getApiBaseUrl = () => {
  const baseUrl = process.env.REACT_APP_API_BASE_URL || 'https://product-assignment-server.onrender.com/api';
  console.log('API Base URL:', baseUrl);
  return baseUrl;
};

const API_BASE_URL = getApiBaseUrl();

function App() {
  // State for managing data
  const [agents, setAgents] = useState([]);
  const [products, setProducts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading data...');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [view, setView] = useState('agents'); // "agents", "completed", "unassigned", "previously-assigned", "queue"
  const [completedTasks, setCompletedTasks] = useState([]);
  const [unassignedProducts, setUnassignedProducts] = useState([]);
  const [previouslyAssigned, setPreviouslyAssigned] = useState([]);
  const [queueProducts, setQueueProducts] = useState([]);
  const [confirmDialog, setConfirmDialog] = useState({ show: false, title: '', message: '', onConfirm: null });
  const [uploadSuccess, setUploadSuccess] = useState(false);

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
      console.log("Products loaded:", productsData.length);
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

  // File upload handler
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    // Reset the file input
    event.target.value = null;
    
    setUploadSuccess(false);
    setIsLoading(true);
    setLoadingMessage('Uploading CSV file and adding new products...');
    
    // Create form data
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
      
      const result = await response.json();
      
      // Show a detailed success message
      setMessage(
        result.message || 
        `Success! Added ${result.newProducts || 0} new products and updated ${result.updatedProducts || 0} existing products.`
      );
      setUploadSuccess(true);
      
      // Reload data after successful upload
      await loadDataFromServer();
    } catch (error) {
      console.error('Error uploading file:', error);
      setMessage(`Error uploading file: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

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

  const unassignProduct = async (productId, agentId) => {
    setIsLoading(true);
    setLoadingMessage('Unassigning product...');
    try {
      const res = await fetch(`${API_BASE_URL}/unassign-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, agentId })
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
      setConfirmDialog({ show: false, title: '', message: '', onConfirm: null });
    }
  };

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
      setConfirmDialog({ show: false, title: '', message: '', onConfirm: null });
    }
  };

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
      setConfirmDialog({ show: false, title: '', message: '', onConfirm: null });
    }
  };

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

  const loadPreviouslyAssigned = async () => {
    setIsLoading(true);
    setLoadingMessage('Loading previously assigned products...');
    try {
      const res = await fetch(`${API_BASE_URL}/previously-assigned`);
      if (!res.ok) {
        throw new Error('Failed to load previously assigned products');
      }
      const data = await res.json();
      setPreviouslyAssigned(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading previously assigned products:', error);
      setMessage(`Error loading previously assigned products: ${error.message}`);
      setIsLoading(false);
    }
  };

  const loadQueue = async () => {
    setIsLoading(true);
    setLoadingMessage('Loading product queue...');
    try {
      const res = await fetch(`${API_BASE_URL}/queue`);
      if (!res.ok) {
        throw new Error('Failed to load product queue');
      }
      const data = await res.json();
      setQueueProducts(data);
      setIsLoading(false);
    } catch (error) {
      console.error('Error loading product queue:', error);
      setMessage(`Error loading product queue: ${error.message}`);
      setIsLoading(false);
    }
  };

  const downloadCompletedCSV = () => {
    window.open(`${API_BASE_URL}/download/completed-assignments`, '_blank');
  };

  const downloadUnassignedCSV = () => {
    window.open(`${API_BASE_URL}/download/unassigned-products`, '_blank');
  };

  const downloadPreviouslyAssignedCSV = () => {
    window.open(`${API_BASE_URL}/download/previously-assigned`, '_blank');
  };

  const downloadQueueCSV = () => {
    window.open(`${API_BASE_URL}/download/queue`, '_blank');
  };

  const handleViewChange = (newView) => {
    setView(newView);
    if (newView === 'completed') {
      loadCompletedTasks();
    } else if (newView === 'unassigned') {
      loadUnassignedProducts();
    } else if (newView === 'previously-assigned') {
      loadPreviouslyAssigned();
    } else if (newView === 'queue') {
      loadQueue();
    }
  };

  // Show confirm dialog
  const showConfirmDialog = (title, message, onConfirm) => {
    setConfirmDialog({ show: true, title, message, onConfirm });
  };

  // Render confirmation dialog
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
    if (!agent) return <div>Select an agent to view their dashboard.</div>;
    return (
      <div className="agent-dashboard">
        <button className="back-button" onClick={() => setSelectedAgent(null)}>Back to Agent List</button>
        <h2>{agent.name} - Dashboard</h2>
        <p>{agent.role} • {agent.currentAssignments.length} / {agent.capacity} tasks</p>
        <div className="button-group">
          <button className="request-button" onClick={() => requestTask(agent.id)} disabled={isLoading || agent.currentAssignments.length >= agent.capacity}>
            {isLoading ? "Processing..." : agent.currentAssignments.length >= agent.capacity ? "Queue Full" : "Request Task"}
          </button>
          {agent.currentAssignments.length > 0 && (
            <button 
              className="unassign-button" 
              onClick={() => showConfirmDialog(
                "Unassign All Tasks", 
                `Are you sure you want to unassign all tasks from ${agent.name}?`,
                () => unassignAgentTasks(agent.id)
              )} 
              disabled={isLoading}
            >
              Unassign All Tasks
            </button>
          )}
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agent.currentAssignments.map(task => (
                <tr key={task.assignmentId || task.productId}>
                  <td>{task.productId}</td>
                  <td>{task.count}</td>
                  <td>{task.tenantId || 'N/A'}</td>
                  <td>
                    <span className={`priority-tag priority-${task.priority}`}>
                      {task.priority}
                    </span>
                  </td>
                  <td>{task.createdOn || 'N/A'}</td>
                  <td>
                    <div className="action-buttons">
                      <button className="complete-button" onClick={() => completeTask(agent.id, task.productId)} disabled={isLoading}>
                        Complete
                      </button>
                      <button 
                        className="unassign-task-button" 
                        onClick={() => showConfirmDialog(
                          "Unassign Task", 
                          `Are you sure you want to unassign Abstract ID ${task.productId}?`,
                          () => unassignProduct(task.productId, agent.id)
                        )} 
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
          {agents.filter(agent => agent.name.toLowerCase().includes(searchTerm.toLowerCase())).map(agent => (
            <tr key={agent.id}>
              <td>{agent.name}</td>
              <td>{agent.role}</td>
              <td>
                <div className="workload-bar">
                  <div className="workload-fill" style={{ width: `${(agent.currentAssignments.length / agent.capacity) * 100}%` }}></div>
                </div>
                <span className="workload-text">{agent.currentAssignments.length}/{agent.capacity}</span>
              </td>
              <td className="agent-action-buttons">
                <button className="view-button" onClick={() => setSelectedAgent(agent.id)} disabled={isLoading}>
                  View Dashboard
                </button>
                {agent.currentAssignments.length > 0 && (
                  <button 
                    className="unassign-button" 
                    onClick={() => showConfirmDialog(
                      "Unassign All Tasks", 
                      `Are you sure you want to unassign all tasks from ${agent.name}?`,
                      () => unassignAgentTasks(agent.id)
                    )} 
                    disabled={isLoading}
                  >
                    Unassign All
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderCompletedTasks = () => (
    <div className="agent-dashboard">
      <div className="view-nav">
        <button className="back-button" onClick={() => setView('agents')}>Back to Dashboard</button>
        <h2>Completed Tasks</h2>
      </div>
      <button onClick={downloadCompletedCSV} disabled={isLoading} className="download-button">
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

  const renderUnassignedProducts = () => (
    <div className="agent-dashboard">
      <div className="view-nav">
        <button className="back-button" onClick={() => setView('agents')}>Back to Dashboard</button>
        <h2>Unassigned Products</h2>
      </div>
      <button onClick={downloadUnassignedCSV} disabled={isLoading} className="download-button">
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
              <th>Previously Assigned</th>
            </tr>
          </thead>
          <tbody>
            {unassignedProducts.map(p => (
              <tr key={p.id} className={p.wasAssigned ? "previously-assigned-row" : ""}>
                <td>{p.id}</td>
                <td>{p.count}</td>
                <td>{p.tenantId}</td>
                <td>
                  <span className={`priority-tag priority-${p.priority}`}>
                    {p.priority}
                  </span>
                </td>
                <td>{p.createdOn}</td>
                <td>{p.wasAssigned ? "Yes" : "No"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="no-tasks">No unassigned products found.</p>
      )}
    </div>
  );

  const renderPreviouslyAssigned = () => (
    <div className="agent-dashboard">
      <div className="view-nav">
        <button className="back-button" onClick={() => setView('agents')}>Back to Dashboard</button>
        <h2>Previously Assigned Products</h2>
      </div>
      <button onClick={downloadPreviouslyAssignedCSV} disabled={isLoading} className="download-button">
        Download CSV
      </button>
      {previouslyAssigned.length > 0 ? (
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
                <td>{p.count}</td>
                <td>{p.tenantId}</td>
                <td>
                  <span className={`priority-tag priority-${p.priority}`}>
                    {p.priority}
                  </span>
                </td>
                <td>{p.createdOn}</td>
                <td>{p.unassignedTime || 'N/A'}</td>
                <td>{p.unassignedBy || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="no-tasks">No previously assigned products found.</p>
      )}
    </div>
  );

  const renderQueue = () => (
    <div className="agent-dashboard">
      <div className="view-nav">
        <button className="back-button" onClick={() => setView('agents')}>Back to Dashboard</button>
        <h2>Complete Product Queue</h2>
      </div>
      <button onClick={downloadQueueCSV} disabled={isLoading} className="download-button">
        Download CSV
      </button>
      {queueProducts.length > 0 ? (
        <div className="queue-table-container">
          <table className="assignments-table queue-table">
            <thead>
              <tr>
                <th>Abstract ID</th>
                <th>Name</th>
                <th>Count</th>
                <th>Tenant ID</th>
                <th>Priority</th>
                <th>Created On</th>
                <th>Assigned</th>
                <th>Was Assigned</th>
                <th>Unassigned Time</th>
              </tr>
            </thead>
            <tbody>
              {queueProducts.map(p => (
                <tr key={p.id} className={p.assigned ? "assigned-row" : p.wasAssigned ? "previously-assigned-row" : ""}>
                  <td>{p.id}</td>
                  <td>{p.name || 'N/A'}</td>
                  <td>{p.count}</td>
                  <td>{p.tenantId}</td>
                  <td>
                    <span className={`priority-tag priority-${p.priority}`}>
                      {p.priority}
                    </span>
                  </td>
                  <td>{p.createdOn}</td>
                  <td>{p.assigned ? "Yes" : "No"}</td>
                  <td>{p.wasAssigned ? "Yes" : "No"}</td>
                  <td>{p.unassignedTime || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="no-tasks">No products found.</p>
      )}
    </div>
  );

  const renderDashboard = () => {
    if (view === 'completed') return renderCompletedTasks();
    if (view === 'unassigned') return renderUnassignedProducts();
    if (view === 'previously-assigned') return renderPreviouslyAssigned();
    if (view === 'queue') return renderQueue();
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
            
            {/* File Upload Section */}
            <div className="file-upload-section">
              <h4>Upload New Products CSV</h4>
              <div className="file-input-container">
                <input
                  type="file"
                  id="output-csv"
                  accept=".csv"
                  onChange={handleFileUpload}
                  disabled={isLoading}
                  className="file-input"
                />
                <label htmlFor="output-csv" className={`file-label ${uploadSuccess ? 'upload-success' : ''}`}>
                  {uploadSuccess ? '✓ File Uploaded' : 'Choose File'}
                </label>
              </div>
              <p className="file-help-text">Select CSV to add new products (does not replace existing ones)</p>
            </div>

            <div className="button-group">
              <button className="refresh-button" onClick={handleRefreshData} disabled={isLoading}>
                {isLoading ? "Refreshing..." : "Refresh Data"}
              </button>
              {assignments.filter(a => !a.completed).length > 0 && (
                <button 
                  className="unassign-all-button" 
                  onClick={() => showConfirmDialog(
                    "Unassign All Tasks", 
                    "Are you sure you want to unassign ALL tasks from ALL agents?",
                    unassignAllTasks
                  )} 
                  disabled={isLoading}
                >
                  Unassign All Tasks
                </button>
              )}
            </div>
            <div className="button-group" style={{ marginTop: '15px' }}>
              <button onClick={() => { setView('completed'); loadCompletedTasks(); }} className="view-button" disabled={isLoading}>
                View Completed Tasks
              </button>
              <button onClick={() => { setView('unassigned'); loadUnassignedProducts(); }} className="view-button" disabled={isLoading}>
                View Unassigned Products
              </button>
              <button onClick={() => { setView('previously-assigned'); loadPreviouslyAssigned(); }} className="view-button" disabled={isLoading}>
                View Previously Assigned
              </button>
              <button onClick={() => { setView('queue'); loadQueue(); }} className="view-button view-queue-button" disabled={isLoading}>
                View Complete Queue
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
        {renderConfirmDialog()}
      </main>
    </div>
  );
}

export default App;