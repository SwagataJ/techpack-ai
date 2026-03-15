import { VertexAI } from '@google-cloud/vertexai';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const PROJECT_ID = process.env.GCP_PROJECT_ID || 'nano-banana-api-test-484205';
const LOCATION = process.env.GCP_LOCATION || 'us-central1';

// Set credentials env var for both SDKs
const keyFilePath = process.env.SERVICE_ACCOUNT_KEY_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;
if (keyFilePath) {
  process.env.GOOGLE_APPLICATION_CREDENTIALS = keyFilePath;
}

// --- @google-cloud/vertexai (for text generation / spec extraction) ---
let vertexAI: VertexAI | null = null;

export function getVertexAI(): VertexAI {
  if (!vertexAI) {
    vertexAI = new VertexAI({ project: PROJECT_ID, location: LOCATION });
    console.log(`Vertex AI client initialized (project: ${PROJECT_ID}, location: ${LOCATION})`);
  }
  return vertexAI;
}

export function getGenerativeModel(modelName: string = 'gemini-2.0-flash') {
  const ai = getVertexAI();
  return ai.getGenerativeModel({ model: modelName });
}

// --- @google/genai (for image generation, matches Python google-genai SDK) ---
// gemini-3-pro-image-preview requires location: 'global'
let genaiClient: GoogleGenAI | null = null;

export function getGenAIClient(): GoogleGenAI {
  if (!genaiClient) {
    genaiClient = new GoogleGenAI({
      vertexai: true,
      project: PROJECT_ID,
      location: 'global',
    });
    console.log(`GenAI image client initialized (project: ${PROJECT_ID}, location: global)`);
  }
  return genaiClient;
}
