import React, { useState, useEffect } from 'react';
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

const models = [
  { label: "MiniLM (default)", id: "sentence-transformers/all-MiniLM-L6-v2" },
  { label: "MPNet", id: "sentence-transformers/all-mpnet-base-v2" }
];

export default function ImageUploader() {
  const [image, setImage] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [embedding, setEmbedding] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedModel, setSelectedModel] = useState(models[0]); // default: MiniLM
  useEffect(() => {
    const regenerateEmbedding = async () => {
      if (!ocrText || ocrText === '(No text found)') return;

      setLoading(true);
      setError('');
      try {
        const result = await hf.featureExtraction({
          model: selectedModel.id,
          inputs: ocrText
        });
        const emb = Array.isArray(result) ? result : [];
        setEmbedding(emb);

        await addDoc(collection(db, 'ocr_results'), {
          text: ocrText,
          embedding: emb,
          model: selectedModel.id,
          timestamp: new Date()
        });
      } catch (err) {
        console.error(err);
        setError('Failed to regenerate embedding.');
      }
      setLoading(false);
    };

    regenerateEmbedding();
  }, [selectedModel]);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImage(URL.createObjectURL(file));
    setLoading(true);
    setError('');
    setOcrText('');
    setEmbedding([]);

    try {
      // Read file as base64
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64Image = reader.result.split(',')[1]; // remove data:image/... prefix

        // 🔁 Call your Cloud Function
        const res = await fetch(' https://us-central1-biogenisis-ocr.cloudfunctions.net/analyzeImage', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64Image }),
        });

        const data = await res.json();
        const cleanText = data.text?.trim() || '(No text found)';
        setOcrText(cleanText);

        // 🔁 Call Hugging Face embedding
        const result = await hf.featureExtraction({
          model: selectedModel.id,
          inputs: cleanText,
        });

        const emb = Array.isArray(result) ? result : [];
        setEmbedding(emb);

        await addDoc(collection(db, 'ocr_results'), {
          text: cleanText,
          embedding: emb,
          timestamp: new Date()
        });
      };

      reader.readAsDataURL(file);
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

        <div className="text-center">
          <label className="block mb-1 font-medium text-gray-700">Choose Embedding Model</label>
          <select
            value={selectedModel.id}
            onChange={(e) => {
              const model = models.find((m) => m.id === e.target.value);
              setSelectedModel(model);
            }}
            className="px-4 py-2 border rounded-md bg-white shadow-sm text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.label}
              </option>
            ))}
          </select>
        </div>

        {!loading && embedding.length > 0 && (
          <div>
            {(
              <div className="mt-4 bg-gray-50 p-4 rounded-lg shadow">
                <Bar data={chartData} options={chartOptions} />
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    {embedding.length}-dimensional embedding from: <strong>{selectedModel.label}</strong>
                  </p>

              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
