const express = require("express");
const cors = require("cors");
const { onRequest } = require("firebase-functions/v2/https");
const vision = require("@google-cloud/vision");

const app = express();
const client = new vision.ImageAnnotatorClient();

app.use(cors({ origin: true })); // ✅ Allow all origins, or specify a whitelist
app.use(express.json({ limit: "10mb" }));

app.post("/", async (req, res) => {
  try {
    const { image } = req.body;
    if (!image) return res.status(400).json({ error: "Missing image" });

    const [result] = await client.textDetection({ image: { content: image } });
    const detections = result.textAnnotations || [];
    const text = detections.length > 0 ? detections[0].description : "";

    res.json({ text });
  } catch (error) {
    console.error("OCR error:", error);
    res.status(500).json({ error: "OCR failed" });
  }
});

exports.analyzeImage = onRequest({ timeoutSeconds: 60, memory: "1GiB" }, app);
