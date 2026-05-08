import React, { useState } from 'react';
import {
  Dialog, DialogTitle, DialogContent,
  IconButton, Button,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import MealsList from '../../Meals/MealsList';
import { useWeek } from '../../../context/WeekContext';
import './Day.css';

const SLOTS = [
  { key: 'breakfast', label: 'Snídaně', emoji: '☀️' },
  { key: 'snack', label: 'Svačina', emoji: '🍎' },
  { key: 'lunch', label: 'Oběd', emoji: '🍲' },
  { key: 'afternoon_snack', label: 'Odpolední svačina', emoji: '🥪' },
  { key: 'dinner', label: 'Večeře', emoji: '🌙' },
];

function MealCard({ meal, onClick, onDelete }) {
  return (
    <div className={`day-meal-card${onClick ? ' selectable' : ''}`} onClick={onClick}>
      {meal.image ? (
        <img src={meal.image} alt={meal.name} className="day-meal-image" />
      ) : (
        <div className="day-meal-emoji">{meal.emoji}</div>
      )}
      <div className="day-meal-info">
        <h4>{meal.name}</h4>
        <p className="day-meal-prep">{meal.preparation}</p>
        <ul>
          {meal.ingredients.slice(0, 4).map((ing, i) => (
            <li key={i}>{ing.amount} {ing.name}</li>
          ))}
          {meal.ingredients.length > 4 && <li className="day-meal-more">… a {meal.ingredients.length - 4} další</li>}
        </ul>
      </div>
      {onDelete && (
        <IconButton
          size="small"
          className="day-meal-delete"
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          title="Odebrat jídlo"
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      )}
    </div>
  );
}

function Day({ dayKey }) {
  const { getDay, setMeal, removeMeal } = useWeek();
  const dayPlan = getDay(dayKey);
  const [activeSlot, setActiveSlot] = useState(null);

  const activeSlotDef = SLOTS.find(s => s.key === activeSlot);
  const filteredMeals = activeSlot ? MealsList.filter(m => m.type === activeSlot) : [];

  return (
    <div className="day-container">
      {SLOTS.map(slot => (
        <div key={slot.key} className="day-slot">
          <h3 className="day-slot-title">
            <span className="day-slot-emoji">{slot.emoji}</span> {slot.label}
          </h3>
          {dayPlan[slot.key] ? (
            <MealCard
              meal={dayPlan[slot.key]}
              onDelete={() => removeMeal(dayKey, slot.key)}
            />
          ) : (
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setActiveSlot(slot.key)}
              sx={{
                borderColor: '#c49a6c',
                color: '#6B4D24',
                borderStyle: 'dashed',
                borderRadius: '12px',
                py: 1,
                '&:hover': { borderColor: '#6B4D24', backgroundColor: 'rgba(107,77,36,0.06)' },
              }}
            >
              Přidat {slot.label.toLowerCase()}
            </Button>
          )}
        </div>
      ))}

      <Dialog
        open={Boolean(activeSlot)}
        onClose={() => setActiveSlot(null)}
        maxWidth="md"
        fullWidth
        PaperProps={{ sx: { borderRadius: '16px' } }}
      >
        <DialogTitle sx={{ backgroundColor: '#6B4D24', color: 'wheat', pr: 6 }}>
          {activeSlotDef?.emoji} Vybrat {activeSlotDef?.label.toLowerCase()}
          <IconButton
            onClick={() => setActiveSlot(null)}
            sx={{ position: 'absolute', right: 8, top: 8, color: 'wheat' }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ pt: '16px !important', backgroundColor: '#fdf5ec' }}>
          {filteredMeals.length === 0 ? (
            <p style={{ color: '#888', textAlign: 'center', padding: '24px 0' }}>
              Pro tento typ jídla zatím nejsou žádné recepty.
            </p>
          ) : (
            <div className="day-meal-grid">
              {filteredMeals.map(meal => (
                <MealCard
                  key={meal.id}
                  meal={meal}
                  onClick={() => {
                    setMeal(dayKey, activeSlot, meal);
                    setActiveSlot(null);
                  }}
                />
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default Day;
