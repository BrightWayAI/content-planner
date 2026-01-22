import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StoreProvider } from './store/StoreContext';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { Calendar } from './pages/Calendar';
import { ContentEditor } from './pages/ContentEditor';
import { Library } from './pages/Library';
import { Metrics } from './pages/Metrics';
import { WeeklyPlan } from './pages/WeeklyPlan';
import { Settings } from './pages/Settings';

function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="calendar" element={<Calendar />} />
            <Route path="create" element={<ContentEditor />} />
            <Route path="create/:id" element={<ContentEditor />} />
            <Route path="library" element={<Library />} />
            <Route path="metrics" element={<Metrics />} />
            <Route path="weekly" element={<WeeklyPlan />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}

export default App;
