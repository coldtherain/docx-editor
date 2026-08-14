import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TemplateList } from './pages/TemplateList';
import { TemplateEditor } from './pages/TemplateEditor';
import { ContentGen } from './pages/ContentGen';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TemplateList />} />
        <Route path="/templates/:id/edit" element={<TemplateEditor />} />
        <Route path="/templates/:id/generate" element={<ContentGen />} />
      </Routes>
    </BrowserRouter>
  );
}
