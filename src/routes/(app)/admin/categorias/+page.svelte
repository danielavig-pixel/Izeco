<script lang="ts">
	import { onMount } from 'svelte';
	import {
		createProductCategory,
		deactivateProductCategory,
		getProductCategoryTree,
		updateProductCategory,
		type CategoryNode
	} from '#lib/services/api/api.service.js';

	interface FlatNode {
		node: CategoryNode;
		depth: number;
	}

	let tree = $state<CategoryNode[]>([]);
	let isLoading = $state(true);
	let isSaving = $state(false);
	let errorMessage = $state('');
	let notice = $state('');
	let busyId = $state('');

	let newName = $state('');
	let newParentId = $state('');

	let editing = $state<CategoryNode | null>(null);
	let editName = $state('');

	onMount(() => {
		void load();
	});

	async function load() {
		isLoading = true;
		errorMessage = '';
		try {
			tree = await getProductCategoryTree();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudieron cargar las categorías.';
			tree = [];
		} finally {
			isLoading = false;
		}
	}

	function flatten(nodes: CategoryNode[], depth = 0): FlatNode[] {
		const result: FlatNode[] = [];
		for (const node of nodes) {
			result.push({ node, depth });
			if (node.children?.length) result.push(...flatten(node.children, depth + 1));
		}
		return result;
	}

	const flat = $derived(flatten(tree));

	async function submitCreate(event: SubmitEvent) {
		event.preventDefault();
		if (!newName.trim()) {
			errorMessage = 'Escribe el nombre de la categoría.';
			return;
		}
		isSaving = true;
		errorMessage = '';
		notice = '';
		try {
			await createProductCategory({
				name: newName.trim(),
				parentId: newParentId || undefined
			});
			notice = `Categoría "${newName.trim()}" creada.`;
			newName = '';
			newParentId = '';
			await load();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudo crear la categoría.';
		} finally {
			isSaving = false;
		}
	}

	async function saveEdit(event: SubmitEvent) {
		event.preventDefault();
		if (!editing) return;
		if (!editName.trim()) {
			errorMessage = 'El nombre no puede quedar vacío.';
			return;
		}
		isSaving = true;
		errorMessage = '';
		notice = '';
		try {
			await updateProductCategory(editing.id, { name: editName.trim() });
			notice = 'Categoría actualizada.';
			editing = null;
			await load();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudo actualizar.';
		} finally {
			isSaving = false;
		}
	}

	async function deactivate(node: CategoryNode) {
		if (!confirm(`¿Desactivar "${node.name}"? Dejará de aparecer en el catálogo.`)) return;
		busyId = node.id;
		errorMessage = '';
		notice = '';
		try {
			await deactivateProductCategory(node.id);
			notice = `Categoría "${node.name}" desactivada.`;
			await load();
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudo desactivar.';
		} finally {
			busyId = '';
		}
	}

	function startEdit(node: CategoryNode) {
		editing = node;
		editName = node.name;
	}
</script>

<svelte:head>
	<title>Categorías | Administración Izeco</title>
</svelte:head>

<section class="ad-head">
	<div>
		<p class="ad-eyebrow">Administración</p>
		<h1 class="ad-title">Categorías de productos</h1>
		<p class="ad-subtitle">Organiza el catálogo en categorías y subcategorías.</p>
	</div>
</section>

{#if errorMessage}
	<p class="ad-banner" role="alert">{errorMessage}</p>
{/if}
{#if notice}
	<p class="ad-banner success" role="status">{notice}</p>
{/if}

<section class="ad-card">
	<h2 class="ad-card-title">Nueva categoría</h2>
	<form class="ad-form-grid" style="margin-top: 14px;" onsubmit={submitCreate}>
		<div class="ad-field">
			<label for="cat-name">Nombre</label>
			<input id="cat-name" class="ad-input" bind:value={newName} required />
		</div>
		<div class="ad-field">
			<label for="cat-parent">Categoría padre</label>
			<select id="cat-parent" class="ad-select" bind:value={newParentId}>
				<option value="">Ninguna (categoría raíz)</option>
				{#each tree as node (node.id)}
					<option value={node.id}>{node.name}</option>
				{/each}
			</select>
		</div>
		<div class="full ad-form-actions">
			<button class="ad-btn" type="submit" disabled={isSaving}>
				{isSaving ? 'Guardando…' : 'Crear categoría'}
			</button>
		</div>
	</form>
</section>

{#if isLoading}
	<p class="ad-state">Cargando categorías…</p>
{:else if flat.length === 0}
	<p class="ad-state">No hay categorías activas.</p>
{:else}
	<div class="ad-table-wrap">
		<table class="ad-table">
			<thead>
				<tr>
					<th>Categoría</th>
					<th>Slug</th>
					<th>Acciones</th>
				</tr>
			</thead>
			<tbody>
				{#each flat as item (item.node.id)}
					<tr>
						<td>
							<span
								class="ad-cell-strong"
								style="padding-left: {item.depth * 18}px"
							>
								{#if item.depth > 0}<span class="branch" aria-hidden="true">└</span>{/if}
								{item.node.name}
							</span>
						</td>
						<td class="ad-cell-muted">{item.node.slug || '—'}</td>
						<td>
							<div class="ad-cell-actions">
								<button class="ad-btn ghost small" type="button" onclick={() => startEdit(item.node)}>
									Renombrar
								</button>
								<button
									class="ad-btn danger small"
									type="button"
									disabled={busyId === item.node.id}
									onclick={() => deactivate(item.node)}
								>
									Desactivar
								</button>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

{#if editing}
	<section class="ad-detail">
		<div class="ad-card-head">
			<h2 class="ad-card-title">Renombrar categoría</h2>
			<button class="ad-btn ghost small" type="button" onclick={() => (editing = null)}>Cerrar</button>
		</div>
		<form class="ad-form-grid" onsubmit={saveEdit}>
			<div class="ad-field full">
				<label for="edit-name">Nombre</label>
				<input id="edit-name" class="ad-input" bind:value={editName} />
			</div>
			<div class="full ad-form-actions">
				<button class="ad-btn" type="submit" disabled={isSaving}>Guardar</button>
			</div>
		</form>
	</section>
{/if}

<style>
	.branch {
		margin-right: 6px;
		color: var(--iz-faint);
	}
</style>
