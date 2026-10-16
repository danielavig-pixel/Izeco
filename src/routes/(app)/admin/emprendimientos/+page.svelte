<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getArchivedEntrepreneurs,
		getEntrepreneurReviewQueue,
		restoreEntrepreneur,
		reviewEntrepreneur,
		type Entrepreneur
	} from '#lib/services/api/api.service.js';
	import { formatLongDate, toPlainText } from '#lib/utils/format.js';
	import Pagination from '#lib/components/Pagination.svelte';

	const PAGE_SIZE = 12;

	type Tab = 'review' | 'archived';
	type PendingReview = { id: string; action: 'approve' | 'reject' | 'suspend' };

	let tab = $state<Tab>('review');
	let items = $state<Entrepreneur[]>([]);
	let total = $state(0);
	let pageNumber = $state(1);
	let totalPages = $state(1);
	let isLoading = $state(true);
	let errorMessage = $state('');
	let notice = $state('');
	let busyId = $state('');

	let selected = $state<Entrepreneur | null>(null);
	let reviewNote = $state('');
	let pendingReview = $state<PendingReview | null>(null);

	onMount(() => {
		void load(1);
	});

	async function load(target: number) {
		isLoading = true;
		errorMessage = '';
		try {
			const result =
				tab === 'review'
					? await getEntrepreneurReviewQueue({ page: target, limit: PAGE_SIZE })
					: await getArchivedEntrepreneurs({ page: target, limit: PAGE_SIZE });
			items = result.items;
			total = result.total;
			pageNumber = result.page || target;
			totalPages = result.totalPages || 1;
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'No se pudieron cargar los emprendimientos.';
			items = [];
		} finally {
			isLoading = false;
		}
	}

	async function switchTab(next: Tab) {
		if (next === tab) return;
		tab = next;
		selected = null;
		pendingReview = null;
		reviewNote = '';
		await load(1);
	}

	function askReview(entrepreneur: Entrepreneur, action: PendingReview['action']) {
		if (!entrepreneur.id) return;
		if (action === 'approve') {
			void confirmReview({ id: entrepreneur.id, action });
			return;
		}
		pendingReview = { id: entrepreneur.id, action };
		reviewNote = '';
	}

	async function confirmReview(review: PendingReview) {
		if (review.action !== 'approve' && !reviewNote.trim()) {
			errorMessage = 'Escribe una nota para rechazar o suspender.';
			return;
		}
		busyId = review.id;
		errorMessage = '';
		notice = '';
		const labels = { approve: 'aprobado', reject: 'rechazado', suspend: 'suspendido' } as const;
		try {
			await reviewEntrepreneur(review.id, review.action, reviewNote.trim());
			notice = `Emprendimiento ${labels[review.action]}.`;
			pendingReview = null;
			reviewNote = '';
			selected = null;
			await load(pageNumber);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudo completar la revisión.';
		} finally {
			busyId = '';
		}
	}

	async function handleRestore(entrepreneur: Entrepreneur) {
		if (!entrepreneur.id) return;
		busyId = entrepreneur.id;
		errorMessage = '';
		notice = '';
		try {
			await restoreEntrepreneur(entrepreneur.id);
			notice = `Emprendimiento "${entrepreneur.name}" restaurado.`;
			await load(pageNumber);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudo restaurar.';
		} finally {
			busyId = '';
		}
	}

	function statusTone(status: string): string {
		if (status === 'aprobado' || status === 'publicado') return 'green';
		if (status === 'rechazado' || status === 'suspendido') return 'red';
		return 'amber';
	}
</script>

<svelte:head>
	<title>Emprendimientos | Administración Izeco</title>
</svelte:head>

<section class="ad-head">
	<div>
		<p class="ad-eyebrow">Administración</p>
		<h1 class="ad-title">Emprendimientos</h1>
		<p class="ad-subtitle">Revisa, aprueba o rechaza las fichas de los socios que quieren vender.</p>
	</div>
</section>

<div class="ad-tabs" role="tablist" aria-label="Vista de emprendimientos">
	<button
		class="ad-tab"
		class:active={tab === 'review'}
		type="button"
		role="tab"
		aria-selected={tab === 'review'}
		onclick={() => switchTab('review')}
	>
		Por revisar
	</button>
	<button
		class="ad-tab"
		class:active={tab === 'archived'}
		type="button"
		role="tab"
		aria-selected={tab === 'archived'}
		onclick={() => switchTab('archived')}
	>
		Archivados
	</button>
</div>

{#if errorMessage}
	<p class="ad-banner" role="alert">{errorMessage}</p>
{/if}
{#if notice}
	<p class="ad-banner success" role="status">{notice}</p>
{/if}

{#if isLoading}
	<p class="ad-state">Cargando emprendimientos…</p>
{:else if items.length === 0}
	<p class="ad-state">
		{tab === 'review' ? 'No hay fichas pendientes de revisión.' : 'No hay fichas archivadas.'}
	</p>
{:else}
	<div class="ad-table-wrap">
		<table class="ad-table">
			<thead>
				<tr>
					<th>Emprendimiento</th>
					<th>Categoría</th>
					<th>Estado</th>
					<th>Creado</th>
					<th>Acciones</th>
				</tr>
			</thead>
			<tbody>
				{#each items as entrepreneur (entrepreneur.id || entrepreneur.slug)}
					<tr>
						<td>
							<span class="ad-cell-strong">{entrepreneur.name}</span>
							{#if entrepreneur.contactEmail}
								<br /><span class="ad-cell-muted">{entrepreneur.contactEmail}</span>
							{/if}
						</td>
						<td class="ad-cell-muted">{entrepreneur.category || '—'}</td>
						<td>
							<span class="ad-badge {statusTone(entrepreneur.status)}">
								{entrepreneur.status || 'pendiente'}
							</span>
						</td>
						<td class="ad-cell-muted">
							{entrepreneur.createdAt
								? formatLongDate(new Date(entrepreneur.createdAt))
								: '—'}
						</td>
						<td>
							<div class="ad-cell-actions">
								<button
									class="ad-btn ghost small"
									type="button"
									onclick={() => (selected = selected?.id === entrepreneur.id ? null : entrepreneur)}
								>
									Ver ficha
								</button>
								{#if tab === 'review'}
									<button
										class="ad-btn small"
										type="button"
										disabled={busyId === entrepreneur.id}
										onclick={() => askReview(entrepreneur, 'approve')}
									>
										Aprobar
									</button>
									<button
										class="ad-btn ghost small"
										type="button"
										disabled={busyId === entrepreneur.id}
										onclick={() => askReview(entrepreneur, 'reject')}
									>
										Rechazar
									</button>
									<button
										class="ad-btn danger small"
										type="button"
										disabled={busyId === entrepreneur.id}
										onclick={() => askReview(entrepreneur, 'suspend')}
									>
										Suspender
									</button>
								{:else}
									<button
										class="ad-btn small"
										type="button"
										disabled={busyId === entrepreneur.id}
										onclick={() => handleRestore(entrepreneur)}
									>
										Restaurar
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

{#if pendingReview}
	<section class="ad-detail">
		<h2 class="ad-card-title">
			{pendingReview.action === 'reject' ? 'Rechazar' : 'Suspender'} ficha
		</h2>
		<p class="ad-card-sub">La nota es obligatoria y se enviará al emprendedor.</p>
		<div class="ad-field" style="margin-top: 12px;">
			<label for="review-note">Motivo</label>
			<textarea
				id="review-note"
				class="ad-textarea"
				bind:value={reviewNote}
				placeholder="Explica el motivo de la decisión…"
			></textarea>
		</div>
		<div class="ad-form-actions">
			<button
				class="ad-btn danger"
				type="button"
				disabled={busyId === pendingReview.id}
				onclick={() => confirmReview(pendingReview!)}
			>
				Confirmar
			</button>
			<button class="ad-btn ghost" type="button" onclick={() => (pendingReview = null)}>
				Cancelar
			</button>
		</div>
	</section>
{/if}

{#if selected}
	<section class="ad-detail">
		<div class="ad-card-head">
			<div>
				<h2 class="ad-card-title">{selected.name}</h2>
				<p class="ad-card-sub">{selected.category || 'Sin categoría'}</p>
			</div>
			<button class="ad-btn ghost small" type="button" onclick={() => (selected = null)}>Cerrar</button>
		</div>
		<p class="detail-desc">{toPlainText(selected.description, 600) || 'Sin descripción.'}</p>
		<dl>
			<div>
				<dt>Estado</dt>
				<dd>{selected.status || 'pendiente'}</dd>
			</div>
			<div>
				<dt>Slug</dt>
				<dd>{selected.slug || '—'}</dd>
			</div>
			<div>
				<dt>Teléfono</dt>
				<dd>{selected.contactPhone || '—'}</dd>
			</div>
			<div>
				<dt>Correo</dt>
				<dd>{selected.contactEmail || '—'}</dd>
			</div>
		</dl>
	</section>
{/if}

<style>
	.detail-desc {
		margin: 14px 0 0;
		color: var(--iz-ink-soft);
		font-size: 13px;
		line-height: 1.6;
	}
</style>
