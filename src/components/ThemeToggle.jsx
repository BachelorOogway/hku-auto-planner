import { useState, useEffect } from 'react';
import './ThemeToggle.css';

function ThemeToggle() {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('theme') || 'system';
  });

  useEffect(() => {
    const applyTheme = (selectedTheme) => {
      if (selectedTheme === 'system') {
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        document.documentElement.setAttribute('data-theme', systemPrefersDark ? 'dark' : 'light');
      } else {
        document.documentElement.setAttribute('data-theme', selectedTheme);
      }
    };

    applyTheme(theme);
    localStorage.setItem('theme', theme);

    // Listen for system theme changes when in system mode
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = () => applyTheme('system');
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [theme]);

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
  };

  return (
    <div className="theme-toggle">
      <button
        className={`theme-option ${theme === 'light' ? 'active' : ''}`}
        onClick={() => handleThemeChange('light')}
        title="Light mode"
      >
        ☀️
      </button>
      <button
        className={`theme-option ${theme === 'system' ? 'active' : ''}`}
        onClick={() => handleThemeChange('system')}
        title="System theme"
      >
        💻
      </button>
      <button
        className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
        onClick={() => handleThemeChange('dark')}
        title="Dark mode"
      >
        🌙
      </button>
    </div>
  );
}

export default ThemeToggle;
