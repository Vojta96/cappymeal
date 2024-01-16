import logo from './Images/Cappy.png';
import './App.css';
import Meals from './Pages/Meals/Meals';
import Week from './Pages/Week/Week';
import { Box } from '@mui/material';

function App() {
  return (
    <div className="App">
      <header className="App-header">
        <img src={logo} className="App-logo" alt="logo" />
          CappyMeal
      </header>
      <Box className='App-body'>
          <Week/>
      </Box>
    </div>
  );
}

export default App;
