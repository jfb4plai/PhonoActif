import React, { useEffect, useState } from 'react';
import { lireAdresse } from './route.js';

export default function App() {
  const [adresse, setAdresse] = useState(() => lireAdresse(window.location.hash));
  useEffect(() => {
    const surChangement = () => setAdresse(lireAdresse(window.location.hash));
    window.addEventListener('hashchange', surChangement);
    return () => window.removeEventListener('hashchange', surChangement);
  }, []);
  return (
    <main>
      <h1>PhonoActif</h1>
      <p>Écran : {adresse.ecran}</p>
    </main>
  );
}
