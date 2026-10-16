<script lang="ts">
	import { page } from '$app/state';
	import {
		ApiServiceError,
		getPublicCampaignBySlug,
		type Campaign
	} from '#lib/services/api/api.service.js';
	import { formatCurrency, formatDateTimeParts, toPlainText } from '#lib/utils/format.js';

	let campaign = $state<Campaign | null>(null);
	let isLoading = $state(true);
	let errorMessage = $state('');
	let coverFailed = $state(false);

	const slug = $derived(page.params.slug ?? '');

	$effect(() => {
		if (slug) void load(slug);
	});

	async function load(currentSlug: string) {
		isLoading = true;
		errorMessage = '';
		campaign = null;
		coverFailed = false;
		try {
			campaign = await getPublicCampaignBySlug(currentSlug);
		} catch (error) {
			errorMessage =
				error instanceof ApiServiceError && error.status === 404
					? 'No encontramos esta campaña.'
					: error instanceof Error
						? error.message
						: 'No se pudo cargar la campaña.';
		} finally {
			isLoading = false;
		}
	}

	const startDay = $derived(formatDateTimeParts(campaign?.startsAt ?? null).day);
	const endDay = $derived(formatDateTimeParts(campaign?.endsAt ?? null).day);

	const estadoLabel = $derived(
		!campaign ? '' : campaign.isActive ? 'En curso' : campaign.status === 'activa' ? 'Activa' : 'Finalizada'
	);
</script>

<svelte:head>
	<title>{campaign ? `${campaign.title} | Izeco` : 'Campaña | Izeco'}</title>
	<meta
		name="description"
		content={campaign
			? campaign.summary || toPlainText(campaign.description, 140)
			: 'Campaña de la comunidad Izeco.'}
	/>
</svelte:head>

<a class="back" href="/campanas">
	<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11 5 6 10l5 5" /></svg>
	Todas las campañas
</a>

{#if isLoading}
	<p class="state">Cargando campaña…</p>
{:else if errorMessage}
	<div class="error-card">
		<p role="alert">{errorMessage}</p>
		<a href="/campanas">Volver a las campañas</a>
	</div>
{:else if campaign}
	<header class="hero">
		<p class="eyebrow">Campaña de la comunidad · {estadoLabel}</p>
		<h1>{campaign.title}</h1>
		{#if campaign.summary}
			<p class="summary">{campaign.summary}</p>
		{/if}
	</header>

	{#if campaign.imageUrl && !coverFailed}
		<figure class="cover">
			<img src={campaign.imageUrl} alt={campaign.title} onerror={() => (coverFailed = true)} />
		</figure>
	{/if}

	<section class="stats" aria-label="Datos de la campaña">
		<div class="stat">
			<p class="stat-label">Meta</p>
			<p class="stat-value">
				{campaign.goalCents ? formatCurrency(campaign.goalCents) : 'Campaña informativa'}
			</p>
		</div>
		<div class="stat">
			<p class="stat-label">Vigencia</p>
			<p class="stat-value">
				{#if startDay && endDay}
					{startDay} — {endDay}
				{:else if endDay}
					Hasta el {endDay}
				{:else if startDay}
					Desde el {startDay}
				{:else}
					Sin fecha límite
				{/if}
			</p>
		</div>
		<div class="stat">
			<p class="stat-label">Estado</p>
			<p class="stat-value">{estadoLabel}</p>
		</div>
	</section>

	<section class="panel">
		<h2>Sobre la campaña</h2>
		<p class="description">{toPlainText(campaign.description, 4000)}</p>

		<div class="actions">
			{#if campaign.isActive}
				<a class="primary" href="/donaciones?campana={campaign.id}">
					Donar a esta campaña
					<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M8 5h7v7" /></svg>
				</a>
			{/if}
			{#if campaign.donationUrl}
				<a class="secondary" href={campaign.donationUrl} target="_blank" rel="noopener noreferrer">
					Ver cómo aportar
				</a>
			{/if}
			<a class="secondary" href="/jornadas">Súmate a una jornada</a>
		</div>
	</section>
{/if}

<style>
	.back {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 16px;
		color: var(--iz-muted);
		font-size: 12.5px;
		font-weight: 600;
		text-decoration: none;
	}

	.back:hover {
		color: var(--iz-green-700);
	}

	.back svg {
		width: 15px;
		height: 15px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.8;
	}

	.state {
		margin: 0;
		padding: 46px 20px;
		color: var(--iz-muted);
		font-size: 13px;
		text-align: center;
	}

	.error-card {
		padding: 34px 24px;
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-md);
		background: var(--iz-surface);
		text-align: center;
	}

	.error-card p {
		margin: 0 0 14px;
		color: var(--iz-muted);
		font-size: 13px;
	}

	.error-card a {
		color: var(--iz-green-700);
		font-size: 12.5px;
		font-weight: 650;
	}

	.hero {
		margin-bottom: 18px;
		padding: 30px 28px;
		border-radius: var(--iz-radius-lg);
		background: linear-gradient(104deg, #1b4733 0%, #276149 58%, #3d7f57 100%);
		box-shadow: 0 18px 38px rgb(27 71 51 / 20%);
	}

	.eyebrow {
		margin: 0 0 10px;
		color: #a9d089;
		font-size: 10px;
		font-weight: 750;
		letter-spacing: 1.4px;
		text-transform: uppercase;
	}

	.hero h1 {
		margin: 0;
		color: #f6faf3;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 33px;
		font-weight: 600;
		letter-spacing: -0.6px;
		line-height: 1.16;
	}

	.summary {
		max-width: 640px;
		margin: 10px 0 0;
		color: #c8dcc4;
		font-size: 13.5px;
		line-height: 1.55;
	}

	.cover {
		margin: 0 0 18px;
		overflow: hidden;
		border-radius: var(--iz-radius-md);
		box-shadow: var(--iz-shadow-md);
	}

	.cover img {
		display: block;
		width: 100%;
		height: 300px;
		object-fit: cover;
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 14px;
		margin-bottom: 18px;
	}

	.stat {
		padding: 16px 18px;
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-sm);
		background: var(--iz-surface);
	}

	.stat-label {
		margin: 0 0 5px;
		color: var(--iz-faint);
		font-size: 10px;
		font-weight: 750;
		letter-spacing: 1.1px;
		text-transform: uppercase;
	}

	.stat-value {
		margin: 0;
		color: var(--iz-ink);
		font-size: 14px;
		font-weight: 650;
	}

	.panel {
		padding: 24px;
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-md);
		background: var(--iz-surface);
		box-shadow: var(--iz-shadow-sm);
	}

	.panel h2 {
		margin: 0 0 12px;
		color: var(--iz-ink);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 20px;
		font-weight: 600;
	}

	.description {
		margin: 0;
		color: var(--iz-ink-soft);
		font-size: 13px;
		line-height: 1.7;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 20px;
		padding-top: 18px;
		border-top: 1px solid var(--iz-line);
	}

	.primary,
	.secondary {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 11px 18px;
		border-radius: 11px;
		font-size: 12.5px;
		font-weight: 650;
		text-decoration: none;
	}

	.primary {
		background: var(--iz-green-800);
		color: #f4f7f2;
	}

	.primary:hover {
		background: var(--iz-green-900);
	}

	.primary svg {
		width: 13px;
		height: 13px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.7;
	}

	.secondary {
		border: 1px solid var(--iz-line-strong);
		color: var(--iz-green-700);
	}

	.secondary:hover {
		background: var(--iz-green-50);
	}

	@media (max-width: 880px) {
		.stats {
			grid-template-columns: minmax(0, 1fr);
		}

		.cover img {
			height: 200px;
		}

		.hero h1 {
			font-size: 26px;
		}
	}
</style>
