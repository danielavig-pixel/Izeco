<script lang="ts">
	import { onMount } from 'svelte';
	import {
		archiveVolunteerActivity,
		closeVolunteerActivity,
		confirmVolunteerSignup,
		createVolunteerActivity,
		finishVolunteerActivity,
		getAdminSignups,
		getAdminVolunteerActivities,
		getArchivedVolunteerActivities,
		openVolunteerActivity,
		rejectVolunteerSignup,
		restoreVolunteerActivity,
		type AdminSignup,
		type VolunteerActivity
	} from '#lib/services/api/api.service.js';
	import { formatDateTimeParts, toPlainText } from '#lib/utils/format.js';
	import Pagination from '#lib/components/Pagination.svelte';

	const PAGE_SIZE = 12;
	const STATUS_OPTIONS = ['borrador', 'abierta', 'cerrada', 'finalizada'];
	const SIGNUP_STATUS = ['pendiente', 'confirmado', 'rechazado', 'cancelado'];

	type Tab = 'activities' | 'signups' | 'archived';
	type ActivityAction = 'open' | 'close' | 'finish' | 'archive' | 'restore';

	let tab = $state<Tab>('activities');
	let isLoading = $state(true);
	let errorMessage = $state('');
	let notice = $state('');
	let busyId = $state('');

	let activities = $state<VolunteerActivity[]>([]);
	let total = $state(0);
	let pageNumber = $state(1);
	let totalPages = $state(1);
	let statusFilter = $state('');

	let signups = $state<AdminSignup[]>([]);
	let signupTotal = $state(0);
	let signupPage = $state(1);
	let signupPages = $state(1);
	let signupStatus = $state('');

	let showForm = $state(false);
	let isSaving = $state(false);
	let form = $state({
		title: '',
		description: '',
		location: '',
		startsAt: '',
		endsAt: '',
		slots: '',
		imageUrl: ''
	});

	let rejecting = $state<{ id: string; title: string } | null>(null);
	let rejectNote = $state('');

	onMount(() => {
		void loadActivities(1);
	});

	async function loadActivities(target: number) {
		isLoading = true;
		errorMessage = '';
		try {
			const result =
				tab === 'archived'
					? await getArchivedVolunteerActivities({ page: target, limit: PAGE_SIZE })
					: await getAdminVolunteerActivities({
							page: target,
							limit: PAGE_SIZE,
							status: statusFilter || undefined
						});
			activities = result.items;
			total = result.total;
			pageNumber = result.page || target;
			totalPages = result.totalPages || 1;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudieron cargar las jornadas.';
			activities = [];
		} finally {
			isLoading = false;
		}
	}

	async function loadSignups(target: number) {
		isLoading = true;
		errorMessage = '';
		try {
			const result = await getAdminSignups({
				page: target,
				limit: PAGE_SIZE,
				status: signupStatus || undefined
			});
			signups = result.items;
			signupTotal = result.total;
			signupPage = result.page || target;
			signupPages = result.totalPages || 1;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudieron cargar las inscripciones.';
			signups = [];
		} finally {
			isLoading = false;
		}
	}

	async function refresh(target = 1) {
		if (tab === 'signups') await loadSignups(target);
		else await loadActivities(target);
	}

	async function switchTab(next: Tab) {
		if (next === tab) return;
		tab = next;
		rejecting = null;
		await refresh(1);
	}

	function resetForm() {
		form = {
			title: '',
			description: '',
			location: '',
			startsAt: '',
			endsAt: '',
			slots: '',
			imageUrl: ''
		};
	}

	async function submitForm(event: SubmitEvent) {
		event.preventDefault();
		if (!form.title.trim() || !form.description.trim() || !form.startsAt) {
			errorMessage = 'Título, descripción y fecha de inicio son obligatorios.';
			return;
		}
		isSaving = true;
		errorMessage = '';
		notice = '';
		try {
			await createVolunteerActivity({
				title: form.title.trim(),
				description: form.description.trim(),
				location: form.location.trim() || undefined,
				startsAt: new Date(form.startsAt).toISOString(),
				endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : undefined,
				slots: form.slots ? Number(form.slots) : undefined,
				imageUrl: form.imageUrl.trim() || undefined
			});
			notice = 'Jornada creada como borrador.';
			resetForm();
			showForm = false;
			await refresh(1);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudo crear la jornada.';
		} finally {
			isSaving = false;
		}
	}

	async function runActivity(activity: VolunteerActivity, action: ActivityAction) {
		if (!activity.id) return;
		if (action === 'archive' && !confirm(`¿Archivar "${activity.title}"?`)) return;
		busyId = activity.id;
		errorMessage = '';
		notice = '';
		const labels: Record<ActivityAction, string> = {
			open: 'abierta a inscripciones',
			close: 'cerrada',
			finish: 'finalizada',
			archive: 'archivada',
			restore: 'restaurada'
		};
		try {
			if (action === 'open') await openVolunteerActivity(activity.id);
			else if (action === 'close') await closeVolunteerActivity(activity.id);
			else if (action === 'finish') await finishVolunteerActivity(activity.id);
			else if (action === 'archive') await archiveVolunteerActivity(activity.id);
			else await restoreVolunteerActivity(activity.id);
			notice = `Jornada ${labels[action]}.`;
			await refresh(pageNumber);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudo completar la acción.';
		} finally {
			busyId = '';
		}
	}

	async function confirmSignup(signup: AdminSignup) {
		if (!signup.id) return;
		busyId = signup.id;
		errorMessage = '';
		notice = '';
		try {
			await confirmVolunteerSignup(signup.id);
			notice = `Inscripción de ${signup.volunteerName || signup.volunteerEmail} confirmada.`;
			await loadSignups(signupPage);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudo confirmar.';
		} finally {
			busyId = '';
		}
	}

	async function submitReject() {
		if (!rejecting) return;
		if (!rejectNote.trim()) {
			errorMessage = 'Escribe el motivo del rechazo.';
			return;
		}
		busyId = rejecting.id;
		errorMessage = '';
		notice = '';
		try {
			await rejectVolunteerSignup(rejecting.id, rejectNote.trim());
			notice = 'Inscripción rechazada.';
			rejecting = null;
			rejectNote = '';
			await loadSignups(signupPage);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudo rechazar.';
		} finally {
			busyId = '';
		}
	}

	function statusTone(status: string): string {
		if (status === 'abierta' || status === 'confirmado') return 'green';
		if (status === 'finalizada') return 'blue';
		if (status === 'rechazado' || status === 'cerrada') return 'red';
		return 'amber';
	}

	function formatRange(activity: VolunteerActivity): string {
		const start = formatDateTimeParts(activity.startsAt);
		const end = formatDateTimeParts(activity.endsAt);
		if (!start.day) return '—';
		return end.day ? `${start.day}, ${start.time} → ${end.day}, ${end.time}` : `${start.day}, ${start.time}`;
	}
</script>

<svelte:head>
	<title>Voluntariados | Administración Izeco</title>
</svelte:head>

<section class="ad-head">
	<div>
		<p class="ad-eyebrow">Administración</p>
		<h1 class="ad-title">Voluntariados</h1>
		<p class="ad-subtitle">Crea jornadas, revisa inscripciones y controla los cupos.</p>
	</div>
	{#if tab !== 'signups'}
		<button class="ad-btn" type="button" onclick={() => (showForm = !showForm)}>
			{showForm ? 'Cerrar' : 'Nueva jornada'}
		</button>
	{/if}
</section>

{#if errorMessage}
	<p class="ad-banner" role="alert">{errorMessage}</p>
{/if}
{#if notice}
	<p class="ad-banner success" role="status">{notice}</p>
{/if}

{#if showForm && tab !== 'signups'}
	<form class="ad-card" onsubmit={submitForm}>
		<h2 class="ad-card-title">Nueva jornada</h2>
		<p class="ad-card-sub">Nace en borrador; ábrela cuando quieras recibir inscripciones.</p>
		<div class="ad-form-grid" style="margin-top: 14px;">
			<div class="ad-field full">
				<label for="v-title">Título</label>
				<input id="v-title" class="ad-input" bind:value={form.title} required />
			</div>
			<div class="ad-field full">
				<label for="v-desc">Descripción</label>
				<textarea id="v-desc" class="ad-textarea" bind:value={form.description} required></textarea>
			</div>
			<div class="ad-field">
				<label for="v-location">Lugar</label>
				<input id="v-location" class="ad-input" bind:value={form.location} />
			</div>
			<div class="ad-field">
				<label for="v-slots">Cupos (vacío = ilimitados)</label>
				<input id="v-slots" class="ad-input" type="number" min="0" bind:value={form.slots} />
			</div>
			<div class="ad-field">
				<label for="v-starts">Inicio</label>
				<input id="v-starts" class="ad-input" type="datetime-local" bind:value={form.startsAt} required />
			</div>
			<div class="ad-field">
				<label for="v-ends">Fin</label>
				<input id="v-ends" class="ad-input" type="datetime-local" bind:value={form.endsAt} />
			</div>
			<div class="ad-field full">
				<label for="v-image">Imagen de portada (URL)</label>
				<input id="v-image" class="ad-input" bind:value={form.imageUrl} />
			</div>
		</div>
		<div class="ad-form-actions">
			<button class="ad-btn" type="submit" disabled={isSaving}>
				{isSaving ? 'Guardando…' : 'Crear jornada'}
			</button>
			<button class="ad-btn ghost" type="button" onclick={resetForm}>Limpiar</button>
		</div>
	</form>
{/if}

<div class="ad-tabs" role="tablist" aria-label="Vista de voluntariados">
	<button class="ad-tab" class:active={tab === 'activities'} type="button" role="tab" aria-selected={tab === 'activities'} onclick={() => switchTab('activities')}>
		Jornadas
	</button>
	<button class="ad-tab" class:active={tab === 'signups'} type="button" role="tab" aria-selected={tab === 'signups'} onclick={() => switchTab('signups')}>
		Inscripciones
	</button>
	<button class="ad-tab" class:active={tab === 'archived'} type="button" role="tab" aria-selected={tab === 'archived'} onclick={() => switchTab('archived')}>
		Archivadas
	</button>
</div>

{#if tab === 'signups'}
	<form class="ad-toolbar" onsubmit={(event) => (event.preventDefault(), loadSignups(1))}>
		<div class="ad-field">
			<label for="s-status">Estado</label>
			<select id="s-status" class="ad-select" bind:value={signupStatus}>
				<option value="">Todas</option>
				{#each SIGNUP_STATUS as status (status)}
					<option value={status}>{status}</option>
				{/each}
			</select>
		</div>
		<div class="ad-btn-row">
			<button class="ad-btn" type="submit" disabled={isLoading}>Filtrar</button>
		</div>
	</form>

	{#if isLoading}
		<p class="ad-state">Cargando inscripciones…</p>
	{:else if signups.length === 0}
		<p class="ad-state">No hay inscripciones con esos filtros.</p>
	{:else}
		<p class="ad-count">{signupTotal.toLocaleString('es-CO')} inscripciones en total.</p>
		<div class="ad-table-wrap">
			<table class="ad-table">
				<thead>
					<tr>
						<th>Voluntario</th>
						<th>Jornada</th>
						<th>Estado</th>
						<th>Nota</th>
						<th>Acciones</th>
					</tr>
				</thead>
				<tbody>
					{#each signups as signup (signup.id)}
						<tr>
							<td>
								<span class="ad-cell-strong">{signup.volunteerName || 'Sin nombre'}</span>
								<br /><span class="ad-cell-muted">{signup.volunteerEmail}</span>
							</td>
							<td class="ad-cell-muted">{signup.activityTitle || '—'}</td>
							<td>
								<span class="ad-badge {statusTone(signup.status)}">
									{signup.status || 'pendiente'}
								</span>
							</td>
							<td class="ad-cell-muted">{signup.note || '—'}</td>
							<td>
								<div class="ad-cell-actions">
									{#if signup.status !== 'confirmado'}
										<button class="ad-btn small" type="button" disabled={busyId === signup.id} onclick={() => confirmSignup(signup)}>
											Confirmar
										</button>
									{/if}
									{#if signup.status !== 'rechazado'}
										<button
											class="ad-btn danger small"
											type="button"
											disabled={busyId === signup.id}
											onclick={() => (rejecting = { id: signup.id, title: signup.volunteerName || signup.volunteerEmail }, rejectNote = '')}
										>
											Rechazar
										</button>
									{/if}
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		<Pagination page={signupPage} totalPages={signupPages} onchange={(next) => loadSignups(next)} disabled={isLoading} />
	{/if}
{:else}
	<form class="ad-toolbar" onsubmit={(event) => (event.preventDefault(), loadActivities(1))}>
		{#if tab === 'activities'}
			<div class="ad-field">
				<label for="a-status">Estado</label>
				<select id="a-status" class="ad-select" bind:value={statusFilter}>
					<option value="">Todos</option>
					{#each STATUS_OPTIONS as status (status)}
						<option value={status}>{status}</option>
					{/each}
				</select>
			</div>
		{/if}
		<div class="ad-btn-row">
			<button class="ad-btn" type="submit" disabled={isLoading}>Filtrar</button>
		</div>
	</form>

	{#if isLoading}
		<p class="ad-state">Cargando jornadas…</p>
	{:else if activities.length === 0}
		<p class="ad-state">
			{tab === 'archived' ? 'No hay jornadas archivadas.' : 'No hay jornadas con esos filtros.'}
		</p>
	{:else}
		<div class="ad-table-wrap">
			<table class="ad-table">
				<thead>
					<tr>
						<th>Jornada</th>
						<th>Cupos</th>
						<th>Estado</th>
						<th>Fechas</th>
						<th>Acciones</th>
					</tr>
				</thead>
				<tbody>
					{#each activities as activity (activity.id)}
						<tr>
							<td>
								<span class="ad-cell-strong">{activity.title}</span>
								{#if activity.location}
									<p class="desc">{activity.location}</p>
								{/if}
							</td>
							<td class="ad-cell-muted">
								{activity.slots === null
									? `${activity.taken} inscritos · ilimitado`
									: `${activity.taken}/${activity.slots}`}
							</td>
							<td>
								<span class="ad-badge {statusTone(activity.status)}">
									{activity.status || 'borrador'}
								</span>
							</td>
							<td class="ad-cell-muted">{formatRange(activity)}</td>
							<td>
								<div class="ad-cell-actions">
									{#if tab === 'activities'}
										{#if activity.status === 'borrador' || activity.status === 'cerrada'}
											<button class="ad-btn small" type="button" disabled={busyId === activity.id} onclick={() => runActivity(activity, 'open')}>
												Abrir
											</button>
										{/if}
										{#if activity.status === 'abierta'}
											<button class="ad-btn ghost small" type="button" disabled={busyId === activity.id} onclick={() => runActivity(activity, 'close')}>
												Cerrar
											</button>
										{/if}
										{#if activity.status !== 'finalizada'}
											<button class="ad-btn ghost small" type="button" disabled={busyId === activity.id} onclick={() => runActivity(activity, 'finish')}>
												Finalizar
											</button>
										{/if}
										<button class="ad-btn danger small" type="button" disabled={busyId === activity.id} onclick={() => runActivity(activity, 'archive')}>
											Archivar
										</button>
									{:else}
										<button class="ad-btn small" type="button" disabled={busyId === activity.id} onclick={() => runActivity(activity, 'restore')}>
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
		<Pagination page={pageNumber} {totalPages} onchange={(next) => loadActivities(next)} disabled={isLoading} />
	{/if}
{/if}

{#if rejecting}
	<section class="ad-detail">
		<h2 class="ad-card-title">Rechazar inscripción</h2>
		<p class="ad-card-sub">{rejecting.title} recibirá el motivo por correo.</p>
		<div class="ad-field" style="margin-top: 12px;">
			<label for="reject-note">Motivo</label>
			<textarea id="reject-note" class="ad-textarea" bind:value={rejectNote}></textarea>
		</div>
		<div class="ad-form-actions">
			<button class="ad-btn danger" type="button" disabled={busyId === rejecting.id} onclick={submitReject}>
				Confirmar rechazo
			</button>
			<button class="ad-btn ghost" type="button" onclick={() => (rejecting = null)}>Cancelar</button>
		</div>
	</section>
{/if}

<style>
	.desc {
		margin: 4px 0 0;
		color: var(--iz-muted);
		font-size: 11px;
		line-height: 1.4;
	}

	.ad-count {
		margin: 0 0 10px;
		color: var(--iz-muted);
		font-size: 12px;
	}
</style>
