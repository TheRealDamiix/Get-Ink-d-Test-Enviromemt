import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import HomePage from '@/pages/HomePage';
import ArtistProfile from '@/pages/ArtistProfile';
import ArtistDashboard from '@/pages/ArtistDashboard';
import ClientDashboard from '@/pages/ClientDashboard';
import AuthPage from '@/pages/AuthPage';
import SearchResultsPage from '@/pages/SearchResultsPage'; // Import the new component

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="min-h-screen bg-background">
          <Navbar />
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/artist/:username" element={<ArtistProfile />} />
            <Route path="/artist-dashboard" element={<ArtistDashboard />} />
            <Route path="/client-dashboard" element={<ClientDashboard />} />
            <Route path="/search-results" element={<SearchResultsPage />} /> {/* New route */}
          </Routes>
          <Toaster />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
