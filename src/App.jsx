import React from 'react';
import ImageUploader from './components/ImageUploader';

function App() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6">
      <h1 className="text-3xl font-bold mb-8 text-center text-gray-800">
        OCR + Text Embedding App
      </h1>
      <ImageUploader />
    </main>
  );
}

export default App;
