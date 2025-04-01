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
  
  // Previous methods remain the same...

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