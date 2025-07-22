import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import axios from 'axios';

// Components
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Profile from './pages/Profile';
import Messages from './pages/Messages';
import Reels from './pages/Reels';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Calls from './pages/Calls';
import Friends from './pages/Friends';
import Notifications from './pages/Notifications';

// Theme
const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
    secondary: {
      main: '#dc004e',
    },
    background: {
      default: '#f5f5f5',
      paper: '#ffffff',
    },
  },
});

// Axios configuration
axios.defaults.baseURL = 'http://localhost:5000/api';
axios.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get('/user')
        .then(res => {
          setUser(res.data);
        })
        .catch(() => {
          localStorage.removeItem('token');
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <Navbar user={user} setUser={setUser} />
        <Routes>
          <Route path="/" element={user ? <Home user={user} /> : <Navigate to="/login" />} />
          <Route path="/profile" element={user ? <Profile user={user} /> : <Navigate to="/login" />} />
          <Route path="/messages" element={user ? <Messages user={user} /> : <Navigate to="/login" />} />
          <Route path="/reels" element={user ? <Reels user={user} /> : <Navigate to="/login" />} />
          <Route path="/calls" element={user ? <Calls user={user} /> : <Navigate to="/login" />} />
          <Route path="/friends" element={user ? <Friends user={user} /> : <Navigate to="/login" />} />
          <Route path="/notifications" element={user ? <Notifications user={user} /> : <Navigate to="/login" />} />
          <Route path="/login" element={!user ? <Login setUser={setUser} /> : <Navigate to="/" />} />
          <Route path="/signup" element={!user ? <Signup setUser={setUser} /> : <Navigate to="/" />} />
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
