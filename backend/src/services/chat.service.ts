import { getGenerativeModel } from './vertexai.service';
import { GarmentSpecifications } from '../types';

const REVISION_PROMPT = `You are a garment tech pack specialist. A designer wants to revise certain parts of an existing tech pack.

Here are the current specifications:
\`\`\`json
{{SPECS}}
\`\`\`

The designer says: "{{MESSAGE}}"

Apply the designer's requested changes to the specifications. Only modify the fields that are relevant to their request — leave everything else unchanged.

Return a JSON object with exactly three keys:
1. "changes" — a brief human-readable summary of what you changed (1-3 sentences)
2. "regenerateCAD" — boolean. This controls whether the technical flat drawings are regenerated.
   Set to TRUE if the change would make the garment LOOK different in a flat sketch — i.e. any change to construction, structure, shape, or visible design elements. Examples that REQUIRE regenerateCAD=true:
   - Changing hem type (e.g. regular to elastic, ribbed, cuffed)
   - Adding/removing/changing pockets, vents, slits, pleats
   - Changing collar or neckline style
   - Changing sleeve type or length
   - Changing closure type (buttons to zipper, etc.)
   - Adding/removing design elements (yoke, panels, piping, trims)
   - Changing garment silhouette or fit
   Set to FALSE ONLY for changes that would NOT be visible in a line drawing:
   - Adjusting measurement numbers
   - Changing fabric composition text or weight
   - Updating colors/pantone codes
   - Fixing typos, changing names, updating care instructions
   When in doubt, set to true — it's better to regenerate unnecessarily than to have stale drawings.
3. "specifications" — the complete updated specifications object (same structure as above, with changes applied)

Return ONLY valid JSON, no markdown fences, no other text.`;

export async function reviseSpecifications(
  currentSpecs: GarmentSpecifications,
  designerMessage: string
): Promise<{ updatedSpecs: GarmentSpecifications; changes: string; regenerateCAD: boolean }> {
  console.log('Revising specs via chat:', designerMessage.substring(0, 100));

  const model = getGenerativeModel();

  const prompt = REVISION_PROMPT
    .replace('{{SPECS}}', JSON.stringify(currentSpecs, null, 2))
    .replace('{{MESSAGE}}', designerMessage);

  const result = await model.generateContent({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
  });

  const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error('No response from AI');

  let jsonStr = text.trim();
  const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (jsonMatch) jsonStr = jsonMatch[1].trim();

  const objMatch = jsonStr.match(/\{[\s\S]*\}/);
  if (objMatch) jsonStr = objMatch[0];

  const parsed = JSON.parse(jsonStr);

  if (!parsed.specifications) {
    throw new Error('AI response missing specifications');
  }

  return {
    updatedSpecs: parsed.specifications as GarmentSpecifications,
    changes: parsed.changes || 'Specifications updated.',
    regenerateCAD: parsed.regenerateCAD === true,
  };
}
