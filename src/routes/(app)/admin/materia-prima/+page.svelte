<script lang="ts">
	import { onMount } from 'svelte';
	import {
		archiveAdminRawMaterial,
		createAdminRawMaterial,
		getAdminRawMaterials,
		getProductCategoryTree,
		publishAdminRawMaterial,
		restoreAdminRawMaterial,
		unpublishAdminRawMaterial,
		updateAdminRawMaterial,
		type AdminProduct,
		type CategoryNode
	} from '#lib/services/api/api.service.js';
	import { formatCurrency, formatLongDate, toPlainText } from '#lib/utils/format.js';
	import Pagination from '#lib/components/Pagination.svelte';

	const PAGE_SIZE = 12;
	const STATUS_OPTIONS = ['borrador', 'publicado', 'despublicado'];

	interface FlatCategory {
		id: string;
		label: string;
	}

	let materials = $state<AdminProduct[]>([]);
	let total = $state(0);
	let pageNumber = $state(1);
	let totalPages = $state(1);
	let isLoading = $state(true);
	let errorMessage = $state('');
	let notice = $state('');
	let busyId = $state('');
	let categories = $state<FlatCategory[]>([]);

	let query = $state('');
	let statusFilter = $state('');
	let includeArchived = $state(false);

	// Formulario (crear o editar).
	let formOpen = $state(false);
	let editingId = $state('');
	let isSaving = $state(false);
	let name = $state('');
	let description = $state('');
	let priceText = $state('');
	let stockText = $state('');
	let categoryId = $state('');
	let imagesText = $state('');
	let isActive = $state(true);

	onMount(async () => {
		await Promise.all([loadCategories(), load(1)]);
	});

	function flatten(nodes: CategoryNode[], depth = 0): FlatCategory[] {
		const result: FlatCategory[] = [];
		for (const node of nodes) {
			result.push({
				id: node.id,
				label: `${'— '.repeat(depth)}${node.name}`
			});
			if (node.children?.length) result.push(...flatten(node.children, depth + 1));
		}
		return result;
	}

	async function loadCategories() {
		try {
			categories = flatten(await getProductCategoryTree());
		} catch {
			categories = [];
		}
	}

	async function load(target: number) {
		isLoading = true;
		errorMessage = '';
		try {
			const result = await getAdminRawMaterials({
				page: target,
				limit: PAGE_SIZE,
				q: query.trim() || undefined,
				status: statusFilter || undefined,
				includeArchived
			});
			materials = result.items;
			total = result.total;
			pageNumber = result.page || target;
			totalPages = result.totalPages || 1;
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'No se pudo cargar la materia prima.';
			materials = [];
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

	function resetForm() {
		editingId = '';
		name = '';
		description = '';
		priceText = '';
		stockText = '';
		categoryId = categories[0]?.id ?? '';
		imagesText = '';
		isActive = true;
	}

	function openCreate() {
		resetForm();
		errorMessage = '';
		notice = '';
		formOpen = true;
	}

	function openEdit(material: AdminProduct) {
		resetForm();
		editingId = material.id;
		name = material.name;
		description = material.description;
		priceText = (material.priceCents / 100).toString();
		stockText = material.stock === null ? '' : String(material.stock);
		categoryId = '';
		isActive = material.isActive;
		errorMessage = '';
		notice = '';
		formOpen = true;
	}

	function toCents(text: string): number {
		const normalized = text.replace(',', '.').trim();
		const value = Number(normalized);
		if (!Number.isFinite(value) || value <= 0) return 0;
		return Math.round(value * 100);
	}

	function parseStock(text: string): number | undefined {
		const trimmed = text.trim();
		if (!trimmed) return undefined;
		const value = Number(trimmed);
		if (!Number.isInteger(value) || value < 0) return NaN;
		return value;
	}

	function parseImages(text: string): string[] {
		return text
			.split('\n')
			.map((line) => line.trim())
			.filter((line) => line.length > 0);
	}

	async function submitForm(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';
		notice = '';

		const priceCents = toCents(priceText);
		if (name.trim().length < 2) {
			errorMessage = 'El nombre debe tener al menos 2 caracteres.';
			return;
		}
		if (description.trim().length < 10) {
			errorMessage = 'La descripción debe tener al menos 10 caracteres.';
			return;
		}
		if (priceCents <= 0) {
			errorMessage = 'Escribe un precio válido (mayor que cero).';
			return;
		}
		const stock = parseStock(stockText);
		if (Number.isNaN(stock)) {
			errorMessage = 'El stock debe ser un número entero mayor o igual a cero.';
			return;
		}
		if (!editingId && !categoryId) {
			errorMessage = 'Elige una categoría para la materia prima.';
			return;
		}

		const images = parseImages(imagesText);
		const wasEditing = Boolean(editingId);
		isSaving = true;
		try {
			if (editingId) {
				await updateAdminRawMaterial(editingId, {
					name: name.trim(),
					description: description.trim(),
					priceCents,
					stock,
					...(categoryId ? { categoryId } : {}),
					...(images.length ? { images } : {}),
					isActive
				});
				notice = 'Materia prima actualizada.';
			} else {
				await createAdminRawMaterial({
					name: name.trim(),
					description: description.trim(),
					priceCents,
					categoryId,
					stock,
					images: images.length ? images : undefined,
					isActive
				});
				notice = 'Materia prima creada como borrador. Publícala para que aparezca en la tienda.';
			}
			formOpen = false;
			resetForm();
			await load(wasEditing ? pageNumber : 1);
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'No se pudo guardar la materia prima.';
		} finally {
			isSaving = false;
		}
	}

	async function publish(material: AdminProduct) {
		if (!material.id) return;
		busyId = material.id;
		errorMessage = '';
		notice = '';
		try {
			await publishAdminRawMaterial(material.id);
			notice = `"${material.name}" publicada en la tienda.`;
			await load(pageNumber);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudo publicar.';
		} finally {
			busyId = '';
		}
	}

	async function unpublish(material: AdminProduct) {
		if (!material.id) return;
		busyId = material.id;
		errorMessage = '';
		notice = '';
		try {
			await unpublishAdminRawMaterial(material.id);
			notice = `"${material.name}" salió de la tienda.`;
			await load(pageNumber);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudo despublicar.';
		} finally {
			busyId = '';
		}
	}

	async function archive(material: AdminProduct) {
		if (!material.id) return;
		if (!confirm(`¿Archivar "${material.name}"? Podrás restaurarla luego.`)) return;
		busyId = material.id;
		errorMessage = '';
		notice = '';
		try {
			await archiveAdminRawMaterial(material.id);
			notice = `"${material.name}" archivada.`;
			await load(pageNumber);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudo archivar.';
		} finally {
			busyId = '';
		}
	}

	async function restore(material: AdminProduct) {
		if (!material.id) return;
		busyId = material.id;
		errorMessage = '';
		notice = '';
		try {
			await restoreAdminRawMaterial(material.id);
			notice = `"${material.name}" restaurada.`;
			await load(pageNumber);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudo restaurar.';
		} finally {
			busyId = '';
		}
	}

	function statusTone(status: string): string {
		if (status === 'publicado') return 'green';
		if (status === 'despublicado') return 'red';
		return 'amber';
	}
</script>

<svelte:head>
	<title>Materia prima | Administración Izeco</title>
</svelte:head>

<section class="ad-head">
	<div>
		<p class="ad-eyebrow">Administración</p>
		<h1 class="ad-title">Materia prima</h1>
		<p class="ad-subtitle">
			La plataforma vende materia prima recuperada en las jornadas. Aquí la publicas en la tienda.
			{total.toLocaleString('es-CO')}
			{total === 1 ? 'material' : 'materiales'}.
		</p>
	</div>
	<div class="ad-btn-row">
		<button class="ad-btn" type="button" onclick={openCreate}>Nueva materia prima</button>
	</div>
</section>

{#if errorMessage}
	<p class="ad-banner" role="alert">{errorMessage}</p>
{/if}
{#if notice}
	<p class="ad-banner success" role="status">{notice}</p>
{/if}

{#if formOpen}
	<section class="ad-card">
		<div class="ad-card-head">
			<h2 class="ad-card-title">{editingId ? 'Editar materia prima' : 'Nueva materia prima'}</h2>
			<button
				class="ad-btn ghost small"
				type="button"
				onclick={() => (formOpen = false, resetForm())}
			>
				Cerrar
			</button>
		</div>
		<form class="ad-form-grid" style="margin-top: 12px;" onsubmit={submitForm}>
			<div class="ad-field full">
				<label for="rm-name">Nombre</label>
				<input id="rm-name" class="ad-input" bind:value={name} placeholder="Ej: PET molido" required />
			</div>
			<div class="ad-field full">
				<label for="rm-desc">Descripción</label>
				<textarea
					id="rm-desc"
					class="ad-input"
					rows="3"
					bind:value={description}
					placeholder="Describe el material, su origen y en qué se puede transformar."
				></textarea>
			</div>
			<div class="ad-field">
				<label for="rm-price">Precio por unidad ({'$'} / centavos)</label>
				<input
					id="rm-price"
					class="ad-input"
					inputmode="decimal"
					bind:value={priceText}
					placeholder="Ej: 85,00"
				/>
			</div>
			<div class="ad-field">
				<label for="rm-stock">Stock (vacío = ilimitado)</label>
				<input
					id="rm-stock"
					class="ad-input"
					inputmode="numeric"
					bind:value={stockText}
					placeholder="Ej: 120"
				/>
			</div>
			<div class="ad-field">
				<label for="rm-category">{editingId ? 'Cambiar categoría (opcional)' : 'Categoría'}</label>
				<select id="rm-category" class="ad-select" bind:value={categoryId}>
					{#if editingId}
						<option value="">Mantener la actual</option>
					{/if}
					{#each categories as category (category.id)}
						<option value={category.id}>{category.label}</option>
					{/each}
				</select>
			</div>
			<div class="ad-field">
				<label class="ad-check" style="margin-top: 22px;">
					<input type="checkbox" bind:checked={isActive} />
					Activa en el catálogo
				</label>
			</div>
			<div class="ad-field full">
				<label for="rm-images">Imágenes (una URL por línea, opcional)</label>
				<textarea
					id="rm-images"
					class="ad-input"
					rows="2"
					bind:value={imagesText}
					placeholder="https://..."
				></textarea>
			</div>
			<div class="full ad-form-actions">
				<button class="ad-btn" type="submit" disabled={isSaving}>
					{isSaving ? 'Guardando…' : editingId ? 'Guardar cambios' : 'Crear borrador'}
				</button>
			</div>
		</form>
	</section>
{/if}

<form class="ad-toolbar" onsubmit={applyFilters}>
	<div class="ad-field grow">
		<label for="rm-q">Buscar</label>
		<input id="rm-q" class="ad-input" type="search" bind:value={query} placeholder="Nombre o descripción" />
	</div>
	<div class="ad-field">
		<label for="rm-status">Estado</label>
		<select id="rm-status" class="ad-select" bind:value={statusFilter}>
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
	<p class="ad-state">Cargando materia prima…</p>
{:else if materials.length === 0}
	<p class="ad-state">
		Aún no hay materia prima. Crea la primera con “Nueva materia prima”.
	</p>
{:else}
	<div class="ad-table-wrap">
		<table class="ad-table">
			<thead>
				<tr>
					<th>Material</th>
					<th>Precio</th>
					<th>Stock</th>
					<th>Estado</th>
					<th>Creado</th>
					<th>Acciones</th>
				</tr>
			</thead>
			<tbody>
				{#each materials as material (material.id || material.name)}
					<tr>
						<td>
							<span class="ad-cell-strong">{material.name}</span>
							<br />
							<span class="ad-cell-muted">{material.categoryName || 'Sin categoría'}</span>
							{#if material.description}
								<p class="desc">{toPlainText(material.description, 90)}</p>
							{/if}
						</td>
						<td class="ad-cell-strong">
							{formatCurrency(material.priceCents, material.currencyCode)}
						</td>
						<td class="ad-cell-muted">
							{material.stock === null ? 'Ilimitado' : material.stock.toLocaleString('es-CO')}
						</td>
						<td>
							<span class="ad-badge {material.isArchived ? 'red' : statusTone(material.status)}">
								{material.isArchived ? 'archivado' : material.status}
							</span>
						</td>
						<td class="ad-cell-muted">
							{material.createdAt ? formatLongDate(new Date(material.createdAt)) : '—'}
						</td>
						<td>
							<div class="ad-cell-actions">
								{#if material.isArchived}
									<button
										class="ad-btn small"
										type="button"
										disabled={busyId === material.id}
										onclick={() => restore(material)}
									>
										Restaurar
									</button>
								{:else}
									<button
										class="ad-btn ghost small"
										type="button"
										onclick={() => openEdit(material)}
									>
										Editar
									</button>
									{#if material.status === 'publicado'}
										<button
											class="ad-btn danger small"
											type="button"
											disabled={busyId === material.id}
											onclick={() => unpublish(material)}
										>
											Despublicar
										</button>
									{:else}
										<button
											class="ad-btn small"
											type="button"
											disabled={busyId === material.id}
											onclick={() => publish(material)}
										>
											Publicar
										</button>
									{/if}
									<button
										class="ad-btn danger small"
										type="button"
										disabled={busyId === material.id}
										onclick={() => archive(material)}
									>
										Archivar
									</button>
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
