import React from 'react';
import ImageUploader from './components/ImageUploader';

function App() {
  return (
    <main className="min-h-screen p-4 bg-gray-100">
      <h1 className="text-2xl font-bold mb-4 text-center">OCR & BERT App</h1>
      <ImageUploader />
    </main>
  );
}

export default App;