import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider } from 'react-router';
import { App } from './app/App';
import { DarziDb } from './data/db';
import { ShopStore } from './data/store';
import './index.css';

const store = new ShopStore({ db: new DarziDb() });
void store.load();

// A data router, so screens with unsaved changes can block navigation. App keeps its own <Routes>.
const router = createBrowserRouter([{ path: '*', element: <App store={store} /> }]);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
);
