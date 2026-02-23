import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StoreProvider } from './store/StoreContext';
import { Layout } from './components/Layout';
import { Home } from './pages/Home';
import { Drafts } from './pages/Drafts';
import { Schedule } from './pages/Schedule';
import { Editor } from './pages/Editor';
import { Analytics } from './pages/Analytics';
import { Settings } from './pages/Settings';

function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="drafts" element={<Drafts />} />
            <Route path="schedule" element={<Schedule />} />
            <Route path="editor/:id?" element={<Editor />} />
            <Route path="analytics" element={<Analytics />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}

export default App;
