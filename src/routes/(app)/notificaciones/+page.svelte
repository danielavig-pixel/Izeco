<script lang="ts">
	import { onMount } from 'svelte';
	import NotificationIcon from '#lib/components/NotificationIcon.svelte';
	import {
		getMyNotifications,
		getUnreadNotificationCount,
		markNotificationRead,
		type NotificationItem
	} from '#lib/services/api/api.service.js';
	import { formatRelativeTime, toPlainText } from '#lib/utils/format.js';

	// Tipos que documenta la API para /notifications/mine
	const TYPE_FILTERS = [
		{ value: '', label: 'Todos los tipos' },
		{ value: 'pago', label: 'Pagos' },
		{ value: 'voluntariado', label: 'Jornadas' },
		{ value: 'emprendimiento', label: 'Emprendimientos' },
		{ value: 'campana', label: 'Campañas' },
		{ value: 'sistema', label: 'Sistema' }
	];

	let notifications = $state<NotificationItem[]>([]);
	let unreadCount = $state(0);
	let isLoading = $state(true);
	let isLoadingMore = $state(false);
	let errorMessage = $state('');
	let onlyUnread = $state(false);
	let typeFilter = $state('');
	let pageNumber = $state(1);
	let totalPages = $state(1);

	onMount(() => {
		void reload();
	});

	async function reload() {
		isLoading = true;
		errorMessage = '';
		pageNumber = 1;
		try {
			const [result, unread] = await Promise.all([
				getMyNotifications({ page: 1, limit: 20, unread: onlyUnread, type: typeFilter }),
				getUnreadNotificationCount()
			]);
			notifications = result.items;
			totalPages = result.totalPages;
			unreadCount = unread;
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'No se pudieron cargar tus notificaciones.';
		} finally {
			isLoading = false;
		}
	}

	async function loadMore() {
		if (isLoadingMore || pageNumber >= totalPages) return;
		isLoadingMore = true;
		try {
			const result = await getMyNotifications({
				page: pageNumber + 1,
				limit: 20,
				unread: onlyUnread,
				type: typeFilter
			});
			notifications = [...notifications, ...result.items];
			pageNumber += 1;
			totalPages = result.totalPages;
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'No se pudieron cargar más notificaciones.';
		} finally {
			isLoadingMore = false;
		}
	}

	async function handleRead(item: NotificationItem) {
		if (item.isRead) return;
		notifications = notifications.map((notification) =>
			notification.id === item.id ? { ...notification, isRead: true } : notification
		);
		unreadCount = Math.max(0, unreadCount - 1);
		try {
			await markNotificationRead(item.id);
			if (onlyUnread) await reload();
		} catch {
			await reload();
		}
	}
</script>

<svelte:head>
	<title>Notificaciones | Izeco</title>
	<meta name="description" content="Tu historial de notificaciones y avisos de Izeco." />
</svelte:head>

<section class="page-head">
	<div>
		<p class="eyebrow"><span class="eyebrow-dot" aria-hidden="true"></span>Tu actividad</p>
		<h1>Notificaciones</h1>
		<p class="subtitle">Pagos, jornadas, emprendimientos y avisos de la plataforma.</p>
	</div>

	<div class="filters">
		<button
			class="filter"
			class:active={!onlyUnread}
			type="button"
			onclick={() => {
				onlyUnread = false;
				void reload();
			}}
		>
			Todas
		</button>
		<button
			class="filter"
			class:active={onlyUnread}
			type="button"
			onclick={() => {
				onlyUnread = true;
				void reload();
			}}
		>
			Sin leer{unreadCount > 0 ? ` (${unreadCount})` : ''}
		</button>
	</div>
</section>

<div class="toolbar">
	<label class="type-filter">
		<span>Tipo</span>
		<select bind:value={typeFilter} onchange={reload}>
			{#each TYPE_FILTERS as option (option.value)}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>
	</label>
	<button class="refresh" type="button" onclick={reload} disabled={isLoading}>Actualizar</button>
</div>

{#if errorMessage}
	<p class="banner" role="alert">{errorMessage}</p>
{/if}

<section class="card">
	{#if isLoading}
		<p class="state">Cargando notificaciones…</p>
	{:else if notifications.length === 0}
		<p class="state">
			{onlyUnread ? 'No tienes notificaciones sin leer.' : 'Todavía no tienes notificaciones.'}
		</p>
	{:else}
		<ul class="list">
			{#each notifications as item (item.id)}
				<li>
					<button
						class="row"
						class:unread={!item.isRead}
						type="button"
						disabled={item.isRead}
						onclick={() => handleRead(item)}
					>
						<NotificationIcon type={item.type} />
						<span class="row-body">
							<span class="row-head">
								<strong>{toPlainText(item.title, 90)}</strong>
								<small>{formatRelativeTime(item.createdAt)}</small>
							</span>
							{#if item.body}
								<span class="row-text">{toPlainText(item.body)}</span>
							{/if}
						</span>
						{#if !item.isRead}
							<span class="unread-dot" aria-hidden="true"></span>
						{/if}
					</button>
				</li>
			{/each}
		</ul>

		{#if pageNumber < totalPages}
			<button class="more" type="button" onclick={loadMore} disabled={isLoadingMore}>
				{isLoadingMore ? 'Cargando…' : 'Cargar más'}
			</button>
		{/if}
	{/if}
</section>

<style>
	.page-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 18px;
	}

	.eyebrow {
		display: flex;
		align-items: center;
		gap: 7px;
		margin: 0 0 8px;
		color: var(--iz-green-600);
		font-size: 10px;
		font-weight: 750;
		letter-spacing: 1.4px;
		text-transform: uppercase;
	}

	.eyebrow-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--iz-green-600);
	}

	h1 {
		margin: 0;
		color: var(--iz-ink);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 32px;
		font-weight: 600;
		letter-spacing: -0.6px;
	}

	.subtitle {
		margin: 6px 0 0;
		color: var(--iz-muted);
		font-size: 13px;
	}

	.filters {
		display: flex;
		gap: 8px;
	}

	.filter {
		padding: 8px 16px;
		border: 1px solid var(--iz-line);
		border-radius: 999px;
		background: var(--iz-surface);
		color: var(--iz-ink-soft);
		font: inherit;
		font-size: 12.5px;
		font-weight: 600;
		cursor: pointer;
	}

	.filter.active {
		border-color: var(--iz-green-300);
		background: var(--iz-green-100);
		color: var(--iz-green-800);
	}

	.toolbar {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 14px;
	}

	.type-filter {
		display: flex;
		align-items: center;
		gap: 9px;
		color: var(--iz-muted);
		font-size: 12px;
	}

	.type-filter select {
		padding: 8px 12px;
		border: 1px solid var(--iz-line);
		border-radius: 10px;
		background: var(--iz-surface);
		color: var(--iz-ink);
		font: inherit;
		font-size: 12.5px;
	}

	.refresh {
		padding: 8px 16px;
		border: 1px solid var(--iz-line);
		border-radius: 10px;
		background: var(--iz-surface);
		color: var(--iz-green-700);
		font: inherit;
		font-size: 12.5px;
		font-weight: 650;
		cursor: pointer;
	}

	.refresh:disabled {
		color: var(--iz-faint);
		cursor: wait;
	}

	.banner {
		margin: 0 0 14px;
		padding: 11px 14px;
		border: 1px solid #eccfc8;
		border-radius: var(--iz-radius-sm);
		background: #fbf0ec;
		color: var(--iz-danger);
		font-size: 12px;
	}

	.card {
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-md);
		background: var(--iz-surface);
		box-shadow: var(--iz-shadow-sm);
	}

	.state {
		margin: 0;
		padding: 44px 20px;
		color: var(--iz-muted);
		font-size: 13px;
		text-align: center;
	}

	.list {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.list li + li {
		border-top: 1px solid var(--iz-line);
	}

	.row {
		display: flex;
		width: 100%;
		align-items: flex-start;
		gap: 13px;
		padding: 15px 18px;
		border: 0;
		background: transparent;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.row.unread {
		background: var(--iz-green-50);
	}

	.row:disabled {
		cursor: default;
	}

	.row:not(:disabled):hover {
		background: var(--iz-surface-muted);
	}

	.row-body {
		display: flex;
		min-width: 0;
		flex: 1;
		flex-direction: column;
		gap: 4px;
	}

	.row-head {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		justify-content: space-between;
		gap: 8px;
	}

	.row-head strong {
		color: var(--iz-ink);
		font-size: 13px;
		font-weight: 650;
	}

	.row-head small {
		color: var(--iz-faint);
		font-size: 11px;
	}

	.row-text {
		display: -webkit-box;
		overflow: hidden;
		color: var(--iz-muted);
		font-size: 12.5px;
		line-height: 1.5;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}

	.unread-dot {
		width: 8px;
		height: 8px;
		flex: 0 0 auto;
		margin-top: 8px;
		border-radius: 50%;
		background: var(--iz-green-600);
	}

	.more {
		display: block;
		width: 100%;
		padding: 13px;
		border: 0;
		border-top: 1px solid var(--iz-line);
		border-radius: 0 0 var(--iz-radius-md) var(--iz-radius-md);
		background: transparent;
		color: var(--iz-green-700);
		font: inherit;
		font-size: 12.5px;
		font-weight: 650;
		cursor: pointer;
	}

	.more:hover:not(:disabled) {
		background: var(--iz-green-50);
	}
</style>
