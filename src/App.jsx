import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from '@/components/ui/toaster';
import { AuthProvider } from '@/contexts/AuthContext';
import Navbar from '@/components/Navbar';
import HomePage from '@/pages/HomePage';
import SearchResultsPage from '@/pages/SearchResultsPage';
import ArtistProfile from '@/pages/ArtistProfile';
import ArtistDashboard from '@/pages/ArtistDashboard';
import ClientDashboard from '@/pages/ClientDashboard';
import AuthPage from '@/pages/AuthPage';
import ChatPage from '@/pages/ChatPage';
import UserProfilePage from '@/pages/UserProfilePage';
import NewsFeedPage from '@/pages/NewsFeedPage'; 

function App() {
  return (
    <AuthProvider>
      <Router>
        {/* Updated for full-height flexible layout */}
        <div className="h-screen flex flex-col bg-background text-foreground">
          <Navbar />
          {/* The main content area is now scrollable */}
          <main className="flex-1 overflow-y-auto custom-scrollbar">
            <Routes>
              <Route path="/" element={<HomePage />} />
              <Route path="/feed" element={<NewsFeedPage />} />
              <Route path="/search" element={<SearchResultsPage />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/artist/:username" element={<ArtistProfile />} />
              <Route path="/user/:username" element={<UserProfilePage />} /> 
              <Route path="/artist-dashboard" element={<ArtistDashboard />} />
              <Route path="/client-dashboard" element={<ClientDashboard />} />
              <Route path="/chat" element={<ChatPage />} />
            </Routes>
          </main>
          <Toaster />
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
