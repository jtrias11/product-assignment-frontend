import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

// Utility function for date formatting
const formatEST = (dateStr) => {
  if (!dateStr) return 'N/A';
  const date = new Date(dateStr.endsWith('Z') ? dateStr : dateStr + ' UTC');
  return date.toLocaleString('en-US', { 
    timeZone: 'America/New_York', 
    hour12: true, 
    year: 'numeric', 
    month: 'numeric', 
    day: 'numeric', 
    hour: '2-digit', 
    minute: '2-digit' 
  });
};

// API Configuration
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'https://product-assignment-server.onrender.com/api';

function App() {
  // State Management
  const [darkMode, setDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [view, setView] = useState('agents');
  
  // Data States
  const [agents, setAgents] = useState([]);
  const [products, setProducts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [selectedAgent, setSelectedAgent] = useState(null);
  
  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch Data Function
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [agentsRes, productsRes, assignmentsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/agents`),
        fetch(`${API_BASE_URL}/products`),
        fetch(`${API_BASE_URL}/assignments`)
      ]);

      if (!agentsRes.ok || !productsRes.ok || !assignmentsRes.ok) {
        throw new Error('Failed to fetch data');
      }

      const agentsData = await agentsRes.json();
      const productsData = await productsRes.json();
      const assignmentsData = await assignmentsRes.json();

      setAgents(agentsData);
      setProducts(productsData);
      setAssignments(assignmentsData);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load data on component mount
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Render Agent Dashboard View
  const renderAgentDashboard = () => {
    if (!selectedAgent) return <div>No agent selected</div>;
    return (
      <div className="view-container">
        <h2>{selectedAgent.name}'s Dashboard</h2>
        <p>Capacity: {selectedAgent.capacity}</p>
        <div style={{ margin: '1rem 0' }}>
          <button 
            className="action-btn"
            onClick={() => alert("Request Tasks functionality not implemented yet")}
          >
            Request Tasks
          </button>
          <button 
            className="action-btn"
            onClick={() => alert("Complete Tasks functionality not implemented yet")}
          >
            Complete Tasks
          </button>
          <button 
            className="action-btn"
            onClick={() => alert("Unassign Task functionality not implemented yet")}
          >
            Unassign Task
          </button>
        </div>
        <div style={{ marginTop: '1rem' }}>
          <p>Total Agents: {agents.length}</p>
          <p>Total Products: {products.length}</p>
        </div>
      </div>
    );
  };

  // Render Agents List
  const renderAgents = () => {
    const filteredAgents = agents.filter(agent => 
      agent.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="view-container">
        <h2>Agent Directory</h2>
        <div style={{ marginBottom: '1rem' }}>
          <p>Total Agents: {agents.length}</p>
          <p>Total Products: {products.length}</p>
        </div>
        <input 
          type="text" 
          placeholder="Search agents..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Capacity</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAgents.map(agent => (
              <tr key={agent.id}>
                <td>{agent.name}</td>
                <td>{agent.role}</td>
                <td>{agent.capacity}</td>
                <td>
                  <button 
                    onClick={() => {
                      setSelectedAgent(agent);
                      setView('agent-dashboard');
                    }}
                    className="action-btn"
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
  };

  // Render Completed Tasks
  const renderCompletedTasks = () => {
    const completedAssignments = assignments.filter(a => a.completed);
    
    return (
      <div className="view-container">
        <h2>Completed Tasks</h2>
        <table className="data-table">
          <thead>
            <tr>
              <th>Product ID</th>
              <th>Completed On</th>
              <th>Agent</th>
            </tr>
          </thead>
          <tbody>
            {completedAssignments.map(assignment => {
              const agent = agents.find(a => a.id === assignment.agentId);
              return (
                <tr key={assignment.id}>
                  <td>{assignment.productId}</td>
                  <td>{formatEST(assignment.completedOn)}</td>
                  <td>{agent ? agent.name : 'Unknown'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  // Render Side Menu
  const renderSideMenu = () => {
    return (
      <div className={`side-menu ${menuOpen ? 'open' : ''}`}>
        <button className="close-menu" onClick={() => setMenuOpen(false)}>
          ✕
        </button>
        <nav>
          <button onClick={() => setView('agents')}>Agents</button>
          <button onClick={() => setView('completed-tasks')}>Completed Tasks</button>
          <button onClick={() => setView('products')}>Products</button>
          <button onClick={() => setView('unassigned')}>Unassigned Tasks</button>
        </nav>
        <div className="theme-toggle">
          <button onClick={() => setDarkMode(!darkMode)}>
            {darkMode ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>
      </div>
    );
  };

  // Render Content Based on View
  const renderContent = () => {
    switch(view) {
      case 'agents':
        return renderAgents();
      case 'completed-tasks':
        return renderCompletedTasks();
      case 'agent-dashboard':
        return renderAgentDashboard();
      default:
        return <div>Select a view from the menu</div>;
    }
  };

  return (
    <div className={`app ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <header>
        <button className="hamburger-btn" onClick={() => setMenuOpen(true)}>
          ☰
        </button>
        <h1>Product Assignment</h1>
      </header>
      
      {renderSideMenu()}
      
      <main>
        {isLoading ? (
          <div className="loading">Loading...</div>
        ) : error ? (
          <div className="error">{error}</div>
        ) : (
          renderContent()
        )}
      </main>
    </div>
  );
}

export default App;
