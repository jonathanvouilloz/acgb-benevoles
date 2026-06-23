/**
 * Palette de couleurs auto-assignées aux postes (cf. docs/features/03-tournois.md).
 * Teintes distinctes et lisibles sur fond blanc, dérivées de la charte ACGB.
 * L'assignation cycle si un tournoi a plus de postes que de couleurs.
 */
export const posteColors = [
	'#020e71', // marine
	'#2ac5a1', // teal
	'#6f76de', // périwinkle
	'#e0a21e', // ambre
	'#40d9f1', // cyan
	'#d6457f', // magenta
	'#7b5cd6', // violet
	'#e2632b' // orange brûlé
] as const;

/** Couleur attribuée au prochain poste, en fonction du nombre de postes déjà créés. */
export function assignPosteColor(existingCount: number): string {
	return posteColors[existingCount % posteColors.length];
}
