/**
 * Export Excel (.xlsx) du suivi d'un tournoi — généré côté client via ExcelJS.
 *
 * ExcelJS est lourd : on le charge en import dynamique pour ne pas plomber le bundle
 * initial (et éviter tout passage côté serveur). Quatre mises en forme au choix, chacune
 * pensée pour un usage concret de l'organisateur.
 */
import type { Workbook, Worksheet, Fill } from 'exceljs';
import { formatDay, formatTime } from '$lib/format';
import type { VolunteerTournament } from '$lib/server/services/signup-service';

export type XlsxFormat = 'poste' | 'matrix' | 'shift' | 'contacts';

export const XLSX_FORMATS: { value: XlsxFormat; label: string; description: string }[] = [
	{
		value: 'poste',
		label: 'Par poste',
		description: 'Un onglet par poste, créneaux et bénévoles.'
	},
	{
		value: 'matrix',
		label: 'Matrice',
		description: 'Bénévoles × créneaux (✓ / ?), cases colorées.'
	},
	{
		value: 'shift',
		label: 'Par créneau',
		description: 'Une ligne par créneau, places et inscrits.'
	},
	{
		value: 'contacts',
		label: 'Bénévoles & contacts',
		description: 'Liste des bénévoles avec téléphone et nombre de créneaux.'
	}
];

const FILL_AVAILABLE: Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6F5E3' } };
const FILL_MAYBE: Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFCEFCB' } };
const FILL_HEADER: Fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF1F5' } };

function timeRange(s: { startsAt: Date; endsAt: Date }): string {
	return `${formatTime(s.startsAt)}–${formatTime(s.endsAt)}`;
}

/** « Nom (note) » si une note est présente, sinon juste le nom. */
function withNote(su: { name: string; note: string | null }): string {
	return su.note ? `${su.name} (${su.note})` : su.name;
}

/** Style commun d'une ligne d'en-tête (gras + fond léger). */
function styleHeaderRow(ws: Worksheet, rowNumber: number) {
	const row = ws.getRow(rowNumber);
	row.font = { bold: true };
	row.eachCell((cell) => {
		cell.fill = FILL_HEADER;
	});
}

/** Format « Par poste » : un onglet par poste. */
function buildPoste(wb: Workbook, t: VolunteerTournament) {
	for (const p of t.positions) {
		// Nom d'onglet : Excel interdit certains caractères et limite à 31 car.
		const safe = p.name.replace(/[\\/?*[\]:]/g, ' ').slice(0, 31) || 'Poste';
		const ws = wb.addWorksheet(safe);
		ws.columns = [
			{ header: 'Jour', width: 16 },
			{ header: 'Créneau', width: 16 },
			{ header: 'Places', width: 9 },
			{ header: 'Disponibles', width: 40 },
			{ header: 'Peut-être', width: 30 }
		];
		styleHeaderRow(ws, 1);
		for (const s of p.shifts) {
			const available = s.signups.filter((x) => x.status === 'available').map(withNote);
			const maybe = s.signups.filter((x) => x.status === 'maybe').map(withNote);
			ws.addRow([
				formatDay(s.startsAt),
				timeRange(s),
				`${s.availableCount}/${s.capacity}`,
				available.join(', '),
				maybe.join(', ')
			]);
		}
		ws.views = [{ state: 'frozen', ySplit: 1 }];
	}
}

/** Format « Matrice » : bénévoles × créneaux, ✓ / ?, cases colorées. */
function buildMatrix(wb: Workbook, t: VolunteerTournament) {
	const ws = wb.addWorksheet('Matrice');

	// Colonnes = créneaux (groupés par poste) ; on conserve les bornes pour fusionner.
	type Col = { posteName: string; shiftId: string; day: string; time: string };
	const cols: Col[] = [];
	const groupSpans: { name: string; start: number; end: number }[] = [];
	const volunteers = new Map<string, string>();
	const lookup = new Map<string, 'available' | 'maybe'>();

	for (const p of t.positions) {
		if (p.shifts.length === 0) continue;
		const start = cols.length + 2; // +1 colonne bénévole, +1 base 1
		for (const s of p.shifts) {
			cols.push({
				posteName: p.name,
				shiftId: s.id,
				day: formatDay(s.startsAt),
				time: timeRange(s)
			});
			for (const su of s.signups) {
				if (!volunteers.has(su.userId)) volunteers.set(su.userId, su.name);
				lookup.set(`${su.userId}:${s.id}`, su.status);
			}
		}
		groupSpans.push({ name: p.name, start, end: cols.length + 1 });
	}

	// Ligne 1 : noms de postes (fusionnés) ; lignes 2-3 : jour / horaire.
	ws.getCell(1, 1).value = 'Bénévole';
	ws.mergeCells(1, 1, 3, 1);
	for (const g of groupSpans) {
		ws.getCell(1, g.start).value = g.name;
		if (g.end > g.start) ws.mergeCells(1, g.start, 1, g.end);
	}
	cols.forEach((c, i) => {
		ws.getCell(2, i + 2).value = c.day;
		ws.getCell(3, i + 2).value = c.time;
	});
	for (let r = 1; r <= 3; r++) styleHeaderRow(ws, r);

	// Lignes bénévoles.
	let rowNo = 4;
	for (const [id, name] of volunteers) {
		ws.getCell(rowNo, 1).value = name;
		cols.forEach((c, i) => {
			const status = lookup.get(`${id}:${c.shiftId}`);
			const cell = ws.getCell(rowNo, i + 2);
			cell.alignment = { horizontal: 'center' };
			if (status === 'available') {
				cell.value = '✓';
				cell.fill = FILL_AVAILABLE;
			} else if (status === 'maybe') {
				cell.value = '?';
				cell.fill = FILL_MAYBE;
			}
		});
		rowNo++;
	}

	ws.getColumn(1).width = 24;
	for (let i = 0; i < cols.length; i++) ws.getColumn(i + 2).width = 10;
	ws.views = [{ state: 'frozen', xSplit: 1, ySplit: 3 }];
}

/** Format « Par créneau » : une ligne par créneau, tous postes confondus. */
function buildShift(wb: Workbook, t: VolunteerTournament) {
	const ws = wb.addWorksheet('Par créneau');
	ws.columns = [
		{ header: 'Poste', width: 22 },
		{ header: 'Jour', width: 16 },
		{ header: 'Début', width: 9 },
		{ header: 'Fin', width: 9 },
		{ header: 'Places', width: 9 },
		{ header: 'Disponibles', width: 40 },
		{ header: 'Peut-être', width: 30 }
	];
	styleHeaderRow(ws, 1);
	for (const p of t.positions) {
		for (const s of p.shifts) {
			const available = s.signups.filter((x) => x.status === 'available').map(withNote);
			const maybe = s.signups.filter((x) => x.status === 'maybe').map(withNote);
			ws.addRow([
				p.name,
				formatDay(s.startsAt),
				formatTime(s.startsAt),
				formatTime(s.endsAt),
				`${s.availableCount}/${s.capacity}`,
				available.join(', '),
				maybe.join(', ')
			]);
		}
	}
	ws.views = [{ state: 'frozen', ySplit: 1 }];
}

/** Format « Bénévoles & contacts » : une ligne par bénévole avec téléphone. */
function buildContacts(wb: Workbook, t: VolunteerTournament) {
	const ws = wb.addWorksheet('Bénévoles');
	ws.columns = [
		{ header: 'Bénévole', width: 28 },
		{ header: 'Téléphone', width: 18 },
		{ header: 'Créneaux', width: 10 },
		{ header: 'Détail des créneaux', width: 50 }
	];
	styleHeaderRow(ws, 1);

	type Vol = { name: string; phone: string | null; shifts: string[] };
	const map = new Map<string, Vol>();
	for (const p of t.positions) {
		for (const s of p.shifts) {
			for (const su of s.signups) {
				let v = map.get(su.userId);
				if (!v) {
					v = { name: su.name, phone: su.phone, shifts: [] };
					map.set(su.userId, v);
				}
				const tag = su.status === 'maybe' ? ' (peut-être)' : '';
				const noteTag = su.note ? ` — ${su.note}` : '';
				v.shifts.push(`${p.name} — ${formatDay(s.startsAt)} ${timeRange(s)}${tag}${noteTag}`);
			}
		}
	}
	const vols = [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'fr'));
	for (const v of vols) {
		ws.addRow([v.name, v.phone ?? '', v.shifts.length, v.shifts.join(' · ')]);
	}
	ws.views = [{ state: 'frozen', ySplit: 1 }];
}

const BUILDERS: Record<XlsxFormat, (wb: Workbook, t: VolunteerTournament) => void> = {
	poste: buildPoste,
	matrix: buildMatrix,
	shift: buildShift,
	contacts: buildContacts
};

/** Construit puis télécharge le classeur .xlsx pour le format demandé. */
export async function exportTournamentXlsx(
	t: VolunteerTournament,
	format: XlsxFormat
): Promise<void> {
	const mod = await import('exceljs');
	const ExcelJS = (mod as { default?: typeof import('exceljs') }).default ?? mod;
	const wb = new ExcelJS.Workbook();
	wb.creator = 'Bénévoles ACGB';

	BUILDERS[format](wb, t);

	const buffer = await wb.xlsx.writeBuffer();
	const blob = new Blob([buffer], {
		type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
	});
	const url = URL.createObjectURL(blob);
	const slug =
		t.name
			.replace(/[^a-z0-9]+/gi, '-')
			.replace(/^-+|-+$/g, '')
			.toLowerCase() || 'tournoi';
	const a = document.createElement('a');
	a.href = url;
	a.download = `suivi-${slug}-${format}.xlsx`;
	a.click();
	URL.revokeObjectURL(url);
}
