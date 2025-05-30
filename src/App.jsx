import React from 'react';
import ImageUploader from './components/ImageUploader';

function App() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-100 to-gray-200 p-6">
      <div className="text-center bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-6 rounded-xl shadow mb-8">
        <h1 className="text-4xl font-extrabold tracking-wide">OCR + Text Embedding App</h1>
        <p className="text-sm font-light mt-2">
          Upload or capture an image to extract text and visualize embeddings using Hugging Face models.
        </p>
      </div>
      <ImageUploader />
    </main>
  );
}

export default App;
