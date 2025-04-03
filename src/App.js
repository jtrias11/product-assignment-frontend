import React, { useState, useEffect, useCallback, useMemo } from 'react';
import './App.css';

// Helper to get API base URL from environment variable or default
const getApiBaseUrl = () => {
  return process.env.REACT_APP_API_BASE_URL || 'https://product-assignment-server.onrender.com/api';
};
const API_BASE_URL = getApiBaseUrl();

function App() {
  // Theme & Menu state
  const [darkMode, setDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleTheme = useCallback(() => setDarkMode(prev => !prev), []);
  const toggleMenu = useCallback(() => setMenuOpen(prev => !prev), []);

  // Data states
  const [agents, setAgents] = useState([]);
  const [products, setProducts] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [previouslyAssigned, setPreviouslyAssigned] = useState([]);

  // System status
  const [totalAgents, setTotalAgents] = useState(0);
  const [totalProducts, setTotalProducts] = useState(0);
  const [totalAssignments, setTotalAssignments] = useState(0);

  // UI states
  const [isLoading, setIsLoading] = useState(true);
  const [loadingMessage, setLoadingMessage] = useState('Loading data...');
  const [searchTerm, setSearchTerm] = useState('');

  // View and Agent selection state
  const [view, setView] = useState('agents');
  const [selectedAgent, setSelectedAgent] = useState(null);

  // Progressive loading state
  const [loadStages, setLoadStages] = useState({
    agentsLoaded: false,
    productsLoaded: false,
    assignmentsLoaded: false
  });

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  // Memoized filtered agents for the directory view
  const filteredAgents = useMemo(() => {
    return agents.filter(agent =>
      agent.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [agents, searchTerm]);

  // Memoized agent assignments
  const memoizedAgentAssignments = useMemo(() => {
    const assignmentMap = {};
    
    agents.forEach(agent => {
      assignmentMap[agent._id] = [];
    });
    
    assignments.forEach(assignment => {
      if (
        assignment.agentId && 
        !assignment.completed && 
        !assignment.unassignedTime &&
        assignmentMap[assignment.agentId]
      ) {
        assignmentMap[assignment.agentId].push(assignment);
      }
    });
    
    return assignmentMap;
  }, [agents, assignments]);

  // Memoized workload per agent
  const agentWorkloads = useMemo(() => {
    const workloads = {};
    const productMap = {};
    
    // Create a product lookup map
    products.forEach(product => {
      productMap[product.id] = product;
    });
    
    // Calculate workloads using the map
    Object.entries(memoizedAgentAssignments).forEach(([agentId, agentAssignments]) => {
      const sum = agentAssignments.reduce((total, assign) => {
        const product = productMap[assign.productId];
        const count = product && product.count ? parseInt(product.count, 10) : 1;
        return total + count;
      }, 0);
      workloads[agentId] = sum;
    });
    
    return workloads;
  }, [products, memoizedAgentAssignments]);

  // Memoized completed assignments
  const completedAssignments = useMemo(() => {
    return assignments.filter(a => a.completed);
  }, [assignments]);

  // Memoized grouped completed tasks
  const groupedCompletedTasks = useMemo(() => {
    const result = {};
    const productMap = {};
    const agentMap = {};
    
    // Build lookup maps
    products.forEach(p => { productMap[p.id] = p; });
    agents.forEach(a => { agentMap[a._id] = a; });
    
    completedAssignments.forEach(c => {
      const key = c.productId;
      if (!result[key]) {
        const product = productMap[key];
        result[key] = {
          count: product && product.count ? parseInt(product.count, 10) : 1,
          createdOn: product?.createdOn || 'N/A',
          priority: product?.priority || 'N/A',
          tenantId: product?.tenantId || 'N/A',
          completedTime: c.completedOn || 'N/A',
          agentNames: new Set(),
        };
      } else {
        const product = productMap[key];
        const additional = product && product.count ? parseInt(product.count, 10) : 1;
        result[key].count += additional;
      }
      const agent = agentMap[c.agentId];
      if (agent) {
        result[key].agentNames.add(agent.name || 'Unknown');
      }
    });
    
    return result;
  }, [completedAssignments, products, agents]);

  // Memoized unassigned products
  const unassignedProducts = useMemo(() => {
    return products.filter(p => !p.assigned);
  }, [products]);

  const getAgentWorkloadCount = useCallback((agentId) => {
    return agentWorkloads[agentId] || 0;
  }, [agentWorkloads]);

  // Data loading function for agents, products and assignments
  const loadDataFromServer = useCallback(async () => {
    setIsLoading(true);
    setLoadingMessage('Loading data from server...');
    try {
      // Use the new combined endpoint for faster loading
      const dashboardRes = await fetch(`${API_BASE_URL}/dashboard-data`);
      
      if (!dashboardRes.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const dashboardData = await dashboardRes.json();
      
      setProducts(dashboardData.products);
      setAgents(dashboardData.agents);
      setAssignments(dashboardData.assignments);
      setTotalAgents(dashboardData.totalAgents);
      setTotalProducts(dashboardData.totalProducts);
      setTotalAssignments(dashboardData.totalAssignments);
      
      // Mark progressive loading stages
      setLoadStages({
        agentsLoaded: true,
        productsLoaded: true,
        assignmentsLoaded: true
      });
    } catch (error) {
      console.error('Error loading data:', error);
      
      // Fallback to individual endpoints if combined endpoint fails
      try {
        const [prodRes, agentsRes, assignRes] = await Promise.all([
          fetch(`${API_BASE_URL}/products`),
          fetch(`${API_BASE_URL}/agents`),
          fetch(`${API_BASE_URL}/assignments`)
        ]);
        
        if (!prodRes.ok || !agentsRes.ok || !assignRes.ok) {
          throw new Error('One or more fetch requests failed');
        }
        
        const productsData = await prodRes.json();
        const agentsData = await agentsRes.json();
        const assignmentsData = await assignRes.json();
        
        setProducts(productsData);
        setAgents(agentsData);
        setAssignments(assignmentsData);
        setTotalAgents(agentsData.length);
        setTotalProducts(productsData.length);
        setTotalAssignments(assignmentsData.length);
        
        // Mark progressive loading stages
        setLoadStages({
          agentsLoaded: true,
          productsLoaded: true,
          assignmentsLoaded: true
        });
      } catch (fallbackError) {
        console.error('Fallback loading failed:', fallbackError);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load previously assigned tasks (for "unassigned" view)
  const loadPreviouslyAssigned = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/previously-assigned`);
      if (!res.ok) throw new Error('Failed to load unassigned tasks');
      const data = await res.json();
      setPreviouslyAssigned(data);
    } catch (error) {
      console.error('Error loading unassigned tasks:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDataFromServer();
  }, [loadDataFromServer]);

  // File Upload Handler (for CSV upload)
  const handleFileUpload = useCallback(async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    event.target.value = null;
    setIsLoading(true);
    setLoadingMessage('Uploading CSV file...');
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
      await loadDataFromServer();
    } catch (error) {
      console.error('Error uploading file:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [loadDataFromServer]);

  // Data refresh handler
  const handleRefreshData = useCallback(async () => {
    setIsLoading(true);
    setLoadingMessage('Refreshing data...');
    try {
      const refreshRes = await fetch(`${API_BASE_URL}/refresh`, { method: 'POST' });
      if (!refreshRes.ok) {
        const errText = await refreshRes.text();
        throw new Error(`Failed to refresh data: ${errText}`);
      }
      await loadDataFromServer();
    } catch (error) {
      console.error('Error refreshing data:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [loadDataFromServer]);

  // Request Task: assigns an available product to the agent if capacity allows
  const requestTask = useCallback(async (agentId) => {
    const workloadCount = getAgentWorkloadCount(agentId);
    if (workloadCount >= 30) {
      alert("Please complete or unassign some tasks before requesting new ones (max capacity = 30).");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Assignment failed');
      }
      await loadDataFromServer();
    } catch (error) {
      console.error('Error requesting task:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [getAgentWorkloadCount, loadDataFromServer]);

  const completeTask = useCallback(async (agentId, productId) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, productId })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Completion failed');
      }
      await loadDataFromServer();
    } catch (error) {
      console.error('Error completing task:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [loadDataFromServer]);

  const completeAllTasksForAgent = useCallback(async (agentId) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/complete-all-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Completion failed');
      }
      await loadDataFromServer();
    } catch (error) {
      console.error('Error completing all tasks for agent:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [loadDataFromServer]);

  const unassignProduct = useCallback(async (productId, agentId) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/unassign-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, agentId })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Unassignment failed');
      }
      await loadDataFromServer();
    } catch (error) {
      console.error('Error unassigning product:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [loadDataFromServer]);

  const unassignAgentTasks = useCallback(async (agentId) => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/unassign-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId })
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Unassignment failed');
      }
      await loadDataFromServer();
    } catch (error) {
      console.error('Error unassigning agent tasks:', error);
      alert(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  }, [loadDataFromServer]);

  // CSV download handlers
  const downloadCompletedCSV = useCallback(() => {
    window.open(`${API_BASE_URL}/download/completed-assignments`, '_blank');
  }, []);
  
  const downloadUnassignedCSV = useCallback(() => {
    window.open(`${API_BASE_URL}/download/unassigned-products`, '_blank');
  }, []);

  // View Switching
  const handleViewChange = useCallback((newView) => {
    setSelectedAgent(null);
    if (newView === 'unassigned') {
      loadPreviouslyAssigned();
    }
    setView(newView);
    setMenuOpen(false);
  }, [loadPreviouslyAssigned]);

  // Render Functions
  const renderConfirmDialog = useCallback(() => {
    if (!confirmDialog.show) return null;
    return (
      <div className="confirm-overlay">
        <div className="confirm-dialog">
          <h3>{confirmDialog.title}</h3>
          <p>{confirmDialog.message}</p>
          <div className="confirm-buttons">
            <button
              onClick={() =>
                setConfirmDialog({ show: false, title: '', message: '', onConfirm: null })
              }
              className="cancel-button"
            >
              Cancel
            </button>
            <button onClick={confirmDialog.onConfirm} className="confirm-button">
              Confirm
            </button>
          </div>
        </div>
      </div>
    );
  }, [confirmDialog]);

  const renderHeader = useCallback(() => (
    <header className={`app-header ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <div className="header-left">
        <button className="hamburger-btn" onClick={toggleMenu}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill={darkMode ? '#fff' : '#000'}>
            <path d="M3 6h18v2H3V6zm0 5h18v2H3v-2zm0 5h18v2H3v-2z" />
          </svg>
        </button>
        <h1 className="brand-title">Product Assignment</h1>
      </div>
      <div className="header-right"></div>
    </header>
  ), [darkMode, toggleMenu]);

  const renderSideMenu = useCallback(() => (
    <div className={`side-menu ${menuOpen ? 'open' : ''} ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      <button className="close-menu-btn" onClick={() => setMenuOpen(false)}>
        ✕
      </button>
      <nav className="side-menu-nav">
        <button onClick={() => handleViewChange('agents')} disabled={isLoading}>
          Agent Directory
        </button>
        <button onClick={() => handleViewChange('completed')} disabled={isLoading}>
          Completed Tasks
        </button>
        <button onClick={() => handleViewChange('available')} disabled={isLoading}>
          Available Products
        </button>
        <button onClick={() => handleViewChange('queue')} disabled={isLoading}>
          Queue
        </button>
        <button onClick={() => handleViewChange('unassigned')} disabled={isLoading}>
          Unassigned Tasks
        </button>
        <hr />
        <button onClick={toggleTheme} className="theme-toggle-button">
          {darkMode ? 'Light Mode' : 'Dark Mode'}
        </button>
      </nav>
      <hr />
      <div className="menu-upload-section">
        <label htmlFor="output-csv" className="upload-icon">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill={darkMode ? '#fff' : '#0d6efd'}>
            <path d="M5 20h14v-2H5v2zm7-18L5.33 9h3.84v4h6.66v-4h3.84L12 2z" />
          </svg>
          <span>Upload CSV</span>
        </label>
        <input type="file" id="output-csv" accept=".csv" onChange={handleFileUpload} disabled={isLoading} className="file-input" />
      </div>
    </div>
  ), [darkMode, menuOpen, isLoading, handleViewChange, handleFileUpload, toggleTheme]);

  const renderQueue = useCallback(() => (
    <div className="view-section">
      <h2>Queue</h2>
      {products.length === 0 ? (
        <p>No products found.</p>
      ) : (
        <table className="assignments-table">
          <thead>
            <tr>
              <th className="product-id">Abstract ID</th>
              <th>Name</th>
              <th>Count</th>
              <th>Tenant ID</th>
              <th>Priority</th>
              <th>Created On</th>
              <th>Assigned</th>
            </tr>
          </thead>
          <tbody>
            {products.map((p) => (
              <tr key={p.id}>
                <td className="product-id">{p.id}</td>
                <td>{p.name || 'N/A'}</td>
                <td>{p.count || 1}</td>
                <td>{p.tenantId || 'N/A'}</td>
                <td>{p.priority || 'N/A'}</td>
                <td>{p.createdOn || 'N/A'}</td>
                <td>{p.assigned ? 'Yes' : 'No'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button className="back-button" onClick={() => setView('agents')}>
        Back to Directory
      </button>
    </div>
  ), [products]);

  const renderAgentDirectory = useCallback(() => (
    <div className="agent-list-section">
      <h2>Agent Directory</h2>
      <div className="system-status-cards">
        <div className="status-card">
          <h3>System Status</h3>
          <p>Total Agents: {totalAgents}</p>
          <p>Total Products: {totalProducts}</p>
          <p>Total Assignments: {totalAssignments}</p>
        </div>
      </div>
      <div className="search-box">
        <input type="text" placeholder="Search agents..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <button onClick={handleRefreshData} className="refresh-button">
          Refresh
        </button>
      </div>
      {filteredAgents.length === 0 ? (
        <p>No agents found.</p>
      ) : (
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
              <tr key={agent._id}>
                <td>{agent.name}</td>
                <td>{agent.role}</td>
                <td>{getAgentWorkloadCount(agent._id)}/30</td>
                <td>
                  <button
                    className="view-dashboard-btn"
                    onClick={() => { setSelectedAgent(agent._id); setView('agent-dashboard'); }}
                  >
                    View Dashboard
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  ), [filteredAgents, getAgentWorkloadCount, totalAgents, totalProducts, totalAssignments, handleRefreshData, searchTerm]);

  const renderAgentDashboard = useCallback(() => {
    const agent = agents.find(a => a._id === selectedAgent);
    if (!agent) return <p>Agent not found.</p>;
    const agentAssignments = memoizedAgentAssignments[agent._id] || [];
    
    return (
      <div className="view-section">
        <h2>{agent.name} - Dashboard</h2>
        <p>{agent.role} • {getAgentWorkloadCount(agent._id)}/30 tasks</p>
        <div className="dashboard-actions">
          <button className="request-task-btn" onClick={() => requestTask(agent._id)} disabled={isLoading}>
            Request Task
          </button>
          <button className="unassign-all-btn" onClick={() => unassignAgentTasks(agent._id)} disabled={isLoading || agentAssignments.length === 0}>
            Unassign Tasks
          </button>
          <button className="complete-all-btn" onClick={() => completeAllTasksForAgent(agent._id)} disabled={isLoading || agentAssignments.length === 0}>
            Complete All
          </button>
          <button
            className="copy-ids-btn"
            onClick={() => {
              const ids = agentAssignments.map(a => a.productId).join(', ');
              navigator.clipboard.writeText(ids)
                .then(() => alert('Product IDs copied!'))
                .catch(() => alert('Failed to copy product IDs.'));
            }}
            disabled={agentAssignments.length === 0}
          >
            Copy Product IDs
          </button>
        </div>
        {agentAssignments.length === 0 ? (
          <p>No tasks assigned.</p>
        ) : (
          <table className="assignments-table">
            <thead>
              <tr>
                <th className="product-id">Product ID</th>
                <th>Count</th>
                <th>Tenant ID</th>
                <th>Priority</th>
                <th>Created On</th>
                <th>Assigned On</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {agentAssignments.map((assign) => {
                const product = products.find(p => p.id === assign.productId);
                return (
                  <tr key={assign._id}>
                    <td className="product-id">{assign.productId}</td>
                    <td>{product?.count || 1}</td>
                    <td>{product?.tenantId || 'N/A'}</td>
                    <td>{product?.priority || 'N/A'}</td>
                    <td>{product?.createdOn || 'N/A'}</td>
                    <td>{assign.assignedOn || 'N/A'}</td>
                    <td>
                      <div className="action-buttons">
                        <button className="complete-task-btn" onClick={() => completeTask(agent._id, assign.productId)} disabled={isLoading}>
                          Complete
                        </button>
                        <button className="unassign-task-btn" onClick={() => unassignProduct(assign.productId, agent._id)} disabled={isLoading}>
                          Unassign
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        <button className="back-button" onClick={() => { setSelectedAgent(null); setView('agents'); }}>
          Back to Directory
        </button>
      </div>
    );
  }, [agents, memoizedAgentAssignments, products, selectedAgent, getAgentWorkloadCount, isLoading, requestTask, unassignAgentTasks, completeAllTasksForAgent, completeTask, unassignProduct]);

  const renderCompletedTasks = useCallback(() => {
    return (
      <div className="view-section">
        <h2>Completed Tasks</h2>
        <button className="download-completed-btn" onClick={downloadCompletedCSV}>
          Download Completed CSV
        </button>
        {Object.keys(groupedCompletedTasks).length === 0 ? (
          <p>No completed tasks found.</p>
        ) : (
          <table className="assignments-table">
            <thead>
              <tr>
                <th className="product-id">Product ID</th>
                <th>Completed By</th>
                <th>Task Count</th>
                <th>Tenant ID</th>
                <th>Priority</th>
                <th>Created On</th>
                <th>Completed Time</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(groupedCompletedTasks).map(([prodId, data]) => (
                <tr key={prodId}>
                  <td className="product-id">{prodId}</td>
                  <td>{Array.from(data.agentNames).join(', ')}</td>
                  <td>{data.count}</td>
                  <td>{data.tenantId}</td>
                  <td>{data.priority}</td>
                  <td>{data.createdOn}</td>
                  <td>{data.completedTime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button className="back-button" onClick={() => setView('agents')}>
          Back to Directory
        </button>
      </div>
    );
  }, [groupedCompletedTasks, downloadCompletedCSV]);

  const renderAvailableProducts = useCallback(() => {
    return (
      <div className="view-section">
        <h2>Available Products</h2>
        {unassignedProducts.length === 0 ? (
          <p>No available products found.</p>
        ) : (
          <table className="assignments-table">
            <thead>
              <tr>
                <th className="product-id">Abstract ID</th>
                <th>Count</th>
                <th>Tenant ID</th>
                <th>Priority</th>
                <th>Created On</th>
              </tr>
            </thead>
            <tbody>
              {unassignedProducts.map((p) => (
                <tr key={p.id}>
                  <td className="product-id">{p.id}</td>
                  <td>{p.count || 1}</td>
                  <td>{p.tenantId || 'N/A'}</td>
                  <td>{p.priority || 'N/A'}</td>
                  <td>{p.createdOn || 'N/A'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <button className="back-button" onClick={() => setView('agents')}>
          Back to Directory
        </button>
      </div>
    );
  }, [unassignedProducts]);

  const renderPreviouslyAssigned = useCallback(() => (
    <div className="view-section">
      <h2>Unassigned Tasks</h2>
      <button className="download-completed-btn" onClick={downloadUnassignedCSV}>
        Download Unassigned CSV
      </button>
      {previouslyAssigned.length === 0 ? (
        <p>No unassigned tasks found.</p>
      ) : (
        <table className="assignments-table">
          <thead>
            <tr>
              <th className="product-id">Abstract ID</th>
              <th>Count</th>
              <th>Tenant ID</th>
              <th>Priority</th>
              <th>Created On</th>
              <th>Unassigned Time</th>
              <th>Unassigned By</th>
            </tr>
          </thead>
          <tbody>
            {previouslyAssigned.map((p) => (
              <tr key={p.id}>
                <td className="product-id">{p.id}</td>
                <td>{p.count || 1}</td>
                <td>{p.tenantId || 'N/A'}</td>
                <td>{p.priority || 'N/A'}</td>
                <td>{p.createdOn || 'N/A'}</td>
                <td>{p.unassignedTime || 'N/A'}</td>
                <td>{p.unassignedBy || 'N/A'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <button className="back-button" onClick={() => setView('agents')}>
        Back to Directory
      </button>
    </div>
  ), [previouslyAssigned, downloadUnassignedCSV]);

  // Progressive rendering based on loading stages
  const renderProgressiveUI = useCallback(() => {
    if (!loadStages.agentsLoaded && !loadStages.productsLoaded) {
      // Show minimal UI while loading
      return (
        <div className="loading-content">
          <h2>Loading application data...</h2>
        </div>
      );
    }
    
    // Show loaded views as soon as needed data is available
    if (view === 'completed' && loadStages.assignmentsLoaded) return renderCompletedTasks();
    if (view === 'available' && loadStages.productsLoaded) return renderAvailableProducts();
    if (view === 'queue' && loadStages.productsLoaded) return renderQueue();
    if (view === 'unassigned' && loadStages.assignmentsLoaded) return renderPreviouslyAssigned();
    if (view === 'agent-dashboard' && selectedAgent && loadStages.assignmentsLoaded) return renderAgentDashboard();
    if (loadStages.agentsLoaded) return renderAgentDirectory();
    
    // Fallback to loading indicator
    return (
      <div className="loading-content">
        <h2>Loading view data...</h2>
      </div>
    );
  }, [
    view, 
    selectedAgent, 
    loadStages,
    renderCompletedTasks, 
    renderAvailableProducts, 
    renderQueue, 
    renderPreviouslyAssigned, 
    renderAgentDashboard, 
    renderAgentDirectory
  ]);

  return (
    <div className={`app ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      {renderHeader()}
      {renderSideMenu()}
      <main className="app-content">
        {isLoading && (
          <div className="loading-overlay">
            <div className="loading-content">
              <div className="spinner-large"></div>
              <p>{loadingMessage}</p>
            </div>
          </div>
        )}
        {renderProgressiveUI()}
        {renderConfirmDialog()}
      </main>
    </div>
  );
}

export default App;