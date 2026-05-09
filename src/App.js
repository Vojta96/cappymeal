import logo from './Images/Cappy.png';
import './App.css';
import Week from './Pages/Week/Week';
import Home from './Pages/Home/Home';
import Meals from './Pages/Meals/Meals';
import ShopList from './Pages/ShopList/ShopList';
import Login from './Pages/Login/Login';
import NoPage from './Pages/NoPage';
import PreferencesModal from './components/PreferencesModal';
import { Box, CircularProgress } from '@mui/material';
import { BrowserRouter, Routes, Route, Link, Navigate } from 'react-router-dom';
import { WeekProvider } from './context/WeekContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PreferencesProvider, usePreferences } from './context/PreferencesContext';

function AppContent() {
  const { user, loading, logout } = useAuth();
  const { preferences, prefsLoaded } = usePreferences();

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <div className="App">
      <header className="App-header">
        <Link to="/">
          <img src={logo} className="App-logo" alt="logo" />
          CappyMeal
        </Link>
        {user ? (
          <button onClick={logout}>Odhlásit se</button>
        ) : (
          <Link to="/login">
            <button>Přihlásit se</button>
          </Link>
        )}
      </header>
      <PreferencesModal open={!!user && prefsLoaded && preferences === null} />
      <Box className="App-body">
        <Routes>
          {!user ? (
            <>
              <Route path="/login" element={<Login />} />
              <Route path="*" element={<Navigate to="/login" replace />} />
            </>
          ) : (
            <>
              <Route path="/" element={<Home />} />
              <Route path="/week" element={<Week />} />
              <Route path="/recipes" element={<Meals />} />
              <Route path="/shoplist" element={<ShopList />} />
              <Route path="/login" element={<Navigate to="/" replace />} />
              <Route path="*" element={<NoPage />} />
            </>
          )}
        </Routes>
      </Box>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <WeekProvider>
          <PreferencesProvider>
            <AppContent />
          </PreferencesProvider>
        </WeekProvider>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
