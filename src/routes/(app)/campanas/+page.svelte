<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getPublicCampaigns, type Campaign } from '#lib/services/api/api.service.js';
	import { formatCurrency, formatDateTimeParts, toPlainText } from '#lib/utils/format.js';

	const PAGE_SIZE = 6;

	let campaigns = $state<Campaign[]>([]);
	let total = $state(0);
	let isLoading = $state(true);
	let isLoadingMore = $state(false);
	let errorMessage = $state('');
	let pageNumber = $state(1);
	let totalPages = $state(1);
	// Las campanas sin portada o con una URL caida muestran el respaldo verde.
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
			// La API pagina de 6 en 6, asi que se piden las paginas anteriores para
			// que "?pagina=2" muestre tambien lo ya cargado.
			const first = await getPublicCampaigns({ page: 1, limit: PAGE_SIZE });
			let items = first.items;
			total = first.total;
			totalPages = first.totalPages;

			for (let current = 2; current <= target; current += 1) {
				const next = await getPublicCampaigns({ page: current, limit: PAGE_SIZE });
				items = [...items, ...next.items];
				if (next.items.length < PAGE_SIZE) break;
			}

			campaigns = items;
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'No se pudieron cargar las campañas.';
			campaigns = [];
			total = 0;
		} finally {
			isLoading = false;
		}
	}

	async function loadMore() {
		if (isLoadingMore || pageNumber >= totalPages) return;
		isLoadingMore = true;
		try {
			const next = await getPublicCampaigns({ page: pageNumber + 1, limit: PAGE_SIZE });
			campaigns = [...campaigns, ...next.items];
			pageNumber += 1;
			totalPages = next.totalPages;
			// reset:false conserva el scroll al cargar mas resultados.
			await goto(`/campanas?pagina=${pageNumber}`, { reset: false, replace: true });
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'No se pudieron cargar más campañas.';
		} finally {
			isLoadingMore = false;
		}
	}

	function vigencia(campaign: Campaign): string {
		const start = formatDateTimeParts(campaign.startsAt).day;
		const end = formatDateTimeParts(campaign.endsAt).day;
		if (start && end) return `Del ${start} al ${end}`;
		if (end) return `Hasta el ${end}`;
		if (start) return `Desde el ${start}`;
		return 'Sin fecha límite';
	}
</script>

<svelte:head>
	<title>Campañas | Izeco</title>
	<meta
		name="description"
		content="Campañas activas de la comunidad Izeco: reforestación, limpieza de ríos y talleres de reutilización."
	/>
</svelte:head>

<section class="page-head">
	<div>
		<p class="eyebrow"><span class="eyebrow-dot" aria-hidden="true"></span>Comunidad Izeco</p>
		<h1>Campañas que suman</h1>
		<p class="subtitle">
			{total}
			{total === 1 ? 'campaña activa' : 'campañas activas'} para recuperar el río, sembrar el
			monte y abrir los talleres del barrio.
		</p>
	</div>
</section>

{#if errorMessage}
	<p class="banner" role="alert">{errorMessage}</p>
{/if}

{#if isLoading}
	<p class="state">Cargando campañas…</p>
{:else if campaigns.length === 0}
	<p class="state">Todavía no hay campañas publicadas.</p>
{:else}
	<section class="grid" aria-label="Campañas">
		{#each campaigns as campaign (campaign.id)}
			<article class="ccard">
				<div class="ccard-media">
					{#if campaign.imageUrl && !brokenCovers[campaign.id]}
						<img
							src={campaign.imageUrl}
							alt={campaign.title}
							loading="lazy"
							onerror={() => (brokenCovers = { ...brokenCovers, [campaign.id]: true })}
						/>
					{:else}
						<span class="ccard-fallback" aria-hidden="true">
							<svg viewBox="0 0 24 24"
								><path d="M12 21c0-6 0-9 8-12 0 8-3 11-8 12Z" /><path
									d="M12 21C12 14 10 9 4 6c-1 7 2 12 8 15Z"
								/></svg
							>
						</span>
					{/if}
					<span class="badge" class:open={campaign.isActive}>
						{campaign.isActive ? 'En curso' : campaign.status}
					</span>
				</div>

				<div class="ccard-body">
					<h2>{campaign.title}</h2>
					{#if campaign.summary}
						<p class="ccard-summary">{toPlainText(campaign.summary, 160)}</p>
					{:else if campaign.description}
						<p class="ccard-summary">{toPlainText(campaign.description, 160)}</p>
					{/if}

					<dl class="ccard-meta">
						{#if campaign.goalCents}
							<div>
								<dt>Meta</dt>
								<dd>{formatCurrency(campaign.goalCents)}</dd>
							</div>
						{/if}
						<div>
							<dt>Vigencia</dt>
							<dd>{vigencia(campaign)}</dd>
						</div>
					</dl>

					<a class="ccard-link" href={`/campanas/${campaign.slug}`}>
						Ver campaña
						<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M8 5h7v7" /></svg>
					</a>
				</div>
			</article>
		{/each}
	</section>

	{#if pageNumber < totalPages}
		<button class="more" type="button" onclick={loadMore} disabled={isLoadingMore}>
			{isLoadingMore ? 'Cargando…' : 'Ver más campañas'}
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

	.ccard {
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

	.ccard:hover {
		transform: translateY(-2px);
		box-shadow: var(--iz-shadow-md);
	}

	.ccard-media {
		position: relative;
		height: 178px;
		background: linear-gradient(104deg, #1b4733 0%, #276149 58%, #3d7f57 100%);
	}

	.ccard-media img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.ccard-fallback {
		display: grid;
		height: 100%;
		place-items: center;
	}

	.ccard-fallback svg {
		width: 44px;
		height: 44px;
		fill: none;
		stroke: #a8d47f;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.4;
	}

	.badge {
		position: absolute;
		top: 12px;
		left: 12px;
		padding: 5px 11px;
		border-radius: 999px;
		background: rgb(255 255 255 / 92%);
		color: var(--iz-ink-soft);
		font-size: 10.5px;
		font-weight: 700;
		letter-spacing: 0.6px;
		text-transform: uppercase;
	}

	.badge.open {
		background: var(--iz-green-100);
		color: var(--iz-green-800);
	}

	.ccard-body {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 10px;
		padding: 20px;
	}

	.ccard-body h2 {
		margin: 0;
		color: var(--iz-ink);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 21px;
		font-weight: 600;
		letter-spacing: -0.3px;
	}

	.ccard-summary {
		margin: 0;
		color: var(--iz-muted);
		font-size: 12.5px;
		line-height: 1.55;
	}

	.ccard-meta {
		display: flex;
		flex-wrap: wrap;
		gap: 22px;
		margin: 2px 0 0;
	}

	.ccard-meta dt {
		margin: 0 0 3px;
		color: var(--iz-faint);
		font-size: 10px;
		font-weight: 750;
		letter-spacing: 1.1px;
		text-transform: uppercase;
	}

	.ccard-meta dd {
		margin: 0;
		color: var(--iz-ink-soft);
		font-size: 12.5px;
		font-weight: 650;
	}

	.ccard-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-top: auto;
		padding-top: 14px;
		border-top: 1px solid var(--iz-line);
		color: var(--iz-green-700);
		font-size: 12.5px;
		font-weight: 650;
		text-decoration: none;
	}

	.ccard-link svg {
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
