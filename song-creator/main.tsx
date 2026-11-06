import React from 'react';
import { createRoot } from 'react-dom/client';
import SongCreator from './SongCreator';
import './styles.css';

createRoot(document.getElementById('root')!).render(<SongCreator />);
