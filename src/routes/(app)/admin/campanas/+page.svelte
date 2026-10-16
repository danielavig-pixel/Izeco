<script lang="ts">
	import { onMount } from 'svelte';
	import {
		archiveCampaign,
		closeCampaign,
		createCampaign,
		getAdminCampaigns,
		getArchivedCampaigns,
		notifyCampaign,
		publishCampaign,
		restoreCampaign,
		type Campaign
	} from '#lib/services/api/api.service.js';
	import { formatCurrency, formatLongDate, toPlainText } from '#lib/utils/format.js';
	import Pagination from '#lib/components/Pagination.svelte';

	const PAGE_SIZE = 12;

	type Tab = 'active' | 'archived';

	let tab = $state<Tab>('active');
	let campaigns = $state<Campaign[]>([]);
	let total = $state(0);
	let pageNumber = $state(1);
	let totalPages = $state(1);
	let isLoading = $state(true);
	let errorMessage = $state('');
	let notice = $state('');
	let busyId = $state('');

	let showForm = $state(false);
	let isSaving = $state(false);
	let form = $state({
		title: '',
		summary: '',
		description: '',
		imageUrl: '',
		goal: '',
		donationUrl: '',
		startsAt: '',
		endsAt: ''
	});

	onMount(() => {
		void load(1);
	});

	async function load(target: number) {
		isLoading = true;
		errorMessage = '';
		try {
			const result =
				tab === 'active'
					? await getAdminCampaigns({ page: target, limit: PAGE_SIZE })
					: await getArchivedCampaigns({ page: target, limit: PAGE_SIZE });
			campaigns = result.items;
			total = result.total;
			pageNumber = result.page || target;
			totalPages = result.totalPages || 1;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudieron cargar las campañas.';
			campaigns = [];
		} finally {
			isLoading = false;
		}
	}

	async function switchTab(next: Tab) {
		if (next === tab) return;
		tab = next;
		await load(1);
	}

	function resetForm() {
		form = {
			title: '',
			summary: '',
			description: '',
			imageUrl: '',
			goal: '',
			donationUrl: '',
			startsAt: '',
			endsAt: ''
		};
	}

	async function submitForm(event: SubmitEvent) {
		event.preventDefault();
		if (!form.title.trim() || !form.description.trim()) {
			errorMessage = 'El título y la descripción son obligatorios.';
			return;
		}
		isSaving = true;
		errorMessage = '';
		notice = '';
		try {
			await createCampaign({
				title: form.title.trim(),
				summary: form.summary.trim() || undefined,
				description: form.description.trim(),
				imageUrl: form.imageUrl.trim() || undefined,
				goalCents: form.goal ? Math.round(Number(form.goal) * 100) : undefined,
				donationUrl: form.donationUrl.trim() || undefined,
				startsAt: form.startsAt ? new Date(form.startsAt).toISOString() : undefined,
				endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined
			});
			notice = 'Campaña creada como borrador.';
			resetForm();
			showForm = false;
			tab = 'active';
			await load(1);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudo crear la campaña.';
		} finally {
			isSaving = false;
		}
	}

	async function runAction(
		campaign: Campaign,
		action: 'publish' | 'close' | 'notify' | 'archive' | 'restore'
	) {
		if (!campaign.id) return;
		if (action === 'notify' && !confirm(`¿Difundir "${campaign.title}" por correo a todos los usuarios?`)) {
			return;
		}
		if (action === 'archive' && !confirm(`¿Archivar "${campaign.title}"?`)) return;

		busyId = campaign.id;
		errorMessage = '';
		notice = '';
		const labels = {
			publish: 'publicada',
			close: 'finalizada',
			notify: 'difundida por correo',
			archive: 'archivada',
			restore: 'restaurada'
		} as const;
		try {
			if (action === 'publish') await publishCampaign(campaign.id);
			else if (action === 'close') await closeCampaign(campaign.id);
			else if (action === 'notify') await notifyCampaign(campaign.id);
			else if (action === 'archive') await archiveCampaign(campaign.id);
			else await restoreCampaign(campaign.id);
			notice = `Campaña ${labels[action]}.`;
			await load(pageNumber);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudo completar la acción.';
		} finally {
			busyId = '';
		}
	}

	function statusTone(status: string): string {
		if (status === 'activa' || status === 'publicado') return 'green';
		if (status === 'finalizada') return 'blue';
		return 'amber';
	}
</script>

<svelte:head>
	<title>Campañas | Administración Izeco</title>
</svelte:head>

<section class="ad-head">
	<div>
		<p class="ad-eyebrow">Administración</p>
		<h1 class="ad-title">Campañas</h1>
		<p class="ad-subtitle">Crea, publica y difunde las campañas de la plataforma.</p>
	</div>
	<button class="ad-btn" type="button" onclick={() => (showForm = !showForm)}>
		{showForm ? 'Cerrar' : 'Nueva campaña'}
	</button>
</section>

{#if errorMessage}
	<p class="ad-banner" role="alert">{errorMessage}</p>
{/if}
{#if notice}
	<p class="ad-banner success" role="status">{notice}</p>
{/if}

{#if showForm}
	<form class="ad-card" onsubmit={submitForm}>
		<h2 class="ad-card-title">Nueva campaña</h2>
		<p class="ad-card-sub">Se crea en borrador; publícala cuando esté lista.</p>
		<div class="ad-form-grid" style="margin-top: 14px;">
			<div class="ad-field full">
				<label for="c-title">Título</label>
				<input id="c-title" class="ad-input" bind:value={form.title} required />
			</div>
			<div class="ad-field full">
				<label for="c-summary">Resumen</label>
				<input id="c-summary" class="ad-input" bind:value={form.summary} placeholder="Frase corta del listado" />
			</div>
			<div class="ad-field full">
				<label for="c-desc">Descripción</label>
				<textarea id="c-desc" class="ad-textarea" bind:value={form.description} required></textarea>
			</div>
			<div class="ad-field">
				<label for="c-goal">Meta (en moneda)</label>
				<input id="c-goal" class="ad-input" type="number" min="0" bind:value={form.goal} placeholder="50000" />
			</div>
			<div class="ad-field">
				<label for="c-donation">Enlace de donación</label>
				<input id="c-donation" class="ad-input" bind:value={form.donationUrl} />
			</div>
			<div class="ad-field">
				<label for="c-starts">Inicio</label>
				<input id="c-starts" class="ad-input" type="datetime-local" bind:value={form.startsAt} />
			</div>
			<div class="ad-field">
				<label for="c-ends">Fin</label>
				<input id="c-ends" class="ad-input" type="datetime-local" bind:value={form.endsAt} />
			</div>
			<div class="ad-field full">
				<label for="c-image">Imagen de portada (URL)</label>
				<input id="c-image" class="ad-input" bind:value={form.imageUrl} />
			</div>
		</div>
		<div class="ad-form-actions">
			<button class="ad-btn" type="submit" disabled={isSaving}>
				{isSaving ? 'Guardando…' : 'Crear campaña'}
			</button>
			<button class="ad-btn ghost" type="button" onclick={resetForm}>Limpiar</button>
		</div>
	</form>
{/if}

<div class="ad-tabs" role="tablist" aria-label="Vista de campañas">
	<button class="ad-tab" class:active={tab === 'active'} type="button" role="tab" aria-selected={tab === 'active'} onclick={() => switchTab('active')}>
		Activas y borradores
	</button>
	<button class="ad-tab" class:active={tab === 'archived'} type="button" role="tab" aria-selected={tab === 'archived'} onclick={() => switchTab('archived')}>
		Archivadas
	</button>
</div>

{#if isLoading}
	<p class="ad-state">Cargando campañas…</p>
{:else if campaigns.length === 0}
	<p class="ad-state">{tab === 'active' ? 'No hay campañas todavía.' : 'No hay campañas archivadas.'}</p>
{:else}
	<div class="ad-table-wrap">
		<table class="ad-table">
			<thead>
				<tr>
					<th>Campaña</th>
					<th>Meta</th>
					<th>Estado</th>
					<th>Vigencia</th>
					<th>Acciones</th>
				</tr>
			</thead>
			<tbody>
				{#each campaigns as campaign (campaign.id || campaign.slug)}
					<tr>
						<td>
							<span class="ad-cell-strong">{campaign.title}</span>
							{#if campaign.summary}
								<p class="desc">{toPlainText(campaign.summary, 110)}</p>
							{/if}
						</td>
						<td class="ad-cell-muted">
							{campaign.goalCents !== null ? formatCurrency(campaign.goalCents, 'COP') : '—'}
						</td>
						<td>
							<span class="ad-badge {statusTone(campaign.status)}">
								{campaign.status || 'borrador'}
							</span>
						</td>
						<td class="ad-cell-muted">
							{campaign.startsAt ? formatLongDate(new Date(campaign.startsAt)) : '—'}
							{#if campaign.endsAt} → {formatLongDate(new Date(campaign.endsAt))}{/if}
						</td>
						<td>
							<div class="ad-cell-actions">
								{#if tab === 'active'}
									{#if campaign.status !== 'activa'}
										<button class="ad-btn small" type="button" disabled={busyId === campaign.id} onclick={() => runAction(campaign, 'publish')}>
											Publicar
										</button>
									{/if}
									{#if campaign.status === 'activa'}
										<button class="ad-btn ghost small" type="button" disabled={busyId === campaign.id} onclick={() => runAction(campaign, 'close')}>
											Finalizar
										</button>
										<button class="ad-btn ghost small" type="button" disabled={busyId === campaign.id} onclick={() => runAction(campaign, 'notify')}>
											Difundir
										</button>
									{/if}
									<button class="ad-btn danger small" type="button" disabled={busyId === campaign.id} onclick={() => runAction(campaign, 'archive')}>
										Archivar
									</button>
								{:else}
									<button class="ad-btn small" type="button" disabled={busyId === campaign.id} onclick={() => runAction(campaign, 'restore')}>
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

<style>
	.desc {
		margin: 4px 0 0;
		color: var(--iz-muted);
		font-size: 11px;
		line-height: 1.4;
	}
</style>
