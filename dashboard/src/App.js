import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import AppList from './pages/AppList';
import Deploy from './pages/Deploy';
import AppDetail from './pages/AppDetail';

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <Routes>
        <Route path="/" element={<AppList />} />
        <Route path="/deploy" element={<Deploy />} />
        <Route path="/apps/:name" element={<AppDetail />} />
      </Routes>
    </BrowserRouter>
  );
}
