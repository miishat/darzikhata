import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './app/App';
import { DarziDb } from './data/db';
import { ShopStore } from './data/store';
import './index.css';

const store = new ShopStore({ db: new DarziDb() });
void store.load();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App store={store} />
    </BrowserRouter>
  </StrictMode>,
);
