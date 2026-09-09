/**
 * @file routes/converse.ts
 * Express route module. Extracted (byte-preserved) from the legacy monolithic
 * server.ts. Shared middleware / helpers are imported from ../middleware and
 * ../shared; every route still falls back to the in-memory store when MySQL is
 * unavailable (no behaviour changes, wiring only).
 */
import express from 'express';
import fs from 'fs';
import path from 'path';
import { createHash, randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware';
import { executeQuery, inMemoryDb } from '../db';
import { authenticateToken, authenticatePatientSession, requireRole } from '../middleware';
import type { AuthenticatedRequest, PatientSessionRequest } from '../middleware';
import { getAiClient, normalizeClinicalSummary, inMemoryDocuments, inMemoryPrescriptions } from '../shared';
import { verifyAndRegister, verifyAndRegisterSchema, AbdmApiError, OtpExpiredError } from '../services/patientVerificationWorkflow';
import { abdmTokenManager } from '../services/abdmTokenManager';
import { isAbdmConfigured } from '../services/abdmConfig';
import { isSarvamConfigured, sarvamSTT, sarvamTTS, sarvamTranslate, sarvamDetectLanguage, sarvamChat, languageCodeToSarvam, sarvamLangToShort } from '../services/sarvamService';
import { aiConfigured, aiText, aiChat, aiVision } from '../services/aiService';
import { decodeQrImage } from '../services/qrService';
import { digitizeDocument } from '../services/documentService';
import { validateImage } from '../services/imageProcessingService';

const router = express.Router();
router.post('/api/converse/adaptive-question', async (req, res) => {
  try {
    const {
      complaintId,
      chiefComplaint = 'Consultation Intake',
      conversationHistory = [],
      socrates = {},
      redFlags = [],
      selectedLanguage = 'en',
      lastAnswer = '',
      stepIndex = 0,
    } = req.body;

    const lowerAns = (lastAnswer || '').toLowerCase();
    const newRedFlags: string[] = [];
    const extractedAttributes: Record<string, any> = {};

    // 1. Immediate Rule-Based Red Flag & Clinical Attribute Sniffing
    if (lowerAns.includes('left arm') || lowerAns.includes('jaw') || lowerAns.includes('shoulder')) {
      newRedFlags.push('Cardiac Radiation: Pain extending to left arm / shoulder / jaw');
      extractedAttributes.radiation = 'Left arm & jaw radiation';
    }
    if (lowerAns.includes('crushing') || lowerAns.includes('heavy pressure') || lowerAns.includes('squeezing')) {
      newRedFlags.push('High-Risk Sensation: Compressive crushing chest discomfort');
      extractedAttributes.character = 'Crushing compressive pressure';
    }
    if (lowerAns.includes('sweat') || lowerAns.includes('diaphoresis') || lowerAns.includes('cold sweat')) {
      newRedFlags.push('Autonomic Distress: Profuse diaphoresis with acute onset');
      extractedAttributes.associations = ['Profuse cold sweating'];
    }
    if (lowerAns.includes('shortness of breath') || lowerAns.includes('cannot breathe') || lowerAns.includes('breathless') || lowerAns.includes('gasping')) {
      newRedFlags.push('Respiratory Alert: Acute breathlessness (air hunger)');
      extractedAttributes.associations = [...(extractedAttributes.associations || []), 'Shortness of breath'];
    }
    if (lowerAns.includes('thunderclap') || lowerAns.includes('worst headache') || lowerAns.includes('sudden explosion')) {
      newRedFlags.push('Neurological Warning: Thunderclap headache onset pattern');
      extractedAttributes.onset = 'Sudden thunderclap within seconds';
    }
    if (lowerAns.includes('rigid') || lowerAns.includes('rock hard') || lowerAns.includes('unbearable stomach')) {
      newRedFlags.push('Acute Abdomen Alert: Peritoneal rigidity suspected');
      extractedAttributes.character = 'Severe acute rigidity';
    }

    const ai = aiConfigured();

    // 2. Try AI dynamic generation
    if (ai) {
      try {
        const historySummary = conversationHistory
          .slice(-6)
          .map((h: any) => `${h.speaker === 'kiosk' ? 'Doctor/Kiosk' : 'Patient'}: ${h.text}`)
          .join('\n');

        const prompt = `You are an expert AI OPD triage physician at a smart hospital kiosk in India.
Follow the SOCRATES protocol (Site, Onset, Character, Radiation, Associations, Timing, Exacerbating/Relieving, Severity).
Chief Complaint: ${chiefComplaint} (${complaintId})
Patient Selected Language: ${selectedLanguage} (Options: en, te, ta, kn, ml, mr)
Current Step Index: ${stepIndex}
Accumulated Clinical Attributes: ${JSON.stringify({ ...socrates, ...extractedAttributes })}
Active Red Flags: ${JSON.stringify([...redFlags, ...newRedFlags])}
Recent Dialogue:
${historySummary}

Patient's latest answer/input: "${lastAnswer}"

YOUR GOAL:
Dynamically generate the NEXT logical clinical follow-up question directly tailored to what the patient just reported.
- Do NOT repeat questions the patient has already answered.
- If the patient reported chest or arm discomfort, probe for cardiac red flags (sweats, radiation, breathlessness).
- If the patient reported digestive discomfort, probe for meal relation, burning, nausea, or localized tenderness.
- If stepIndex >= 5 or if core symptoms are fully characterized, transition to pain severity (0-10) with isPainScale: true, or set isFinal: true if triage is complete.
- Provide "reasoning" (one sentence explaining to the patient why this question is being asked based on their last answer).
- "title": Question in English.
- "titleRegional": Question accurately translated into the patient's selected language (${selectedLanguage}).
- "options": 3 to 4 context-specific, distinct options for this question. Each option must have label (English), labelRegional (in ${selectedLanguage}), code (snake_case), and isRed (boolean if dangerous).

Return STRICTLY JSON format:
{
  "question": {
    "id": "dyn_q_${Date.now()}",
    "step": "site" | "onset" | "character" | "radiation" | "associations" | "timing" | "exacerbating" | "severity" | "followup",
    "title": string,
    "titleRegional": string,
    "subtitle": string,
    "reasoning": string,
    "options": [
      { "label": string, "labelRegional": string, "code": string, "isRed": boolean }
    ],
    "isPainScale": boolean,
    "isMultiSelect": boolean,
    "isFinal": boolean
  },
  "extractedAttributes": {
    "site": string | null,
    "onset": string | null,
    "character": string | null,
    "radiation": string | null,
    "associations": string[] | null,
    "timing": string | null,
    "exacerbating": string | null,
    "relieving": string | null,
    "severity": number | null
  },
  "newRedFlags": string[]
}`;

        const rawJson = (await aiText({
          prompt,
          modelKind: 'fast',
          json: true,
        })).trim() || '{}';
        const parsed = JSON.parse(rawJson);

        if (parsed.question && parsed.question.title) {
          const mergedRedFlags = Array.from(
            new Set([...newRedFlags, ...(parsed.newRedFlags || [])])
          );
          const mergedAttributes = {
            ...extractedAttributes,
            ...(parsed.extractedAttributes || {}),
          };

          return res.json({
            success: true,
            question: parsed.question,
            extractedAttributes: mergedAttributes,
            newRedFlags: mergedRedFlags,
            source: 'ai-adaptive',
          });
        }
      } catch (aiErr: any) {
        console.warn('[Adaptive Converse] AI generation fallback:', aiErr?.message || aiErr);
      }
    }

    // 3. Fallback Adaptive Clinical Rule Engine (Offline / API key missing)
    let dynamicStep: any = 'character';
    let titleEn = 'How would you describe the sensation or feeling of this discomfort?';
    let reasoning = lastAnswer ? `Tailoring assessment to your previous response: "${lastAnswer.slice(0, 40)}..."` : 'Gathering baseline diagnostic details';
    let options: any[] = [];
    let isPainScale = false;
    let isFinal = false;

    // Adaptive branch for Chest / Cardiovascular
    if (complaintId === 'chest_pain' || lowerAns.includes('chest') || lowerAns.includes('heart')) {
      if (lowerAns.includes('left') || lowerAns.includes('center') || socrates.site) {
        if (!socrates.radiation && !extractedAttributes.radiation) {
          dynamicStep = 'radiation';
          titleEn = 'Does this chest discomfort spread or shoot anywhere into your arm, neck, or back?';
          reasoning = 'Checking for cardiovascular radiation pathways based on chest location';
          options = [
            { label: 'Yes, spreads to left arm, shoulder, or jaw', code: 'left_arm_jaw', isRed: true },
            { label: 'Yes, travels straight through to the back', code: 'back_scapula', isRed: true },
            { label: 'Yes, upwards into the throat or neck', code: 'throat_neck', isRed: true },
            { label: 'No, it stays strictly in the chest without spreading', code: 'localized_only', isRed: false },
          ];
        } else if (!socrates.associations || socrates.associations.length === 0) {
          dynamicStep = 'associations';
          titleEn = 'Are you experiencing any sweating, breathlessness, or nausea right now?';
          reasoning = 'Assessing autonomic distress following your reported sensation';
          options = [
            { label: 'Heavy cold sweating (diaphoresis)', code: 'cold_sweat', isRed: true },
            { label: 'Shortness of breath / difficulty catching breath', code: 'dyspnea', isRed: true },
            { label: 'Nausea or lightheaded dizziness', code: 'nausea_dizzy', isRed: true },
            { label: 'None of these associated symptoms', code: 'none_assoc', isRed: false },
          ];
        } else if (stepIndex >= 4 || socrates.character) {
          dynamicStep = 'severity';
          titleEn = 'On a scale from 0 to 10, how severe is this chest pain right now?';
          reasoning = 'Quantifying pain severity for triage priority assignment';
          isPainScale = true;
          isFinal = stepIndex >= 5;
        } else {
          dynamicStep = 'exacerbating';
          titleEn = 'What happens to the pain when you walk, exert yourself, or rest?';
          reasoning = 'Evaluating exertional ischemia correlation';
          options = [
            { label: 'Worsens with physical movement, eases with complete rest', code: 'exertion_angina', isRed: true },
            { label: 'Does NOT ease with rest â€” stays continuously intense', code: 'constant_unrelieved', isRed: true },
            { label: 'Worsens with deep breaths or coughing', code: 'pleuritic', isRed: false },
            { label: 'Improves after drinking water or antacids', code: 'acid_relief', isRed: false },
          ];
        }
      } else {
        dynamicStep = 'site';
        titleEn = 'Where in your chest is the pain primarily centered?';
        reasoning = 'Localizing the primary focus of chest discomfort';
        options = [
          { label: 'Directly behind the breastbone (retrosternal)', code: 'retrosternal', isRed: true },
          { label: 'Left side of the chest over the ribs', code: 'left_chest', isRed: true },
          { label: 'Upper abdomen just below ribs (epigastric)', code: 'epigastric', isRed: false },
          { label: 'Right side of the chest', code: 'right_chest', isRed: false },
        ];
      }
    }
    // Adaptive branch for Stomach / Abdominal
    else if (complaintId === 'stomach_digestive' || lowerAns.includes('stomach') || lowerAns.includes('abdomen') || lowerAns.includes('belly')) {
      if (lowerAns.includes('burn') || lowerAns.includes('acid') || lowerAns.includes('meal')) {
        dynamicStep = 'exacerbating';
        titleEn = 'Does the stomach pain occur immediately after eating, or when your stomach is empty?';
        reasoning = 'Differentiating peptic ulcer and gastroesophageal reflux patterns';
        options = [
          { label: 'Worse right after spicy or oily meals (Annadrava Shula)', code: 'post_meal_acid', isRed: false },
          { label: 'Worse on an empty stomach or late at night (Parinama Shula)', code: 'empty_stomach_acid', isRed: false },
          { label: 'Constant intense burning with severe nausea', code: 'constant_gastritis', isRed: false },
          { label: 'Relieved immediately after antacids or cold milk', code: 'antacid_relief', isRed: false },
        ];
      } else if (lowerAns.includes('right') || lowerAns.includes('lower')) {
        dynamicStep = 'associations';
        titleEn = 'Is there any fever, vomiting, or sharp pain when walking or touching the area?';
        reasoning = 'Checking for acute appendicitis or peritoneal irritation';
        options = [
          { label: 'Sharp pain when pressing or letting go (rebound tenderness)', code: 'rebound_tenderness', isRed: true },
          { label: 'Fever with chills and repeated vomiting', code: 'fever_vomiting', isRed: true },
          { label: 'Loose watery motions or gas cramps', code: 'diarrhea_cramps', isRed: false },
          { label: 'Pain during urination or cloudy urine', code: 'urinary_symptoms', isRed: false },
        ];
      } else if (stepIndex >= 4) {
        dynamicStep = 'severity';
        titleEn = 'Please rate the intensity of this stomach discomfort from 0 to 10:';
        reasoning = 'Assessing clinical discomfort severity for physician triage';
        isPainScale = true;
        isFinal = true;
      } else {
        dynamicStep = 'character';
        titleEn = 'What kind of feeling is present in your abdomen?';
        reasoning = 'Categorizing abdominal pain mechanism (cramping vs sharp vs bloated)';
        options = [
          { label: 'Twisting colicky spasms that come and go in waves', code: 'colic_cramps', isRed: false },
          { label: 'Persistent burning sensation rising into chest', code: 'heartburn_acid', isRed: false },
          { label: 'Heavy bloating and excessive gas (Aadhmana)', code: 'bloating_gas', isRed: false },
          { label: 'Severe continuous sharp localized ache', code: 'sharp_continuous', isRed: true },
        ];
      }
    }
    // Adaptive branch for Headache / Neurological
    else if (complaintId === 'headache' || complaintId === 'headache_neuro' || lowerAns.includes('head') || lowerAns.includes('migraine')) {
      if (lowerAns.includes('sudden') || lowerAns.includes('severe') || lowerAns.includes('worst')) {
        dynamicStep = 'associations';
        titleEn = 'Are you experiencing any neck stiffness, double vision, or weakness in your arms or legs?';
        reasoning = 'Screening for intracranial hemorrhage or meningitis red flags';
        options = [
          { label: 'Stiff neck and inability to bend head forward', code: 'meningismus', isRed: true },
          { label: 'Blurred vision or flashing lights (visual aura)', code: 'visual_aura', isRed: false },
          { label: 'Weakness or numbness on one side of face or arm', code: 'focal_neuro', isRed: true },
          { label: 'Extreme sensitivity to sound and bright light', code: 'photophobia', isRed: false },
        ];
      } else if (stepIndex >= 4) {
        dynamicStep = 'severity';
        titleEn = 'How intense is this headache right now on a scale of 0 to 10?';
        reasoning = 'Establishing headache severity benchmark';
        isPainScale = true;
        isFinal = true;
      } else {
        dynamicStep = 'character';
        titleEn = 'What type of headache sensation are you feeling?';
        reasoning = 'Distinguishing vascular vs tension vs migraine presentation';
        options = [
          { label: 'Pulsing or throbbing rhythm like a heartbeat', code: 'throbbing_migraine', isRed: false },
          { label: 'Tight constricting band squeezing both temples', code: 'tension_band', isRed: false },
          { label: 'Sharp piercing stabbing behind one eye', code: 'cluster_eye', isRed: false },
          { label: 'Heavy dull pressure throughout the entire head', code: 'dull_holocranial', isRed: false },
        ];
      }
    }
    // Generic clinical adaptation
    else {
      if (stepIndex >= 4) {
        dynamicStep = 'severity';
        titleEn = 'Please rate the overall severity of this symptom from 0 to 10:';
        reasoning = 'Standardized triage severity scoring';
        isPainScale = true;
        isFinal = true;
      } else if (!socrates.timing && !extractedAttributes.timing) {
        dynamicStep = 'timing';
        titleEn = 'How long has this condition been troubling you?';
        reasoning = 'Establishing symptom timeline and chronicity';
        options = [
          { label: 'Started suddenly in the last 1 to 2 hours', code: 'acute_hours', isRed: true },
          { label: 'Ongoing for 1 to 3 days', code: 'few_days', isRed: false },
          { label: 'Recurring on and off for several weeks', code: 'subacute_weeks', isRed: false },
          { label: 'Chronic condition present for over a month', code: 'chronic_months', isRed: false },
        ];
      } else {
        dynamicStep = 'exacerbating';
        titleEn = 'What activities or factors make this feeling noticeably worse?';
        reasoning = 'Identifying aggravating physical or environmental triggers';
        options = [
          { label: 'Worse during movement, exertion, or walking', code: 'worse_exertion', isRed: false },
          { label: 'Worse when sitting still, bending, or lying flat', code: 'worse_posture', isRed: false },
          { label: 'Worse after meals or specific foods', code: 'worse_food', isRed: false },
          { label: 'Constant throughout the day regardless of activity', code: 'constant_intensity', isRed: false },
        ];
      }
    }

    // 4. Regional Translations for Fallback Title
    const regionalTitles: Record<string, string> = {
      en: titleEn,
      te: dynamicStep === 'severity'
        ? '0 à°¨à±à°‚à°¡à°¿ 10 à°¸à±à°•à±‡à°²à±à°²à±‹ à°®à±€ à°¸à°®à°¸à±à°¯ à°¤à±€à°µà±à°°à°¤à°¨à± à°¤à±†à°²à°¿à°¯à°œà±‡à°¯à°‚à°¡à°¿:'
        : dynamicStep === 'radiation'
        ? 'à°ˆ à°¨à±Šà°ªà±à°ªà°¿ à°®à±€ à°šà±‡à°¤à°¿à°•à°¿, à°®à±†à°¡à°•à± à°²à±‡à°¦à°¾ à°µà±€à°ªà±à°•à± à°µà±à°¯à°¾à°ªà°¿à°¸à±à°¤à±à°‚à°¦à°¾?'
        : dynamicStep === 'associations'
        ? 'à°¦à±€à°¨à°¿à°¤à±‹ à°ªà°¾à°Ÿà± à°šà±†à°®à°Ÿà°²à± à°ªà°Ÿà±à°Ÿà°¡à°‚, à°¶à±à°µà°¾à°¸ à°¤à±€à°¸à±à°•à±‹à°µà°¡à°‚à°²à±‹ à°‡à°¬à±à°¬à°‚à°¦à°¿ à°²à±‡à°¦à°¾ à°µà°¿à°•à°¾à°°à°‚ à°‰à°‚à°¦à°¾?'
        : dynamicStep === 'site'
        ? 'à°®à±€ à°¶à°°à±€à°°à°‚à°²à±‹ à°ˆ à°¨à±Šà°ªà±à°ªà°¿ à°ªà±à°°à°§à°¾à°¨à°‚à°—à°¾ à°Žà°•à±à°•à°¡ à°•à±‡à°‚à°¦à±à°°à±€à°•à±ƒà°¤à°®à±ˆ à°‰à°‚à°¦à°¿?'
        : dynamicStep === 'timing'
        ? 'à°ˆ à°¸à°®à°¸à±à°¯ à°Žà°‚à°¤ à°•à°¾à°²à°‚à°—à°¾ à°®à°¿à°®à±à°®à°²à±à°¨à°¿ à°‡à°¬à±à°¬à°‚à°¦à°¿ à°ªà±†à°¡à±à°¤à±‹à°‚à°¦à°¿?'
        : dynamicStep === 'exacerbating'
        ? 'à°¨à°¡à°µà°¡à°‚, à°¶à±à°°à°®à°¿à°‚à°šà°¡à°‚ à°²à±‡à°¦à°¾ à°†à°¹à°¾à°°à°‚ à°¤à±€à°¸à±à°•à±à°¨à±à°¨à°ªà±à°ªà±à°¡à± à°ˆ à°¨à±Šà°ªà±à°ªà°¿ à°ªà±†à°°à±à°—à±à°¤à±à°‚à°¦à°¾?'
        : 'à°®à±€à°°à± à°…à°¨à±à°­à°µà°¿à°¸à±à°¤à±à°¨à±à°¨ à°ˆ à°…à°¸à±Œà°•à°°à±à°¯ à°­à°¾à°µà°¨à°¨à± à°Žà°²à°¾ à°µà°¿à°µà°°à°¿à°¸à±à°¤à°¾à°°à±?',
      ta: dynamicStep === 'severity'
        ? '0 à®®à¯à®¤à®²à¯ 10 à®µà®°à¯ˆà®¯à®¿à®²à®¾à®© à®…à®³à®µà®¿à®²à¯ à®‰à®™à¯à®•à®³à¯ à®µà®²à®¿ à®¤à¯€à®µà®¿à®°à®¤à¯à®¤à¯ˆ à®®à®¤à®¿à®ªà¯à®ªà®¿à®Ÿà¯à®™à¯à®•à®³à¯:'
        : dynamicStep === 'radiation'
        ? 'à®‡à®¨à¯à®¤ à®µà®²à®¿ à®‰à®™à¯à®•à®³à¯ à®•à¯ˆ, à®•à®´à¯à®¤à¯à®¤à¯ à®…à®²à¯à®²à®¤à¯ à®®à¯à®¤à¯à®•à¯à®•à¯à®•à¯ à®ªà®°à®µà¯à®•à®¿à®±à®¤à®¾?'
        : dynamicStep === 'associations'
        ? 'à®‡à®¤à¯à®¤à¯à®Ÿà®©à¯ à®µà®¿à®¯à®°à¯à®µà¯ˆ, à®®à¯‚à®šà¯à®šà¯à®¤à¯ à®¤à®¿à®£à®±à®²à¯ à®…à®²à¯à®²à®¤à¯ à®•à¯à®®à®Ÿà¯à®Ÿà®²à¯ à®‰à®³à¯à®³à®¤à®¾?'
        : dynamicStep === 'site'
        ? 'à®‡à®¨à¯à®¤ à®µà®²à®¿ à®®à¯à®•à¯à®•à®¿à®¯à®®à®¾à®• à®Žà®™à¯à®•à¯ à®…à®®à¯ˆà®¨à¯à®¤à¯à®³à¯à®³à®¤à¯?'
        : dynamicStep === 'timing'
        ? 'à®‡à®¨à¯à®¤ à®ªà®¿à®°à®šà¯à®šà®©à¯ˆ à®Žà®µà¯à®µà®³à®µà¯ à®•à®¾à®²à®®à®¾à®• à®‰à®³à¯à®³à®¤à¯?'
        : dynamicStep === 'exacerbating'
        ? 'à®¨à®Ÿà®•à¯à®•à¯à®®à¯à®ªà¯‹à®¤à¯ à®…à®²à¯à®²à®¤à¯ à®‰à®£à®µà¯ à®šà®¾à®ªà¯à®ªà®¿à®Ÿà¯à®Ÿ à®ªà®¿à®±à®•à¯ à®‡à®¨à¯à®¤ à®µà®²à®¿ à®…à®¤à®¿à®•à®®à®¾à®•à®¿à®±à®¤à®¾?'
        : 'à®‡à®¨à¯à®¤ à®…à®šà¯Œà®•à®°à®¿à®¯à®¤à¯à®¤à¯ˆ à®Žà®µà¯à®µà®¾à®±à¯ à®µà®¿à®µà®°à®¿à®ªà¯à®ªà¯€à®°à¯à®•à®³à¯?',
      kn: dynamicStep === 'severity'
        ? '0 à²°à²¿à²‚à²¦ 10 à²° à²ªà³à²°à²®à²¾à²£à²¦à²²à³à²²à²¿ à²¨à²¿à²®à³à²® à²¤à³Šà²‚à²¦à²°à³†à²¯ à²¤à³€à²µà³à²°à²¤à³†à²¯à²¨à³à²¨à³ à²¤à²¿à²³à²¿à²¸à²¿:'
        : dynamicStep === 'radiation'
        ? 'à²ˆ à²¨à³‹à²µà³ à²•à³ˆ, à²•à³à²¤à³à²¤à²¿à²—à³† à²…à²¥à²µà²¾ à²¬à³†à²¨à³à²¨à²¿à²—à³† à²¹à²°à²¡à³à²¤à³à²¤à²¿à²¦à³†à²¯à³‡?'
        : dynamicStep === 'associations'
        ? 'à²‡à²¦à²°à³Šà²‚à²¦à²¿à²—à³† à²¬à³†à²µà²°à³, à²‰à²¸à²¿à²°à²¾à²Ÿà²¦ à²¤à³Šà²‚à²¦à²°à³† à²…à²¥à²µà²¾ à²µà²¾à²•à²°à²¿à²•à³† à²‡à²¦à³†à²¯à³‡?'
        : dynamicStep === 'site'
        ? 'à²ˆ à²¨à³‹à²µà³ à²®à³à²–à³à²¯à²µà²¾à²—à²¿ à²Žà²²à³à²²à²¿à²¦à³†?'
        : dynamicStep === 'timing'
        ? 'à²ˆ à²¸à²®à²¸à³à²¯à³† à²Žà²·à³à²Ÿà³ à²¸à²®à²¯à²¦à²¿à²‚à²¦ à²‡à²¦à³†?'
        : dynamicStep === 'exacerbating'
        ? 'à²¯à²¾à²µ à²šà²Ÿà³à²µà²Ÿà²¿à²•à³†à²¯à²¿à²‚à²¦ à²¨à³‹à²µà³ à²¹à³†à²šà³à²šà²¾à²—à³à²¤à³à²¤à²¦à³†?'
        : 'à²ˆ à²¨à³‹à²µà²¿à²¨ à²¸à³à²µà²°à³‚à²ª à²¹à³‡à²—à²¿à²¦à³† à²Žà²‚à²¬à³à²¦à²¨à³à²¨à³ à²µà²¿à²µà²°à²¿à²¸à²¿?',
      ml: dynamicStep === 'severity'
        ? '0 à´®àµà´¤àµ½ 10 à´µà´°àµ†à´¯àµà´³àµà´³ à´¸àµà´•àµ†à´¯à´¿à´²à´¿àµ½ à´¨à´¿à´™àµà´™à´³àµà´Ÿàµ† à´µàµ‡à´¦à´¨à´¯àµà´Ÿàµ† à´¤àµ€à´µàµà´°à´¤ à´°àµ‡à´–à´ªàµà´ªàµ†à´Ÿàµà´¤àµà´¤àµà´•:'
        : dynamicStep === 'radiation'
        ? 'à´ˆ à´µàµ‡à´¦à´¨ à´¨à´¿à´™àµà´™à´³àµà´Ÿàµ† à´•àµˆà´¯à´¿à´²àµ‡à´•àµà´•àµ‹ à´•à´´àµà´¤àµà´¤à´¿à´²àµ‡à´•àµà´•àµ‹ à´ªà´Ÿà´°àµà´¨àµà´¨àµà´£àµà´Ÿàµ‹?'
        : dynamicStep === 'associations'
        ? 'à´‡à´¤àµ‹à´ŸàµŠà´ªàµà´ªà´‚ à´µà´¿à´¯àµ¼à´ªàµà´ªàµ‹ à´¶àµà´µà´¾à´¸à´¤à´Ÿà´¸àµà´¸à´®àµ‹ à´…à´¨àµà´­à´µà´ªàµà´ªàµ†à´Ÿàµà´¨àµà´¨àµà´£àµà´Ÿàµ‹?'
        : dynamicStep === 'site'
        ? 'à´ˆ à´…à´¸àµà´µà´¸àµà´¥à´¤ à´ªàµà´°à´§à´¾à´¨à´®à´¾à´¯àµà´‚ à´Žà´µà´¿à´Ÿàµ†à´¯à´¾à´£àµ?'
        : dynamicStep === 'timing'
        ? 'à´ˆ à´¬àµà´¦àµà´§à´¿à´®àµà´Ÿàµà´Ÿàµ à´Žà´¤àµà´° à´¨à´¾à´³à´¾à´¯à´¿ à´‰à´£àµà´Ÿàµ?'
        : dynamicStep === 'exacerbating'
        ? 'à´Žà´¨àµà´¤àµ†à´™àµà´•à´¿à´²àµà´‚ à´šàµ†à´¯àµà´¯àµà´®àµà´ªàµ‹àµ¾ à´µàµ‡à´¦à´¨ à´•àµ‚à´Ÿàµà´¨àµà´¨àµà´£àµà´Ÿàµ‹?'
        : 'à´ˆ à´…à´¸àµà´µà´¸àµà´¥à´¤à´¯àµà´Ÿàµ† à´¸àµà´µà´­à´¾à´µà´‚ à´Žà´™àµà´™à´¨àµ†à´¯à´¾à´£àµ?',
      mr: dynamicStep === 'severity'
        ? '0 à¤¤à¥‡ 10 à¤šà¥à¤¯à¤¾ à¤ªà¥à¤°à¤®à¤¾à¤£à¤¾à¤¤ à¤†à¤ªà¤²à¥à¤¯à¤¾ à¤¤à¥à¤°à¤¾à¤¸à¤¾à¤šà¥€ à¤¤à¥€à¤µà¥à¤°à¤¤à¤¾ à¤¸à¤¾à¤‚à¤—à¤¾:'
        : dynamicStep === 'radiation'
        ? 'à¤¹à¥€ à¤µà¥‡à¤¦à¤¨à¤¾ à¤¹à¤¾à¤¤à¤¾à¤®à¤§à¥à¤¯à¥‡, à¤®à¤¾à¤¨à¥‡à¤®à¤§à¥à¤¯à¥‡ à¤•à¤¿à¤‚à¤µà¤¾ à¤ªà¤¾à¤ à¥€à¤¤ à¤ªà¤¸à¤°à¤¤ à¤†à¤¹à¥‡ à¤•à¤¾?'
        : dynamicStep === 'associations'
        ? 'à¤¯à¤¾à¤¸à¥‹à¤¬à¤¤ à¤˜à¤¾à¤® à¤¯à¥‡à¤£à¥‡, à¤§à¤¾à¤ª à¤²à¤¾à¤—à¤£à¥‡ à¤•à¤¿à¤‚à¤µà¤¾ à¤®à¤³à¤®à¤³ à¤œà¤¾à¤£à¤µà¤¤ à¤†à¤¹à¥‡ à¤•à¤¾?'
        : dynamicStep === 'site'
        ? 'à¤¹à¤¾ à¤¤à¥à¤°à¤¾à¤¸ à¤ªà¥à¤°à¤¾à¤®à¥à¤–à¥à¤¯à¤¾à¤¨à¥‡ à¤¨à¤•à¥à¤•à¥€ à¤•à¥à¤ à¥‡ à¤¹à¥‹à¤¤ à¤†à¤¹à¥‡?'
        : dynamicStep === 'timing'
        ? 'à¤¹à¤¾ à¤¤à¥à¤°à¤¾à¤¸ à¤•à¤¿à¤¤à¥€ à¤•à¤¾à¤³à¤¾à¤ªà¤¾à¤¸à¥‚à¤¨ à¤¸à¥à¤°à¥‚ à¤†à¤¹à¥‡?'
        : dynamicStep === 'exacerbating'
        ? 'à¤šà¤¾à¤²à¤£à¥à¤¯à¤¾à¤¨à¥‡ à¤•à¤¿à¤‚à¤µà¤¾ à¤–à¤¾à¤£à¥à¤¯à¤¾à¤¨à¥‡ à¤¹à¤¾ à¤¤à¥à¤°à¤¾à¤¸ à¤µà¤¾à¤¢à¤¤à¥‹ à¤•à¤¾?'
        : 'à¤¯à¤¾ à¤¤à¥à¤°à¤¾à¤¸à¤¾à¤šà¥‡ à¤¸à¥à¤µà¤°à¥‚à¤ª à¤•à¤¸à¥‡ à¤œà¤¾à¤£à¤µà¤¤ à¤†à¤¹à¥‡?',
    };

    const titleRegional = regionalTitles[selectedLanguage] || titleEn;

    return res.json({
      success: true,
      question: {
        id: `adaptive_q_${Date.now()}`,
        step: dynamicStep,
        title: titleEn,
        titleRegional,
        subtitle: 'Select the best matching option or use speech input',
        reasoning,
        options,
        isPainScale,
        isMultiSelect: false,
        isFinal,
      },
      extractedAttributes,
      newRedFlags,
      source: 'rule-engine',
    });
  } catch (err: any) {
    console.error('Error in adaptive question engine:', err);
    res.status(500).json({ error: 'Adaptive question generation failed' });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Free-Form Conversational NLP & Clinical Keyword Sniffer
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
router.post('/api/converse/analyze-transcript', async (req, res) => {
  try {
    const {
      transcript = '',
      opdType = 'allopathic',
      complaintId = 'chest_pain',
      selectedLanguage = 'en',
      priorKeywords = [],
    } = req.body;

    const lowerText = (transcript || '').toLowerCase();
    const isAyush = opdType === 'ayurveda';

    // 1. Sniff Red Flags
    const detectedRedFlags: string[] = [];
    if (lowerText.includes('left arm') || lowerText.includes('jaw') || lowerText.includes('shoulder')) {
      detectedRedFlags.push('Cardiac Radiation: Pain extending to left arm / shoulder / jaw');
    }
    if (lowerText.includes('crushing') || lowerText.includes('heavy pressure') || lowerText.includes('squeezing') || lowerText.includes('tightness')) {
      detectedRedFlags.push('High-Risk Sensation: Compressive crushing chest discomfort');
    }
    if (lowerText.includes('sweat') || lowerText.includes('diaphoresis') || lowerText.includes('cold sweat') || lowerText.includes('à°šà±†à°®à°Ÿ')) {
      detectedRedFlags.push('Autonomic Distress: Profuse diaphoresis with acute onset');
    }
    if (lowerText.includes('shortness of breath') || lowerText.includes('cannot breathe') || lowerText.includes('breathless') || lowerText.includes('à°¶à±à°µà°¾à°¸ à°†à°¡à°Ÿà±à°²à±‡à°¦à±')) {
      detectedRedFlags.push('Respiratory Alert: Acute breathlessness (air hunger)');
    }
    if (lowerText.includes('thunderclap') || lowerText.includes('worst headache') || lowerText.includes('sudden explosion')) {
      detectedRedFlags.push('Neurological Warning: Thunderclap headache onset pattern');
    }
    if (lowerText.includes('rigid') || lowerText.includes('rock hard') || lowerText.includes('unbearable stomach')) {
      detectedRedFlags.push('Acute Abdomen Alert: Peritoneal rigidity suspected');
    }

    // Baseline Keyword Definitions with full regional translations
    const KEYWORD_DEFINITIONS = [
      {
        id: 'problem',
        question: 'What is the problem?',
        regional: {
          te: 'à°®à±€ à°¸à°®à°¸à±à°¯ à°à°®à°¿à°Ÿà°¿? (à°¨à±Šà°ªà±à°ªà°¿ à°²à±‡à°¦à°¾ à°¬à°¾à°§ à°Žà°•à±à°•à°¡ à°‰à°‚à°¦à°¿?)',
          ta: 'à®‰à®™à¯à®•à®³à¯ à®ªà®¿à®°à®šà¯à®šà®©à¯ˆ à®Žà®©à¯à®©? (à®µà®²à®¿ à®…à®²à¯à®²à®¤à¯ à®…à®šà¯Œà®•à®°à®¿à®¯à®®à¯ à®Žà®™à¯à®•à¯à®³à¯à®³à®¤à¯?)',
          kn: 'à²¨à²¿à²®à³à²® à²¸à²®à²¸à³à²¯à³† à²à²¨à³? (à²¨à³‹à²µà³ à²…à²¥à²µà²¾ à²¤à³Šà²‚à²¦à²°à³† à²¨à²¿à²–à²°à²µà²¾à²—à²¿ à²Žà²²à³à²²à²¿à²¦à³†?)',
          ml: 'à´¨à´¿à´™àµà´™à´³àµà´Ÿàµ† à´ªàµà´°à´¶àµà´¨à´‚ à´Žà´¨àµà´¤à´¾à´£àµ? (à´µàµ‡à´¦à´¨ à´•àµƒà´¤àµà´¯à´®à´¾à´¯à´¿ à´Žà´µà´¿à´Ÿàµ†à´¯à´¾à´£àµ?)',
          mr: 'à¤¤à¥à¤®à¤šà¥€ à¤¸à¤®à¤¸à¥à¤¯à¤¾ à¤•à¤¾à¤¯ à¤†à¤¹à¥‡? (à¤¤à¥à¤°à¤¾à¤¸ à¤•à¤¿à¤‚à¤µà¤¾ à¤µà¥‡à¤¦à¤¨à¤¾ à¤¨à¤•à¥à¤•à¥€ à¤•à¥à¤ à¥‡ à¤¹à¥‹à¤¤ à¤†à¤¹à¥‡?)',
        } as Record<string, string>,
      },
      {
        id: 'duration',
        question: 'From how long have you been experiencing the symptoms?',
        regional: {
          te: 'à°ˆ à°²à°•à±à°·à°£à°¾à°²à± à°Žà°‚à°¤ à°•à°¾à°²à°‚ à°¨à±à°‚à°¡à°¿ à°‰à°¨à±à°¨à°¾à°¯à°¿?',
          ta: 'à®Žà®µà¯à®µà®³à®µà¯ à®•à®¾à®²à®®à®¾à®• à®‡à®¨à¯à®¤ à®…à®±à®¿à®•à¯à®±à®¿à®•à®³à¯ à®‰à®³à¯à®³à®©?',
          kn: 'à²Žà²·à³à²Ÿà³ à²¸à²®à²¯à²¦à²¿à²‚à²¦ à²ˆ à²²à²•à³à²·à²£à²—à²³à³ à²•à²¾à²£à²¿à²¸à²¿à²•à³Šà²‚à²¡à²¿à²µà³†?',
          ml: 'à´Žà´¤àµà´° à´¨à´¾à´³à´¾à´¯à´¿ à´ˆ à´²à´•àµà´·à´£à´™àµà´™àµ¾ à´…à´¨àµà´­à´µà´ªàµà´ªàµ†à´Ÿàµà´¨àµà´¨àµ?',
          mr: 'à¤¹à¤¾ à¤¤à¥à¤°à¤¾à¤¸ à¤•à¤¿à¤¤à¥€ à¤¦à¤¿à¤µà¤¸à¤¾à¤‚à¤ªà¤¾à¤¸à¥‚à¤¨ à¤•à¤¿à¤‚à¤µà¤¾ à¤µà¥‡à¤³à¤¾à¤ªà¤¾à¤¸à¥‚à¤¨ à¤œà¤¾à¤£à¤µà¤¤ à¤†à¤¹à¥‡?',
        } as Record<string, string>,
      },
      {
        id: 'medications',
        question: 'Have you taken any previous medications?',
        regional: {
          te: 'à°—à°¤à°‚à°²à±‹ à°²à±‡à°¦à°¾ à°‡à°Ÿà±€à°µà°² à°à°µà±ˆà°¨à°¾ à°®à°‚à°¦à±à°²à± à°¤à±€à°¸à±à°•à±à°¨à±à°¨à°¾à°°à°¾?',
          ta: 'à®®à¯à®©à¯à®ªà¯ à®à®¤à¯‡à®©à¯à®®à¯ à®®à®°à¯à®¨à¯à®¤à¯à®•à®³à¯ à®Žà®Ÿà¯à®¤à¯à®¤à¯à®•à¯à®•à¯Šà®£à¯à®Ÿà¯€à®°à¯à®•à®³à®¾?',
          kn: 'à²¹à²¿à²‚à²¦à³† à²…à²¥à²µà²¾ à²‡à²¤à³à²¤à³€à²šà³†à²—à³† à²¯à²¾à²µà³à²¦à³‡ à²”à²·à²§à²¿à²—à²³à²¨à³à²¨à³ à²¤à³†à²—à³†à²¦à³à²•à³Šà²‚à²¡à²¿à²¦à³à²¦à³€à²°à²¾?',
          ml: 'à´®àµà´®àµà´ªàµ à´Žà´¨àµà´¤àµ†à´™àµà´•à´¿à´²àµà´‚ à´®à´°àµà´¨àµà´¨àµà´•àµ¾ à´•à´´à´¿à´šàµà´šà´¿à´Ÿàµà´Ÿàµà´£àµà´Ÿàµ‹?',
          mr: 'à¤ªà¥‚à¤°à¥à¤µà¥€ à¤•à¤¿à¤‚à¤µà¤¾ à¤¸à¤§à¥à¤¯à¤¾ à¤•à¥‹à¤£à¤¤à¥€ à¤”à¤·à¤§à¥‡ à¤˜à¥‡à¤¤ à¤†à¤¹à¤¾à¤¤ à¤•à¤¾?',
        } as Record<string, string>,
      },
      {
        id: 'associations',
        question: 'Any allergies or other associated symptoms?',
        regional: {
          te: 'à°à°µà±ˆà°¨à°¾ à°…à°²à±†à°°à±à°œà±€à°²à± à°²à±‡à°¦à°¾ à°‡à°¤à°° à°¸à°‚à°¬à°‚à°§à°¿à°¤ à°²à°•à±à°·à°£à°¾à°²à± à°‰à°¨à±à°¨à°¾à°¯à°¾?',
          ta: 'à®à®¤à¯‡à®©à¯à®®à¯ à®’à®µà¯à®µà®¾à®®à¯ˆ à®…à®²à¯à®²à®¤à¯ à®ªà®¿à®± à®…à®±à®¿à®•à¯à®±à®¿à®•à®³à¯ à®‰à®³à¯à®³à®¤à®¾?',
          kn: 'à²¯à²¾à²µà³à²¦à³‡ à²…à²²à²°à³à²œà²¿ à²…à²¥à²µà²¾ à²‡à²¤à²° à²¸à²‚à²¬à²‚à²§à²¿à²¤ à²²à²•à³à²·à²£à²—à²³à³ à²‡à²µà³†à²¯à³‡?',
          ml: 'à´Žà´¨àµà´¤àµ†à´™àµà´•à´¿à´²àµà´‚ à´…à´²àµ¼à´œà´¿à´¯àµ‹ à´®à´±àµà´±àµ à´…à´¨àµà´¬à´¨àµà´§ à´²à´•àµà´·à´£à´™àµà´™à´³àµ‹ à´‰à´£àµà´Ÿàµ‹?',
          mr: 'à¤•à¤¾à¤¹à¥€ à¥²à¤²à¤°à¥à¤œà¥€ à¤•à¤¿à¤‚à¤µà¤¾ à¤‡à¤¤à¤° à¤¸à¤‚à¤¬à¤‚à¤§à¤¿à¤¤ à¤²à¤•à¥à¤·à¤£à¥‡ à¤œà¤¾à¤£à¤µà¤¤ à¤†à¤¹à¥‡à¤¤ à¤•à¤¾?',
        } as Record<string, string>,
      },
      {
        id: 'severity',
        question: 'Severity of pain or discomfort (0 to 10)?',
        regional: {
          te: 'à°¨à±Šà°ªà±à°ªà°¿ à°²à±‡à°¦à°¾ à°…à°¸à±Œà°•à°°à±à°¯ à°¤à±€à°µà±à°°à°¤ à°Žà°‚à°¤ (0 à°¨à±à°‚à°¡à°¿ 10 à°¸à±à°•à±‡à°²à±à°²à±‹)?',
          ta: 'à®µà®²à®¿à®¯à®¿à®©à¯ à®¤à¯€à®µà®¿à®°à®®à¯ à®Žà®µà¯à®µà®³à®µà¯ (0 à®®à¯à®¤à®²à¯ 10 à®µà®°à¯ˆ)?',
          kn: 'à²¨à³‹à²µà²¿à²¨ à²¤à³€à²µà³à²°à²¤à³† à²Žà²·à³à²Ÿà³ (0 à²°à²¿à²‚à²¦ 10 à²° à²ªà³à²°à²®à²¾à²£à²¦à²²à³à²²à²¿)?',
          ml: 'à´µàµ‡à´¦à´¨à´¯àµà´Ÿàµ† à´¤àµ€à´µàµà´°à´¤ à´Žà´¤àµà´°à´¯à´¾à´£àµ (0 à´®àµà´¤àµ½ 10 à´µà´°àµ†à´¯àµà´³àµà´³ à´¸àµà´•àµ†à´¯à´¿à´²à´¿àµ½)?',
          mr: 'à¤µà¥‡à¤¦à¤¨à¤¾ à¤•à¤¿à¤‚à¤µà¤¾ à¤¤à¥à¤°à¤¾à¤¸à¤¾à¤šà¥€ à¤¤à¥€à¤µà¥à¤°à¤¤à¤¾ à¤•à¤¿à¤¤à¥€ à¤†à¤¹à¥‡ (0 à¤¤à¥‡ 10 à¤šà¥à¤¯à¤¾ à¤ªà¥à¤°à¤®à¤¾à¤£à¤¾à¤¤)?',
        } as Record<string, string>,
      },
    ];

    if (isAyush) {
      KEYWORD_DEFINITIONS.push(
        {
          id: 'agni_koshtha',
          question: 'Digestive fire & bowel routine (Agni & Koshtha)?',
          regional: {
            te: 'à°®à±€ à°œà±€à°°à±à°£à°¶à°•à±à°¤à°¿ à°®à°°à°¿à°¯à± à°®à°²à°µà°¿à°¸à°°à±à°œà°¨ à°Žà°²à°¾ à°‰à°‚à°¦à°¿? (à°…à°—à±à°¨à°¿ & à°•à±‹à°·à±à° )',
            ta: 'à®‰à®™à¯à®•à®³à¯ à®šà¯†à®°à®¿à®®à®¾à®© à®šà®•à¯à®¤à®¿ à®®à®±à¯à®±à¯à®®à¯ à®•à¯à®Ÿà®²à¯ à®ªà®´à®•à¯à®•à®®à¯ à®Žà®ªà¯à®ªà®Ÿà®¿ à®‰à®³à¯à®³à®¤à¯? (à®…à®•à¯à®©à®¿ & à®•à¯‹à®·à¯à®Ÿà®¾)',
            kn: 'à²¨à²¿à²®à³à²® à²œà³€à²°à³à²£à²•à³à²°à²¿à²¯à³† à²®à²¤à³à²¤à³ à²®à²²à²µà²¿à²¸à²°à³à²œà²¨à³† à²¹à³‡à²—à²¿à²¦à³†? (à²…à²—à³à²¨à²¿ & à²•à³‹à²·à³à² )',
            ml: 'à´¨à´¿à´™àµà´™à´³àµà´Ÿàµ† à´¦à´¹à´¨à´¶à´•àµà´¤à´¿à´¯àµà´‚ à´®à´²à´µà´¿à´¸àµ¼à´œàµà´œà´¨ à´¶àµ€à´²à´™àµà´™à´³àµà´‚ à´Žà´™àµà´™à´¨àµ†à´¯àµà´£àµà´Ÿàµ? (à´…à´—àµà´¨à´¿ & à´•àµ‹à´·àµà´ )',
            mr: 'à¤¤à¥à¤®à¤šà¥€ à¤ªà¤šà¤¨à¤¶à¤•à¥à¤¤à¥€ à¤†à¤£à¤¿ à¤ªà¥‹à¤Ÿà¤¾à¤šà¥€ à¤¸à¤µà¤¯ à¤•à¤¶à¥€ à¤†à¤¹à¥‡? (à¤…à¤—à¥à¤¨à¥€ à¤µ à¤•à¥‹à¤·à¥à¤ )',
          } as Record<string, string>,
        },
        {
          id: 'ahara_vihara',
          question: 'Daily diet, routine & sleep patterns (Ahara-Vihara)?',
          regional: {
            te: 'à°®à±€ à°†à°¹à°¾à°°à°ªà± à°…à°²à°µà°¾à°Ÿà±à°²à± à°®à°°à°¿à°¯à± à°¨à°¿à°¦à±à°° à°¸à°®à°¯à°¾à°²à± à°Žà°²à°¾ à°‰à°¨à±à°¨à°¾à°¯à°¿? (à°†à°¹à°¾à°°-à°µà°¿à°¹à°¾à°° & à°¨à°¿à°¦à±à°°)',
            ta: 'à®‰à®™à¯à®•à®³à¯ à®¤à®¿à®©à®šà®°à®¿ à®‰à®£à®µà¯ à®®à®±à¯à®±à¯à®®à¯ à®¤à¯‚à®•à¯à®• à®®à¯à®±à¯ˆà®•à®³à¯ à®Žà®©à¯à®©? (à®†à®¹à®¾à®°-à®µà®¿à®¹à®¾à®° & à®¨à®¿à®¤à¯à®¤à®¿à®°à¯ˆ)',
            kn: 'à²¨à²¿à²®à³à²® à²†à²¹à²¾à²° à²ªà²¦à³à²§à²¤à²¿ à²®à²¤à³à²¤à³ à²¨à²¿à²¦à³à²°à³†à²¯ à²®à²¾à²¦à²°à²¿ à²¹à³‡à²—à²¿à²¦à³†? (à²†à²¹à²¾à²°-à²µà²¿à²¹à²¾à²° & à²¨à²¿à²¦à³à²°à³†)',
            ml: 'à´¨à´¿à´™àµà´™à´³àµà´Ÿàµ† à´­à´•àµà´·à´£à´°àµ€à´¤à´¿à´•à´³àµà´‚ à´‰à´±à´•àµà´• à´¶àµ€à´²à´™àµà´™à´³àµà´‚ à´Žà´¨àµà´¤àµŠà´•àµà´•àµ†à´¯à´¾à´£àµ? (à´†à´¹à´¾à´°-à´µà´¿à´¹à´¾à´° & à´¨à´¿à´¦àµà´°)',
            mr: 'à¤¤à¥à¤®à¤šà¤¾ à¤†à¤¹à¤¾à¤° à¤†à¤£à¤¿ à¤à¥‹à¤ªà¥‡à¤šà¥€ à¤¦à¤¿à¤¨à¤šà¤°à¥à¤¯à¤¾ à¤•à¤¶à¥€ à¤†à¤¹à¥‡? (à¤†à¤¹à¤¾à¤°-à¤µà¤¿à¤¹à¤¾à¤° à¤µ à¤¨à¤¿à¤¦à¥à¤°à¤¾)',
          } as Record<string, string>,
        }
      );
    }

    const ai = aiConfigured();
    let analysisResult: any = null;

    if (ai && transcript.trim().length > 10) {
      try {
        const prompt = `You are an expert clinical intake AI at MediKiosk+.
The patient explained their problem in free-form words (spoken/typed):
"${transcript}"

OPD Department: ${opdType} (Modern Allopathic or Classical Ayurveda)
Selected Language: ${selectedLanguage}

Evaluate which of these required clinical keywords/questions the patient has already explained:
1. 'problem': What is the problem & where is it?
2. 'duration': From how long / duration / onset?
3. 'medications': Have they taken prior medicines, painkillers, home remedies, or none?
4. 'associations': Any allergies, nausea, vomiting, sweating, breathlessness, fever, or none?
5. 'severity': Pain or distress rating (0-10 or mild/moderate/severe/none)?
${isAyush ? "6. 'agni_koshtha': Digestion / appetite / constipation / bowel habits?\n7. 'ahara_vihara': Daily diet, sleep (Nidra), and routine?" : ""}

Respond ONLY with valid JSON:
{
  "evaluatedKeywords": [
    { "id": "problem", "isCovered": boolean, "extractedDetail": string or null },
    { "id": "duration", "isCovered": boolean, "extractedDetail": string or null },
    { "id": "medications", "isCovered": boolean, "extractedDetail": string or null },
    { "id": "associations", "isCovered": boolean, "extractedDetail": string or null },
    { "id": "severity", "isCovered": boolean, "extractedDetail": string or null }
    ${isAyush ? ',{ "id": "agni_koshtha", "isCovered": boolean, "extractedDetail": string or null }, { "id": "ahara_vihara", "isCovered": boolean, "extractedDetail": string or null }' : ""}
  ],
  "extractedSocrates": {
    "site": string,
    "onset": string,
    "character": string,
    "radiation": string,
    "associations": string[],
    "timing": string,
    "severity": number,
    "medications": string[],
    ${isAyush ? '"agni": string, "koshtha": string, "aharaVihara": string,' : ""}
    "allergies": string
  },
  "emergencyFlags": string[]
}`;

        const parsed = JSON.parse((await aiText({
          prompt,
          modelKind: 'fast',
          json: true,
        })).trim() || '{}');
        if (parsed.evaluatedKeywords) {
          analysisResult = parsed;
        }
      } catch (aiErr: any) {
        console.warn('[Transcript Analyzer] AI error, using smart rule engine:', aiErr?.message || aiErr);
      }
    }

    // Deterministic Rule-Engine Fallback
    const priorMap = new Map<string, any>((priorKeywords || []).map((k: any) => [k.id, k]));

    // Regex and semantic matching for each dimension
    const hasProblem = lowerText.length > 5 && (
      lowerText.includes('pain') || lowerText.includes('ache') || lowerText.includes('chest') ||
      lowerText.includes('stomach') || lowerText.includes('head') || lowerText.includes('fever') ||
      lowerText.includes('cough') || lowerText.includes('breath') || lowerText.includes('rash') ||
      lowerText.includes('à°¨à±Šà°ªà±à°ªà°¿') || lowerText.includes('à°¬à°¾à°§') || lowerText.includes('à®µà®²à®¿') ||
      lowerText.includes('à®¨à¯‹à®µà¯') || lowerText.includes('à´µàµ‡à´¦à´¨') || lowerText.includes('à¤¤à¥à¤°à¤¾à¤¸') ||
      lowerText.includes('à¤µà¥‡à¤¦à¤¨à¤¾') || lowerText.includes('problem') || lowerText.includes('suffering')
    );

    const hasDuration = (
      lowerText.includes('day') || lowerText.includes('hour') || lowerText.includes('week') ||
      lowerText.includes('month') || lowerText.includes('year') || lowerText.includes('since') ||
      lowerText.includes('yesterday') || lowerText.includes('morning') || lowerText.includes('night') ||
      lowerText.includes('à°°à±‹à°œà±') || lowerText.includes('à°—à°‚à°Ÿ') || lowerText.includes('à®¨à®¾à®³à¯') ||
      lowerText.includes('à®®à®£à®¿') || lowerText.includes('à²¦à²¿à²¨') || lowerText.includes('à²—à²‚à²Ÿà³†') ||
      lowerText.includes('à´¦à´¿à´µà´¸à´‚') || lowerText.includes('à´®à´£à´¿à´•àµà´•àµ‚àµ¼') || lowerText.includes('à¤¦à¤¿à¤µà¤¸') ||
      lowerText.includes('à¤¤à¤¾à¤¸') || /\d+\s*(days?|hrs?|hours?|weeks?|months?|m|d|h)/i.test(lowerText)
    );

    const hasMedications = (
      lowerText.includes('medicine') || lowerText.includes('tablet') || lowerText.includes('pill') ||
      lowerText.includes('syrup') || lowerText.includes('paracetamol') || lowerText.includes('dolo') ||
      lowerText.includes('aspirin') || lowerText.includes('antibiotic') || lowerText.includes('none') ||
      lowerText.includes('no medicine') || lowerText.includes('not taken') || lowerText.includes('à°®à°‚à°¦à±') ||
      lowerText.includes('à°®à°¾à°¤à±à°°') || lowerText.includes('à®®à®°à¯à®¨à¯à®¤à¯') || lowerText.includes('à²®à²¾à²¤à³à²°à³†') ||
      lowerText.includes('à´®à´°àµà´¨àµà´¨àµ') || lowerText.includes('à¤”à¤·à¤§') || lowerText.includes('à¤—à¥‹à¤³à¥€')
    );

    const hasAssociations = (
      lowerText.includes('allergy') || lowerText.includes('allergies') || lowerText.includes('sweat') ||
      lowerText.includes('vomit') || lowerText.includes('nausea') || lowerText.includes('dizzy') ||
      lowerText.includes('fever') || lowerText.includes('no allergy') || lowerText.includes('nothing else') ||
      lowerText.includes('à°…à°²à±†à°°à±à°œà±€') || lowerText.includes('à°µà°¾à°‚à°¤à±à°²à±') || lowerText.includes('à°šà±†à°®à°Ÿ') ||
      lowerText.includes('à®’à®µà¯à®µà®¾à®®à¯ˆ') || lowerText.includes('à®µà®¾à®¨à¯à®¤à®¿') || lowerText.includes('à²…à²²à²°à³à²œà²¿') ||
      lowerText.includes('à²µà²¾à²‚à²¤à²¿') || lowerText.includes('à´›àµ¼à´¦àµà´¦à´¿') || lowerText.includes('à¤‰à¤²à¤Ÿà¥à¤¯à¤¾')
    );

    const hasSeverity = (
      /\b([0-9]|10)\s*(\/|\s*out of\s*)\s*10\b/i.test(lowerText) ||
      /\b([0-9]|10)\s*(scale|severity|score|level)\b/i.test(lowerText) ||
      lowerText.includes('severe') || lowerText.includes('mild') || lowerText.includes('moderate') ||
      lowerText.includes('unbearable') || lowerText.includes('worst') || lowerText.includes('à°¤à±€à°µà±à°°') ||
      lowerText.includes('à°¸à°¾à°§à°¾à°°à°£') || lowerText.includes('à®•à®Ÿà¯à®®à¯ˆà®¯à®¾à®©') || lowerText.includes('à®²à¯‡à®šà®¾à®©') ||
      lowerText.includes('à²¤à³€à²µà³à²°') || lowerText.includes('à²•à´ à´¿à´¨à´®à´¾à´¯') || lowerText.includes('à¤…à¤¸à¤¹à¥à¤¯') || lowerText.includes('à¤¤à¥€à¤µà¥à¤°')
    );

    const hasAgniKoshtha = isAyush && (
      lowerText.includes('digest') || lowerText.includes('motion') || lowerText.includes('constipat') ||
      lowerText.includes('gas') || lowerText.includes('acidity') || lowerText.includes('appetite') ||
      lowerText.includes('hungry') || lowerText.includes('bowel') || lowerText.includes('à°œà±€à°°à±à°£') ||
      lowerText.includes('à°®à°²') || lowerText.includes('à®šà¯†à®°à®¿à®®à®¾à®©') || lowerText.includes('à®®à®²à®®à¯') ||
      lowerText.includes('à²œà³€à²°à³à²£') || lowerText.includes('à²¦à´¹à´¨') || lowerText.includes('à¤ªà¤šà¤¨') || lowerText.includes('à¤¶à¥Œà¤š')
    );

    const hasAharaVihara = isAyush && (
      lowerText.includes('diet') || lowerText.includes('food') || lowerText.includes('sleep') ||
      lowerText.includes('insomnia') || lowerText.includes('rice') || lowerText.includes('spicy') ||
      lowerText.includes('oily') || lowerText.includes('routine') || lowerText.includes('à°†à°¹à°¾à°°') ||
      lowerText.includes('à°¨à°¿à°¦à±à°°') || lowerText.includes('à®‰à®£à®µà¯') || lowerText.includes('à®¤à¯‚à®•à¯à®•à®®à¯') ||
      lowerText.includes('à²†à²¹à²¾à²°') || lowerText.includes('à²¨à²¿à²¦à³à²°à³†') || lowerText.includes('à´­à´•àµà´·à´£') ||
      lowerText.includes('à´‰à´±à´•àµà´•') || lowerText.includes('à¤œà¥‡à¤µà¤£') || lowerText.includes('à¤à¥‹à¤ª')
    );

    // Build the evaluated keyword array
    const keywords = KEYWORD_DEFINITIONS.map((def) => {
      const prior = priorMap.get(def.id);
      let isCovered = prior?.isCovered || false;
      let extractedDetail: string | null = prior?.extractedDetail || null;

      if (analysisResult?.evaluatedKeywords) {
        const found = analysisResult.evaluatedKeywords.find((k: any) => k.id === def.id);
        if (found) {
          isCovered = isCovered || Boolean(found.isCovered);
          if (found.extractedDetail) extractedDetail = found.extractedDetail;
        }
      } else {
        // Use deterministic rule matches
        if (def.id === 'problem' && hasProblem) {
          isCovered = true;
          if (!extractedDetail) extractedDetail = transcript.slice(0, 45);
        } else if (def.id === 'duration' && hasDuration) {
          isCovered = true;
          if (!extractedDetail) extractedDetail = 'Duration stated';
        } else if (def.id === 'medications' && hasMedications) {
          isCovered = true;
          if (!extractedDetail) extractedDetail = 'Medications noted';
        } else if (def.id === 'associations' && hasAssociations) {
          isCovered = true;
          if (!extractedDetail) extractedDetail = 'Associated symptoms noted';
        } else if (def.id === 'severity' && hasSeverity) {
          isCovered = true;
          if (!extractedDetail) extractedDetail = 'Severity score specified';
        } else if (def.id === 'agni_koshtha' && hasAgniKoshtha) {
          isCovered = true;
          if (!extractedDetail) extractedDetail = 'Agni/Koshtha evaluated';
        } else if (def.id === 'ahara_vihara' && hasAharaVihara) {
          isCovered = true;
          if (!extractedDetail) extractedDetail = 'Ahara-Vihara evaluated';
        }
      }

      return {
        id: def.id,
        question: def.question,
        questionRegional: def.regional[selectedLanguage] || def.question,
        isCovered,
        extractedDetail,
      };
    });

    const missingKeywords = keywords.filter((k) => !k.isCovered).map((k) => k.id);
    const allCovered = missingKeywords.length === 0;

    // Determine targeted follow-up question for the first missing keyword
    let nextFollowupQuestion: any = null;
    if (!allCovered) {
      const nextTarget = keywords.find((k) => !k.isCovered);
      if (nextTarget) {
        nextFollowupQuestion = {
          keywordId: nextTarget.id,
          prompt: nextTarget.question,
          promptRegional: nextTarget.questionRegional,
        };
      }
    }

    const mergedRedFlags = Array.from(
      new Set([...detectedRedFlags, ...(analysisResult?.emergencyFlags || [])])
    );

    const extractedSocrates = analysisResult?.extractedSocrates || {
      site: hasProblem ? transcript.slice(0, 40) : undefined,
      timing: hasDuration ? 'Reported during intake' : undefined,
      severity: hasSeverity ? 7 : undefined,
    };

    res.json({
      keywords,
      allCovered,
      missingKeywords,
      nextFollowupQuestion,
      extractedSocrates,
      redFlags: mergedRedFlags,
      transcript,
    });
  } catch (err: any) {
    console.error('Error in analyze-transcript:', err);
    res.status(500).json({ error: 'Transcript analysis failed', detail: err.message });
  }
});

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// FHIR R4 ABDM Gateway Push
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€


export default router;
