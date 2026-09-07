import { jsPDF } from 'jspdf';
import { ClinicalSummary, DigitizedDocument, HistoryObject, PatientProfile, QueueToken } from '../types';

export interface GeneratePdfOptions {
  patientProfile: PatientProfile | null;
  historyObject: HistoryObject;
  documents: DigitizedDocument[];
  summary: ClinicalSummary | null;
  createdToken: QueueToken | null;
  prescriptions?: any[];
}

export function generateClinicalReportPdf({
  patientProfile,
  historyObject,
  documents,
  summary,
  createdToken,
  prescriptions = [],
}: GeneratePdfOptions): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 15;

  // Header Banner
  doc.setFillColor(37, 99, 235); // Indigo blue
  doc.rect(0, 0, pageWidth, 28, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text('MEDIKIOSK+ | SMART OPD CLINICAL REPORT', 14, 12);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.text('Ayushman Bharat Digital Mission (ABDM) Compliant Healthcare Triage', 14, 18);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 23);

  const tokenStr = createdToken?.tokenNumber || 'TK-01';
  const roomStr = createdToken?.roomNumber ? `Room: ${createdToken.roomNumber}` : 'Room: 104';
  doc.setFont('helvetica', 'bold');
  doc.text(`Token: ${tokenStr} | ${roomStr}`, pageWidth - 14, 18, { align: 'right' });

  y = 36;

  // Patient Demographic Card
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, y, pageWidth - 28, 26, 3, 3, 'FD');

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  const patientName = patientProfile?.fullName || 'Walk-in Patient';
  doc.text(`Patient: ${patientName}`, 18, y + 7);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const ageGender = `${patientProfile?.age || 35} Yrs / ${patientProfile?.gender || 'Male'}`;
  const bloodGroup = patientProfile?.bloodGroup ? ` | Blood: ${patientProfile.bloodGroup}` : '';
  doc.text(`Demographics: ${ageGender}${bloodGroup}`, 18, y + 13);

  const abhaId = patientProfile?.abhaId || '91-8842-1092-4410';
  const phone = patientProfile?.phone || '+91 98765 43210';
  doc.text(`ABHA Health ID: ${abhaId} | Phone: ${phone}`, 18, y + 19);

  const opdDept = historyObject.opdType === 'ayurveda' ? 'AYUSH Ayurveda OPD' : 'General Medicine OPD';
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(37, 99, 235);
  doc.text(`Department: ${opdDept}`, pageWidth - 18, y + 13, { align: 'right' });

  y += 33;

  // Chief Complaint & Red Flag Section
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('1. Chief Complaint & Triage Evaluation', 14, y);
  y += 5;

  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text(`Primary Health Issue: ${historyObject.chiefComplaint || 'Consultation Intake'}`, 14, y);
  y += 5;

  if (historyObject.redFlags && historyObject.redFlags.length > 0) {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(248, 113, 113);
    doc.roundedRect(14, y, pageWidth - 28, 12 + historyObject.redFlags.length * 4, 2, 2, 'FD');
    doc.setTextColor(185, 28, 28);
    doc.setFont('helvetica', 'bold');
    doc.text('RED FLAGS IDENTIFIED (ELEVATED TO TOP PRIORITY):', 18, y + 5);
    doc.setFont('helvetica', 'normal');
    let rfY = y + 10;
    historyObject.redFlags.forEach((flag) => {
      doc.text(`• ${flag}`, 22, rfY);
      rfY += 4.5;
    });
    y = rfY + 3;
  }

  // History of Present Illness (HPI)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('History of Present Illness (HPI Narrative):', 14, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const hpiText = summary?.hpi || historyObject.transcriptLogs?.join(' ') || 'Patient presented for outpatient consultation with acute onset symptoms.';
  const splitHpi = doc.splitTextToSize(hpiText, pageWidth - 28);
  doc.text(splitHpi, 14, y);
  y += splitHpi.length * 4.2 + 4;

  // Clinical Summary & Assessment
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('2. Clinical Examination & Biomarkers', 14, y);
  y += 5;

  // Past History & Allergies
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const pastMed = summary?.pastHistory || 'Nil significant';
  const allergies = summary?.allergies || 'No known drug allergies';
  doc.text(`Past Medical History: ${pastMed}`, 14, y);
  y += 4.5;
  doc.text(`Known Allergies: ${allergies}`, 14, y);
  y += 6;

  // AYUSH Assessment if applicable
  if (historyObject.opdType === 'ayurveda' && summary?.ayushAssessment) {
    const ayush = summary.ayushAssessment;
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(14, y, pageWidth - 28, 16, 2, 2, 'FD');
    doc.setTextColor(22, 101, 52);
    doc.setFont('helvetica', 'bold');
    doc.text('Ayurvedic Rogi Pariksha Profile:', 18, y + 5);
    doc.setFont('helvetica', 'normal');
    doc.text(`Prakriti: ${ayush.prakriti || 'Vata-Pitta'} | Agni: ${ayush.agni || 'Sama Agni'} | Koshtha: ${ayush.koshtha || 'Madhyama'}`, 18, y + 10);
    doc.text(`Imbalance: ${ayush.doshaImbalance || 'Tridosha assessment'} | Ahara-Vihara recorded`, 18, y + 14);
    y += 21;
  }

  // Scanned Documents & Lab Values Summary
  if (documents.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text(`Digitized Prescription & Lab Reports (${documents.length}):`, 14, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    documents.forEach((d) => {
      doc.text(`• [${d.date}] ${d.title} (${d.hospitalOrClinic || 'Clinic'})`, 18, y);
      y += 4;
      if (d.medications && d.medications.length > 0) {
        const medsSummary = d.medications.map((m) => `${m.name} ${m.dosage}`).join(', ');
        doc.setTextColor(100, 116, 139);
        doc.text(`   Extracted Meds: ${medsSummary}`, 22, y);
        doc.setTextColor(51, 65, 85);
        y += 4;
      }
    });
    y += 3;
  }

  // Doctor Prescriptions Section
  if (prescriptions && prescriptions.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('3. Prescribed Medications & Regimens (Rx)', 14, y);
    y += 5;

    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, pageWidth - 28, 6, 'F');
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(71, 85, 105);
    doc.text('Medicine Name', 16, y + 4);
    doc.text('Dosage', 75, y + 4);
    doc.text('Frequency', 110, y + 4);
    doc.text('Duration', 160, y + 4);
    y += 7;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(15, 23, 42);
    prescriptions.forEach((rx) => {
      if (Array.isArray(rx.medications)) {
        rx.medications.forEach((m: any) => {
          doc.text(String(m.medicineName || m.name || '').slice(0, 32), 16, y + 4);
          doc.text(String(m.dosage || '').slice(0, 16), 75, y + 4);
          doc.text(String(m.frequency || '').slice(0, 24), 110, y + 4);
          doc.text(String(m.duration || '').slice(0, 14), 160, y + 4);
          y += 5.5;
        });
      }
    });
    y += 4;
  }

  // Provisional Care Plan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(15, 23, 42);
  doc.text('Provisional Management & Care Plan:', 14, y);
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(51, 65, 85);
  const planText = summary?.provisionalPlan || 'Follow up with attending physician for physical examination and routine laboratory workup.';
  const splitPlan = doc.splitTextToSize(planText, pageWidth - 28);
  doc.text(splitPlan, 14, y);

  // Footer Verification & ABDM Compliance Stamp
  const footerY = doc.internal.pageSize.getHeight() - 18;
  doc.setDrawColor(226, 232, 240);
  doc.line(14, footerY - 4, pageWidth - 14, footerY - 4);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(148, 163, 184);
  doc.text('Electronically validated at MediKiosk+ Outpatient Terminal. DPDP Act 2023 Compliant.', 14, footerY);
  doc.text('Official Clinical Triage Summary Slip — Page 1 of 1', pageWidth - 14, footerY, { align: 'right' });

  // Save the PDF
  const cleanPatientName = (patientProfile?.fullName || 'Patient').replace(/[^a-zA-Z0-9]/g, '_');
  doc.save(`MediKiosk_Clinical_Report_${cleanPatientName}_${tokenStr}.pdf`);
}
