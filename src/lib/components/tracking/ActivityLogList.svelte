<script lang="ts">
	import { activityMeta, type ActivityLogRow } from '$lib/activity-log';
	import { formatDateTime } from '$lib/format';

	let { entries }: { entries: ActivityLogRow[] } = $props();
</script>

<!--
  Rendu d'une liste d'événements, partagé par la page journal et l'aperçu de /suivi : deux
  rendus différents pour la même donnée finiraient par diverger.
-->
<ul class="overflow-hidden rounded-lg border border-border">
	{#each entries as e (e.id)}
		{@const meta = activityMeta(e.targetType, e.action)}
		{@const Icon = meta.icon}
		<li
			class="flex flex-wrap items-start gap-x-2 gap-y-1 border-border px-4 py-2.5 text-sm not-first:border-t"
		>
			<Icon size={15} class="mt-0.5 shrink-0 {meta.color}" />
			<span class="font-medium text-ink-strong">{e.actorName}</span>
			<span class="text-ink-muted">{meta.label}</span>
			<!-- La personne concernée n'est nommée que si elle diffère de l'acteur : « Marie s'est
			     inscrite » plutôt que « Marie s'est inscrite Marie ». -->
			{#if e.volunteerName && e.volunteerName !== e.actorName}
				<span class="font-medium text-ink-strong">{e.volunteerName}</span>
			{/if}
			<span class="text-ink-muted">— {e.detail}</span>
			<span class="ml-auto whitespace-nowrap text-xs text-ink-muted/70">
				{formatDateTime(e.createdAt)}
			</span>
			{#if e.reason}
				<p class="w-full pl-[23px] text-xs text-ink-muted italic">« {e.reason} »</p>
			{/if}
		</li>
	{/each}
</ul>
