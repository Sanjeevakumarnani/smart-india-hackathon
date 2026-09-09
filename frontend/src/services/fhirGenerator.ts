import { ClinicalSummary, DigitizedDocument, HistoryObject, PatientProfile } from '../types';

export function generateFhirR4Bundle(
  patient: PatientProfile | null,
  history: HistoryObject,
  summary: ClinicalSummary,
  documents: DigitizedDocument[]
): any {
  const timestamp = new Date().toISOString();
  const bundleId = `urn:uuid:${crypto.randomUUID ? crypto.randomUUID() : 'bndl-' + Date.now()}`;
  const patientId = patient?.id || 'PAT-DEMO-001';
  const compositionId = `urn:uuid:${crypto.randomUUID ? crypto.randomUUID() : 'comp-' + Date.now()}`;

  const entries: any[] = [];

  // 1. Composition Resource (Document Header)
  entries.push({
    fullUrl: compositionId,
    resource: {
      resourceType: 'Composition',
      id: 'comp-medikiosk-01',
      status: 'final',
      type: {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: '371531000',
            display: 'Clinical report (record artifact)',
          },
        ],
        text: 'MediKiosk+ Intake & Triage Summary',
      },
      subject: {
        reference: `Patient/${patientId}`,
        display: patient?.fullName || 'Anonymous Patient',
      },
      date: timestamp,
      author: [
        {
          reference: 'Device/medikiosk-kiosk-unit-01',
          display: 'MediKiosk+ Automated Triage Terminal v2.4',
        },
      ],
      title: 'Multilingual Clinical Case-Taking & Triage Record',
      section: [
        {
          title: 'Chief Complaint & History of Present Illness',
          code: {
            coding: [{ system: 'http://loinc.org', code: '10154-3', display: 'Chief complaint' }],
          },
          text: {
            status: 'generated',
            div: `<div xmlns="http://www.w3.org/1999/xhtml"><p><strong>CC:</strong> ${summary.chiefComplaint}</p><p><strong>HPI:</strong> ${summary.hpi}</p></div>`,
          },
        },
        {
          title: 'Past Medical History & Allergies',
          code: {
            coding: [{ system: 'http://loinc.org', code: '11348-0', display: 'History of Past illness' }],
          },
          text: {
            status: 'generated',
            div: `<div xmlns="http://www.w3.org/1999/xhtml"><p>${summary.pastHistory}</p><p><strong>Allergies:</strong> ${summary.allergies}</p></div>`,
          },
        },
        {
          title: 'Provisional Diagnosis & Triage Impression',
          code: {
            coding: [{ system: 'http://loinc.org', code: '11301-9', display: 'Provisional diagnosis' }],
          },
          text: {
            status: 'generated',
            div: `<div xmlns="http://www.w3.org/1999/xhtml"><ul>${summary.differentialDiagnosis.map((d) => `<li>${d}</li>`).join('')}</ul><p><strong>Plan:</strong> ${summary.provisionalPlan}</p></div>`,
          },
        },
      ],
    },
  });

  // 2. Patient Resource
  entries.push({
    fullUrl: `Patient/${patientId}`,
    resource: {
      resourceType: 'Patient',
      id: patientId,
      identifier: [
        {
          system: 'https://healthid.ndhm.gov.in',
          value: patient?.abhaId || '91-0000-0000-0000',
          type: {
            coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'MR', display: 'ABHA Number' }],
          },
        },
        {
          system: 'https://uidai.gov.in',
          value: `XXXXXXXX${patient?.aadhaarLast4 || '0000'}`,
          type: {
            coding: [{ system: 'http://terminology.hl7.org/CodeSystem/v2-0203', code: 'NI', display: 'National Identity (Aadhaar)' }],
          },
        },
      ],
      name: [
        {
          use: 'official',
          text: patient?.fullName || 'Patient Name',
        },
      ],
      gender: patient?.gender?.toLowerCase() || 'unknown',
      birthDate: patient?.age ? `${new Date().getFullYear() - patient.age}-01-01` : '1970-01-01',
      telecom: [
        {
          system: 'phone',
          value: patient?.phone || '+91 9000000000',
          use: 'mobile',
        },
      ],
      address: [
        {
          city: patient?.city || 'New Delhi',
          state: patient?.state || 'Delhi',
          country: 'IND',
        },
      ],
    },
  });

  // 3. Condition (Chief Complaint & ICD-10)
  const isCardiac = history.chiefComplaint.toLowerCase().includes('chest');
  entries.push({
    fullUrl: `Condition/cond-01`,
    resource: {
      resourceType: 'Condition',
      id: 'cond-01',
      clinicalStatus: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-clinical', code: 'active' }],
      },
      verificationStatus: {
        coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-ver-status', code: 'provisional' }],
      },
      category: [
        {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/condition-category', code: 'encounter-diagnosis' }],
        },
      ],
      code: {
        coding: [
          {
            system: 'http://hl7.org/fhir/sid/icd-10',
            code: isCardiac ? 'I20.9' : 'K30',
            display: isCardiac ? 'Angina pectoris, unspecified' : 'Functional dyspepsia',
          },
          {
            system: 'http://snomed.info/sct',
            code: isCardiac ? '29857009' : '54586004',
            display: isCardiac ? 'Chest pain' : 'Abdominal pain',
          },
        ],
        text: history.chiefComplaint,
      },
      subject: {
        reference: `Patient/${patientId}`,
      },
      recordedDate: timestamp,
      severity: {
        coding: [
          {
            system: 'http://snomed.info/sct',
            code: history.socrates.severity >= 7 ? '24484000' : '6736007',
            display: history.socrates.severity >= 7 ? 'Severe' : 'Moderate',
          },
        ],
      },
    },
  });

  // 4. Observations (Pain Score & SOCRATES)
  entries.push({
    fullUrl: `Observation/obs-pain-01`,
    resource: {
      resourceType: 'Observation',
      id: 'obs-pain-01',
      status: 'final',
      category: [
        {
          coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'survey' }],
        },
      ],
      code: {
        coding: [{ system: 'http://loinc.org', code: '72514-3', display: 'Pain severity - 0-10 verbal numeric rating' }],
        text: 'Pain Severity Numerical Rating Scale (NRS)',
      },
      subject: { reference: `Patient/${patientId}` },
      effectiveDateTime: timestamp,
      valueQuantity: {
        value: history.socrates.severity || 0,
        unit: 'score {0-10}',
        system: 'http://unitsofmeasure.org',
        code: '{score}',
      },
      component: [
        {
          code: { text: 'Anatomical Site' },
          valueString: history.socrates.site || 'Unspecified',
        },
        {
          code: { text: 'Radiation' },
          valueString: history.socrates.radiation || 'None',
        },
        {
          code: { text: 'Character' },
          valueString: history.socrates.character || 'Unspecified',
        },
      ],
    },
  });

  // 5. AYUSH Observation if Ayurveda mode
  if (history.opdType === 'ayurveda' && history.ayush) {
    entries.push({
      fullUrl: `Observation/obs-ayush-01`,
      resource: {
        resourceType: 'Observation',
        id: 'obs-ayush-01',
        status: 'final',
        category: [
          {
            coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'exam' }],
          },
        ],
        code: {
          coding: [{ system: 'https://ayush.gov.in/namaste-portal', code: 'NAMASTE-DP-01', display: 'Dashavidha Pariksha - Deha Prakriti & Agni' }],
          text: 'Ayurveda Dashavidha Rogi Pariksha',
        },
        subject: { reference: `Patient/${patientId}` },
        effectiveDateTime: timestamp,
        valueString: `Prakriti: ${history.ayush.prakriti} (V:${history.ayush.vataScore}, P:${history.ayush.pittaScore}, K:${history.ayush.kaphaScore}) | Agni: ${history.ayush.agni} | Koshtha: ${history.ayush.koshtha}`,
      },
    });
  }

  // 6. Document Observations for Abnormal Lab Values
  documents.forEach((doc, idx) => {
    doc.labValues.filter((l) => l.isAbnormal).forEach((lab, lIdx) => {
      entries.push({
        fullUrl: `Observation/obs-lab-${idx}-${lIdx}`,
        resource: {
          resourceType: 'Observation',
          id: `obs-lab-${idx}-${lIdx}`,
          status: 'final',
          category: [
            {
              coding: [{ system: 'http://terminology.hl7.org/CodeSystem/observation-category', code: 'laboratory' }],
            },
          ],
          code: {
            text: lab.test,
          },
          subject: { reference: `Patient/${patientId}` },
          effectiveDateTime: doc.date ? `${doc.date}T00:00:00Z` : timestamp,
          valueString: `${lab.value} ${lab.unit}`,
          interpretation: [
            {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation',
                  code: lab.status.includes('HIGH') ? 'H' : 'L',
                  display: lab.status,
                },
              ],
            },
          ],
          referenceRange: [
            {
              text: lab.reference,
            },
          ],
        },
      });
    });
  });

  return {
    resourceType: 'Bundle',
    id: bundleId,
    type: 'document',
    timestamp: timestamp,
    meta: {
      profile: ['https://nrces.in/ndhm/fhir/r4/StructureDefinition/ClinicalArtifactBundle'],
    },
    entry: entries,
  };
}
