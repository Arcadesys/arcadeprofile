'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface CosmosContextType {
  cosmosTime: number;
  setCosmosTime: (t: number) => void;
}

const CosmosContext = createContext<CosmosContextType>({
  cosmosTime: 0,
  setCosmosTime: () => {},
});

export function useCosmosTime() {
  return useContext(CosmosContext);
}

export function CosmosProvider({ children }: { children: ReactNode }) {
  const [cosmosTime, setCosmosTimeState] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem('cosmos-time');
    if (saved !== null) setCosmosTimeState(parseFloat(saved));
  }, []);

  const setCosmosTime = (t: number) => {
    const clamped = Math.max(0, Math.min(1, t));
    setCosmosTimeState(clamped);
    localStorage.setItem('cosmos-time', String(clamped));
  };

  return (
    <CosmosContext.Provider value={{ cosmosTime, setCosmosTime }}>
      {children}
    </CosmosContext.Provider>
  );
}
