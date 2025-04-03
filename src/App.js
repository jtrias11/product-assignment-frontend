import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

  // Filtered and memoized data
  const filteredAgents = useMemo(() => 
    agents.filter(agent => 
      agent.name.toLowerCase().includes(searchTerm.toLowerCase())
    ), 
    [agents, searchTerm]
  );

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

      if (!prodRes.ok || !agentsRes.ok || !assignRes.ok) {
        throw new Error('Failed to fetch data');
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
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load previously assigned tasks
  const loadPreviouslyAssigned = useCallback(async () => {
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
  }, []);

  // File Upload Handler
  const handleFileUpload = useCallback(async (event) => {
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
  }, [loadDataFromServer]);

  // Initial data load
  useEffect(() => {
    loadDataFromServer();
  }, [loadDataFromServer]);

  // Render main dashboard (placeholder)
  const renderDashboard = () => (
    <div>
      <h1>Product Assignment Dashboard</h1>
      <div>
        <h2>System Status</h2>
        <p>Total Agents: {totalAgents}</p>
        <p>Total Products: {totalProducts}</p>
        <p>Total Assignments: {totalAssignments}</p>
      </div>
    </div>
  );

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