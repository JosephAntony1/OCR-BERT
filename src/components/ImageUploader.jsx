import React, { useState } from 'react';
import Tesseract from 'tesseract.js';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, BarElement, CategoryScale, LinearScale } from 'chart.js';
import { firebaseConfig, huggingface_key } from '../config';
import { HfInference } from '@huggingface/inference';

ChartJS.register(BarElement, CategoryScale, LinearScale);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const hf = new HfInference(huggingface_key);

export default function ImageUploader() {
  const [image, setImage] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [embedding, setEmbedding] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showEmbedding, setShowEmbedding] = useState(false);

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
      // OCR with Tesseract
      const tesseractResult = await Tesseract.recognize(file, 'eng');
      const rawText = tesseractResult.data.text;
      const cleanText = rawText.replace(/\s+/g, ' ').trim();
      setOcrText(cleanText || '(No text found)');

      // Embedding with Hugging Face
      const result = await hf.featureExtraction({
        model: 'sentence-transformers/all-MiniLM-L6-v2',
        inputs: cleanText
      });

      const emb = Array.isArray(result) ? result : [];
      setEmbedding(emb);

      // Save to Firestore
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
    datasets: [
      {
        label: 'Embedding Value',
        data: embedding,
        backgroundColor: 'rgba(59, 130, 246, 0.6)',
      }
    ]
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
    <div className="max-w-xl mx-auto bg-white rounded-2xl shadow-md p-6 space-y-6">
      <div className="space-y-2">
        <label className="block text-lg font-medium text-gray-700">
          Upload an Image
        </label>
        <input
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4
            file:rounded-full file:border-0 file:text-sm file:font-semibold
            file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {image && (
        <div className="text-center">
          <img
            src={image}
            alt="Uploaded preview"
            className="mx-auto rounded-lg shadow max-h-64 object-contain"
          />
        </div>
      )}

      {loading && (
        <div className="text-center text-blue-600 font-semibold animate-pulse">
          Processing image and generating embedding...
        </div>
      )}

      {error && (
        <div className="text-red-500 text-sm font-semibold text-center">
          {error}
        </div>
      )}

      {!loading && ocrText && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h2 className="font-semibold text-gray-700 mb-2">Extracted Text:</h2>
          <p className="whitespace-pre-wrap text-gray-800 text-sm">{ocrText}</p>
        </div>
      )}

      {!loading && embedding.length > 0 && (
        <div>
          <button
            onClick={() => setShowEmbedding(!showEmbedding)}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            {showEmbedding ? 'Hide' : 'Show'} Embedding Visualization
          </button>

          {showEmbedding && (
            <div className="mt-4">
              <Bar data={chartData} options={chartOptions} />
              <p className="text-xs text-gray-500 mt-2 text-center">
                {embedding.length}-dimensional embedding from MiniLM
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
