import * as React from 'react';
import PropTypes from 'prop-types';
import SwipeableViews from 'react-swipeable-views-react-18-fix';
import { useTheme } from '@mui/material/styles';
import AppBar from '@mui/material/AppBar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Monday from './Days/Monday';

function TabPanel(props) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`full-width-tabpanel-${index}`}
      aria-labelledby={`full-width-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          <Typography>{children}</Typography>
        </Box>
      )}
    </div>
  );
}

TabPanel.propTypes = {
  children: PropTypes.node,
  index: PropTypes.number.isRequired,
  value: PropTypes.number.isRequired,
};

function a11yProps(index) {
  return {
    id: `full-width-tab-${index}`,
    'aria-controls': `full-width-tabpanel-${index}`,
  };
}


const Week = () => {
  const theme = useTheme();

  const [value, setValue] = React.useState(0);

  const handleChange = (event, newValue) => {
    setValue(newValue);
  };

  const handleChangeIndex = (index) => {
    setValue(index);
  };

  return (
    <Box>
      <AppBar position="static">
        <Tabs
          value={value}
          onChange={handleChange}
          indicatorColor= 'white'
          textColor="inherit"
          variant="fullWidth"
          aria-label="full width tabs example"
          sx={{background: '#6B4D24'}}
        >
          <Tab label="Pondělí" {...a11yProps(0)} />
          <Tab label="Úterý" {...a11yProps(1)} />
          <Tab label="Středa" {...a11yProps(2)} />
          <Tab label="Čtvrtek" {...a11yProps(3)} />
          <Tab label="Pátek" {...a11yProps(4)} />
          <Tab label="Sobota" {...a11yProps(5)} />
          <Tab label="Neděle" {...a11yProps(6)} />
        </Tabs>
      </AppBar>
      <SwipeableViews
        index={value}
        onChangeIndex={handleChangeIndex}
      >
        <TabPanel value={value} index={0} dir={theme.direction}>
          <Monday/>
        </TabPanel>
        <TabPanel value={value} index={1} dir={theme.direction}>
          Úterý
        </TabPanel>
        <TabPanel value={value} index={2} dir={theme.direction}>
          Středa
        </TabPanel>
        <TabPanel value={value} index={3} dir={theme.direction}>
          Čtvrtek
        </TabPanel>
        <TabPanel value={value} index={4} dir={theme.direction}>
          Pátek
        </TabPanel>
        <TabPanel value={value} index={5} dir={theme.direction}>
          Sobota
        </TabPanel>
        <TabPanel value={value} index={6} dir={theme.direction}>
          Neděle
        </TabPanel>
      </SwipeableViews>
    </Box>
  );
}

export default Week