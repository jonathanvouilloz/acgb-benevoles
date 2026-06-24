/**
 * Système de toasts maison (style sonner) — état module-level + API impérative.
 *
 * Le store vit au niveau du module : il survit à la navigation client SvelteKit,
 * donc un toast déclenché juste avant un `goto`/redirect reste visible après.
 * Monté une seule fois via <Toaster /> dans le layout racine.
 */

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
	id: number;
	type: ToastType;
	message: string;
}

/** Durée d'affichage par type (ms). Les erreurs restent plus longtemps. */
const DEFAULT_TIMEOUT: Record<ToastType, number> = {
	success: 4000,
	info: 4000,
	warning: 5000,
	error: 6000
};

let items = $state<Toast[]>([]);
let nextId = 0;

/** Lecture réactive de la pile (getter pour préserver la réactivité à travers le module). */
export const toasts = {
	get items() {
		return items;
	}
};

export function dismiss(id: number) {
	const i = items.findIndex((t) => t.id === id);
	if (i !== -1) items.splice(i, 1);
}

function push(type: ToastType, message: string, timeout?: number) {
	const id = nextId++;
	items.push({ id, type, message });
	const ms = timeout ?? DEFAULT_TIMEOUT[type];
	if (ms > 0 && typeof window !== 'undefined') {
		setTimeout(() => dismiss(id), ms);
	}
	return id;
}

export const toast = {
	success: (message: string, timeout?: number) => push('success', message, timeout),
	error: (message: string, timeout?: number) => push('error', message, timeout),
	warning: (message: string, timeout?: number) => push('warning', message, timeout),
	info: (message: string, timeout?: number) => push('info', message, timeout),
	dismiss
};
