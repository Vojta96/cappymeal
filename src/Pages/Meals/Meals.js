import React, { useState } from 'react';
import './Meals.css'
import MealsList from './MealsList';


const Meals = () => {
  const [meals] = useState(MealsList)

  return (
    <div className='Meals'>
      {meals.map(meal => {
        return (
          <div className='meal'>
            <img src={meal.image} alt='meal-image' />
            <h3 className='meal-name'>
              {meal.name}
            </h3>
            <ul className='meal-ingredients'>
              {meal.ingredients.map(ingredient => {
                return (
                  <li className='meal-ingredient'>
                    {ingredient}
                  </li>
                )
              })}
            </ul>
          </div>
        )
      })}
    </div>
  )
}

export default Meals