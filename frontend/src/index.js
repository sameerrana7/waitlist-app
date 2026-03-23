import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Google Fonts
const link = document.createElement('link');
link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&family=Outfit:wght@300;400;500;600&display=swap';
link.rel = 'stylesheet';
document.head.appendChild(link);

// Global reset
const style = document.createElement('style');
style.textContent = `* { margin: 0; padding: 0; box-sizing: border-box; } body { font-family: 'Outfit', sans-serif; }`;
document.head.appendChild(style);

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);
