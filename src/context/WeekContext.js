import React, { createContext, useContext, useReducer, useEffect, useRef } from 'react';
import { db } from '../firebase';
import { ref, onValue, set } from 'firebase/database';
import { useAuth } from './AuthContext';

const MEAL_SLOTS = ['breakfast', 'snack', 'lunch', 'afternoon_snack', 'dinner'];

export const makeEmptyDay = () => MEAL_SLOTS.reduce((acc, slot) => ({ ...acc, [slot]: null }), {});

function reducer(state, action) {
  switch (action.type) {
    case 'SET_MEAL': {
      const day = state[action.day] || makeEmptyDay();
      return { ...state, [action.day]: { ...day, [action.slot]: action.meal } };
    }
    case 'REMOVE_MEAL': {
      const day = state[action.day] || makeEmptyDay();
      return { ...state, [action.day]: { ...day, [action.slot]: null } };
    }
    case 'LOAD':
      return action.data;
    default:
      return state;
  }
}

const WeekContext = createContext(null);

export function WeekProvider({ children }) {
  const { user } = useAuth();
  const [weekPlan, dispatch] = useReducer(reducer, {});
  const skipNextWrite = useRef(false);
  const initialLoad = useRef(false);

  useEffect(() => {
    if (!user) {
      dispatch({ type: 'LOAD', data: {} });
      initialLoad.current = false;
      return;
    }

    initialLoad.current = false;
    const planRef = ref(db, `users/${user.uid}/weekPlan`);

    const unsub = onValue(planRef, (snapshot) => {
      const data = snapshot.val() ?? {};
      skipNextWrite.current = true;
      dispatch({ type: 'LOAD', data });
      initialLoad.current = true;
    });
    return () => unsub();
  }, [user?.uid]);

  useEffect(() => {
    if (!user || !initialLoad.current) return;
    if (skipNextWrite.current) {
      skipNextWrite.current = false;
      return;
    }
    set(ref(db, `users/${user.uid}/weekPlan`), weekPlan);
  }, [weekPlan]);

  const getDay = (dateKey) => weekPlan[dateKey] || makeEmptyDay();
  const setMeal = (day, slot, meal) => dispatch({ type: 'SET_MEAL', day, slot, meal });
  const removeMeal = (day, slot) => dispatch({ type: 'REMOVE_MEAL', day, slot });

  return (
    <WeekContext.Provider value={{ weekPlan, getDay, setMeal, removeMeal }}>
      {children}
    </WeekContext.Provider>
  );
}

export const useWeek = () => useContext(WeekContext);
