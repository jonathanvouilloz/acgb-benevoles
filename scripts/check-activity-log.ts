/**
 * Contrôle de la migration du journal d'activité (epic 16) — lecture seule.
 *
 * Lancer :  npx tsx scripts/check-activity-log.ts
 *  - AVANT `drizzle-kit migrate` : compte les lignes de `assignment_log`.
 *  - APRÈS : vérifie que `activity_log` en a autant, que le vocabulaire a été traduit
 *    (`add`→`assign`, `remove`→`unassign`) et que l'index attendu existe.
 *
 * Vérifie aussi le backfill `published` de la migration `0011` : sans lui, tous les tournois
 * existants disparaissent du listing public.
 */
import { readFileSync } from 'node:fs';
import { neon } from '@neondatabase/serverless';

function loadEnv() {
	let txt: string;
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
const sql = neon(DATABASE_URL);

const [t] = await sql`
	SELECT to_regclass('public.assignment_log')::text AS old, to_regclass('public.activity_log')::text AS current
`;
console.log('table assignment_log :', t.old ?? '(absente)');
console.log('table activity_log   :', t.current ?? '(absente)');

if (t.old) {
	const [c] = await sql`SELECT count(*)::int AS n FROM assignment_log`;
	console.log('  lignes assignment_log =', c.n);
}

if (t.current) {
	const [c] = await sql`SELECT count(*)::int AS n FROM activity_log`;
	console.log('  lignes activity_log   =', c.n);

	const byAction = await sql`
		SELECT target_type::text AS target, action, count(*)::int AS n
		FROM activity_log GROUP BY 1, 2 ORDER BY 3 DESC
	`;
	for (const r of byAction) console.log(`  ${r.target}.${r.action} → ${r.n}`);

	const legacy =
		await sql`SELECT count(*)::int AS n FROM activity_log WHERE action IN ('add', 'remove')`;
	console.log(
		legacy[0].n === 0
			? '  ✔ vocabulaire traduit (aucun add/remove résiduel)'
			: `  ✖ ${legacy[0].n} ligne(s) encore en add/remove`
	);

	const idx = await sql`
		SELECT indexname FROM pg_indexes
		WHERE tablename = 'activity_log' AND indexname = 'activity_log_tournament_created_idx'
	`;
	console.log(
		idx.length > 0 ? '  ✔ index présent' : '  ✖ index activity_log_tournament_created_idx ABSENT'
	);
}

// Migration 0011 : un tournoi non publié disparaît du listing public.
const [pub] = await sql`
	SELECT count(*)::int AS total, count(*) FILTER (WHERE published)::int AS visible FROM tournament
`;
console.log(`tournois : ${pub.visible}/${pub.total} publiés`);
if (pub.total > 0 && pub.visible === 0) {
	console.log(
		'  ✖ AUCUN tournoi publié — le backfill de 0011 manque : UPDATE tournament SET published = true;'
	);
}
