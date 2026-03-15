import { getGenerativeModel } from './vertexai.service';
import { GarmentSpecifications } from '../types';

const SPEC_EXTRACTION_PROMPT = `You are a professional garment technician. Analyze this garment image and extract detailed technical specifications.

Return a JSON object with EXACTLY this structure (no markdown, no code fences, just raw JSON):
{
  "garmentType": "e.g. Blazer, Dress, Shirt, Pants",
  "style": "e.g. Blue Cropped Blazer with Contrast Piping",
  "description": "Short description, max 8-10 words e.g. Short sleeve knitted polo shirt with textured pattern",
  "season": "e.g. Summer 2027",
  "date": "today's date in DD.MM.YYYY format",
  "supplier": "Supplier name",
  "designer": "Designer name",
  "measurements": [
    {"id": "OW_CHEST_WIDTH", "name": "1/2 Chest Width", "value": 55, "unit": "cm"},
    {"id": "OW_BODY_LENGTH", "name": "Body Length from HPS", "value": 45, "unit": "cm"},
    {"id": "OW_SHOULDER_WIDTH", "name": "Shoulder Width", "value": 46, "unit": "cm"},
    {"id": "OW_SLEEVE_LENGTH", "name": "Sleeve Length from Shoulder Seam", "value": 45, "unit": "cm"},
    {"id": "LAPEL_WIDTH", "name": "Lapel Width", "value": 8, "unit": "cm"},
    {"id": "VENT_LENGTH", "name": "Back Vent Length", "value": 0, "unit": "cm"},
    {"id": "OW_HEM_WIDTH", "name": "1/2 Hem Width", "value": 53, "unit": "cm"},
    {"id": "OW_SLEEVE_OPENING", "name": "1/2 Sleeve Opening", "value": 12.5, "unit": "cm"},
    {"id": "OW_ARMHOLE_DEPTH", "name": "Armhole Depth", "value": 26, "unit": "cm"},
    {"id": "OW_BICEP_WIDTH", "name": "1/2 Bicep Width", "value": 20, "unit": "cm"},
    {"id": "OW_WAIST_WIDTH", "name": "1/2 Waist Width", "value": 51, "unit": "cm"},
    {"id": "OW_ACROSS_FRONT", "name": "Across Front", "value": 42, "unit": "cm"},
    {"id": "OW_ACROSS_BACK", "name": "Across Back", "value": 43, "unit": "cm"},
    {"id": "OW_NECK_DROP_FRONT", "name": "Front Neck Drop", "value": 9.5, "unit": "cm"},
    {"id": "OW_NECK_DROP_BACK", "name": "Back Neck Drop", "value": 2.5, "unit": "cm"},
    {"id": "OW_POCKET_WIDTH", "name": "Pocket Opening Width", "value": 0, "unit": "cm"},
    {"id": "OW_BUTTON_SPACING", "name": "Button Spacing", "value": 0, "unit": "cm"}
  ],
  "materials": [
    {"type": "Main Fabric", "description": "Detailed fabric description including composition, weight, texture, finish"},
    {"type": "Lining", "description": "Lining details or 'Unlined' with seam finish details"},
    {"type": "Thread", "description": "Thread details including color, type, stitch count"}
  ],
  "colors": [
    {"name": "Color Name", "pantone": "XX-XXXX TCX", "hex": "#000000"}
  ],
  "constructionDetails": [
    {"title": "Detail Name", "description": "Full construction specification including stitch type, SPI, seam allowance, tolerances", "location": "Front View or Back View"}
  ],
  "careInstructions": ["Machine wash cold", "Do not bleach", "Tumble dry low", "Iron medium heat"],
  "trims": ["Button type and size", "Piping details"],
  "uniqueFeatures": [
    {"name": "Feature name (e.g. Horn Buttons, Floral Print, Ribbed Knit)", "description": "Brief description of the feature, what makes it distinctive, material/technique used"}
  ]
}

- uniqueFeatures: identify exactly 3 standout design elements of this garment. These should be the most visually distinctive or noteworthy features — e.g. a specific print/pattern, special buttons/closures, unique stitching, embroidery, contrast fabric panels, hardware, labels, elastic details, etc. Focus on what makes this garment special.

Important:
- Estimate realistic measurements based on the garment type visible in the image
- constructionDetails MUST be comprehensive (aim for 8-15 entries). Include ALL of these where applicable:
  Front View: collar/lapel construction, neckline finish, shoulder seam, armhole seam, side seam, front placket/closure, button/buttonhole placement & spacing, pocket construction (welt/patch/flap), pocket placement, dart placement, topstitching details, sleeve attachment, sleeve hem/cuff finish, front hem finish, piping/trim/contrast panels, zipper type & placement, waistband construction, pleats/gathers, embroidery/print placement, label placement
  Back View: back neckline facing/finish, back yoke seam, center back seam, back dart placement, back vent/slit construction, back hem finish, back shoulder seam, back armhole finish, back pocket, back waistband, kick pleat
- For EACH detail: specify stitch type (lockstitch, overlock, coverstitch, flatlock, blind hem), SPI/stitch density, seam allowance in cm, tolerance +/- in mm
- Provide Pantone TCX color codes
- Return ONLY valid JSON, no other text`;

export interface SpecParams {
  season?: string;
  department?: string;
  designer?: string;
  supplier?: string;
  notes?: string;
}

export async function extractSpecifications(
  imageBuffer: Buffer,
  mimeType: string = 'image/jpeg',
  params?: SpecParams
): Promise<GarmentSpecifications> {
  console.log('Starting specification extraction...');

  const model = getGenerativeModel();

  const imagePart = {
    inlineData: {
      mimeType: mimeType,
      data: imageBuffer.toString('base64'),
    },
  };

  // Build context from user-provided parameters
  const contextParts: string[] = [];
  if (params?.season) contextParts.push(`Season: ${params.season}`);
  if (params?.department) contextParts.push(`Department: ${params.department}`);
  if (params?.designer) contextParts.push(`Designer: ${params.designer}`);
  if (params?.supplier) contextParts.push(`Supplier/Vendor: ${params.supplier}`);
  if (params?.notes) contextParts.push(`Additional notes: ${params.notes}`);
  const contextStr = contextParts.length > 0
    ? `\n\nThe following information has been provided by the designer — use these values where applicable:\n${contextParts.join('\n')}`
    : '';

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [imagePart, { text: SPEC_EXTRACTION_PROMPT + contextStr }] }],
  });

  const response = result.response;
  const text = response.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!text) {
    throw new Error('No text response from specification extraction');
  }

  console.log('Raw spec response length:', text.length);

  const specs = parseSpecifications(text);

  // Override with user-provided values
  if (params?.season) specs.season = params.season;
  if (params?.designer) specs.designer = params.designer;
  if (params?.supplier) specs.supplier = params.supplier;

  console.log('Specifications extracted:', specs.garmentType, '-', specs.measurements.length, 'measurements');

  return specs;
}

function parseSpecifications(text: string): GarmentSpecifications {
  // Try to extract JSON from the response
  let jsonStr = text.trim();

  // Remove markdown code fences if present
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) {
    jsonStr = jsonMatch[1].trim();
  }

  // Try to find JSON object in the text
  const objMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objMatch) {
    jsonStr = objMatch[0];
  }

  try {
    const parsed = JSON.parse(jsonStr);

    // Validate required fields
    if (!parsed.garmentType || typeof parsed.garmentType !== 'string') {
      parsed.garmentType = 'Unknown Garment';
    }

    if (!Array.isArray(parsed.measurements) || parsed.measurements.length === 0) {
      parsed.measurements = [
        { id: 'CHEST', name: 'Chest Width', value: 50, unit: 'cm' },
      ];
    }

    // Ensure all measurements have positive values
    parsed.measurements = parsed.measurements.map((m: any) => ({
      id: m.id || m.name?.toUpperCase().replace(/\s+/g, '_') || 'UNKNOWN',
      name: m.name || 'Unknown',
      value: Math.max(0, Number(m.value) || 0),
      unit: m.unit || 'cm',
    }));

    return {
      garmentType: parsed.garmentType,
      style: parsed.style || parsed.garmentType,
      description: parsed.description || '',
      season: parsed.season || '',
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.'),
      supplier: parsed.supplier || 'Supplier name',
      designer: parsed.designer || '',
      measurements: parsed.measurements,
      materials: parsed.materials || [],
      colors: parsed.colors || [],
      constructionDetails: parsed.constructionDetails || [],
      careInstructions: parsed.careInstructions || [],
      trims: parsed.trims || [],
      uniqueFeatures: parsed.uniqueFeatures || [],
    };
  } catch (error) {
    console.error('Failed to parse specifications JSON:', error);
    throw new Error('Failed to parse garment specifications from AI response');
  }
}
