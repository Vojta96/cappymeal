import React, { useState } from 'react';
import { Checkbox, FormControlLabel, Divider, Chip, Paper, Button } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep';
import { useWeek } from '../../context/WeekContext';
import { Link } from 'react-router-dom';
import './ShopList.css';

const CZECH_DAYS_SHORT = ['Ne', 'Po', 'Út', 'St', 'Čt', 'Pá', 'So'];
const formatDayKey = (key) => {
  const d = new Date(key + 'T12:00:00');
  return `${CZECH_DAYS_SHORT[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.`;
};

const SLOT_LABELS = {
  breakfast:        'Snídaně',
  snack:            'Svačina',
  lunch:            'Oběd',
  afternoon_snack:  'Odp. svačina',
  dinner:           'Večeře',
};

const FRACTIONS = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };
const SKIP_PATTERN = /dle chuti|dle chutě|pár kapek/i;

function formatNum(n) {
  if (n === Math.floor(n)) return String(n);
  const whole = Math.floor(n);
  const frac = Math.round((n - whole) * 8) / 8;
  const fracStr = frac === 0.5 ? '½' : frac === 0.25 ? '¼' : frac === 0.75 ? '¾' : n.toFixed(1).replace('.', ',');
  return whole > 0 ? `${whole}${fracStr}` : fracStr;
}

function getTotalAmount(entries) {
  const unitTotals = {};

  for (const { amount } of entries) {
    const raw = amount.trim();
    if (SKIP_PATTERN.test(raw)) continue;

    let num = 0;
    let rest = raw;

    for (const [frac, val] of Object.entries(FRACTIONS)) {
      if (rest.includes(frac)) {
        num += val;
        rest = rest.replace(frac, '').trim();
      }
    }

    const numMatch = rest.match(/^([\d.,]+)\s*/);
    if (numMatch) {
      num += parseFloat(numMatch[1].replace(',', '.'));
      rest = rest.slice(numMatch[0].length).trim();
    }

    const unit = rest.toLowerCase() || 'ks';
    unitTotals[unit] = (unitTotals[unit] || 0) + (num || 1);
  }

  const parts = Object.entries(unitTotals).map(([unit, total]) => `${formatNum(total)} ${unit}`);
  return parts.length > 0 ? parts.join(' + ') : null;
}

const ShopList = () => {
  const { weekPlan } = useWeek();
  const [checked, setChecked] = useState({});

  const ingredientMap = {};
  Object.entries(weekPlan).forEach(([day, slots]) => {
    Object.entries(slots).forEach(([slot, meal]) => {
      if (!meal) return;
      meal.ingredients.forEach(ing => {
        const key = ing.name.toLowerCase().trim();
        if (!ingredientMap[key]) {
          ingredientMap[key] = { name: ing.name, entries: [] };
        }
        ingredientMap[key].entries.push({
          amount: ing.amount,
          day: formatDayKey(day),
          slot: SLOT_LABELS[slot],
          mealName: meal.name,
        });
      });
    });
  });

  const ingredients = Object.entries(ingredientMap)
    .map(([key, val]) => ({ key, ...val }))
    .sort((a, b) => a.name.localeCompare(b.name, 'cs'));

  const plannedCount = Object.values(weekPlan)
    .flatMap(Object.values)
    .filter(Boolean).length;

  const checkedCount = ingredients.filter(i => checked[i.key]).length;

  const toggle = key => setChecked(prev => ({ ...prev, [key]: !prev[key] }));
  const clearChecked = () => setChecked({});

  if (plannedCount === 0) {
    return (
      <div className="shoplist-empty">
        <ShoppingCartIcon sx={{ fontSize: 90, color: '#c49a6c', mb: 2 }} />
        <h2>Nákupní seznam je prázdný</h2>
        <p>Nejprve si naplánujte jídla v sekci <Link to="/week" className="shoplist-link">Týden</Link>.</p>
      </div>
    );
  }

  return (
    <div className="shoplist-container">
      <div className="shoplist-header">
        <div>
          <h1 className="shoplist-title">
            <ShoppingCartIcon sx={{ verticalAlign: 'middle', mr: 1 }} />
            Nákupní seznam
          </h1>
          <p className="shoplist-subtitle">
            {plannedCount} jídel · {ingredients.length} položek
            {checkedCount > 0 && ` · ${checkedCount} zakoupeno`}
          </p>
        </div>
        {checkedCount > 0 && (
          <Button
            variant="outlined"
            size="small"
            startIcon={<DeleteSweepIcon />}
            onClick={clearChecked}
            sx={{ borderColor: '#c49a6c', color: '#6B4D24', alignSelf: 'flex-start' }}
          >
            Odškrtnout vše
          </Button>
        )}
      </div>

      <Paper className="shoplist-paper" elevation={2}>
        {ingredients.map((item, idx) => {
          const total = getTotalAmount(item.entries);
          return (
            <div key={item.key}>
              {idx > 0 && <Divider />}
              <div className={`shoplist-item${checked[item.key] ? ' checked' : ''}`}>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={!!checked[item.key]}
                      onChange={() => toggle(item.key)}
                      sx={{ color: '#c49a6c', '&.Mui-checked': { color: '#6B4D24' } }}
                    />
                  }
                  label={
                    <span className="shoplist-item-label">
                      <span className="shoplist-item-name-row">
                        <span className="shoplist-item-name">{item.name}</span>
                        {total && (
                          <span className="shoplist-item-total">celkem {total}</span>
                        )}
                      </span>
                      <span className="shoplist-chips">
                        {item.entries.map((e, i) => (
                          <Chip
                            key={i}
                            label={`${e.amount} — ${e.day}`}
                            size="small"
                            title={`${e.mealName} (${e.slot})`}
                            className="shoplist-chip"
                          />
                        ))}
                      </span>
                    </span>
                  }
                  sx={{ width: '100%', m: 0, py: 0.75, alignItems: 'flex-start' }}
                />
              </div>
            </div>
          );
        })}
      </Paper>
    </div>
  );
};

export default ShopList;
