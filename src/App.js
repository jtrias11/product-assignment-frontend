import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  const [previouslyAssigned, setPreviouslyAssigned] = useState([]);
  
  // UI States
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState(null);

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

  // View Rendering Functions
  const renderAgents = () => {
    const filteredAgents = agents.filter(agent => 
      agent.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
      <div className="view-container">
        <h2>Agent Directory</h2>
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
              const product = products.find(p => p.id === assignment.productId);
              
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

  const renderContent = () => {
    switch(view) {
      case 'agents':
        return renderAgents();
      case 'completed-tasks':
        return renderCompletedTasks();
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