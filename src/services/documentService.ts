/**
 * @file documentService.ts
 * @description Provider-neutral document OCR / digitization service.
 *
 * Handles medical document OCR, report digitization and prescription
 * processing.  The actual model call is delegated to the provider-neutral
 * `aiService` (which routes to the Groq VISION_MODEL).  Extraction is strict
 * structured JSON; unclear fields are returned as null rather than invented.
 */

import { aiVision } from './aiService';

export interface OcrDocumentInput {
  imageBase64: string;
  mimeType?: string;
  documentType?: string;
}

/**
 * Extracts structured clinical data from a scanned medical document.
 * Returns an object with a `source` field describing provider status.
 */
export async function digitizeDocument(input: OcrDocumentInput): Promise<{
  document: Record<string, unknown>;
  source: string;
}> {
  const prompt = `You are a medical OCR specialist. Analyze this uploaded medical document (prescription, discharge summary, or lab report).
Extract the structured clinical information into this JSON schema:
{
  "documentType": "prescription" | "lab_report" | "discharge_summary" | "other",
  "date": "YYYY-MM-DD" or null,
  "doctorName": string or null,
  "hospitalOrClinic": string or null,
  "diagnoses": string[],
  "medications": [{ "name": string, "dosage": string, "frequency": string, "duration": string }],
  "labValues": [{ "test": string, "value": string, "unit": string, "status": "NORMAL" | "HIGH" | "LOW" | "CRITICAL" }],
  "rawText": string (full verbatim transcription),
  "confidenceScore": number
}
Do NOT invent data that is not visible in the image. Set unclear fields to null.
Return only JSON.`;

  const raw = await aiVision({
    imageBase64: input.imageBase64,
    mimeType: input.mimeType,
    prompt,
    json: true,
  });

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { rawText: raw, confidenceScore: 0 };
  }

  return { document: parsed, source: 'ai-vision' };
}
