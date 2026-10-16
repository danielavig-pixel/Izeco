<script lang="ts">
	import { onMount } from 'svelte';
	import {
		changeAdminUserRole,
		changeAdminUserStatus,
		getAdminUser,
		getAdminUsers,
		type AdminUser,
		type UserProfile
	} from '#lib/services/api/api.service.js';
	import { describeOverview, humanizeKey, type MetricGroup } from '#lib/utils/admin.js';
	import { formatLongDate, formatRole } from '#lib/utils/format.js';
	import Pagination from '#lib/components/Pagination.svelte';

	const ROLE_OPTIONS = ['admin', 'emprendedor', 'comprador', 'voluntario'];
	const PAGE_SIZE = 12;

	let users = $state<AdminUser[]>([]);
	let total = $state(0);
	let pageNumber = $state(1);
	let totalPages = $state(1);
	let isLoading = $state(true);
	let errorMessage = $state('');
	let notice = $state('');
	let busyId = $state('');

	let query = $state('');
	let roleFilter = $state('');
	let activeFilter = $state('');

	let detail: { user: UserProfile; raw: Record<string, unknown> } | null = $state(null);
	let isLoadingDetail = $state(false);

	onMount(() => {
		void load(1);
	});

	async function load(target: number) {
		isLoading = true;
		errorMessage = '';
		try {
			const result = await getAdminUsers({
				page: target,
				limit: PAGE_SIZE,
				q: query.trim() || undefined,
				role: roleFilter || undefined,
				isActive: activeFilter === '' ? undefined : activeFilter === 'true'
			});
			users = result.items;
			total = result.total;
			pageNumber = result.page || target;
			totalPages = result.totalPages || 1;
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudieron cargar los usuarios.';
			users = [];
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
		roleFilter = '';
		activeFilter = '';
		await load(1);
	}

	async function handleRoleChange(user: AdminUser, role: string) {
		if (!user.id || role === user.role) return;
		busyId = user.id;
		errorMessage = '';
		notice = '';
		try {
			await changeAdminUserRole(user.id, role);
			notice = `Rol de ${user.name || user.email} actualizado a ${formatRole(role)}.`;
			await load(pageNumber);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudo cambiar el rol.';
			await load(pageNumber);
		} finally {
			busyId = '';
		}
	}

	async function toggleStatus(user: AdminUser) {
		if (!user.id) return;
		const next = !user.isActive;
		busyId = user.id;
		errorMessage = '';
		notice = '';
		try {
			await changeAdminUserStatus(user.id, next);
			notice = next
				? `Cuenta de ${user.name || user.email} reactivada.`
				: `Cuenta de ${user.name || user.email} desactivada.`;
			await load(pageNumber);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudo cambiar el estado.';
		} finally {
			busyId = '';
		}
	}

	async function openDetail(user: AdminUser) {
		if (!user.id) return;
		isLoadingDetail = true;
		detail = null;
		try {
			detail = await getAdminUser(user.id);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudo cargar el usuario.';
		} finally {
			isLoadingDetail = false;
		}
	}

	function buildDetailMetrics(
		value: { user: UserProfile; raw: Record<string, unknown> } | null
	): MetricGroup[] {
		return value ? describeOverview(value.raw) : [];
	}

	const detailMetrics = $derived(buildDetailMetrics(detail));
</script>

<svelte:head>
	<title>Usuarios | Administración Izeco</title>
</svelte:head>

<section class="ad-head">
	<div>
		<p class="ad-eyebrow">Administración</p>
		<h1 class="ad-title">Usuarios</h1>
		<p class="ad-subtitle">
			{total.toLocaleString('es-CO')}
			{total === 1 ? 'cuenta registrada' : 'cuentas registradas'}. Cambia roles y activa o
			desactiva cuentas.
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
		<label for="user-q">Buscar</label>
		<input id="user-q" class="ad-input" type="search" bind:value={query} placeholder="Nombre o correo" />
	</div>
	<div class="ad-field">
		<label for="user-role">Rol</label>
		<select id="user-role" class="ad-select" bind:value={roleFilter}>
			<option value="">Todos</option>
			{#each ROLE_OPTIONS as role (role)}
				<option value={role}>{formatRole(role)}</option>
			{/each}
		</select>
	</div>
	<div class="ad-field">
		<label for="user-state">Estado</label>
		<select id="user-state" class="ad-select" bind:value={activeFilter}>
			<option value="">Todos</option>
			<option value="true">Activas</option>
			<option value="false">Desactivadas</option>
		</select>
	</div>
	<div class="ad-btn-row">
		<button class="ad-btn" type="submit" disabled={isLoading}>Filtrar</button>
		<button class="ad-btn ghost" type="button" onclick={clearFilters} disabled={isLoading}>
			Limpiar
		</button>
	</div>
</form>

{#if isLoading}
	<p class="ad-state">Cargando usuarios…</p>
{:else if users.length === 0}
	<p class="ad-state">No se encontraron usuarios con esos filtros.</p>
{:else}
	<div class="ad-table-wrap">
		<table class="ad-table">
			<thead>
				<tr>
					<th>Usuario</th>
					<th>Rol</th>
					<th>Estado</th>
					<th>Registro</th>
					<th>Acciones</th>
				</tr>
			</thead>
			<tbody>
				{#each users as user (user.id || user.email)}
					<tr>
						<td>
							<span class="ad-cell-strong">{user.name || 'Sin nombre'}</span>
							<br />
							<span class="ad-cell-muted">{user.email}</span>
						</td>
						<td>
							<select
								class="ad-select"
								aria-label={`Rol de ${user.name || user.email}`}
								value={user.role}
								disabled={busyId === user.id}
								onchange={(event) => handleRoleChange(user, event.currentTarget.value)}
							>
								{#each ROLE_OPTIONS as role (role)}
									<option value={role}>{formatRole(role)}</option>
								{/each}
							</select>
						</td>
						<td>
							<span class="ad-badge" class:green={user.isActive} class:red={!user.isActive}>
								{user.isActive ? 'Activa' : 'Desactivada'}
							</span>
						</td>
						<td class="ad-cell-muted">{formatLongDate(new Date(user.createdAt ?? Date.now()))}</td>
						<td>
							<div class="ad-cell-actions">
								<button
									class="ad-btn ghost small"
									type="button"
									onclick={() => openDetail(user)}
									disabled={isLoadingDetail}
								>
									Ver
								</button>
								<button
									class="ad-btn small"
									class:danger={user.isActive}
									type="button"
									onclick={() => toggleStatus(user)}
									disabled={busyId === user.id}
								>
									{user.isActive ? 'Desactivar' : 'Activar'}
								</button>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<Pagination page={pageNumber} {totalPages} onchange={(next) => load(next)} disabled={isLoading} />
{/if}

{#if isLoadingDetail}
	<p class="ad-state">Cargando detalle…</p>
{:else if detail}
	<section class="ad-detail">
		<div class="ad-card-head">
			<div>
				<h2 class="ad-card-title">{detail.user.name || detail.user.email}</h2>
				<p class="ad-card-sub">{detail.user.email}</p>
			</div>
			<button class="ad-btn ghost small" type="button" onclick={() => (detail = null)}>Cerrar</button>
		</div>

		<dl>
			<div>
				<dt>Rol</dt>
				<dd>{formatRole(detail.user.role)}</dd>
			</div>
			<div>
				<dt>Estado</dt>
				<dd>{detail.user.isActive ? 'Activa' : 'Desactivada'}</dd>
			</div>
			<div>
				<dt>Teléfono</dt>
				<dd>{detail.user.phone || '—'}</dd>
			</div>
			<div>
				<dt>Registro</dt>
				<dd>{detail.user.createdAt ? formatLongDate(new Date(detail.user.createdAt)) : '—'}</dd>
			</div>
		</dl>

		{#if detail.user.bio}
			<p class="bio">{detail.user.bio}</p>
		{/if}

		{#each detailMetrics as group (group.key)}
			<h3 class="ad-group-title detail-group">{group.label}</h3>
			<div class="ad-stats">
				{#each group.metrics as metric (metric.key)}
					<article class="ad-stat">
						<p class="ad-stat-label">{metric.label || humanizeKey(metric.key)}</p>
						<p class="ad-stat-value">{metric.value.toLocaleString('es-CO')}</p>
					</article>
				{/each}
			</div>
		{/each}
	</section>
{/if}

<style>
	.bio {
		margin: 14px 0 0;
		color: var(--iz-ink-soft);
		font-size: 12.5px;
		line-height: 1.55;
	}

	.detail-group {
		margin-top: 18px;
	}
</style>
