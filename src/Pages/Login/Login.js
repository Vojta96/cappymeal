import React, { useState } from 'react'
import './Login.css'

const Login = () => {
  const [formSwitch, setFormSwitch] = useState('login');

  const pozor = () => {
    alert('pozor, pozor')
  }

  const Form = () => {
    switch (formSwitch) {
      case ('login'):
        return (
          <form onSubmit={e => pozor()} className='loginForm'>
            <label for="nickname">Přezdívka:</label>
            <input name='nickname' type='text' />
            <label for="password">Zadejte heslo:</label>
            <input name='password' type='text' />
            <input type='submit' className='loginForm__submit-btn' />
          </form>
        )
        break;
      case ('register'):
        return (
          <form onSubmit={""} className='loginForm'>
            <label for="nickname">Přezdívka:</label>
            <input name='nickname' type='text' />
            <label for="password1">Zadejte heslo:</label>
            <input name='password1' type='text' />

            <label for="password2">Zadejte heslo pro kontolu:</label>
            <input name='password2' type='text' />
            <input type='submit' className='loginForm__submit-btn' />
          </form>
        )
        break;
      default:
        alert('something went wrong')
        break;
    }
  }

  return (
    <div className='form--container'>
      <div>
        <div className='login--switch'>
          <p onClick={e => setFormSwitch('login')}>Login</p>
          <p>  /  </p>
          <p onClick={e => setFormSwitch('register')}>Register</p>
        </div>
        <Form />
      </div>
    </div>
  )
}

export default Login