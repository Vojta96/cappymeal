import * as React from 'react';
import SwipeableViews from 'react-swipeable-views-react-18-fix';
import AppBar from '@mui/material/AppBar';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Box from '@mui/material/Box';
import Day from './Days/Day';
import { useWeek } from '../../context/WeekContext';

const CZECH_DAYS = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];

function generateDays(count = 14) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    const label = `${CZECH_DAYS[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.`;
    return { key, label };
  });
}

const Week = () => {
  const [value, setValue] = React.useState(0);
  const { pruneOldDays } = useWeek();
  const DAYS = React.useMemo(() => generateDays(14), []);

  React.useEffect(() => {
    pruneOldDays?.();
  }, []);

  return (
    <Box>
      <AppBar position="sticky" elevation={0} sx={{ top: 'var(--header-h)' }}>
        <Tabs
          value={value}
          onChange={(_, v) => setValue(v)}
          textColor="inherit"
          variant="scrollable"
          scrollButtons="auto"
          aria-label="plán jídel"
          sx={{ background: '#6B4D24' }}
          TabIndicatorProps={{ style: { backgroundColor: 'wheat' } }}
        >
          {DAYS.map((day, i) => (
            <Tab key={day.key} label={day.label} id={`tab-${i}`} aria-controls={`tabpanel-${i}`} />
          ))}
        </Tabs>
      </AppBar>

      <Box sx={{ maxWidth: 900, mx: 'auto' }}>
        <SwipeableViews index={value} onChangeIndex={setValue}>
          {DAYS.map((day, i) => (
            <div
              key={day.key}
              role="tabpanel"
              hidden={value !== i}
              id={`tabpanel-${i}`}
              aria-labelledby={`tab-${i}`}
            >
              {value === i && <Day dayKey={day.key} />}
            </div>
          ))}
        </SwipeableViews>
      </Box>
    </Box>
  );
};

export default Week;
