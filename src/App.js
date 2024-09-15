import logo from './Images/Cappy.png';
import './App.css';
import Week from './Pages/Week/Week';
import Home from './Pages/Home/Home';
import { Box } from '@mui/material';
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import Login from './Pages/Login/Login';
import NoPage from './Pages/NoPage';
function App() {
  return (<BrowserRouter>
    <div className="App">
      <header className="App-header">
        <Link to="/">
          <img src={logo} className="App-logo" alt="logo" />
          CappyMeal
        </Link>
        <Link to="/login">
          <button>Přihlásit se</button>
        </Link>
      </header>
      <Box className='App-body'>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/week" index element={<Week />} />
          <Route path="/login" index element={<Login />} />
          <Route path="/nopage" index element={<NoPage />} />
        </Routes>
      </Box>
    </div>
  </BrowserRouter>
  );
}

export default App;
