<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getAccessToken, logout } from '#lib/services/auth/auth.service.js';
	import { clearSession, loadSession, session } from '#lib/services/api/session.svelte.js';
	import {
		getMyNotifications,
		getUnreadNotificationCount,
		markNotificationRead,
		type NotificationItem
	} from '#lib/services/api/api.service.js';
	import {
		formatLongDate,
		formatRelativeTime,
		formatRole,
		initials,
		toPlainText
	} from '#lib/utils/format.js';
	import NotificationIcon from '#lib/components/NotificationIcon.svelte';

	let { children } = $props();

	const navItems = [
		{ label: 'Inicio', href: '/dashboard', dot: false },
		{ label: 'Catálogo', href: '/catalogo', dot: false },
		{ label: 'Emprendimientos', href: '/emprendimientos', dot: false },
		{ label: 'Campañas', href: '/campanas', dot: false },
		{ label: 'Jornadas', href: '/jornadas', dot: false }
	];

	let isReady = $state(false);
	let menuOpen = $state(false);
	let panelOpen = $state(false);
	let unreadCount = $state(0);
	let notifications = $state<NotificationItem[]>([]);
	let isLoadingNotifications = $state(false);
	let notificationsError = $state('');
	let searchTerm = $state('');
	let currentDate = $state(formatLongDate());

	onMount(() => {
		if (!getAccessToken()) {
			void goto('/');
			return;
		}

		isReady = true;
		currentDate = formatLongDate();
		void loadSession().then(() => {
			if (session.expired) {
				logout();
				clearSession();
				void goto('/');
			}
		});
		void refreshUnreadCount();
	});

	function isActive(href: string): boolean {
		const path = page.url.pathname;
		return path === href || path.startsWith(`${href}/`);
	}

	async function refreshUnreadCount() {
		try {
			unreadCount = await getUnreadNotificationCount();
		} catch {
			unreadCount = 0;
		}
	}

	async function loadNotifications() {
		isLoadingNotifications = true;
		notificationsError = '';
		try {
			const pageResult = await getMyNotifications({ limit: 6 });
			notifications = pageResult.items;
			if (unreadCount === 0) {
				unreadCount = pageResult.items.filter((item) => !item.isRead).length;
			}
		} catch (error) {
			notificationsError =
				error instanceof Error ? error.message : 'No se pudieron cargar tus notificaciones.';
		} finally {
			isLoadingNotifications = false;
		}
	}

	async function togglePanel() {
		menuOpen = false;
		panelOpen = !panelOpen;
		if (panelOpen) await loadNotifications();
	}

	async function handleNotificationClick(item: NotificationItem) {
		if (item.isRead) return;
		notifications = notifications.map((notification) =>
			notification.id === item.id ? { ...notification, isRead: true } : notification
		);
		unreadCount = Math.max(0, unreadCount - 1);
		try {
			await markNotificationRead(item.id);
		} catch {
			// Si falla, refrescamos para no mostrar un estado optimista equivocado.
			void loadNotifications();
			void refreshUnreadCount();
		}
	}

	async function goToNotifications() {
		panelOpen = false;
		await goto('/notificaciones');
	}

	async function handleSearch(event: SubmitEvent) {
		event.preventDefault();
		const term = searchTerm.trim();
		menuOpen = false;
		panelOpen = false;
		await goto(term ? `/catalogo?q=${encodeURIComponent(term)}` : '/catalogo');
	}

	async function handleLogout() {
		menuOpen = false;
		panelOpen = false;
		logout();
		clearSession();
		await goto('/');
	}
</script>

<svelte:head>
	<meta
		name="description"
		content="Panel de Izeco: tu catálogo, tus compras y tu impacto."
	/>
</svelte:head>

{#if panelOpen || menuOpen}
	<button class="scrim" type="button" aria-label="Cerrar" onclick={() => (panelOpen = false, menuOpen = false)}
	></button>
{/if}

<div class="app-shell">
	<header class="app-header">
		<div class="header-inner">
			<a class="brand" href="/dashboard" aria-label="Izeco, ir al inicio">
				<svg class="brand-leaf" viewBox="0 0 24 24" aria-hidden="true">
					<path d="M12 21c0-6 0-9 8-12 0 8-3 11-8 12Z" />
					<path d="M12 21C12 14 10 9 4 6c-1 7 2 12 8 15Z" />
				</svg>
				<span class="brand-name">Izeco</span>
			</a>

			<span class="brand-divider" aria-hidden="true"></span>

			<nav class="main-nav" aria-label="Navegación principal">
				<div class="nav-track">
					{#each navItems as item (item.href)}
						<a class:active={isActive(item.href)} href={item.href}>
							{item.label}
							{#if item.dot}
								<span class="nav-dot" aria-hidden="true"></span>
							{/if}
						</a>
					{/each}
				</div>
			</nav>

			<div class="header-tools">
				<form class="search" onsubmit={handleSearch} role="search">
					<svg viewBox="0 0 20 20" aria-hidden="true">
						<circle cx="9" cy="9" r="5.2" />
						<path d="m13 13 4 4" />
					</svg>
					<input
						type="search"
						name="q"
						placeholder="Buscar en Izeco…"
						aria-label="Buscar en Izeco"
						bind:value={searchTerm}
					/>
				</form>

				<div class="today" aria-label={`Fecha de hoy: ${currentDate}`}>
					<svg viewBox="0 0 20 20" aria-hidden="true">
						<rect x="3" y="4.5" width="14" height="12" rx="2" />
						<path d="M3 8.5h14M7 3v3M13 3v3" />
					</svg>
					<span>{currentDate}</span>
				</div>

				<div class="popover-host">
					<button
						class="icon-button"
						type="button"
						aria-haspopup="true"
						aria-expanded={panelOpen}
						aria-label={unreadCount > 0
							? `Notificaciones, ${unreadCount} sin leer`
							: 'Notificaciones'}
						onclick={togglePanel}
					>
						<svg viewBox="0 0 20 20" aria-hidden="true">
							<path
								d="M10 3a4.5 4.5 0 0 1 4.5 4.5c0 3 1.2 4.2 1.2 4.2H4.3s1.2-1.2 1.2-4.2A4.5 4.5 0 0 1 10 3Z"
							/>
							<path d="M8.4 15a1.7 1.7 0 0 0 3.2 0" />
						</svg>
						{#if unreadCount > 0}
							<span class="notice-dot" aria-hidden="true"></span>
						{/if}
					</button>

					{#if panelOpen}
						<div class="panel notifications-panel" role="dialog" aria-label="Notificaciones">
							<header class="panel-head">
								<h2>Notificaciones</h2>
								{#if unreadCount > 0}
									<span class="unread-pill">{unreadCount} sin leer</span>
								{/if}
							</header>

							{#if isLoadingNotifications}
								<p class="panel-state">Cargando…</p>
							{:else if notificationsError}
								<p class="panel-state error" role="alert">{notificationsError}</p>
							{:else if notifications.length === 0}
								<p class="panel-state">No tienes notificaciones todavía.</p>
							{:else}
								<ul class="notification-list">
									{#each notifications as item (item.id)}
										<li>
											<button
												class="notification"
												class:unread={!item.isRead}
												type="button"
												onclick={() => handleNotificationClick(item)}
											>
												<NotificationIcon type={item.type} />
												<span class="notification-body">
													<strong>{toPlainText(item.title, 80)}</strong>
													{#if item.body}
														<span>{toPlainText(item.body, 150)}</span>
													{/if}
													<small>{formatRelativeTime(item.createdAt)}</small>
												</span>
												{#if !item.isRead}
													<span class="unread-dot" aria-hidden="true"></span>
												{/if}
											</button>
										</li>
									{/each}
								</ul>
							{/if}

							<button class="panel-footer" type="button" onclick={goToNotifications}>
								Ver todas las notificaciones
							</button>
						</div>
					{/if}
				</div>

				<div class="popover-host">
					<button
						class="user-button"
						type="button"
						aria-haspopup="menu"
						aria-expanded={menuOpen}
						onclick={() => (menuOpen = !menuOpen, panelOpen = false)}
					>
						<span class="avatar" aria-hidden="true">{initials(session.user?.name ?? '')}</span>
						<span class="user-meta">
							<strong>{session.user?.name ?? 'Tu cuenta'}</strong>
							<small>{session.user ? formatRole(session.user.role) : 'Cargando…'}</small>
						</span>
						<svg class="chevron" viewBox="0 0 20 20" aria-hidden="true">
							<path d="m5 8 5 5 5-5" />
						</svg>
					</button>

					{#if menuOpen}
						<div class="panel user-menu" role="menu">
							{#if session.user}
								<p class="menu-name">{session.user.name}</p>
								<p class="menu-email">{session.user.email}</p>
							{/if}
							<button type="button" role="menuitem" onclick={handleLogout}>Cerrar sesión</button>
						</div>
					{/if}
				</div>
			</div>
		</div>
	</header>

	<main class="app-main">
		{#if isReady}
			{@render children()}
		{:else}
			<p class="loading">Comprobando tu sesión…</p>
		{/if}
	</main>
</div>

<style>
	.app-shell {
		display: flex;
		min-height: 100vh;
		flex-direction: column;
		background: var(--iz-bg);
	}

	.app-header {
		position: sticky;
		top: 0;
		z-index: 20;
		border-bottom: 1px solid var(--iz-line);
		background: var(--iz-header);
	}

	.header-inner {
		display: flex;
		max-width: 1480px;
		align-items: center;
		gap: 14px;
		margin: 0 auto;
		padding: 12px 26px;
	}

	.brand {
		display: flex;
		flex: 0 0 auto;
		align-items: center;
		gap: 9px;
		color: var(--iz-ink);
		text-decoration: none;
	}

	.brand-leaf {
		width: 23px;
		height: 23px;
		fill: none;
		stroke: var(--iz-green-600);
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.7;
	}

	.brand-name {
		color: var(--iz-ink);
		font-size: 20px;
		font-weight: 700;
		letter-spacing: -0.5px;
	}

	.brand-divider {
		width: 1px;
		height: 26px;
		flex: 0 0 auto;
		background: var(--iz-line-strong);
	}

	.main-nav {
		min-width: 0;
	}

	.nav-track {
		position: relative;
		display: flex;
		align-items: center;
		gap: 2px;
		padding: 4px;
		border: 1px solid var(--iz-line);
		border-radius: 14px;
		background: var(--iz-surface);
	}

	.nav-track a {
		position: relative;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 7px 15px;
		border-radius: 10px;
		color: var(--iz-muted);
		font-size: 13px;
		font-weight: 550;
		white-space: nowrap;
		text-decoration: none;
		transition:
			background-color 150ms ease,
			color 150ms ease;
	}

	.nav-track a:hover {
		background: var(--iz-surface-muted);
		color: var(--iz-ink-soft);
	}

	.nav-track a.active {
		background: var(--iz-green-100);
		color: var(--iz-green-800);
		font-weight: 650;
	}

	.nav-track a.active::after {
		content: '';
		position: absolute;
		bottom: -6px;
		left: 50%;
		width: 46px;
		height: 2px;
		border-radius: 2px;
		background: var(--iz-green-600);
		transform: translateX(-50%);
	}

	.nav-dot {
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: var(--iz-amber);
	}

	.header-tools {
		display: flex;
		align-items: center;
		gap: 14px;
		margin-left: auto;
	}

	.search {
		display: flex;
		width: 258px;
		align-items: center;
		gap: 8px;
		padding: 8px 12px;
		border: 1px solid var(--iz-line);
		border-radius: 10px;
		background: var(--iz-surface);
	}

	.search:focus-within {
		border-color: var(--iz-green-600);
		box-shadow: 0 0 0 3px rgb(63 122 82 / 12%);
	}

	.search svg {
		width: 15px;
		height: 15px;
		flex: 0 0 auto;
		fill: none;
		stroke: var(--iz-faint);
		stroke-linecap: round;
		stroke-width: 1.7;
	}

	.search input {
		width: 100%;
		min-width: 0;
		border: 0;
		outline: 0;
		background: transparent;
		color: var(--iz-ink);
		font: inherit;
		font-size: 12.5px;
	}

	.search input::placeholder {
		color: var(--iz-faint);
	}

	.today {
		display: flex;
		align-items: center;
		gap: 7px;
		color: var(--iz-ink-soft);
		font-size: 12.5px;
		white-space: nowrap;
	}

	.today svg {
		width: 15px;
		height: 15px;
		fill: none;
		stroke: var(--iz-faint);
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.5;
	}

	.popover-host {
		position: relative;
	}

	.icon-button {
		position: relative;
		display: grid;
		width: 34px;
		height: 34px;
		place-items: center;
		border: 0;
		border-radius: 50%;
		background: transparent;
		color: var(--iz-ink-soft);
		cursor: pointer;
	}

	.icon-button:hover {
		background: var(--iz-surface-muted);
	}

	.icon-button svg {
		width: 19px;
		height: 19px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.5;
	}

	.notice-dot {
		position: absolute;
		top: 5px;
		right: 6px;
		width: 8px;
		height: 8px;
		border: 1.5px solid var(--iz-header);
		border-radius: 50%;
		background: var(--iz-amber);
	}

	.user-button {
		display: flex;
		align-items: center;
		gap: 9px;
		padding: 3px 6px 3px 3px;
		border: 0;
		border-radius: 999px;
		background: transparent;
		color: var(--iz-ink);
		font: inherit;
		cursor: pointer;
	}

	.user-button:hover {
		background: var(--iz-surface-muted);
	}

	.avatar {
		display: grid;
		width: 34px;
		height: 34px;
		place-items: center;
		border-radius: 50%;
		background: #ddd1b6;
		color: #6a5b3e;
		font-size: 12px;
		font-weight: 700;
	}

	.user-meta {
		display: flex;
		flex-direction: column;
		line-height: 1.2;
		text-align: left;
	}

	.user-meta strong {
		font-size: 12.5px;
		font-weight: 650;
	}

	.user-meta small {
		color: var(--iz-muted);
		font-size: 10.5px;
	}

	.chevron {
		width: 14px;
		height: 14px;
		fill: none;
		stroke: var(--iz-faint);
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.7;
	}

	.scrim {
		position: fixed;
		/* Por debajo del header (20) para que los paneles del header queden encima. */
		z-index: 19;
		inset: 0;
		border: 0;
		background: transparent;
		cursor: default;
	}

	.panel {
		position: absolute;
		top: calc(100% + 10px);
		right: 0;
		z-index: 22;
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-md);
		background: var(--iz-surface);
		box-shadow: var(--iz-shadow-lg);
	}

	.notifications-panel {
		width: 372px;
		max-width: calc(100vw - 32px);
		overflow: hidden;
	}

	.panel-head {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 10px;
		padding: 14px 16px 12px;
		border-bottom: 1px solid var(--iz-line);
	}

	.panel-head h2 {
		margin: 0;
		color: var(--iz-ink);
		font-size: 13.5px;
		font-weight: 700;
	}

	.unread-pill {
		padding: 3px 9px;
		border-radius: 999px;
		background: var(--iz-green-100);
		color: var(--iz-green-700);
		font-size: 10.5px;
		font-weight: 650;
	}

	.panel-state {
		margin: 0;
		padding: 22px 16px;
		color: var(--iz-muted);
		font-size: 12.5px;
		text-align: center;
	}

	.panel-state.error {
		color: var(--iz-danger);
	}

	.notification-list {
		max-height: 340px;
		margin: 0;
		padding: 0;
		overflow-y: auto;
		list-style: none;
	}

	.notification-list li + li {
		border-top: 1px solid var(--iz-line);
	}

	.notification {
		display: flex;
		width: 100%;
		align-items: flex-start;
		gap: 11px;
		padding: 12px 16px;
		border: 0;
		background: transparent;
		font: inherit;
		text-align: left;
		cursor: pointer;
	}

	.notification:hover {
		background: var(--iz-surface-muted);
	}

	.notification.unread {
		background: var(--iz-green-50);
	}

	.notification-body {
		display: flex;
		min-width: 0;
		flex: 1;
		flex-direction: column;
		gap: 3px;
	}

	.notification-body strong {
		color: var(--iz-ink);
		font-size: 12.5px;
		font-weight: 650;
	}

	.notification-body span {
		display: -webkit-box;
		overflow: hidden;
		color: var(--iz-muted);
		font-size: 11.5px;
		line-height: 1.45;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}

	.notification-body small {
		color: var(--iz-faint);
		font-size: 10.5px;
	}

	.unread-dot {
		width: 7px;
		height: 7px;
		flex: 0 0 auto;
		margin-top: 6px;
		border-radius: 50%;
		background: var(--iz-green-600);
	}

	.panel-footer {
		display: block;
		width: 100%;
		padding: 12px;
		border: 0;
		border-top: 1px solid var(--iz-line);
		background: transparent;
		color: var(--iz-green-700);
		font: inherit;
		font-size: 12px;
		font-weight: 650;
		cursor: pointer;
	}

	.panel-footer:hover {
		background: var(--iz-green-50);
	}

	.user-menu {
		min-width: 216px;
		padding: 8px;
	}

	.menu-name {
		margin: 4px 8px 0;
		color: var(--iz-ink);
		font-size: 12.5px;
		font-weight: 650;
	}

	.menu-email {
		margin: 2px 8px 8px;
		color: var(--iz-muted);
		font-size: 11px;
		overflow-wrap: anywhere;
	}

	.user-menu button {
		width: 100%;
		padding: 8px;
		border: 0;
		border-radius: 8px;
		background: transparent;
		color: var(--iz-danger);
		font: inherit;
		font-size: 12px;
		font-weight: 600;
		text-align: left;
		cursor: pointer;
	}

	.user-menu button:hover {
		background: #f8efec;
	}

	.app-main {
		width: 100%;
		max-width: 1480px;
		flex: 1;
		margin: 0 auto;
		padding: 22px 26px 40px;
	}

	.loading {
		margin: 80px auto;
		color: var(--iz-muted);
		font-size: 13px;
		text-align: center;
	}

	@media (max-width: 1180px) {
		.search {
			width: 180px;
		}

		.user-meta {
			display: none;
		}
	}

	@media (max-width: 900px) {
		.header-inner {
			flex-wrap: wrap;
			gap: 10px;
			padding: 10px 16px;
		}

		.brand-divider {
			display: none;
		}

		.main-nav {
			order: 3;
			width: 100%;
			overflow-x: auto;
		}

		.nav-track {
			width: max-content;
		}

		.today {
			display: none;
		}

		.app-main {
			padding: 18px 16px 32px;
		}
	}

	@media (max-width: 560px) {
		.header-tools {
			gap: 8px;
		}

		.search {
			width: 140px;
		}
	}
</style>
