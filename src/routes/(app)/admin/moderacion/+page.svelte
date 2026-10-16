<script lang="ts">
	import { onMount } from 'svelte';
	import {
		adminRestoreProduct,
		adminUnpublishProduct,
		getModerationProducts,
		type AdminProduct
	} from '#lib/services/api/api.service.js';
	import { formatCurrency, formatLongDate, toPlainText } from '#lib/utils/format.js';
	import Pagination from '#lib/components/Pagination.svelte';

	const PAGE_SIZE = 12;
	const STATUS_OPTIONS = ['borrador', 'publicado', 'despublicado'];

	let products = $state<AdminProduct[]>([]);
	let total = $state(0);
	let pageNumber = $state(1);
	let totalPages = $state(1);
	let isLoading = $state(true);
	let errorMessage = $state('');
	let notice = $state('');
	let busyId = $state('');

	let query = $state('');
	let statusFilter = $state('');
	let includeArchived = $state(false);

	onMount(() => {
		void load(1);
	});

	async function load(target: number) {
		isLoading = true;
		errorMessage = '';
		try {
			const result = await getModerationProducts({
				page: target,
				limit: PAGE_SIZE,
				q: query.trim() || undefined,
				status: statusFilter || undefined,
				includeArchived,
				type: 'artesania'
			});
			products = result.items;
			total = result.total;
			pageNumber = result.page || target;
			totalPages = result.totalPages || 1;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudieron cargar los productos.';
			products = [];
		} finally {
			isLoading = false;
		}
	}

	async function applyFilters(event: SubmitEvent) {
		event.preventDefault();
		await load(1);
	}

	async function clearFilters() {
		query = '';
		statusFilter = '';
		includeArchived = false;
		await load(1);
	}

	async function unpublish(product: AdminProduct) {
		if (!product.id) return;
		busyId = product.id;
		errorMessage = '';
		notice = '';
		try {
			await adminUnpublishProduct(product.id);
			notice = `"${product.name}" salió del catálogo público.`;
			await load(pageNumber);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudo despublicar.';
		} finally {
			busyId = '';
		}
	}

	async function restore(product: AdminProduct) {
		if (!product.id) return;
		busyId = product.id;
		errorMessage = '';
		notice = '';
		try {
			await adminRestoreProduct(product.id);
			notice = `"${product.name}" restaurado.`;
			await load(pageNumber);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudo restaurar.';
		} finally {
			busyId = '';
		}
	}

	function statusTone(status: string): string {
		if (status === 'publicado') return 'green';
		if (status === 'despublicado' || status === 'archivado') return 'red';
		return 'amber';
	}
</script>

<svelte:head>
	<title>Moderación | Administración Izeco</title>
</svelte:head>

<section class="ad-head">
	<div>
		<p class="ad-eyebrow">Administración</p>
		<h1 class="ad-title">Moderación de productos</h1>
		<p class="ad-subtitle">
			{total.toLocaleString('es-CO')}
			{total === 1 ? 'producto' : 'productos'} de los socios, en cualquier estado. La materia
			prima de la plataforma se gestiona en su propia sección.
		</p>
	</div>
</section>

{#if errorMessage}
	<p class="ad-banner" role="alert">{errorMessage}</p>
{/if}
{#if notice}
	<p class="ad-banner success" role="status">{notice}</p>
{/if}

<form class="ad-toolbar" onsubmit={applyFilters}>
	<div class="ad-field grow">
		<label for="mod-q">Buscar</label>
		<input id="mod-q" class="ad-input" type="search" bind:value={query} placeholder="Nombre o descripción" />
	</div>
	<div class="ad-field">
		<label for="mod-status">Estado</label>
		<select id="mod-status" class="ad-select" bind:value={statusFilter}>
			<option value="">Todos</option>
			{#each STATUS_OPTIONS as status (status)}
				<option value={status}>{status}</option>
			{/each}
		</select>
	</div>
	<label class="ad-check">
		<input type="checkbox" bind:checked={includeArchived} />
		Incluir archivados
	</label>
	<div class="ad-btn-row">
		<button class="ad-btn" type="submit" disabled={isLoading}>Filtrar</button>
		<button class="ad-btn ghost" type="button" onclick={clearFilters} disabled={isLoading}>
			Limpiar
		</button>
	</div>
</form>

{#if isLoading}
	<p class="ad-state">Cargando productos…</p>
{:else if products.length === 0}
	<p class="ad-state">No se encontraron productos con esos filtros.</p>
{:else}
	<div class="ad-table-wrap">
		<table class="ad-table">
			<thead>
				<tr>
					<th>Producto</th>
					<th>Emprendimiento</th>
					<th>Precio</th>
					<th>Estado</th>
					<th>Creado</th>
					<th>Acciones</th>
				</tr>
			</thead>
			<tbody>
				{#each products as product (product.id || product.name)}
					<tr>
						<td>
							<span class="ad-cell-strong">{product.name}</span>
							<br />
							<span class="ad-cell-muted"
								>{product.categoryName || 'Sin categoría'}{product.isArchived
									? ' · Archivado'
									: ''}</span
							>
							{#if product.description}
								<p class="desc">{toPlainText(product.description, 90)}</p>
							{/if}
						</td>
						<td class="ad-cell-muted">{product.entrepreneurName || '—'}</td>
						<td class="ad-cell-strong">
							{formatCurrency(product.priceCents, product.currencyCode)}
						</td>
						<td>
							<span class="ad-badge {product.isArchived ? 'red' : statusTone(product.status)}">
								{product.isArchived ? 'archivado' : product.status}
							</span>
						</td>
						<td class="ad-cell-muted">
							{product.createdAt ? formatLongDate(new Date(product.createdAt)) : '—'}
						</td>
						<td>
							<div class="ad-cell-actions">
								{#if product.isArchived}
									<button
										class="ad-btn small"
										type="button"
										disabled={busyId === product.id}
										onclick={() => restore(product)}
									>
										Restaurar
									</button>
								{:else if product.status === 'publicado'}
									<button
										class="ad-btn danger small"
										type="button"
										disabled={busyId === product.id}
										onclick={() => unpublish(product)}
									>
										Despublicar
									</button>
								{:else}
									<span class="ad-cell-muted">Sin acción</span>
								{/if}
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<Pagination page={pageNumber} {totalPages} onchange={(next) => load(next)} disabled={isLoading} />
{/if}

<style>
	.desc {
		margin: 4px 0 0;
		color: var(--iz-muted);
		font-size: 11px;
		line-height: 1.4;
	}

	.ad-check {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 9px 4px;
		color: var(--iz-ink-soft);
		font-size: 12.5px;
		white-space: nowrap;
		cursor: pointer;
	}
</style>
