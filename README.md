# AI OCR Web App

A mobile-friendly web app that:
- Performs OCR on uploaded images using Tesseract.js
- Uses Hugging Face to generate embeddings of the extracted text
- Stores results in Firebase Firestore

## Setup

1. Clone repo
2. `npm install`
3. Add Firebase and Hugging Face API keys
4. `npm run dev` to start locally

## Deploy

1. `npm run build`
2. `firebase login`
3. `firebase init` (select Hosting, choose `dist` as public folder)
4. `firebase deploy`
