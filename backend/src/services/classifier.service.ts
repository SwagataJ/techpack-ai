import { getGenerativeModel } from './vertexai.service';

export interface ClassifiedImage {
  buffer: Buffer;
  mimeType: string;
  view: 'front' | 'back' | 'side' | 'detail' | 'unknown';
  confidence: number;
  quality: number;
}

export interface SelectedImages {
  frontImage: Buffer;
  frontMime: string;
  backImage: Buffer | null;
  backMime: string | null;
  allImages: Buffer[];
}

const CLASSIFY_PROMPT = `Analyze these garment images. For each image (numbered 1 to N), determine:
1. Which view it shows: "front", "back", "side", "detail", or "unknown"
2. Confidence (0-100) that the classification is correct
3. Image quality score (0-100) based on: clarity, lighting, how well the garment details are visible, and suitability for generating technical drawings

Return ONLY valid JSON array, no other text:
[
  {"index": 1, "view": "front", "confidence": 95, "quality": 85},
  {"index": 2, "view": "back", "confidence": 80, "quality": 70}
]`;

export async function classifyAndSelectImages(
  images: { buffer: Buffer; mimeType: string }[]
): Promise<SelectedImages> {
  if (images.length === 1) {
    // Single image — use as front, no back
    return {
      frontImage: images[0].buffer,
      frontMime: images[0].mimeType,
      backImage: null,
      backMime: null,
      allImages: images.map(i => i.buffer),
    };
  }

  console.log(`Classifying ${images.length} images...`);

  const model = getGenerativeModel();
  const parts: any[] = [];

  for (let i = 0; i < images.length; i++) {
    parts.push({
      inlineData: {
        mimeType: images[i].mimeType,
        data: images[i].buffer.toString('base64'),
      },
    });
    parts.push({ text: `Image ${i + 1}` });
  }
  parts.push({ text: CLASSIFY_PROMPT });

  const result = await model.generateContent({
    contents: [{ role: 'user', parts }],
  });

  const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  let classifications: { index: number; view: string; confidence: number; quality: number }[] = [];

  try {
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      classifications = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.warn('Failed to parse classification, using first image as front:', e);
  }

  console.log('Image classifications:', classifications);

  // Pick best front image
  const frontCandidates = classifications
    .filter(c => c.view === 'front')
    .sort((a, b) => (b.confidence + b.quality) - (a.confidence + a.quality));

  // Pick best back image
  const backCandidates = classifications
    .filter(c => c.view === 'back')
    .sort((a, b) => (b.confidence + b.quality) - (a.confidence + a.quality));

  let frontIdx = 0; // default to first image
  let backIdx: number | null = null;

  if (frontCandidates.length > 0) {
    frontIdx = frontCandidates[0].index - 1;
  }

  if (backCandidates.length > 0) {
    backIdx = backCandidates[0].index - 1;
  }

  // If no front was classified but back was, use the non-back image as front
  if (frontCandidates.length === 0 && backCandidates.length > 0) {
    frontIdx = classifications.find(c => c.view !== 'back')?.index
      ? (classifications.find(c => c.view !== 'back')!.index - 1)
      : 0;
  }

  console.log(`Selected: front=image ${frontIdx + 1}, back=${backIdx !== null ? `image ${backIdx + 1}` : 'none (will generate from front)'}`);

  return {
    frontImage: images[frontIdx].buffer,
    frontMime: images[frontIdx].mimeType,
    backImage: backIdx !== null ? images[backIdx].buffer : null,
    backMime: backIdx !== null ? images[backIdx].mimeType : null,
    allImages: images.map(i => i.buffer),
  };
}
