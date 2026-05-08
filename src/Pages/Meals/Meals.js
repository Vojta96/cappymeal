import React, { useState } from 'react';
import './Meals.css';
import MealsList from './MealsList';
import { Tabs, Tab, Box } from '@mui/material';

const TYPE_FILTERS = [
  { key: null,               label: 'Vše' },
  { key: 'breakfast',        label: '☀️ Snídaně' },
  { key: 'snack',            label: '🍎 Svačina' },
  { key: 'lunch',            label: '🍲 Oběd' },
  { key: 'afternoon_snack',  label: '🥪 Odp. svačina' },
  { key: 'dinner',           label: '🌙 Večeře' },
];

const Meals = () => {
  const [filter, setFilter] = useState(null);
  const filtered = filter ? MealsList.filter(m => m.type === filter) : MealsList;

  return (
    <div className="meals-page">
      <Box sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: '#6B4D24', position: 'sticky', top: 0, zIndex: 100 }}>
        <Tabs
          value={filter}
          onChange={(_, v) => setFilter(v)}
          textColor="inherit"
          variant="scrollable"
          scrollButtons="auto"
          sx={{ color: 'wheat' }}
          TabIndicatorProps={{ style: { backgroundColor: 'wheat' } }}
        >
          {TYPE_FILTERS.map(f => (
            <Tab key={String(f.key)} value={f.key} label={f.label} sx={{ color: 'wheat' }} />
          ))}
        </Tabs>
      </Box>

      <div className="meals-grid">
        {filtered.map(meal => (
          <div className="recipe-card" key={meal.id}>
            {meal.image ? (
              <img src={meal.image} alt={meal.name} className="recipe-card-image" />
            ) : (
              <div className="recipe-card-emoji">{meal.emoji}</div>
            )}
            <div className="recipe-card-body">
              <h3 className="recipe-card-name">{meal.name}</h3>
              <p className="recipe-card-prep">{meal.preparation}</p>
              <ul className="recipe-card-ingredients">
                {meal.ingredients.map((ing, i) => (
                  <li key={i}><strong>{ing.amount}</strong> {ing.name}</li>
                ))}
              </ul>
              {meal.instructions && (
                <p className="recipe-card-instructions">{meal.instructions}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Meals;
