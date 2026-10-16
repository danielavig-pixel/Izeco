<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getAdminDonations,
		getAdminDonationStats,
		type AdminDonationStats,
		type Donation
	} from '#lib/services/api/api.service.js';
	import { formatCurrency, formatLongDate } from '#lib/utils/format.js';
	import Pagination from '#lib/components/Pagination.svelte';

	const PAGE_SIZE = 12;
	const STATUS_OPTIONS = ['pendiente', 'aprobado', 'rechazado', 'cancelado', 'reembolsado'];

	const STATUS_LABEL: Record<string, string> = {
		pendiente: 'Pendiente',
		aprobado: 'Confirmada',
		rechazado: 'Rechazada',
		cancelado: 'Cancelada',
		reembolsado: 'Reembolsada'
	};

	let donations = $state<Donation[]>([]);
	let stats = $state<AdminDonationStats | null>(null);
	let total = $state(0);
	let pageNumber = $state(1);
	let totalPages = $state(1);
	let isLoading = $state(true);
	let errorMessage = $state('');
	let statusFilter = $state('');

	onMount(() => {
		void load(1);
	});

	async function load(target: number) {
		isLoading = true;
		errorMessage = '';
		try {
			const [list, summary] = await Promise.all([
				getAdminDonations({
					page: target,
					limit: PAGE_SIZE,
					status: statusFilter || undefined
				}),
				getAdminDonationStats()
			]);
			donations = list.items;
			total = list.total;
			pageNumber = list.page || target;
			totalPages = list.totalPages || 1;
			stats = summary;
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'No se pudieron cargar las donaciones.';
			donations = [];
		} finally {
			isLoading = false;
		}
	}

	function statusTone(status: string): string {
		if (status === 'aprobado') return 'green';
		if (status === 'rechazado' || status === 'cancelado') return 'red';
		if (status === 'reembolsado') return 'purple';
		return 'amber';
	}
</script>

<svelte:head>
	<title>Donaciones | Administración Izeco</title>
</svelte:head>

<section class="ad-head">
	<div>
		<p class="ad-eyebrow">Administración</p>
		<h1 class="ad-title">Donaciones</h1>
		<p class="ad-subtitle">
			{total.toLocaleString('es-CO')}
			{total === 1 ? 'aporte registrado' : 'aportes registrados'} en la plataforma.
		</p>
	</div>
</section>

{#if errorMessage}
	<p class="ad-banner" role="alert">{errorMessage}</p>
{/if}

{#if stats}
	<section class="ad-stats" style="margin-bottom: 16px;">
		<article class="ad-stat">
			<p class="ad-stat-label">Recaudado</p>
			<p class="ad-stat-value">{formatCurrency(stats.recaudadoCents)}</p>
		</article>
		<article class="ad-stat">
			<p class="ad-stat-label">Fondo general</p>
			<p class="ad-stat-value">{formatCurrency(stats.fondoGeneralCents)}</p>
		</article>
		<article class="ad-stat">
			<p class="ad-stat-label">Por campañas</p>
			<p class="ad-stat-value">{formatCurrency(stats.porCampanaCents)}</p>
		</article>
		<article class="ad-stat">
			<p class="ad-stat-label">Aportes</p>
			<p class="ad-stat-value">{stats.aprobadas.toLocaleString('es-CO')}</p>
			<p class="ad-stat-hint">
				{stats.pendientes.toLocaleString('es-CO')}
				{stats.pendientes === 1 ? ' pendiente' : ' pendientes'}
			</p>
		</article>
	</section>
{/if}

{#if stats && stats.topCampanas.length > 0}
	<section class="ad-card" style="margin-bottom: 16px;">
		<h2 class="ad-card-title">Campañas con más recaudo</h2>
		<ul class="tops">
			{#each stats.topCampanas as campaign (campaign.campaignId)}
				<li>
					<span>{campaign.title}</span>
					<span class="tops-side">
						{campaign.donors}
						{campaign.donors === 1 ? 'aporte' : 'aportes'} ·
						<strong>{formatCurrency(campaign.raisedCents)}</strong>
					</span>
				</li>
			{/each}
		</ul>
	</section>
{/if}

<form class="ad-toolbar" onsubmit={(event) => (event.preventDefault(), load(1))}>
	<div class="ad-field">
		<label for="d-status">Estado</label>
		<select id="d-status" class="ad-select" bind:value={statusFilter}>
			<option value="">Todos</option>
			{#each STATUS_OPTIONS as status (status)}
				<option value={status}>{STATUS_LABEL[status]}</option>
			{/each}
		</select>
	</div>
	<div class="ad-btn-row">
		<button class="ad-btn" type="submit" disabled={isLoading}>Filtrar</button>
	</div>
</form>

{#if isLoading}
	<p class="ad-state">Cargando donaciones…</p>
{:else if donations.length === 0}
	<p class="ad-state">No hay aportes con esos filtros.</p>
{:else}
	<div class="ad-table-wrap">
		<table class="ad-table">
			<thead>
				<tr>
					<th>Donante</th>
					<th>Destino</th>
					<th>Monto</th>
					<th>Mensaje</th>
					<th>Estado</th>
					<th>Fecha</th>
				</tr>
			</thead>
			<tbody>
				{#each donations as donation (donation.id)}
					<tr>
						<td>
							<span class="ad-cell-strong">
								{donation.anonymous ? 'Anónimo' : (donation.donorName || 'Sin nombre')}
							</span>
						</td>
						<td class="ad-cell-muted">
							{donation.campaignTitle ?? 'Fondo general'}
						</td>
						<td class="ad-cell-strong">
							{formatCurrency(donation.amountCents, donation.currencyCode)}
						</td>
						<td class="ad-cell-muted">{donation.message || '—'}</td>
						<td>
							<span class="ad-badge {statusTone(donation.status)}">
								{STATUS_LABEL[donation.status] ?? donation.status}
							</span>
						</td>
						<td class="ad-cell-muted">
							{donation.createdAt ? formatLongDate(new Date(donation.createdAt)) : '—'}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<Pagination page={pageNumber} {totalPages} onchange={(next) => load(next)} disabled={isLoading} />
{/if}

<style>
	.tops {
		margin: 10px 0 0;
		padding: 0;
		list-style: none;
	}

	.tops li {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		padding: 9px 0;
		border-bottom: 1px solid var(--iz-line);
		color: var(--iz-ink);
		font-size: 13px;
	}

	.tops li:last-child {
		border-bottom: 0;
	}

	.tops-side {
		color: var(--iz-muted);
		font-size: 12px;
		white-space: nowrap;
	}

	.tops-side strong {
		color: var(--iz-ink);
	}
</style>
