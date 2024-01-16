import React from 'react'
import pancakes from './Images/pancakes.png';
import soup from './Images/soup.png';

const MealsList = () => [{
    name: "Zeleninová polévka s kuřecím masem",
    image: soup,
    ingredients: [
      "Půl kuřecích prsou",
      "Kus celeru",
      "2 petržele",
      "2 mrkve",
      "Cibule",
      "Česnek",
      "Sůl, pepř"
    ],
    instructions: "Uvařte maso v osolené vodě s cibulí, česnekem. Před koncem varu nastrouhejte do hrnce kořenovou zeleninu, aby změkla. Posypte na konci petrželí.",
    type: "Soup",
    preparation: "Cooking",
  },
  {
    name: "Palačinky z banánů a bílků",
    image: pancakes,
    ingredients: [
      "3 vaječné bílky (90 ml bílkové směsi)",
      "1 polévková lžíce ořechového másla (nemusí být)",
      "½ banánu nebo malý banán",
      "Špetka skořice",
      "Sprej na vaření bez tuku a kvalitní teflonová pánev",
    ],
    instructions: "Rozmixujeme a upečeme na pánvi.",
    type: "breakfast",
    preparation: "Frying",
  }]

  export default MealsList