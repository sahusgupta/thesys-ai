import React from 'react';
import {createRoot} from 'react-dom/client'
import { StrictMode } from 'react';
import App from './App';
import './styles/tailwind.css';
import 'bootstrap/dist/css/bootstrap.min.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
