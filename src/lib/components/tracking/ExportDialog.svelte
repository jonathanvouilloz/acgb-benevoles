<script lang="ts">
	import { Modal } from '$lib/components/ui/modal';
	import { Button } from '$lib/components/ui/button';
	import { toast } from '$lib/toast.svelte';
	import { exportTournamentXlsx, XLSX_FORMATS, type XlsxFormat } from '$lib/export-xlsx';
	import type { VolunteerTournament } from '$lib/server/services/signup-service';
	import { Check } from 'lucide-svelte';

	let { open = $bindable(false), tournament }: { open?: boolean; tournament: VolunteerTournament } =
		$props();

	let format = $state<XlsxFormat>('poste');
	let exporting = $state(false);

	async function run() {
		exporting = true;
		try {
			await exportTournamentXlsx(tournament, format);
			open = false;
		} catch (err) {
			console.error(err);
			toast.error("L'export Excel a échoué.");
		} finally {
			exporting = false;
		}
	}
</script>

<Modal bind:open title="Exporter en Excel">
	<p class="text-sm text-ink-muted">Choisis la mise en forme du fichier .xlsx :</p>
	<div class="mt-3 flex flex-col gap-2">
		{#each XLSX_FORMATS as f (f.value)}
			<button
				type="button"
				onclick={() => (format = f.value)}
				class="flex items-start gap-3 rounded-md border p-3 text-left transition-colors {format ===
				f.value
					? 'border-brand-primary bg-brand-primary/5'
					: 'border-border hover:bg-surface-subtle'}"
			>
				<span
					class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border {format ===
					f.value
						? 'border-brand-primary bg-brand-primary text-white'
						: 'border-border text-transparent'}"
				>
					<Check size={13} strokeWidth={3} />
				</span>
				<span class="min-w-0">
					<span class="block text-sm font-medium text-ink-strong">{f.label}</span>
					<span class="block text-xs text-ink-muted">{f.description}</span>
				</span>
			</button>
		{/each}
	</div>
	<div class="mt-5 flex justify-end gap-2">
		<Button
			type="button"
			variant="ghost"
			size="sm"
			onclick={() => (open = false)}
			disabled={exporting}
		>
			Annuler
		</Button>
		<Button type="button" size="sm" onclick={run} disabled={exporting}>
			{exporting ? 'Export…' : 'Exporter'}
		</Button>
	</div>
</Modal>
