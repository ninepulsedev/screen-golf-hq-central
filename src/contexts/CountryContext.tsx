import React, { createContext, useContext, useState, ReactNode } from 'react';

interface CountryContextType {
  selectedCountry: string;
  setSelectedCountry: (country: string) => void;
}

const CountryContext = createContext<CountryContextType | undefined>(undefined);

export const useCountry = () => {
  const context = useContext(CountryContext);
  if (!context) {
    throw new Error('useCountry must be used within a CountryProvider');
  }
  return context;
};

interface CountryProviderProps {
  children: ReactNode;
}

export const CountryProvider: React.FC<CountryProviderProps> = ({ children }) => {
  const [selectedCountry, setSelectedCountry] = useState<string>('ALL');

  return (
    <CountryContext.Provider value={{ selectedCountry, setSelectedCountry }}>
      {children}
    </CountryContext.Provider>
  );
};
