import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { StoreProvider } from './store/StoreContext';
import { Layout } from './components/Layout';
import { Today } from './pages/Today';
import { Ideas } from './pages/Ideas';
import { Drafts } from './pages/Drafts';
import { Published } from './pages/Published';
import { Editor } from './pages/Editor';
import { Settings } from './pages/Settings';

function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Today />} />
            <Route path="ideas" element={<Ideas />} />
            <Route path="drafts" element={<Drafts />} />
            <Route path="published" element={<Published />} />
            <Route path="edit" element={<Editor />} />
            <Route path="edit/:id" element={<Editor />} />
            <Route path="settings" element={<Settings />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  );
}

export default App;
