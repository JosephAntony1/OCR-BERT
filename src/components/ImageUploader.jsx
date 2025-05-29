import React, { useState } from 'react';
import Tesseract from 'tesseract.js';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import { firebaseConfig, huggingface_key } from '../config';

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const HF_API_URL = 'https://api-inference.huggingface.co/embeddings/sentence-transformers/all-MiniLM-L6-v2';
const HF_API_KEY = huggingface_key; // Replace with your own

export default function ImageUploader() {
  const [image, setImage] = useState(null);
  const [ocrText, setOcrText] = useState('');
  const [embedding, setEmbedding] = useState([]);

  const handleImageUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setImage(URL.createObjectURL(file));
    setOcrText('Processing...');

    const { data: { text } } = await Tesseract.recognize(file, 'eng');
    setOcrText(text);

    const response = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ inputs: text }),
    });

    const result = await response.json();
    setEmbedding(result.embedding || []);

    await addDoc(collection(db, 'ocr_results'), {
      text,
      embedding,
      timestamp: new Date()
    });
  };

  return (
    <div className="max-w-md mx-auto">
      <input type="file" accept="image/*" onChange={handleImageUpload} className="mb-4" />
      {image && <img src={image} alt="Uploaded preview" className="mb-4 rounded shadow" />}
      <div className="bg-white p-4 rounded shadow">
        <h2 className="font-semibold">Extracted Text:</h2>
        <p>{ocrText}</p>
      </div>
    </div>
  );
}