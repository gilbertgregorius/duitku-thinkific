import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Container } from '@mui/material';
import Header from './components/Header';
import Dashboard from './pages/Dashboard';
import Installation from './pages/Installation';
import Orders from './pages/Orders';
import Enrollments from './pages/Enrollments';
import Settings from './pages/Settings';
import NotFound from './pages/NotFound';

function App() {
  return (
    <div className="App">
      <Header />
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/install" element={<Installation />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/enrollments" element={<Enrollments />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Container>
    </div>
  );
}

export default App;
