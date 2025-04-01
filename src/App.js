import React, { useState, useEffect } from 'react';
import './App.css';

// Configure API Base URL dynamically
const getApiBaseUrl = () => {
  const baseUrl = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api';
  console.log('API Base URL:', baseUrl);
  return baseUrl;
};

const API_BASE_URL = getApiBaseUrl();

function App() {
  // State for managing data
  const [agents, setAgents] = useState([]);
  const [products, setProducts] = useState([]);
  const [message, setMessage] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const [view, setView] = useState('dashboard');
  const [assignments, setAssignments] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading data...');
  
  // Load data from server on component mount
  useEffect(() => {
    loadDataFromServer();
  }, []);
  
  // Function to load data from server
  const loadDataFromServer = async () => {
    setIsLoading(true);
    setLoadingMessage('Loading data from server...');
    
    try {
      // Fetch products with detailed error handling
      console.log('Fetching products from:', `${API_BASE_URL}/products`);
      const productsResponse = await fetch(`${API_BASE_URL}/products`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
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
      
      // Fetch agents with similar error handling
      const agentsResponse = await fetch(`${API_BASE_URL}/agents`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
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
      
      // Fetch assignments
      const assignmentsResponse = await fetch(`${API_BASE_URL}/assignments`);
      if (!assignmentsResponse.ok) {
        throw new Error('Failed to load assignments');
      }
      const assignmentsData = await assignmentsResponse.json();
      setAssignments(assignmentsData);
      
      setMessage('Data loaded successfully from server');
      setIsLoading(false);
    } catch (error) {
      console.error('Comprehensive Error:', error);
      setMessage(`Error loading data: ${error.message}`);
      setIsLoading(false);
      loadSampleData(); // Fallback to sample data
    }
  };
  
  // Sample data loader (fallback)
  const loadSampleData = () => {
    // Sample agents
    setAgents([
      { id: 1, name: "Aaron Dale Yaeso Bandong", role: "Item Review", capacity: 10, currentAssignments: [] },
      { id: 2, name: "Aaron Marx Lenin Tuban Oriola", role: "Item Review", capacity: 10, currentAssignments: [] },
      { id: 3, name: "Abel Alicaya Cabugnason", role: "Item Review", capacity: 10, currentAssignments: [] },
      { id: 4, name: "Adam Paul Medina Baliguat", role: "Item Review", capacity: 10, currentAssignments: [] },
      { id: 5, name: "Aileen Punsalan Dionisio", role: "Item Review", capacity: 10, currentAssignments: [] }
    ]);
    
    // Sample products
    setProducts([
      { id: "6TBLDVZTR0H4", itemId: 15847619937, name: "Girl's Hoodie Long Sleeve Soft Sweatshirt", priority: "P3", createdOn: "2025-03-31 00:00:03", assigned: false },
      { id: "7AV4W07EGKBV", itemId: 15895965957, name: "Cute Hoodies For Teen Girls Trendy Preppy", priority: "P3", createdOn: "2025-03-31 00:00:05", assigned: false },
      { id: "9KLTW5Z8MQPX", itemId: 15847689402, name: "Winter Jacket Men Warm Padded Parka", priority: "P2", createdOn: "2025-03-31 00:00:07", assigned: false }
    ]);
  };

  // Assign a task to an agent
  const assignTask = async (agentId) => {
    setIsLoading(true);
    setLoadingMessage('Assigning task...');
    
    try {
      // Call the server API to assign a task
      const response = await fetch(`${API_BASE_URL}/assign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentId }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to assign task');
      }
      
      // Refresh data after assignment
      await loadDataFromServer();
      setMessage(result.message);
    } catch (error) {
      console.error('Error assigning task:', error);
      setMessage(`Error assigning task: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Complete a task
  const completeTask = async (agentId, productId) => {
    setIsLoading(true);
    setLoadingMessage('Completing task...');
    
    try {
      // Call the server API to complete a task
      const response = await fetch(`${API_BASE_URL}/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ agentId, productId }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to complete task');
      }
      
      // Refresh data after completion
      await loadDataFromServer();
      setMessage(result.message);
    } catch (error) {
      console.error('Error completing task:', error);
      setMessage(`Error completing task: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle manual data refresh
  const handleRefreshData = () => {
    loadDataFromServer();
  };

  // Filter agents by search term
  const filteredAgents = agents.filter(agent => 
    agent.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Render the agent dashboard
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
                  <th>Product ID</th>
                  <th>Item</th>
                  <th>Priority</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agent.currentAssignments.map(task => (
                  <tr key={task.productId}>
                    <td>{task.productId}</td>
                    <td className="item-name">{task.name}</td>
                    <td>
                      <span className={`priority-tag priority-${task.priority}`}>
                        {task.priority}
                      </span>
                    </td>
                    <td>
                      <button 
                        onClick={() => completeTask(agent.id, task.productId)}
                        className="complete-button"
                        disabled={isLoading}
                      >
                        {isLoading ? "Processing..." : "Complete"}
                      </button>
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

  // Render the main dashboard
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
            <button 
              onClick={handleRefreshData} 
              className="refresh-button"
              disabled={isLoading}
            >
              {isLoading ? "Refreshing..." : "Refresh Data"}
            </button>
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
                      <button 
                        onClick={() => setSelectedAgent(agent.id)} 
                        className="view-button"
                      >
                        View Dashboard
                      </button>
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

  // Main render function
  return (
    <div className="app">
      <header className="app-header">
        <h1>Product ID Assignment System</h1>
        {message && (
          <div className="message">
            {message}
          </div>
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
      </main>
    </div>
  );
}

export default App;