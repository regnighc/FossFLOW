import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import './styles.css';
import { supportedLanguages } from '../../i18n';

const LANG_CODES: Record<string, string> = {
  'en-US': 'ENG', 'zh-CN': 'ZHO', 'es-ES': 'ESP', 'pt-BR': 'POR',
  'fr-FR': 'FRA', 'hi-IN': 'HIN', 'bn-BD': 'BEN', 'ru-RU': 'RUS',
  'pl-PL': 'POL', 'it-IT': 'ITA', 'id-ID': 'IND', 'de-DE': 'DEU',
  'tr-TR': 'TUR'
};

const ChangeLanguage = () => {
  const { i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [currentLang, setCurrentLang] = useState(i18n.language || 'en-US');
  const dropdownRef = useRef<HTMLDivElement>(null);

  const changeLanguage = (lang: string) => {
    i18n.changeLanguage(lang);
    setCurrentLang(lang);
    setIsOpen(false);
    localStorage.setItem('i18nextLng', lang);
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayCode = LANG_CODES[currentLang] || currentLang.slice(0, 3).toUpperCase();

  return (
    <div className="language-selector" ref={dropdownRef}>
      <div
        className="language-display"
        onMouseEnter={() => setIsOpen(true)}
        onClick={() => setIsOpen(o => !o)}
      >
        {displayCode}
      </div>
      {isOpen && (
        <div className="language-dropdown">
          {supportedLanguages.map(item => (
            <div
              key={item.value}
              className={`language-option ${currentLang === item.value ? 'active' : ''}`}
              onClick={() => changeLanguage(item.value)}
            >
              {item.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ChangeLanguage;
