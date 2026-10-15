<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getPublicVolunteerActivities, type VolunteerActivity } from '#lib/services/api/api.service.js';
	import { formatDateTimeParts, toPlainText } from '#lib/utils/format.js';

	const PAGE_SIZE = 6;

	let activities = $state<VolunteerActivity[]>([]);
	let total = $state(0);
	let isLoading = $state(true);
	let isLoadingMore = $state(false);
	let errorMessage = $state('');
	let pageNumber = $state(1);
	let totalPages = $state(1);
	let brokenCovers = $state<Record<string, boolean>>({});

	const requestedPage = $derived(Number(page.url.searchParams.get('pagina') ?? '1') || 1);

	onMount(() => {
		void load(requestedPage);
	});

	$effect(() => {
		const target = requestedPage;
		if (target > 1 && target !== pageNumber) void load(target);
	});

	async function load(target: number) {
		isLoading = true;
		errorMessage = '';
		pageNumber = target;
		try {
			// La API pagina de 6 en 6: se piden las anteriores para que "?pagina=2"
			// muestre tambien lo ya recorrido.
			const first = await getPublicVolunteerActivities({ page: 1, limit: PAGE_SIZE });
			let items = first.items;
			total = first.total;
			totalPages = first.totalPages;

			for (let current = 2; current <= target; current += 1) {
				const next = await getPublicVolunteerActivities({ page: current, limit: PAGE_SIZE });
				items = [...items, ...next.items];
				if (next.items.length < PAGE_SIZE) break;
			}

			activities = items;
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'No se pudieron cargar las jornadas.';
			activities = [];
			total = 0;
		} finally {
			isLoading = false;
		}
	}

	async function loadMore() {
		if (isLoadingMore || pageNumber >= totalPages) return;
		isLoadingMore = true;
		try {
			const next = await getPublicVolunteerActivities({ page: pageNumber + 1, limit: PAGE_SIZE });
			activities = [...activities, ...next.items];
			pageNumber += 1;
			totalPages = next.totalPages;
			// reset:false conserva el scroll al cargar mas resultados.
			await goto(`/jornadas?pagina=${pageNumber}`, { reset: false, replace: true });
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'No se pudieron cargar más jornadas.';
		} finally {
			isLoadingMore = false;
		}
	}

	function cupos(activity: VolunteerActivity): { label: string; tone: 'open' | 'few' | 'full' } {
		if (activity.remaining === null) return { label: 'Cupos abiertos', tone: 'open' };
		if (activity.remaining === 0) return { label: 'Sin cupos', tone: 'full' };
		if (activity.remaining <= 3) return { label: `Últimos ${activity.remaining} cupos`, tone: 'few' };
		return { label: `Quedan ${activity.remaining} cupos`, tone: 'open' };
	}
</script>

<svelte:head>
	<title>Jornadas | Izeco</title>
	<meta
		name="description"
		content="Jornadas de voluntariado abiertas de Izeco: limpieza de ríos, siembra de árboles, talleres y huertas comunitarias."
	/>
</svelte:head>

<section class="page-head">
	<div>
		<p class="eyebrow"><span class="eyebrow-dot" aria-hidden="true"></span>Voluntariado</p>
		<h1>Jornadas abiertas</h1>
		<p class="subtitle">
			{total}
			{total === 1 ? 'jornada' : 'jornadas'} con inscripción abierta. Elige una, reserva tu cupo
			y te avisamos cuando el organizador lo confirme.
		</p>
	</div>
</section>

{#if errorMessage}
	<p class="banner" role="alert">{errorMessage}</p>
{/if}

{#if isLoading}
	<p class="state">Cargando jornadas…</p>
{:else if activities.length === 0}
	<p class="state">Todavía no hay jornadas abiertas.</p>
{:else}
	<section class="grid" aria-label="Jornadas de voluntariado">
		{#each activities as activity (activity.id)}
			{@const cupo = cupos(activity)}
			{@const start = formatDateTimeParts(activity.startsAt)}
			<article class="jcard">
				<div class="jcard-media">
					{#if activity.imageUrl && !brokenCovers[activity.id]}
						<img
							src={activity.imageUrl}
							alt={activity.title}
							loading="lazy"
							onerror={() => (brokenCovers = { ...brokenCovers, [activity.id]: true })}
						/>
					{:else}
						<span class="jcard-fallback" aria-hidden="true">
							<svg viewBox="0 0 24 24"><path d="M12 21c0-6 0-9 8-12 0 8-3 11-8 12Z" /><path d="M12 21C12 14 10 9 4 6c-1 7 2 12 8 15Z" /></svg>
						</span>
					{/if}
					{#if start.day}
						<span class="date-badge">
							<strong>{start.day}</strong>
							{#if start.time}<em>{start.time}</em>{/if}
						</span>
					{/if}
				</div>

				<div class="jcard-body">
					<h2>{activity.title}</h2>

					{#if activity.location}
						<p class="place">
							<svg viewBox="0 0 24 24" aria-hidden="true"
								><path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" /><circle cx="12" cy="11" r="2.2" /></svg
							>
							{activity.location}
						</p>
					{/if}

					<p class="jcard-desc">{toPlainText(activity.description, 150)}</p>

					<footer class="jcard-foot">
						<span class="cupos" data-tone={cupo.tone}>{cupo.label}</span>
						<a class="jcard-link" href={`/jornadas/${activity.id}`}>
							Ver jornada
							<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M8 5h7v7" /></svg>
						</a>
					</footer>
				</div>
			</article>
		{/each}
	</section>

	{#if pageNumber < totalPages}
		<button class="more" type="button" onclick={loadMore} disabled={isLoadingMore}>
			{isLoadingMore ? 'Cargando…' : 'Ver más jornadas'}
		</button>
	{/if}
{/if}

<style>
	.page-head {
		margin-bottom: 18px;
	}

	.eyebrow {
		display: flex;
		align-items: center;
		gap: 7px;
		margin: 0 0 8px;
		color: var(--iz-green-600);
		font-size: 10px;
		font-weight: 750;
		letter-spacing: 1.4px;
		text-transform: uppercase;
	}

	.eyebrow-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--iz-green-600);
	}

	h1 {
		margin: 0;
		color: var(--iz-ink);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 32px;
		font-weight: 600;
		letter-spacing: -0.6px;
	}

	.subtitle {
		max-width: 620px;
		margin: 6px 0 0;
		color: var(--iz-muted);
		font-size: 13px;
	}

	.banner {
		margin: 0 0 14px;
		padding: 11px 14px;
		border: 1px solid #eccfc8;
		border-radius: var(--iz-radius-sm);
		background: #fbf0ec;
		color: var(--iz-danger);
		font-size: 12px;
	}

	.state {
		margin: 0;
		padding: 46px 20px;
		color: var(--iz-muted);
		font-size: 13px;
		text-align: center;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 18px;
	}

	.jcard {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-md);
		background: var(--iz-surface);
		box-shadow: var(--iz-shadow-sm);
		transition:
			transform 160ms ease,
			box-shadow 160ms ease;
	}

	.jcard:hover {
		transform: translateY(-2px);
		box-shadow: var(--iz-shadow-md);
	}

	.jcard-media {
		position: relative;
		height: 168px;
		background: linear-gradient(104deg, #1b4733 0%, #276149 58%, #3d7f57 100%);
	}

	.jcard-media img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.jcard-fallback {
		display: grid;
		height: 100%;
		place-items: center;
	}

	.jcard-fallback svg {
		width: 44px;
		height: 44px;
		fill: none;
		stroke: #a8d47f;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.4;
	}

	.date-badge {
		position: absolute;
		bottom: 12px;
		left: 12px;
		display: flex;
		flex-direction: column;
		padding: 7px 12px;
		border-radius: 11px;
		background: rgb(255 255 255 / 94%);
		box-shadow: var(--iz-shadow-sm);
	}

	.date-badge strong {
		color: var(--iz-ink);
		font-size: 12px;
		font-weight: 700;
	}

	.date-badge em {
		color: var(--iz-muted);
		font-size: 10.5px;
		font-style: normal;
	}

	.jcard-body {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 9px;
		padding: 20px;
	}

	.jcard-body h2 {
		margin: 0;
		color: var(--iz-ink);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 21px;
		font-weight: 600;
		letter-spacing: -0.3px;
	}

	.place {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin: 0;
		color: var(--iz-muted);
		font-size: 12px;
	}

	.place svg {
		width: 15px;
		height: 15px;
		fill: none;
		stroke: var(--iz-green-600);
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.6;
	}

	.jcard-desc {
		margin: 0;
		color: var(--iz-muted);
		font-size: 12.5px;
		line-height: 1.55;
	}

	.jcard-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-top: auto;
		padding-top: 14px;
		border-top: 1px solid var(--iz-line);
	}

	.cupos {
		padding: 5px 11px;
		border-radius: 999px;
		font-size: 11px;
		font-weight: 700;
	}

	.cupos[data-tone='open'] {
		background: var(--iz-green-100);
		color: var(--iz-green-800);
	}

	.cupos[data-tone='few'] {
		background: var(--iz-amber-100);
		color: #8a5a12;
	}

	.cupos[data-tone='full'] {
		background: #f4e3e0;
		color: var(--iz-danger);
	}

	.jcard-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--iz-green-700);
		font-size: 12.5px;
		font-weight: 650;
		white-space: nowrap;
		text-decoration: none;
	}

	.jcard-link svg {
		width: 13px;
		height: 13px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.7;
	}

	.more {
		display: block;
		width: 100%;
		margin-top: 18px;
		padding: 13px;
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-sm);
		background: var(--iz-surface);
		color: var(--iz-green-700);
		font: inherit;
		font-size: 12.5px;
		font-weight: 650;
		cursor: pointer;
	}

	.more:hover:not(:disabled) {
		background: var(--iz-green-50);
	}

	.more:disabled {
		color: var(--iz-faint);
		cursor: wait;
	}

	@media (max-width: 880px) {
		.grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
