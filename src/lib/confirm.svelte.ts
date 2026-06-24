/**
 * Modale de confirmation impérative — ergonomie proche du `confirm()` natif.
 *
 *   if (await confirmAction({ title: '…', variant: 'danger' })) form.requestSubmit();
 *
 * État module-level piloté par un singleton <ConfirmDialog /> monté dans le layout.
 */

export interface ConfirmOptions {
	title: string;
	message?: string;
	confirmLabel?: string;
	cancelLabel?: string;
	variant?: 'danger' | 'default';
}

interface ConfirmState extends ConfirmOptions {
	open: boolean;
}

let current = $state<ConfirmState | null>(null);
let resolver: ((value: boolean) => void) | null = null;

/** Lecture réactive de l'état courant (consommée par ConfirmDialog). */
export const confirmStore = {
	get state() {
		return current;
	}
};

export function confirmAction(options: ConfirmOptions): Promise<boolean> {
	// Une demande déjà en attente est annulée (résolue à false) avant d'en ouvrir une autre.
	resolver?.(false);
	current = { ...options, open: true };
	return new Promise<boolean>((resolve) => {
		resolver = resolve;
	});
}

export function resolveConfirm(value: boolean) {
	resolver?.(value);
	resolver = null;
	// On garde `current` (titre/message) pendant la transition de sortie de la modale ;
	// seul `open` repasse à false. Le prochain confirmAction écrasera l'état.
	if (current) current = { ...current, open: false };
}
