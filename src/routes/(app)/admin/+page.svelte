<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getAdminActivityReport,
		getAdminOverview,
		getAdminUsersReport
	} from '#lib/services/api/api.service.js';
	import {
		describeOverview,
		extractSeries,
		type Metric,
		type MetricGroup,
		type SeriesPoint
	} from '#lib/utils/admin.js';
	import { formatCurrency } from '#lib/utils/format.js';

	const RANGES = [
		{ label: '7 días', days: 7 },
		{ label: '30 días', days: 30 },
		{ label: '90 días', days: 90 }
	];

	let isLoading = $state(true);
	let errorMessage = $state('');
	let groups = $state<MetricGroup[]>([]);
	let activity = $state<SeriesPoint[]>([]);
	let usersSeries = $state<SeriesPoint[]>([]);
	let rangeDays = $state(30);

	onMount(() => {
		void load();
	});

	function rangeParams(days: number): { from: string; to: string } {
		const to = new Date();
		const from = new Date(to.getTime() - days * 24 * 60 * 60 * 1000);
		return { from: from.toISOString(), to: to.toISOString() };
	}

	async function load() {
		isLoading = true;
		errorMessage = '';
		const params = rangeParams(rangeDays);

		const [overview, activityReport, usersReport] = await Promise.allSettled([
			getAdminOverview(),
			getAdminActivityReport(params),
			getAdminUsersReport(params)
		]);

		if (overview.status === 'fulfilled') {
			groups = describeOverview(overview.value);
		} else {
			errorMessage =
				overview.reason instanceof Error
					? overview.reason.message
					: 'No se pudo cargar el resumen del panel.';
		}

		activity =
			activityReport.status === 'fulfilled'
				? extractSeries(activityReport.value, ['users', 'total', 'count'])
				: [];
		usersSeries =
			usersReport.status === 'fulfilled'
				? extractSeries(usersReport.value, ['users', 'created', 'total', 'count'])
				: [];

		isLoading = false;
	}

	async function changeRange(days: number) {
		if (days === rangeDays) return;
		rangeDays = days;
		await load();
	}

	function formatValue(metric: Metric): string {
		if (metric.money) return formatCurrency(metric.value, 'COP');
		return metric.value.toLocaleString('es-CO');
	}

	function chartMax(points: SeriesPoint[]): number {
		return Math.max(...points.map((point) => point.value), 1);
	}

	function barHeight(value: number, points: SeriesPoint[]): string {
		if (value <= 0) return '3%';
		return `${Math.max(6, Math.round((value / chartMax(points)) * 100))}%`;
	}
</script>

<svelte:head>
	<title>Administración | Izeco</title>
	<meta name="description" content="Resumen y reportes del panel de administración de Izeco." />
</svelte:head>

<section class="ad-head">
	<div>
		<p class="ad-eyebrow">Panel de administración</p>
		<h1 class="ad-title">Resumen general</h1>
		<p class="ad-subtitle">
			Estado global de la plataforma: usuarios, emprendimientos, catálogo, voluntariado y dinero.
		</p>
	</div>
	<div class="ad-tabs" role="tablist" aria-label="Rango de los reportes">
		{#each RANGES as option (option.days)}
			<button
				class="ad-tab"
				class:active={rangeDays === option.days}
				type="button"
				role="tab"
				aria-selected={rangeDays === option.days}
				onclick={() => changeRange(option.days)}
			>
				{option.label}
			</button>
		{/each}
	</div>
</section>

<section class="ad-quick" aria-label="Acciones rápidas">
	<a class="quick" href="/admin/materia-prima">
		<span class="quick-icon" aria-hidden="true">
			<svg viewBox="0 0 24 24"
				><path d="M12 21c0-6 0-9 8-12 0 8-3 11-8 12Z" /><path
					d="M12 21C12 14 10 9 4 6c-1 7 2 12 8 15Z"
				/></svg
			>
		</span>
		<span class="quick-body">
			<strong>Publicar materia prima</strong>
			<span>Crea, edita y publica el material recuperado que vendemos.</span>
		</span>
		<svg class="quick-arrow" viewBox="0 0 20 20" aria-hidden="true"
			><path d="M5 15 15 5M8 5h7v7" /></svg
		>
	</a>
	<a class="quick" href="/admin/emprendimientos">
		<span class="quick-icon" aria-hidden="true">
			<svg viewBox="0 0 24 24"
				><path d="M4 9h16l-1 11H5L4 9Z" /><path d="M9 9V6a3 3 0 0 1 6 0v3" /></svg
			>
		</span>
		<span class="quick-body">
			<strong>Revisar emprendimientos</strong>
			<span>Aprueba o rechaza las fichas de los socios.</span>
		</span>
		<svg class="quick-arrow" viewBox="0 0 20 20" aria-hidden="true"
			><path d="M5 15 15 5M8 5h7v7" /></svg
		>
	</a>
	<a class="quick" href="/admin/moderacion">
		<span class="quick-icon" aria-hidden="true">
			<svg viewBox="0 0 24 24"
				><path d="M4 7h16v13H4z" /><path d="M4 7 12 3l8 4" /></svg
			>
		</span>
		<span class="quick-body">
			<strong>Moderar catálogo</strong>
			<span>Revisa las artesanías que publican los socios.</span>
		</span>
		<svg class="quick-arrow" viewBox="0 0 20 20" aria-hidden="true"
			><path d="M5 15 15 5M8 5h7v7" /></svg
		>
	</a>
</section>

{#if errorMessage}
	<p class="ad-banner" role="alert">{errorMessage}</p>
{/if}

{#if isLoading}
	<p class="ad-state">Cargando el resumen…</p>
{:else if groups.length === 0}
	<p class="ad-state">No hay métricas disponibles.</p>
{:else}
	<div class="ad-board">
		{#each groups as group (group.key)}
			<article class="board-panel">
				<h2 class="board-title">{group.label}</h2>
				<div class="board-metrics">
					{#each group.metrics as metric (metric.key)}
						<div class="board-metric">
							<span class="board-label">{metric.label}</span>
							<strong class="board-value">{formatValue(metric)}</strong>
						</div>
					{/each}
				</div>
			</article>
		{/each}
	</div>
{/if}

<section class="ad-card chart-card">
	<div class="ad-card-head">
		<div>
			<h2 class="ad-card-title">Altas en el periodo</h2>
			<p class="ad-card-sub">Nuevos registros por día en los últimos {rangeDays} días.</p>
		</div>
	</div>

	{#if activity.length === 0}
		<p class="ad-empty">El reporte de actividad no devolvió series para este rango.</p>
	{:else}
		<div class="ad-chart" role="img" aria-label="Altas por día">
			{#each activity as point, index (index)}
				<span class="ad-chart-slot">
					<span
						class="ad-chart-bar"
						style="height: {barHeight(point.value, activity)}"
						title={`${point.label}: ${point.value}`}
					></span>
					<span class="ad-chart-label">{point.label}</span>
				</span>
			{/each}
		</div>
	{/if}
</section>

{#if usersSeries.length > 0}
	<section class="ad-card chart-card">
		<div class="ad-card-head">
			<div>
				<h2 class="ad-card-title">Usuarios nuevos</h2>
				<p class="ad-card-sub">Altas diarias según el reporte de usuarios.</p>
			</div>
		</div>
		<div class="ad-chart" role="img" aria-label="Usuarios nuevos por día">
			{#each usersSeries as point, index (index)}
				<span class="ad-chart-slot">
					<span
						class="ad-chart-bar"
						style="height: {barHeight(point.value, usersSeries)}"
						title={`${point.label}: ${point.value}`}
					></span>
					<span class="ad-chart-label">{point.label}</span>
				</span>
			{/each}
		</div>
	</section>
{/if}

<style>
	/* Tablero de métricas: cada grupo es un panel y los paneles se reparten
	   el ancho disponible (3-4 por fila en escritorio, 1 en móvil). */
	.ad-board {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(290px, 1fr));
		gap: 14px;
		align-items: stretch;
		margin-top: 4px;
	}

	.board-panel {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 18px;
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-md);
		background: var(--iz-surface);
		box-shadow: var(--iz-shadow-sm);
	}

	.board-title {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0;
		color: var(--iz-ink-soft);
		font-size: 11.5px;
		font-weight: 700;
		letter-spacing: 0.5px;
		text-transform: uppercase;
	}

	.board-title::before {
		width: 7px;
		height: 7px;
		flex: 0 0 auto;
		border-radius: 50%;
		background: var(--iz-green-600);
		content: '';
	}

	.board-metrics {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(104px, 1fr));
		gap: 14px 16px;
	}

	.board-metric {
		display: flex;
		min-width: 0;
		flex-direction: column;
		gap: 4px;
	}

	.board-label {
		color: var(--iz-muted);
		font-size: 11.5px;
		line-height: 1.3;
	}

	.board-value {
		color: var(--iz-ink);
		font-size: 24px;
		font-weight: 700;
		letter-spacing: -0.6px;
		overflow-wrap: anywhere;
	}

	.ad-quick {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 14px;
		margin: 20px 0 24px;
	}

	.quick {
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 16px 18px;
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-md);
		background: var(--iz-surface);
		box-shadow: var(--iz-shadow-sm);
		color: inherit;
		text-decoration: none;
		transition:
			transform 160ms ease,
			box-shadow 160ms ease,
			border-color 160ms ease;
	}

	.quick:hover {
		transform: translateY(-2px);
		border-color: var(--iz-green-300);
		box-shadow: var(--iz-shadow-md);
	}

	.quick-icon {
		display: grid;
		place-items: center;
		width: 42px;
		height: 42px;
		flex: 0 0 auto;
		border-radius: 12px;
		background: var(--iz-green-100);
	}

	.quick-icon svg {
		width: 22px;
		height: 22px;
		fill: none;
		stroke: var(--iz-green-700);
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.6;
	}

	.quick-body {
		display: flex;
		flex-direction: column;
		gap: 3px;
		min-width: 0;
	}

	.quick-body strong {
		color: var(--iz-ink);
		font-size: 13.5px;
		font-weight: 700;
	}

	.quick-body span {
		color: var(--iz-muted);
		font-size: 12px;
		line-height: 1.45;
	}

	.quick-arrow {
		width: 16px;
		height: 16px;
		flex: 0 0 auto;
		margin-left: auto;
		fill: none;
		stroke: var(--iz-green-700);
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.7;
	}

	@media (max-width: 900px) {
		.ad-quick {
			grid-template-columns: minmax(0, 1fr);
		}
	}

	.chart-card {
		margin-top: 20px;
	}

	.chart-card + .chart-card {
		margin-top: 16px;
	}
</style>
