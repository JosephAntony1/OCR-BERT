import React, { useState } from 'react';
import Tesseract from 'tesseract.js';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale } from 'chart.js';
import { HfInference } from '@huggingface/inference';

ChartJS.register(BarElement, CategoryScale, LinearScale);

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

const huggingface_key = import.meta.env.VITE_HF_KEY;

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const hf = new HfInference(huggingface_key);


export default function ImageUploader() {
  const [image, setImage] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [embedding, setEmbedding] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmbedding, setShowEmbedding] = useState(true);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImage(URL.createObjectURL(file));
    setLoading(true);
    setError('');
    setOcrText('');
    setEmbedding([]);
    setShowEmbedding(false);

    try {
      const tesseractResult = await Tesseract.recognize(file, 'eng');
      const rawText = tesseractResult.data.text;
      const cleanText = rawText.replace(/\s+/g, ' ').trim();
      setOcrText(cleanText || '(No text found)');

      const result = await hf.featureExtraction({
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        inputs: cleanText
      });

      const emb = Array.isArray(result) ? result : [];
      setEmbedding(emb);

      await addDoc(collection(db, 'ocr_results'), {
        text: cleanText,
        embedding: emb,
        timestamp: new Date()
      });
    } catch (err) {
      console.error(err);
      setError('Something went wrong while processing the image.');
    }

    setLoading(false);
  };

  const chartData = {
    labels: embedding.map((_, i) => i),
    datasets: [{
      label: 'Embedding',
      data: embedding,
      backgroundColor: 'rgba(59, 130, 246, 0.7)',
    }]
  };

  const chartOptions = {
    responsive: true,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { display: false } },
      y: { beginAtZero: true }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-white px-4">
      <div className="w-full max-w-2xl bg-white p-8 rounded-2xl shadow-lg space-y-6">
        <h1 className="text-3xl font-bold text-center text-blue-700">OCR + BERT Visualizer</h1>

        <div className="text-center">
          <label className="inline-block cursor-pointer px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">
            Upload Image
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
            />
          </label>
        </div>

        {image && (
          <div className="text-center">
            <img src={image} alt="Uploaded" className="mx-auto rounded-lg max-h-64 shadow-md" />
          </div>
        )}

        {loading && (
          <div className="flex justify-center items-center space-x-2 text-blue-600 font-semibold">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <span>Processing...</span>
          </div>
        )}

        {error && (
          <div className="text-red-600 text-center font-medium">{error}</div>
        )}

        {!loading && ocrText && (
          <div className="bg-gray-50 border rounded-lg p-4">
            <h2 className="font-semibold text-gray-700 mb-2">📝 Extracted Text</h2>
            <p className="text-gray-800 whitespace-pre-wrap text-sm">{ocrText}</p>
          </div>
        )}

        {!loading && embedding.length > 0 && (
          <div>
            <button
              onClick={() => setShowEmbedding(!showEmbedding)}
              className="block mx-auto mt-4 text-blue-600 hover:underline text-sm"
            >
              {showEmbedding ? 'Hide' : 'Show'} Embedding Chart
            </button>

            {showEmbedding && (
              <div className="mt-4 bg-gray-50 p-4 rounded-lg shadow">
                <Bar data={chartData} options={chartOptions} />
                <p className="text-xs text-gray-500 mt-2 text-center">
                  {embedding.length}-dimensional embedding from BERT (MiniLM)
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
