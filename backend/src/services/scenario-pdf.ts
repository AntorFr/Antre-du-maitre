import type { Scenario, ScenarioSession, TodoItem } from '@prisma/client';
import PDFDocument from 'pdfkit';

import { normalizeScenarioData } from '../domain/scenario-state.js';
import { readNumberArray } from '../utils/json-fields.js';

export type ScenarioPdfInput = Scenario & {
  sessions: ScenarioSession[];
  todoItems: TodoItem[];
};

const TODO_CATEGORY_LABELS: Record<TodoItem['category'], string> = {
  FICHES_MONSTRES: 'Fiches monstres',
  FICHES_PNJS: 'Fiches PNJs',
  CARTES: 'Cartes Battle Mats',
  DEROULEMENTS: 'Deroulements et options',
  AUTRE: 'Autre',
};

export async function renderScenarioPdf(
  scenario: ScenarioPdfInput,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: 'A4',
      margin: 48,
      info: {
        Title: scenario.title,
        Author: "L'Antre du Maitre",
        Subject: 'Scenario CoF Mini',
      },
    });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('error', reject);
    doc.on('end', () => resolve(Buffer.concat(chunks)));

    writeScenario(doc, scenario);
    doc.end();
  });
}

function writeScenario(doc: PDFKit.PDFDocument, scenario: ScenarioPdfInput) {
  const data = normalizeScenarioData(scenario.data);

  doc.font('Helvetica-Bold').fontSize(22).fillColor('#2A1F5C').text(scenario.title);
  doc
    .moveDown(0.35)
    .font('Helvetica')
    .fontSize(10)
    .fillColor('#666666')
    .text(`Chroniques Oubliees Mini - export ${formatDate(new Date())}`);

  doc.moveDown(1);
  section(doc, 'Resume');
  keyValue(doc, 'Statut', scenario.status);
  keyValue(doc, 'Ambiance', data.ambiance ?? 'Non definie');
  keyValue(doc, 'Lieu', data.lieu?.nom ?? 'Non defini');
  keyValue(doc, 'Quete', data.quete ?? 'Non definie');
  keyValue(doc, 'Duree estimee', data.sessionning ? `${data.sessionning.dureeTotaleEstimeeMin} min` : 'Non definie');

  if (data.lieu?.description) {
    paragraph(doc, data.lieu.description);
  }

  if (data.antagoniste) {
    section(doc, 'Antagoniste');
    keyValue(doc, 'Nom', data.antagoniste.nom);
    keyValue(doc, 'Nature', data.antagoniste.nature);
    if (data.antagoniste.monsterId) keyValue(doc, 'Monstre DRS', data.antagoniste.monsterId);
    paragraph(doc, data.antagoniste.motivation);
  }

  if (data.pnjs.length > 0) {
    section(doc, 'PNJs');
    for (const pnj of data.pnjs) {
      bullet(doc, `${pnj.nom} (${pnj.role}) - ${pnj.description} Motivation : ${pnj.motivation}`);
    }
  }

  if (data.gameplay) {
    section(doc, 'Types de defis');
    keyValue(doc, 'Types', data.gameplay.types.join(', '));
    paragraph(doc, data.gameplay.notes);
  }

  if (data.actes.length > 0) {
    section(doc, 'Deroule des actes');
    for (const acte of data.actes) {
      subsection(doc, `Acte ${acte.numero} - ${acte.titre} (~${acte.dureeEstimeeMin} min)`);
      paragraph(doc, acte.description);
      if (acte.options.length > 0) {
        paragraph(doc, `Options : ${acte.options.join(' / ')}`);
      }
      if (acte.notesMJ) {
        paragraph(doc, `Notes MJ : ${acte.notesMJ}`);
      }
    }
  }

  if (data.rencontres.length > 0) {
    section(doc, 'Rencontres');
    for (const rencontre of data.rencontres) {
      bullet(doc, `Acte ${rencontre.acteNumero} - ${rencontre.nombre} x ${rencontre.monsterId}. ${rencontre.contexte}`);
      if (rencontre.carteBattleMat) {
        bullet(
          doc,
          `Carte : ${rencontre.carteBattleMat.id} - ${rencontre.carteBattleMat.nom} (Vol.${rencontre.carteBattleMat.volume}, p.${rencontre.carteBattleMat.pages.join('-')})`,
          16,
        );
      }
      if (rencontre.recompense) {
        bullet(doc, `Recompense : ${rencontre.recompense}`, 16);
      }
    }
  }

  if (scenario.sessions.length > 0) {
    section(doc, 'Sessions prevues');
    for (const session of scenario.sessions) {
      const plannedActes = readNumberArray(session.plannedActes);

      bullet(
        doc,
        `Session ${session.number} - actes ${plannedActes.join(', ')} - ${session.plannedDuration ?? '-'} min. ${session.recapHook ?? ''}`,
      );
    }
  }

  if (scenario.todoItems.length > 0) {
    section(doc, 'Todo de preparation');
    for (const item of scenario.todoItems) {
      bullet(
        doc,
        `[${item.done ? 'x' : ' '}] ${TODO_CATEGORY_LABELS[item.category]} - ${item.label}`,
      );
    }
  }

  if (data.recompense || data.notesMJ) {
    section(doc, 'Notes MJ');
    if (data.recompense) paragraph(doc, `Recompense : ${data.recompense}`);
    if (data.notesMJ) paragraph(doc, data.notesMJ);
  }
}

function section(doc: PDFKit.PDFDocument, title: string) {
  ensureSpace(doc, 56);
  doc.moveDown(0.9);
  doc.font('Helvetica-Bold').fontSize(14).fillColor('#3C3489').text(title);
  doc.moveDown(0.25);
  doc.strokeColor('#AFA9EC').lineWidth(0.75).moveTo(doc.x, doc.y).lineTo(547, doc.y).stroke();
  doc.moveDown(0.45);
}

function subsection(doc: PDFKit.PDFDocument, title: string) {
  ensureSpace(doc, 42);
  doc.moveDown(0.25);
  doc.font('Helvetica-Bold').fontSize(11).fillColor('#1a1a1a').text(title);
  doc.moveDown(0.15);
}

function keyValue(doc: PDFKit.PDFDocument, key: string, value: string) {
  ensureSpace(doc, 24);
  doc.font('Helvetica-Bold').fontSize(10).fillColor('#1a1a1a').text(`${key} : `, {
    continued: true,
  });
  doc.font('Helvetica').fillColor('#333333').text(value);
}

function paragraph(doc: PDFKit.PDFDocument, text: string) {
  ensureSpace(doc, 36);
  doc.font('Helvetica').fontSize(10).fillColor('#333333').text(text, {
    lineGap: 2,
  });
  doc.moveDown(0.25);
}

function bullet(doc: PDFKit.PDFDocument, text: string, indent = 0) {
  ensureSpace(doc, 28);
  const x = doc.x + indent;
  doc.font('Helvetica').fontSize(10).fillColor('#333333').text(`- ${text}`, x, doc.y, {
    lineGap: 2,
  });
  doc.moveDown(0.15);
}

function ensureSpace(doc: PDFKit.PDFDocument, height: number) {
  if (doc.y + height > doc.page.height - doc.page.margins.bottom) {
    doc.addPage();
  }
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}
