import './App.css';
import { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { getDataSet } from './redux/DataSetSlice';
import ScatterplotContainer from './components/scatterplot/ScatterplotContainer';
import HierarchyContainer from './components/hierarchy/HierarchyContainer';

function App() {
  const dispatch = useDispatch();
  const visData  = useSelector(state => state.dataSet);
  const [theme, setTheme] = useState('light');

  useEffect(() => { dispatch(getDataSet()); }, [dispatch]);

  // Apply theme to the document root so CSS variables and [data-theme] selectors work globally
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === 'light' ? 'dark' : 'light');

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      background: 'var(--bg)',
      color: 'var(--text)',
      transition: 'background 0.25s, color 0.25s',
    }}>

      {/* ── Compact header ── */}
      <div style={{
        padding: '5px 14px',
        borderBottom: '1px solid var(--border)',
        flexShrink: 0,
        display: 'flex',
        alignItems: 'center',
        gap: 16,
      }}>
        <strong style={{ fontSize: '0.95rem' }}>US Criminality Dataset Explorer</strong>
        <span style={{ fontSize: '0.8rem', color: 'var(--muted)', flex: 1 }}>
          Brush the scatterplot to highlight communities · hover any node to cross-highlight
        </span>

        {/* Theme toggle */}
        <label className="theme-switch">
          <span>{theme === 'light' ? '☀️' : '🌙'}</span>
          <input type="checkbox" checked={theme === 'dark'} onChange={toggleTheme} />
          <span className="switch-track" />
          <span style={{ color: 'var(--muted)', fontSize: '0.78rem' }}>
            {theme === 'dark' ? 'Dark' : 'Light'}
          </span>
        </label>
      </div>

      {visData.length === 0 ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flexGrow: 1, color: 'var(--muted)' }}>
          Loading data…
        </div>
      ) : (
        <div style={{ display: 'flex', flexGrow: 1, overflow: 'hidden' }}>

          {/* Left: scatterplot */}
          <div style={{
            width: '50%',
            display: 'flex',
            flexDirection: 'column',
            padding: '8px 8px 8px 12px',
            borderRight: '1px solid var(--border)',
          }}>
            <div style={{ flexShrink: 0, marginBottom: 4, fontSize: '0.88rem', fontWeight: 600 }}>
              Median Income vs Violent Crimes
            </div>
            <div style={{ flexGrow: 1, position: 'relative', minHeight: 0 }}>
              <ScatterplotContainer
                xAttributeName="medIncome"
                yAttributeName="ViolentCrimesPerPop"
                theme={theme}
              />
            </div>
          </div>

          {/* Right: hierarchy */}
          <div style={{
            width: '50%',
            display: 'flex',
            flexDirection: 'column',
            padding: '8px 12px 8px 8px',
          }}>
            <div style={{ flexShrink: 0, marginBottom: 4, fontSize: '0.88rem', fontWeight: 600 }}>
              Communities by State
            </div>
            <div style={{ flexGrow: 1, position: 'relative', minHeight: 0 }}>
              <HierarchyContainer
                valueAttribute="population"
                colorAttribute="ViolentCrimesPerPop"
                theme={theme}
              />
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

export default App;
