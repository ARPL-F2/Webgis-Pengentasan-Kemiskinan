import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App.jsx'; // This will become your main dashboard
import Landing from './Landing.jsx'; // Make sure this path is correct
import User from './user.jsx'; // 1. IMPORT YOUR NEW FILE HERE
import './index.css';
import 'leaflet/dist/leaflet.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Set Landing as the default route ("/") */}
        <Route path="/" element={<Landing />} />
        {/* Set App as the route for "/app" */}
        <Route path="/app" element={<App />} />
        {/* Optional: Redirect any unknown path to login */}
        <Route path="/user" element={<User />} />
        {/* 2. ADD THIS ROUTE */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
);