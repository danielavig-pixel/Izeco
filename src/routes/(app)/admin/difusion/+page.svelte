<script lang="ts">
	import { onMount } from 'svelte';
	import {
		broadcastNotification,
		getAdminNotifications,
		getAdminNotificationStats,
		type NotificationItem
	} from '#lib/services/api/api.service.js';
	import { describeOverview, type MetricGroup } from '#lib/utils/admin.js';
	import { formatRelativeTime, toPlainText } from '#lib/utils/format.js';
	import Pagination from '#lib/components/Pagination.svelte';
	import NotificationIcon from '#lib/components/NotificationIcon.svelte';

	const PAGE_SIZE = 10;

	let subject = $state('');
	let message = $state('');
	let link = $state('');
	let isSending = $state(false);
	let errorMessage = $state('');
	let notice = $state('');

	let stats = $state<MetricGroup[]>([]);
	let notifications = $state<NotificationItem[]>([]);
	let total = $state(0);
	let pageNumber = $state(1);
	let totalPages = $state(1);
	let isLoading = $state(true);

	onMount(() => {
		void loadStats();
		void loadLog(1);
	});

	async function loadStats() {
		try {
			const raw = await getAdminNotificationStats();
			stats = describeOverview(raw).slice(0, 2);
		} catch {
			stats = [];
		}
	}

	async function loadLog(target: number) {
		isLoading = true;
		try {
			const result = await getAdminNotifications({ page: target, limit: PAGE_SIZE });
			notifications = result.items;
			total = result.total;
			pageNumber = result.page || target;
			totalPages = result.totalPages || 1;
		} catch {
			notifications = [];
		} finally {
			isLoading = false;
		}
	}

	async function send(event: SubmitEvent) {
		event.preventDefault();
		if (!subject.trim() || !message.trim()) {
			errorMessage = 'El asunto y el mensaje son obligatorios.';
			return;
		}
		if (!confirm('¿Enviar este correo a todos los usuarios activos?')) return;
		isSending = true;
		errorMessage = '';
		notice = '';
		try {
			await broadcastNotification({
				subject: subject.trim(),
				message: message.trim(),
				link: link.trim() || undefined
			});
			notice = 'Difusión enviada. Revisa el historial más abajo.';
			subject = '';
			message = '';
			link = '';
			await loadLog(1);
		} catch (error) {
			errorMessage = error instanceof Error ? error.message : 'No se pudo enviar la difusión.';
		} finally {
			isSending = false;
		}
	}
</script>

<svelte:head>
	<title>Difusión | Administración Izeco</title>
</svelte:head>

<section class="ad-head">
	<div>
		<p class="ad-eyebrow">Administración</p>
		<h1 class="ad-title">Difusión y notificaciones</h1>
		<p class="ad-subtitle">Envía un correo a todos los usuarios y consulta el historial de envíos.</p>
	</div>
</section>

{#if errorMessage}
	<p class="ad-banner" role="alert">{errorMessage}</p>
{/if}
{#if notice}
	<p class="ad-banner success" role="status">{notice}</p>
{/if}

{#each stats as group (group.key)}
	<section class="ad-group">
		<h2 class="ad-group-title">{group.label}</h2>
		<div class="ad-stats">
			{#each group.metrics as metric (metric.key)}
				<article class="ad-stat">
					<p class="ad-stat-label">{metric.label}</p>
					<p class="ad-stat-value">{metric.value.toLocaleString('es-CO')}</p>
				</article>
			{/each}
		</div>
	</section>
{/each}

<section class="ad-card">
	<h2 class="ad-card-title">Enviar a todos los usuarios</h2>
	<p class="ad-card-sub">El mensaje se convierte en un correo con el diseño de Izeco.</p>
	<form style="margin-top: 14px;" onsubmit={send}>
		<div class="ad-form-grid">
			<div class="ad-field full">
				<label for="b-subject">Asunto</label>
				<input id="b-subject" class="ad-input" bind:value={subject} required />
			</div>
			<div class="ad-field full">
				<label for="b-message">Mensaje</label>
				<textarea id="b-message" class="ad-textarea" bind:value={message} required></textarea>
			</div>
			<div class="ad-field full">
				<label for="b-link">Enlace (opcional)</label>
				<input id="b-link" class="ad-input" bind:value={link} placeholder="https://…" />
			</div>
		</div>
		<div class="ad-form-actions">
			<button class="ad-btn" type="submit" disabled={isSending}>
				{isSending ? 'Enviando…' : 'Enviar difusión'}
			</button>
		</div>
	</form>
</section>

<section class="ad-card">
	<div class="ad-card-head">
		<div>
			<h2 class="ad-card-title">Historial de envíos</h2>
			<p class="ad-card-sub">
				{total.toLocaleString('es-CO')} {total === 1 ? 'notificación' : 'notificaciones'} registradas.
			</p>
		</div>
	</div>

	{#if isLoading}
		<p class="ad-state">Cargando historial…</p>
	{:else if notifications.length === 0}
		<p class="ad-empty">Todavía no hay envíos registrados.</p>
	{:else}
		<ul class="log">
			{#each notifications as item (item.id)}
				<li>
					<NotificationIcon type={item.type} />
					<div class="log-body">
						<strong>{toPlainText(item.title, 90)}</strong>
						{#if item.body}
							<span>{toPlainText(item.body, 160)}</span>
						{/if}
					</div>
					<span class="log-time">{formatRelativeTime(item.createdAt)}</span>
				</li>
			{/each}
		</ul>
		<Pagination page={pageNumber} {totalPages} onchange={(next) => loadLog(next)} disabled={isLoading} />
	{/if}
</section>

<style>
	.log {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.log li {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 12px 0;
		border-bottom: 1px solid var(--iz-line);
	}

	.log li:last-child {
		border-bottom: 0;
	}

	.log-body {
		display: flex;
		min-width: 0;
		flex: 1;
		flex-direction: column;
		gap: 3px;
	}

	.log-body strong {
		color: var(--iz-ink);
		font-size: 12.5px;
		font-weight: 650;
	}

	.log-body span {
		color: var(--iz-muted);
		font-size: 11.5px;
		line-height: 1.45;
	}

	.log-time {
		flex: 0 0 auto;
		color: var(--iz-faint);
		font-size: 10.5px;
		white-space: nowrap;
	}
</style>
