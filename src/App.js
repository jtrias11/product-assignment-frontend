import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

// Helper function to format a date string to EST.
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

const getApiBaseUrl = () => {
  return process.env.REACT_APP_API_BASE_URL || 'https://product-assignment-server.onrender.com/api';
};

const API_BASE_URL = getApiBaseUrl();

function App() {
  // Theme & Menu state
  const [darkMode, setDarkMode] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleTheme = () => setDarkMode(prev => !prev);
  const toggleMenu = () => setMenuOpen(prev => !prev);

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
  const [error, setError] = useState(null);

  // View state
  const [view, setView] = useState('agents');
  const [selectedAgent, setSelectedAgent] = useState(null);

  // Confirmation dialog state
  const [confirmDialog, setConfirmDialog] = useState({
    show: false,
    title: '',
    message: '',
    onConfirm: null,
  });

  // Initial data loading
  useEffect(() => {
    loadDataFromServer();
  }, []);

  // Data Loading Function
  const loadDataFromServer = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setLoadingMessage('Loading data from server...');

    try {
      const [prodRes, agentsRes, assignRes] = await Promise.all([
        fetch(`${API_BASE_URL}/products`),
        fetch(`${API_BASE_URL}/agents`),
        fetch(`${API_BASE_URL}/assignments`),
      ]);

      if (!prodRes.ok) throw new Error(`Products fetch failed: ${prodRes.status}`);
      if (!agentsRes.ok) throw new Error(`Agents fetch failed: ${agentsRes.status}`);
      if (!assignRes.ok) throw new Error(`Assignments fetch failed: ${assignRes.status}`);

      const productsData = await prodRes.json();
      const agentsData = await agentsRes.json();
      const assignmentsData = await assignRes.json();

      setProducts(productsData);
      setAgents(agentsData);
      setAssignments(assignmentsData);
      setTotalAgents(agentsData.length);
      setTotalProducts(productsData.length);
      setTotalAssignments(assignmentsData.length);
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load previously assigned tasks
  const loadPreviouslyAssigned = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/previously-assigned`);
      if (!res.ok) throw new Error('Failed to load unassigned tasks');
      const data = await res.json();
      const filtered = data.filter(task => task.unassignedTime);
      setPreviouslyAssigned(filtered);
    } catch (error) {
      console.error('Error loading unassigned tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // File Upload Handler
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
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
      setError(error.message);
    } finally {
      setIsLoading(false);
      event.target.value = null;
    }
  };

  // Calculate agent workload
  const getAgentWorkloadCount = (agentId) => {
    const agentAssignments = assignments.filter(
      (a) => a.agentId === agentId && !a.completed && !a.unassignedTime
    );
    let sum = 0;
    agentAssignments.forEach((assign) => {
      const product = products.find((p) => p.id === assign.productId);
      const count = product && product.count ? parseInt(product.count, 10) : 1;
      sum += count;
    });
    return sum;
  };

  // Request Task
  const requestTask = async (agentId) => {
    const availableProducts = products.filter(p => !p.assigned);
    if (availableProducts.length === 0) {
      alert("No available products.");
      return;
    }

    const now = new Date();
    const productsWithSlaDiff = availableProducts.map(p => {
      let slaHours = 24; // default SLA
      if (p.priority === 'P1') {
        slaHours = 2;
      } else if (p.priority === 'P2') {
        slaHours = 12;
      } else if (p.priority === 'P3') {
        slaHours = 24;
      }
      const slaMs = slaHours * 60 * 60 * 1000;
      const created = new Date(p.createdOn);
      const timePassed = now - created;
      const diff = slaMs - timePassed;
      return { ...p, slaDiff: diff };
    });

    const withinSla = productsWithSlaDiff.filter(p => p.slaDiff > 0);
    let selectedProduct;
    if (withinSla.length > 0) {
      selectedProduct = withinSla.reduce((prev, curr) => (prev.slaDiff < curr.slaDiff ? prev : curr));
    } else {
      selectedProduct = productsWithSlaDiff.reduce((prev, curr) => (prev.slaDiff < curr.slaDiff ? prev : curr));
    }

    const workloadCount = getAgentWorkloadCount(agentId);
    if (workloadCount >= 30) {
      alert("Please complete or unassign some tasks before requesting new ones (max capacity = 30).");
      return;
    }

    setIsLoading(true);
    try {
      await fetch(`${API_BASE_URL}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, productId: selectedProduct.id }),
      });
      await loadDataFromServer();
    } catch (error) {
      console.error('Error requesting task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Complete Task
  const completeTask = async (agentId, productId) => {
    setIsLoading(true);
    try {
      await fetch(`${API_BASE_URL}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId, productId }),
      });
      await loadDataFromServer();
    } catch (error) {
      console.error('Error completing task:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Complete All Tasks for Agent
  const completeAllTasksForAgent = async (agentId) => {
    setIsLoading(true);
    try {
      await fetch(`${API_BASE_URL}/complete-all-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });
      await loadDataFromServer();
    } catch (error) {
      console.error('Error completing all tasks for agent:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Unassign Product
  const unassignProduct = async (productId, agentId) => {
    setIsLoading(true);
    try {
      await fetch(`${API_BASE_URL}/unassign-product`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId, agentId }),
      });
      await loadDataFromServer();
    } catch (error) {
      console.error('Error unassigning product:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Unassign Agent Tasks
  const unassignAgentTasks = async (agentId) => {
    setIsLoading(true);
    try {
      await fetch(`${API_BASE_URL}/unassign-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId }),
      });
      await loadDataFromServer();
    } catch (error) {
      console.error('Error unassigning agent tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // Render method (placeholder)
  const renderDashboard = () => {
    // Add your dashboard rendering logic here
    return (
      <div>
        {/* Placeholder content */}
        <h1>Dashboard</h1>
      </div>
    );
  };

  // Main render
  return (
    <div className={`app ${darkMode ? 'dark-mode' : 'light-mode'}`}>
      {isLoading && (
        <div className="loading-overlay">
          <div className="loading-content">
            <div className="spinner-large"></div>
            <p>{loadingMessage}</p>
          </div>
        </div>
      )}
      {error && (
        <div className="error-state">
          <h2>Error Loading Data</h2>
          <p>{error}</p>
          <button onClick={loadDataFromServer} className="retry-button">
            Retry Loading
          </button>
        </div>
      )}
      {renderDashboard()}
    </div>
  );
}

export default App;