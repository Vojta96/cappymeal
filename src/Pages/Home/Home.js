import React from 'react'
import './Home.css'
import { Link } from 'react-router-dom'

const Home = () => {
    return (
        <div className='home-page'>
            <Link className='section recipes' to='/recipes'>
                <h2>Recepty</h2>
            </Link>
            <Link className='section week' to='/week'>
                <h2>Týden</h2>
            </Link>
            <Link className='section shopping-list' to='/shoplist'>
                <h2>Nákupní seznam</h2>
            </Link>
        </div>
    )
}

export default Home
