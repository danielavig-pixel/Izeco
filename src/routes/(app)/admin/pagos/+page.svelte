<script lang="ts">
	import { onMount } from 'svelte';
	import { getAdminPayments, type AdminPayment } from '#lib/services/api/api.service.js';
	import { formatCurrency, formatLongDate } from '#lib/utils/format.js';
	import Pagination from '#lib/components/Pagination.svelte';

	const PAGE_SIZE = 12;
	const STATUS_OPTIONS = ['pendiente', 'aprobado', 'rechazado', 'reembolsado', 'cancelado'];

	let payments = $state<AdminPayment[]>([]);
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
			const result = await getAdminPayments({
				page: target,
				limit: PAGE_SIZE,
				status: statusFilter || undefined
			});
			payments = result.items;
			total = result.total;
			pageNumber = result.page || target;
			totalPages = result.totalPages || 1;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudieron cargar los pagos.';
			payments = [];
		} finally {
			isLoading = false;
		}
	}

	const approvedCents = $derived(
		payments
			.filter((payment) => payment.status === 'aprobado')
			.reduce((sum, payment) => sum + payment.amountCents, 0)
	);

	function statusTone(status: string): string {
		if (status === 'aprobado') return 'green';
		if (status === 'rechazado' || status === 'cancelado') return 'red';
		if (status === 'reembolsado') return 'purple';
		return 'amber';
	}
</script>

<svelte:head>
	<title>Pagos | Administración Izeco</title>
</svelte:head>

<section class="ad-head">
	<div>
		<p class="ad-eyebrow">Administración</p>
		<h1 class="ad-title">Pagos</h1>
		<p class="ad-subtitle">
			{total.toLocaleString('es-CO')} {total === 1 ? 'pago registrado' : 'pagos registrados'} en la
			plataforma.
		</p>
	</div>
</section>

{#if errorMessage}
	<p class="ad-banner" role="alert">{errorMessage}</p>
{/if}

<form class="ad-toolbar" onsubmit={(event) => (event.preventDefault(), load(1))}>
	<div class="ad-field">
		<label for="p-status">Estado</label>
		<select id="p-status" class="ad-select" bind:value={statusFilter}>
			<option value="">Todos</option>
			{#each STATUS_OPTIONS as status (status)}
				<option value={status}>{status}</option>
			{/each}
		</select>
	</div>
	<div class="ad-btn-row">
		<button class="ad-btn" type="submit" disabled={isLoading}>Filtrar</button>
	</div>
</form>

{#if isLoading}
	<p class="ad-state">Cargando pagos…</p>
{:else if payments.length === 0}
	<p class="ad-state">No hay pagos con esos filtros.</p>
{:else}
	<section class="ad-stats" style="margin-bottom: 16px;">
		<article class="ad-stat">
			<p class="ad-stat-label">Aprobado en esta página</p>
			<p class="ad-stat-value">{formatCurrency(approvedCents, payments[0]?.currencyCode ?? 'COP')}</p>
		</article>
	</section>

	<div class="ad-table-wrap">
		<table class="ad-table">
			<thead>
				<tr>
					<th>Comprador</th>
					<th>Emprendimiento</th>
					<th>Monto</th>
					<th>Estado</th>
					<th>Fecha</th>
				</tr>
			</thead>
			<tbody>
				{#each payments as payment (payment.id)}
					<tr>
						<td>
							<span class="ad-cell-strong">{payment.buyerName || 'Sin nombre'}</span>
							{#if payment.buyerEmail}
								<br /><span class="ad-cell-muted">{payment.buyerEmail}</span>
							{/if}
						</td>
						<td class="ad-cell-muted">{payment.sellerName || payment.description || '—'}</td>
						<td class="ad-cell-strong">
							{formatCurrency(payment.amountCents, payment.currencyCode)}
							{#if payment.refundedCents > 0}
								<br /><span class="ad-cell-muted"
									>-{formatCurrency(payment.refundedCents, payment.currencyCode)}</span
								>
							{/if}
						</td>
						<td>
							<span class="ad-badge {statusTone(payment.status)}">
								{payment.status || 'pendiente'}
							</span>
						</td>
						<td class="ad-cell-muted">
							{payment.createdAt ? formatLongDate(new Date(payment.createdAt)) : '—'}
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<Pagination page={pageNumber} {totalPages} onchange={(next) => load(next)} disabled={isLoading} />
{/if}
