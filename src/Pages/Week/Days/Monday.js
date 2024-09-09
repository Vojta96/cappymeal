import React, { useState } from 'react'
import { Button } from '@mui/material'
import MealsList from '../../Meals/MealsList'
import Plus from '../../../Images/Plus.png'
import './Days.css'

const Monday = () => {
	const [mealsList] = useState(MealsList)
	const [breakfast, setBreakFast] = useState()
	const [backdropClass, setBackdropClass] = useState()
	const [breakfastButton, setBreakfastButton] = useState('flex')
	const [menuClass, setMenuClass] = useState('hidden')

	const hideMenu = () => {
		setBackdropClass("hidden")
		setMenuClass("hidden")
	}

	const showMenu = () => {
		setBackdropClass("backdrop")
		setMenuClass("meal")
	}

	const deleteMeal = () => {
		setBreakFast()
		setBreakfastButton("flex")
	}

	const chooseMeal = e => {
		switch (e.type) {
			case 'breakfast': {
				setBreakFast(e)
				console.log(Breakfast)
			} break;
			case 'Soup': {
				setBreakFast(e)
				console.log(Breakfast)
			} break;
			default: { console.log("nada") }
		}
		setBackdropClass("hidden")
		setMenuClass("hidden")
		setBreakfastButton("none")
	}

	const Breakfast = () => {
		if (breakfast)
			return (
				<div className='meal'>
					<img src={breakfast.image} alt='meal-image' />
					<h3 className='meal-name'>
						{breakfast.name}
					</h3>
					<ul className='meal-ingredients'>
						{breakfast.ingredients.map(ingredient => {
							return (
								<li className='meal-ingredient'>
									{ingredient}
								</li>
							)
						})}
					</ul>
					<Button type='error' onClick={deleteMeal}>Delete</Button>
				</div>
			)
	}

	return (
		<div>
			{mealsList.filter(meal => meal.type === "breakfast" || meal.type === "Soup").map(meal => {
				return (
					<div key={meal.id} className={menuClass} onClick={(e) => chooseMeal(meal)}>
						<img src={meal.image} alt='mealc' />
						<h4 className='meal-name'>
							{meal.name}
						</h4>
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
			<div className={backdropClass} onClick={hideMenu} />
			<h3 className='meal-type'>Snídaně</h3>
			<Button onClick={showMenu} variant='outlined' sx={{ m: 'auto', display: breakfastButton, flexDirection: "column" }}>
				<img src={Plus} alt='plus sign' width="150vmin" />
				Přidej snídani
			</Button>
			<Breakfast />
			<h3 className='meal-type'>Svačina</h3>
			<Button variant='outlined' sx={{ m: 'auto', display: "flex", flexDirection: "column" }}>
				<img src={Plus} alt='plus sign' width="150vmin" />
				Přidej svačinu
			</Button>
			<h3 className='meal-type'>Oběd</h3>
			<Button variant='outlined' sx={{ m: 'auto', display: "flex", flexDirection: "column" }}>
				<img src={Plus} alt='plus sign' width="150vmin" />
				Přidej oběd
			</Button>
			<h3 className='meal-type'>Odpolední svačina</h3>
			<Button variant='outlined' sx={{ m: 'auto', display: "flex", flexDirection: "column" }}>
				<img src={Plus} alt='plus sign' width="150vmin" />
				Přidej odpolední svačinu
			</Button>
			<h3 className='meal-type'>Večeře</h3>
			<Button variant='outlined' sx={{ m: 'auto', display: "flex", flexDirection: "column" }}>
				<img src={Plus} alt='plus sign' width="150vmin" />
				Přidej večeři
			</Button>
		</div>
	)
}

export default Monday