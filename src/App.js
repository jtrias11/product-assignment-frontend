// app.js
import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

// Configure API Base URL dynamically
const getApiBaseUrl = () => {
  // Use environment variable if set, otherwise use the deployed backend URL
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
  
  // Load data from the backend
  const loadDataFromServer = useCallback(async () => {
    setIsLoading(true);
    setLoadingMessage('Loading data from server...');
    
    try {
      const productsResponse = await fetch(`${API_BASE_URL}/products`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!productsResponse.ok) {
        const errorText = await productsResponse.text();
        throw new Error(`Failed to load products: ${errorText}`);
      }
      const productsData = await productsResponse.json();
      setProducts(productsData);
      
      const agentsResponse = await fetch(`${API_BASE_URL}/agents`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!agentsResponse.ok) {
        const errorText = await agentsResponse.text();
        throw new Error(`Failed to load agents: ${errorText}`);
      }
      const agentsData = await agentsResponse.json();
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
    }
  }, []);
  
  useEffect(() => {
    loadDataFromServer();
  }, [loadDataFromServer]);
  
  // Refresh data handler: call backend refresh endpoint
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

  // (Other functions for assigning tasks, completing tasks, unassigning remain unchanged)
  // For brevity, only the refresh and data loading parts are shown.
  
  // Render UI components
  const renderDashboard = () => {
    return (
      <div className="dashboard">
        {/* Dashboard content, agent list, refresh button, etc. */}
        <button onClick={handleRefreshData} disabled={isLoading}>
          {isLoading ? "Refreshing..." : "Refresh Data"}
        </button>
        {/* Render agents, assignments, etc. */}
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
