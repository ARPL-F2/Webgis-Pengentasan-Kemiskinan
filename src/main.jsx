import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import App from './App.jsx'; 
import Landing from './Landing.jsx'; 
import User from './user.jsx'; 
import './index.css';
import 'leaflet/dist/leaflet.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* Halaman Awal */}
        <Route path="/" element={<Landing />} />
        
        {/* Halaman Dashboard Admin (Menggunakan path /app sesuai Landing.jsx) */}
        <Route path="/app" element={<App />} />
        
        {/* Halaman Peta User */}
        <Route path="/user" element={<User />} />
        
        {/* Fallback ke Landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);