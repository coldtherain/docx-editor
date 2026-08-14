import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { TemplateList } from './pages/TemplateList';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<TemplateList />} />
        <Route path="/templates/:id/edit" element={<div>编辑器（Task 10）</div>} />
        <Route path="/templates/:id/generate" element={<div>内容生成（Task 11）</div>} />
      </Routes>
    </BrowserRouter>
  );
}
