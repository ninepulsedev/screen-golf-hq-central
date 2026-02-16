import React, { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon } from '@heroicons/react/24/outline';

interface Country {
  code: string;
  name: string;
  aliases?: string[];
}

interface CountrySelectorProps {
  value: string;
  onChange: (countryCode: string) => void;
  placeholder?: string;
}

const countries: Country[] = [
  { code: 'ALL', name: 'All Countries', aliases: ['all', '전체'] },
  { code: 'KR', name: 'South Korea', aliases: ['korea', 'south korea', '대한민국', '한국'] },
  { code: 'KP', name: 'North Korea', aliases: ['north korea', '북한'] },
  { code: 'US', name: 'United States', aliases: ['usa', 'america', 'united states of america', '미국'] },
  { code: 'JP', name: 'Japan', aliases: ['japan', '일본'] },
  { code: 'CN', name: 'China', aliases: ['china', '중국'] },
  { code: 'GB', name: 'United Kingdom', aliases: ['uk', 'britain', 'england', '영국'] },
  { code: 'DE', name: 'Germany', aliases: ['deutschland', '독일'] },
  { code: 'FR', name: 'France', aliases: ['france', '프랑스'] },
  { code: 'IT', name: 'Italy', aliases: ['italy', '이탈리아'] },
  { code: 'ES', name: 'Spain', aliases: ['spain', '에스파냐'] },
  { code: 'NL', name: 'Netherlands', aliases: ['holland', 'nederland', '네덜란드'] },
];

const CountrySelector: React.FC<CountrySelectorProps> = ({
  value,
  onChange,
  placeholder = "Search country..."
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCountries, setFilteredCountries] = useState<Country[]>(countries);
  const [selectedCountry, setSelectedCountry] = useState<Country | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // 현재 선택된 국가 찾기
    const current = countries.find(c => c.code === value);
    setSelectedCountry(current || null);
    setSearchTerm(current?.name || '');
  }, [value]);

  useEffect(() => {
    // 검색어로 국가 필터링
    if (!searchTerm) {
      setFilteredCountries(countries);
    } else {
      const filtered = countries.filter(country => {
        const searchLower = searchTerm.toLowerCase();
        const nameMatch = country.name.toLowerCase().includes(searchLower);
        const codeMatch = country.code.toLowerCase().includes(searchLower);
        const aliasMatch = country.aliases?.some(alias =>
          alias.toLowerCase().includes(searchLower)
        );

        return nameMatch || codeMatch || aliasMatch;
      });
      setFilteredCountries(filtered);
    }
  }, [searchTerm]);

  useEffect(() => {
    // 외부 클릭 시 드롭다운 닫기
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  const handleSelect = (country: Country) => {
    setSelectedCountry(country);
    setSearchTerm(country.name);
    onChange(country.code);
    setIsOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    if (!isOpen) {
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
  };

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <input
          type="text"
          value={searchTerm}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="w-full bg-gray-700 text-white px-3 py-2 pr-10 rounded border border-gray-600 focus:border-cyan-500 focus:outline-none text-sm"
        />
        <button
          onClick={handleToggle}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white focus:outline-none"
        >
          <ChevronDownIcon className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-10 w-full mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {filteredCountries.length === 0 ? (
            <div className="px-3 py-2 text-gray-400 text-sm">
              No countries found
            </div>
          ) : (
            filteredCountries.map((country) => (
              <div
                key={country.code}
                onClick={() => handleSelect(country)}
                className={`px-3 py-2 cursor-pointer text-sm transition-colors ${selectedCountry?.code === country.code
                  ? 'bg-cyan-600/20 text-cyan-400'
                  : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
              >
                <div className="font-medium">{country.name}</div>
                <div className="text-xs text-gray-400">{country.code}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default CountrySelector;
