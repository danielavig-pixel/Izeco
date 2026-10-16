<script lang="ts">
	import { onMount } from 'svelte';
	import {
		COLLECTION_UNITS,
		MATERIAL_OPTIONS,
		createCollection,
		getAdminCollections,
		getAdminVolunteerActivities,
		getCollectionSummary,
		unlinkCollection,
		updateCollection,
		type AdminCollection,
		type CollectionSummaryRow,
		type VolunteerActivity
	} from '#lib/services/api/api.service.js';
	import { formatDateTimeParts } from '#lib/utils/format.js';
	import Pagination from '#lib/components/Pagination.svelte';

	const PAGE_SIZE = 12;

	let activities = $state<VolunteerActivity[]>([]);
	let summary = $state<CollectionSummaryRow[]>([]);
	let collections = $state<AdminCollection[]>([]);
	let total = $state(0);
	let pageNumber = $state(1);
	let totalPages = $state(1);
	let isLoading = $state(true);
	let isSaving = $state(false);
	let errorMessage = $state('');
	let notice = $state('');
	let busyId = $state('');

	let materialFilter = $state('');
	let activityFilter = $state('');

	let form = $state({
		activityId: '',
		material: 'pet',
		quantity: '',
		unit: 'kg',
		collectedAt: '',
		rawMaterialProductId: '',
		notes: ''
	});

	let editing = $state<AdminCollection | null>(null);
	let editForm = $state({ quantity: '', unit: 'kg', material: 'pet', notes: '' });

	onMount(async () => {
		void loadActivities();
		await Promise.all([loadSummary(), load(1)]);
	});

	async function loadActivities() {
		try {
			const result = await getAdminVolunteerActivities({ page: 1, limit: 50 });
			activities = result.items;
			if (activities.length && !form.activityId) form.activityId = activities[0].id;
		} catch {
			activities = [];
		}
	}

	async function loadSummary() {
		try {
			const result = await getCollectionSummary({ limit: 50 });
			summary = result.items;
		} catch {
			summary = [];
		}
	}

	async function load(target: number) {
		isLoading = true;
		errorMessage = '';
		try {
			const result = await getAdminCollections({
				page: target,
				limit: PAGE_SIZE,
				material: materialFilter || undefined,
				activityId: activityFilter || undefined
			});
			collections = result.items;
			total = result.total;
			pageNumber = result.page || target;
			totalPages = result.totalPages || 1;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudieron cargar las recolecciones.';
			collections = [];
		} finally {
			isLoading = false;
		}
	}

	async function applyFilters(event: SubmitEvent) {
		event.preventDefault();
		await load(1);
	}

	async function submitForm(event: SubmitEvent) {
		event.preventDefault();
		if (!form.activityId) {
			errorMessage = 'Selecciona la jornada donde se recolectó el material.';
			return;
		}
		if (!form.quantity || Number(form.quantity) <= 0) {
			errorMessage = 'Indica una cantidad válida.';
			return;
		}
		isSaving = true;
		errorMessage = '';
		notice = '';
		try {
			await createCollection(form.activityId, {
				material: form.material,
				quantity: Number(form.quantity),
				unit: form.unit,
				collectedAt: form.collectedAt ? new Date(form.collectedAt).toISOString() : undefined,
				rawMaterialProductId: form.rawMaterialProductId.trim() || undefined,
				notes: form.notes.trim() || undefined
			});
			notice = 'Recolección registrada.';
			form = { ...form, quantity: '', rawMaterialProductId: '', notes: '', collectedAt: '' };
			await Promise.all([loadSummary(), load(1)]);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudo registrar la recolección.';
		} finally {
			isSaving = false;
		}
	}

	async function saveEdit(event: SubmitEvent) {
		event.preventDefault();
		if (!editing) return;
		isSaving = true;
		errorMessage = '';
		notice = '';
		try {
			await updateCollection(editing.id, {
				material: editForm.material,
				quantity: Number(editForm.quantity),
				unit: editForm.unit,
				notes: editForm.notes.trim() || undefined
			});
			notice = 'Recolección actualizada.';
			editing = null;
			await Promise.all([loadSummary(), load(pageNumber)]);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudo actualizar.';
		} finally {
			isSaving = false;
		}
	}

	async function unlink(collection: AdminCollection) {
		if (!collection.id) return;
		if (!confirm('¿Desvincular esta recolección de su materia prima?')) return;
		busyId = collection.id;
		errorMessage = '';
		notice = '';
		try {
			await unlinkCollection(collection.id);
			notice = 'Recolección desvinculada.';
			await Promise.all([loadSummary(), load(pageNumber)]);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudo desvincular.';
		} finally {
			busyId = '';
		}
	}

	function startEdit(collection: AdminCollection) {
		editing = collection;
		editForm = {
			material: collection.material || 'pet',
			quantity: String(collection.quantity ?? ''),
			unit: collection.unit || 'kg',
			notes: collection.notes || ''
		};
	}

	function activityTitle(id: string): string {
		return activities.find((activity) => activity.id === id)?.title ?? '';
	}

	function dateLabel(value: string | null): string {
		const { day, time } = formatDateTimeParts(value);
		return day ? `${day}, ${time}` : '—';
	}
</script>

<svelte:head>
	<title>Recolecciones | Administración Izeco</title>
</svelte:head>

<section class="ad-head">
	<div>
		<p class="ad-eyebrow">Administración</p>
		<h1 class="ad-title">Recolecciones de material</h1>
		<p class="ad-subtitle">
			Registra lo recolectado en cada jornada y cierra la traza hasta la materia prima.
		</p>
	</div>
</section>

{#if errorMessage}
	<p class="ad-banner" role="alert">{errorMessage}</p>
{/if}
{#if notice}
	<p class="ad-banner success" role="status">{notice}</p>
{/if}

{#if summary.length > 0}
	<section class="ad-card">
		<h2 class="ad-card-title">Totales por material</h2>
		<p class="ad-card-sub">Suma agregada de todas las recolecciones.</p>
		<div class="summary-grid">
			{#each summary as row (row.material + row.unit)}
				<article class="summary-item">
					<p class="ad-stat-label">{row.materialName}</p>
					<p class="ad-stat-value">{row.label || row.total.toLocaleString('es-CO')}</p>
				</article>
			{/each}
		</div>
	</section>
{/if}

<section class="ad-card">
	<h2 class="ad-card-title">Registrar recolección</h2>
	<p class="ad-card-sub">
		Cantidad en unidad base: gramos si es kg, piezas si son unidades, bultos si son bultos.
	</p>
	<form class="ad-form-grid" style="margin-top: 14px;" onsubmit={submitForm}>
		<div class="ad-field">
			<label for="col-activity">Jornada</label>
			<select id="col-activity" class="ad-select" bind:value={form.activityId} required>
				<option value="">Selecciona…</option>
				{#each activities as activity (activity.id)}
					<option value={activity.id}>{activity.title}</option>
				{/each}
			</select>
		</div>
		<div class="ad-field">
			<label for="col-material">Material</label>
			<select id="col-material" class="ad-select" bind:value={form.material}>
				{#each MATERIAL_OPTIONS as option (option.value)}
					<option value={option.value}>{option.label}</option>
				{/each}
			</select>
		</div>
		<div class="ad-field">
			<label for="col-quantity">Cantidad</label>
			<input id="col-quantity" class="ad-input" type="number" min="1" bind:value={form.quantity} required />
		</div>
		<div class="ad-field">
			<label for="col-unit">Unidad</label>
			<select id="col-unit" class="ad-select" bind:value={form.unit}>
				{#each COLLECTION_UNITS as unit (unit.value)}
					<option value={unit.value}>{unit.label}</option>
				{/each}
			</select>
		</div>
		<div class="ad-field">
			<label for="col-date">Fecha (opcional)</label>
			<input id="col-date" class="ad-input" type="datetime-local" bind:value={form.collectedAt} />
		</div>
		<div class="ad-field">
			<label for="col-raw">Materia prima (UUID, opcional)</label>
			<input id="col-raw" class="ad-input" bind:value={form.rawMaterialProductId} />
		</div>
		<div class="ad-field full">
			<label for="col-notes">Notas</label>
			<input id="col-notes" class="ad-input" bind:value={form.notes} />
		</div>
		<div class="full ad-form-actions">
			<button class="ad-btn" type="submit" disabled={isSaving}>
				{isSaving ? 'Guardando…' : 'Registrar'}
			</button>
		</div>
	</form>
</section>

<form class="ad-toolbar" onsubmit={applyFilters}>
	<div class="ad-field">
		<label for="f-material">Material</label>
		<select id="f-material" class="ad-select" bind:value={materialFilter}>
			<option value="">Todos</option>
			{#each MATERIAL_OPTIONS as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	</div>
	<div class="ad-field grow">
		<label for="f-activity">Jornada</label>
		<select id="f-activity" class="ad-select" bind:value={activityFilter}>
			<option value="">Todas</option>
			{#each activities as activity (activity.id)}
				<option value={activity.id}>{activity.title}</option>
			{/each}
		</select>
	</div>
	<div class="ad-btn-row">
		<button class="ad-btn" type="submit" disabled={isLoading}>Filtrar</button>
	</div>
</form>

{#if isLoading}
	<p class="ad-state">Cargando recolecciones…</p>
{:else if collections.length === 0}
	<p class="ad-state">No hay recolecciones registradas con esos filtros.</p>
{:else}
	<p class="ad-count">{total.toLocaleString('es-CO')} recolecciones en total.</p>
	<div class="ad-table-wrap">
		<table class="ad-table">
			<thead>
				<tr>
					<th>Material</th>
					<th>Cantidad</th>
					<th>Jornada</th>
					<th>Materia prima</th>
					<th>Fecha</th>
					<th>Acciones</th>
				</tr>
			</thead>
			<tbody>
				{#each collections as collection (collection.id)}
					<tr>
						<td class="ad-cell-strong">{collection.materialName}</td>
						<td>{collection.label || '—'}</td>
						<td class="ad-cell-muted">{collection.activityTitle || activityTitle(collection.activityId) || '—'}</td>
						<td class="ad-cell-muted">
							{collection.rawMaterialProductName || collection.rawMaterialProductId || 'Sin transformar'}
						</td>
						<td class="ad-cell-muted">{dateLabel(collection.collectedAt)}</td>
						<td>
							<div class="ad-cell-actions">
								<button class="ad-btn ghost small" type="button" onclick={() => startEdit(collection)}>
									Editar
								</button>
								{#if collection.rawMaterialProductId}
									<button
										class="ad-btn danger small"
										type="button"
										disabled={busyId === collection.id}
										onclick={() => unlink(collection)}
									>
										Desvincular
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

{#if editing}
	<section class="ad-detail">
		<div class="ad-card-head">
			<h2 class="ad-card-title">Editar recolección</h2>
			<button class="ad-btn ghost small" type="button" onclick={() => (editing = null)}>Cerrar</button>
		</div>
		<form class="ad-form-grid" onsubmit={saveEdit}>
			<div class="ad-field">
				<label for="e-material">Material</label>
				<select id="e-material" class="ad-select" bind:value={editForm.material}>
					{#each MATERIAL_OPTIONS as option (option.value)}
						<option value={option.value}>{option.label}</option>
					{/each}
				</select>
			</div>
			<div class="ad-field">
				<label for="e-quantity">Cantidad</label>
				<input id="e-quantity" class="ad-input" type="number" min="1" bind:value={editForm.quantity} />
			</div>
			<div class="ad-field">
				<label for="e-unit">Unidad</label>
				<select id="e-unit" class="ad-select" bind:value={editForm.unit}>
					{#each COLLECTION_UNITS as unit (unit.value)}
						<option value={unit.value}>{unit.label}</option>
					{/each}
				</select>
			</div>
			<div class="ad-field full">
				<label for="e-notes">Notas</label>
				<input id="e-notes" class="ad-input" bind:value={editForm.notes} />
			</div>
			<div class="full ad-form-actions">
				<button class="ad-btn" type="submit" disabled={isSaving}>Guardar</button>
			</div>
		</form>
	</section>
{/if}

<style>
	.summary-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 12px;
		margin-top: 14px;
	}

	.summary-item {
		padding: 14px 15px;
		border: 1px solid var(--iz-line);
		border-radius: 12px;
		background: var(--iz-green-50);
	}

	.ad-count {
		margin: 0 0 10px;
		color: var(--iz-muted);
		font-size: 12px;
	}
</style>
