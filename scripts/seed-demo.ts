/**
 * Seed de démonstration — recrée un tournoi réaliste (3 jours, ~9 postes, ~43 créneaux,
 * ~55 bénévoles) inspiré du vrai planning ACGB 2025, pour éprouver l'affichage (matrice
 * large, impression, export) et vérifier que le schéma tient la charge.
 *
 * Lancer :  npx tsx scripts/seed-demo.ts  [email-organisateur]
 *  - L'organisateur par défaut est jonathan.vouilloz@gmail.com (créé/promu si besoin).
 *  - Idempotent : supprime d'abord le tournoi démo et les bénévoles démo (@demo.acgb).
 *
 * Aucune dépendance SvelteKit : on lit DATABASE_URL depuis .env et on ouvre notre propre
 * client Drizzle/neon. Les heures sont posées en UTC « mural » via toShiftTimestamps
 * (comme l'app), donc l'affichage (timeZone UTC) reste cohérent.
 */
import { readFileSync } from 'node:fs';
import { drizzle } from 'drizzle-orm/neon-http';
import { neon } from '@neondatabase/serverless';
import { and, eq, like } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import * as schema from '../src/lib/server/db/schema';
import { toShiftTimestamps } from '../src/lib/schemas/shift';

// --- .env -------------------------------------------------------------------
function loadEnv() {
	let txt = '';
	try {
		txt = readFileSync(new URL('../.env', import.meta.url), 'utf8');
	} catch {
		return;
	}
	for (const line of txt.split(/\r?\n/)) {
		const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)$/);
		if (!m || process.env[m[1]]) continue;
		let v = m[2].trim();
		if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
			v = v.slice(1, -1);
		}
		process.env[m[1]] = v;
	}
}
loadEnv();

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) throw new Error('DATABASE_URL manquant (.env)');

const db = drizzle(neon(DATABASE_URL), { schema });
const { user, tournament, position, shift, signup } = schema;

// --- Données déclaratives ---------------------------------------------------
const ORGANIZER_EMAIL = process.argv[2] ?? 'jonathan.vouilloz@gmail.com';

const FRI = '2026-09-25';
const SAT = '2026-09-26';
const SUN = '2026-09-27';

type ShiftDef = { day: string; start: string; end: string; capacity: number };
type PositionDef = { name: string; color: string; description?: string; shifts: ShiftDef[] };

const POSITIONS: PositionDef[] = [
	{
		name: 'Installation / Désinstallation',
		color: '#6366f1',
		shifts: [
			{ day: FRI, start: '18:30', end: '21:00', capacity: 6 },
			{ day: SAT, start: '07:00', end: '08:00', capacity: 3 }
		]
	},
	{
		name: 'Table officielle',
		color: '#0ea5e9',
		shifts: [
			{ day: SAT, start: '08:00', end: '12:00', capacity: 1 },
			{ day: SAT, start: '12:00', end: '16:00', capacity: 1 },
			{ day: SAT, start: '16:00', end: '20:00', capacity: 1 },
			{ day: SUN, start: '08:00', end: '12:00', capacity: 1 },
			{ day: SUN, start: '12:00', end: '16:00', capacity: 1 },
			{ day: SUN, start: '16:00', end: '18:00', capacity: 1 }
		]
	},
	{
		name: 'Podium',
		color: '#f59e0b',
		shifts: [
			{ day: SUN, start: '13:00', end: '14:00', capacity: 2 },
			{ day: SUN, start: '14:00', end: '15:00', capacity: 3 },
			{ day: SUN, start: '15:00', end: '16:00', capacity: 3 },
			{ day: SUN, start: '16:00', end: '17:00', capacity: 2 }
		]
	},
	{
		name: 'Accueil / T-shirt',
		color: '#10b981',
		shifts: [
			{ day: SAT, start: '07:30', end: '10:00', capacity: 2 },
			{ day: SAT, start: '10:00', end: '13:00', capacity: 1 },
			{ day: SUN, start: '08:00', end: '10:00', capacity: 1 }
		]
	},
	{
		name: 'Supervision bénévoles',
		color: '#8b5cf6',
		shifts: [
			{ day: SAT, start: '08:00', end: '14:00', capacity: 1 },
			{ day: SAT, start: '14:00', end: '20:00', capacity: 1 },
			{ day: SUN, start: '08:00', end: '14:00', capacity: 1 },
			{ day: SUN, start: '14:00', end: '18:00', capacity: 1 }
		]
	},
	{
		name: 'Photographe',
		color: '#ec4899',
		shifts: [
			{ day: SAT, start: '09:00', end: '13:00', capacity: 1 },
			{ day: SAT, start: '14:00', end: '18:00', capacity: 1 },
			{ day: SUN, start: '13:00', end: '17:00', capacity: 1 }
		]
	},
	{
		name: 'Buvette',
		color: '#ef4444',
		shifts: [
			{ day: SAT, start: '07:30', end: '08:30', capacity: 2 },
			{ day: SAT, start: '08:30', end: '10:00', capacity: 3 },
			{ day: SAT, start: '10:00', end: '11:00', capacity: 3 },
			{ day: SAT, start: '11:00', end: '13:00', capacity: 4 },
			{ day: SAT, start: '13:00', end: '14:00', capacity: 3 },
			{ day: SAT, start: '14:00', end: '16:00', capacity: 3 },
			{ day: SAT, start: '16:00', end: '18:00', capacity: 3 },
			{ day: SAT, start: '18:00', end: '20:00', capacity: 2 },
			{ day: SUN, start: '08:00', end: '10:00', capacity: 2 },
			{ day: SUN, start: '10:00', end: '12:00', capacity: 3 },
			{ day: SUN, start: '12:00', end: '14:00', capacity: 3 },
			{ day: SUN, start: '14:00', end: '16:00', capacity: 3 },
			{ day: SUN, start: '16:00', end: '18:00', capacity: 2 }
		]
	},
	{
		name: 'Scoring TV',
		color: '#14b8a6',
		shifts: [
			{ day: SAT, start: '08:30', end: '11:00', capacity: 2 },
			{ day: SAT, start: '11:00', end: '13:00', capacity: 2 },
			{ day: SAT, start: '13:00', end: '16:00', capacity: 2 },
			{ day: SAT, start: '16:00', end: '20:00', capacity: 2 },
			{ day: SUN, start: '08:00', end: '12:00', capacity: 2 },
			{ day: SUN, start: '12:00', end: '16:00', capacity: 2 },
			{ day: SUN, start: '16:00', end: '18:00', capacity: 1 }
		]
	},
	{
		name: 'Rangement',
		color: '#64748b',
		shifts: [{ day: SUN, start: '16:00', end: '18:00', capacity: 5 }]
	}
];

// Bénévoles (prénom, nom) inspirés du vrai planning 2025.
const VOLUNTEERS: [string, string][] = [
	['Michael', 'Minelli'],
	['David', 'Schmid'],
	['Ronnie', 'Rigo'],
	['Noellie', 'Fournier'],
	['Anne', 'Rigo'],
	['Pedro', 'Andrade'],
	['Helène', 'Blanchard'],
	['Catherine', 'Bouchardy'],
	['Véronique', 'Callea'],
	['Pablo', 'Cantero'],
	['Samantha', 'Carrel'],
	['Gaëlle', 'Charbonnier'],
	['Yvan', 'Charbonnier'],
	['Simon', 'Chipier'],
	['Audrey', 'Chipier'],
	['Gabriella', 'De Siebenthal'],
	['Claire', 'De Siebenthal'],
	['Céline', 'Delgado'],
	['Thierry', 'Foulon'],
	['Isabelle', 'Gauchat'],
	['Sarah', 'Gavin'],
	['Yan', 'He'],
	['Anne', 'Henry'],
	['Isabelle', 'Hochstrasser'],
	['Yuki', 'Honda'],
	['Teena', 'Kunjumen'],
	['Cléo', 'Latella'],
	['Théa', 'Latella'],
	['Vinh', 'Le'],
	['Diem-lan', 'Le Nguyen'],
	['Maria', 'Michalik'],
	['Hania', 'Michalik'],
	['Andreia', 'Monteiro'],
	['Tatiana', 'Mourrain'],
	['Amalia', 'Mourrain'],
	['Kamal', 'Najem'],
	['Ludovique', 'Nasel'],
	['Nam', 'Nguyen'],
	['Eusébio', 'Olivia'],
	['Elise', 'Oudiné'],
	['Antriksh', 'Pachauri'],
	['Yi', 'Peng'],
	['Alex', 'Préjbeanu'],
	['Christophe', 'Raval'],
	['Zoé', 'Rigo'],
	['Christophe', 'Schenk'],
	['Anki', 'Sjoberg'],
	['Hanael', 'Soares'],
	['Sandrine', 'Spicher'],
	['Anusha', 'Sridharan'],
	['Sandrine', 'Thierrin'],
	['Dara', 'Var'],
	['Carine', 'Var'],
	['Alain', 'Voirol'],
	['Diem-lan', 'Vu Cantero'],
	['Louca', 'Wicht']
];

function slug(s: string): string {
	return s
		.normalize('NFD')
		.replace(/[̀-ͯ]/g, '')
		.replace(/[^a-z0-9]+/gi, '-')
		.replace(/^-+|-+$/g, '')
		.toLowerCase();
}

function phone(i: number): string {
	const n = (1000000 + i * 73939) % 10000000;
	const s = n.toString().padStart(7, '0');
	return `+41 7${(i % 3) + 6} ${s.slice(0, 3)} ${s.slice(3, 5)} ${s.slice(5, 7)}`;
}

function pick<T>(arr: T[], n: number): T[] {
	const copy = [...arr];
	for (let i = copy.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[copy[i], copy[j]] = [copy[j], copy[i]];
	}
	return copy.slice(0, n);
}

async function main() {
	console.log('→ Connexion DB OK');

	// 1) Organisateur ---------------------------------------------------------
	const existingOrg = await db.select().from(user).where(eq(user.email, ORGANIZER_EMAIL)).limit(1);

	let organizerId: string;
	if (existingOrg.length > 0) {
		organizerId = existingOrg[0].id;
		await db
			.update(user)
			.set({ isOrganizer: true, phone: existingOrg[0].phone ?? phone(0) })
			.where(eq(user.id, organizerId));
		console.log(`→ Organisateur existant : ${ORGANIZER_EMAIL}`);
	} else {
		organizerId = nanoid();
		await db.insert(user).values({
			id: organizerId,
			email: ORGANIZER_EMAIL,
			name: 'Jonathan Vouilloz',
			phone: '+41 79 123 45 67',
			emailVerified: true,
			isOrganizer: true
		});
		console.log(`→ Organisateur créé : ${ORGANIZER_EMAIL}`);
	}

	// 2) Nettoyage démo -------------------------------------------------------
	await db
		.delete(tournament)
		.where(and(eq(tournament.organizerId, organizerId), like(tournament.name, '%(démo)%')));
	await db.delete(user).where(like(user.email, '%@demo.acgb'));
	console.log('→ Anciennes données démo supprimées');

	// 3) Bénévoles ------------------------------------------------------------
	const volunteerRows = VOLUNTEERS.map(([first, last], i) => ({
		id: nanoid(),
		email: `${slug(first)}.${slug(last)}.${i}@demo.acgb`,
		name: `${first} ${last}`,
		phone: phone(i + 1),
		emailVerified: true,
		isOrganizer: false
	}));
	await db.insert(user).values(volunteerRows);
	console.log(`→ ${volunteerRows.length} bénévoles créés`);

	// 4) Tournoi + postes + créneaux -----------------------------------------
	const [tour] = await db
		.insert(tournament)
		.values({
			name: 'Tournoi ACGB 2025 (démo)',
			location: 'Centre sportif du Bois-des-Frères, Genève',
			startDate: new Date(`${FRI}T00:00:00Z`),
			endDate: new Date(`${SUN}T00:00:00Z`),
			organizerId,
			shareToken: nanoid(12)
		})
		.returning();

	let shiftCount = 0;
	const allShiftIds: { id: string; capacity: number }[] = [];
	for (const pdef of POSITIONS) {
		const [pos] = await db
			.insert(position)
			.values({
				tournamentId: tour.id,
				name: pdef.name,
				description: pdef.description ?? null,
				color: pdef.color
			})
			.returning();
		const shiftValues = pdef.shifts.map((s) => {
			const { startsAt, endsAt } = toShiftTimestamps(s.day, s.start, s.end);
			return { positionId: pos.id, startsAt, endsAt, capacity: s.capacity };
		});
		const inserted = await db.insert(shift).values(shiftValues).returning();
		for (const row of inserted) allShiftIds.push({ id: row.id, capacity: row.capacity });
		shiftCount += inserted.length;
	}
	console.log(`→ ${POSITIONS.length} postes, ${shiftCount} créneaux créés`);

	// 5) Inscriptions ---------------------------------------------------------
	// ~75 % des créneaux remplis au complet, le reste partiellement (pour montrer
	// « à pourvoir ») ; ~15 % d'inscriptions en « peut-être ». ~25 % portent une note.
	const NOTES = [
		'dès 18h',
		'jusqu’à 9h',
		'scoring uniquement',
		'pas avant 8h',
		'back-up scoring',
		'avec ma fille',
		'photo pendant les pauses',
		'plutôt en fin de journée',
		'apporte un gâteau',
		'b ou égal'
	];
	const randNote = () =>
		Math.random() < 0.25 ? NOTES[Math.floor(Math.random() * NOTES.length)] : null;

	const signupValues: {
		shiftId: string;
		userId: string;
		status: 'available' | 'maybe';
		note: string | null;
	}[] = [];
	for (const s of allShiftIds) {
		const fill =
			Math.random() < 0.75
				? s.capacity
				: Math.max(0, s.capacity - 1 - Math.floor(Math.random() * 2));
		const chosen = pick(volunteerRows, Math.min(fill, volunteerRows.length));
		for (const v of chosen) {
			signupValues.push({ shiftId: s.id, userId: v.id, status: 'available', note: randNote() });
		}
		// quelques « peut-être » en plus (au-delà de la capacité)
		if (Math.random() < 0.4) {
			const extra = pick(
				volunteerRows.filter((v) => !chosen.includes(v)),
				1 + Math.floor(Math.random() * 2)
			);
			for (const v of extra) {
				signupValues.push({ shiftId: s.id, userId: v.id, status: 'maybe', note: randNote() });
			}
		}
	}
	// Insertion par lots (neon-http : éviter une requête géante).
	for (let i = 0; i < signupValues.length; i += 200) {
		await db.insert(signup).values(signupValues.slice(i, i + 200));
	}
	console.log(`→ ${signupValues.length} inscriptions créées`);

	console.log('\n✅ Seed terminé.');
	console.log(`   Suivi (orga) : /tournois/${tour.id}/suivi`);
	console.log(`   Lien public  : /t/${tour.shareToken}`);
}

main()
	.then(() => process.exit(0))
	.catch((err) => {
		console.error('❌ Seed échoué :', err);
		process.exit(1);
	});
