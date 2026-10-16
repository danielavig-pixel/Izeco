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

{#if errorMessage}
	<p class="ad-banner" role="alert">{errorMessage}</p>
{/if}

{#if isLoading}
	<p class="ad-state">Cargando el resumen…</p>
{:else if groups.length === 0}
	<p class="ad-state">No hay métricas disponibles.</p>
{:else}
	{#each groups as group (group.key)}
		<section class="ad-group">
			<h2 class="ad-group-title">{group.label}</h2>
			<div class="ad-stats">
				{#each group.metrics as metric (metric.key)}
					<article class="ad-stat">
						<p class="ad-stat-label">{metric.label}</p>
						<p class="ad-stat-value">{formatValue(metric)}</p>
					</article>
				{/each}
			</div>
		</section>
	{/each}
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
	.chart-card {
		margin-top: 20px;
	}

	.chart-card + .chart-card {
		margin-top: 16px;
	}
</style>
