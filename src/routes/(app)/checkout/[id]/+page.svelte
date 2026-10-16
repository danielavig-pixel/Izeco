<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import {
		getPaymentById,
		resolveSandboxPayment,
		ApiServiceError,
		type Payment
	} from '#lib/services/api/api.service.js';
	import { formatCurrency } from '#lib/utils/format.js';

	type Outcome = 'approved' | 'rejected' | 'cancelled';

	const STATUS_LABEL: Record<string, string> = {
		pendiente: 'Pendiente',
		aprobado: 'Aprobado',
		rechazado: 'Rechazado',
		cancelado: 'Cancelado',
		reembolsado: 'Reembolsado'
	};

	let payment = $state<Payment | null>(null);
	let isLoading = $state(true);
	let loadError = $state('');
	let actionError = $state('');
	let busy = $state<Outcome | ''>('');
	/** Resultado ya resuelto en esta pantalla (o detectado al cargar). */
	let resolved = $state<Outcome | ''>('');

	onMount(() => {
		void load();
	});

	async function load() {
		isLoading = true;
		loadError = '';
		const id = page.params.id;
		if (!id) {
			loadError = 'No encontramos el pago que buscas.';
			isLoading = false;
			return;
		}
		try {
			const found = await getPaymentById(id);
			payment = found;
			resolved = statusToOutcome(found.status);
		} catch (error) {
			loadError =
				error instanceof ApiServiceError ? error.message : 'No se pudo cargar el pago.';
		} finally {
			isLoading = false;
		}
	}

	function statusToOutcome(status: string): Outcome | '' {
		if (status === 'aprobado') return 'approved';
		if (status === 'rechazado') return 'rejected';
		if (status === 'cancelado') return 'cancelled';
		return '';
	}

	async function resolve(outcome: Outcome) {
		if (!payment || busy || resolved) return;
		busy = outcome;
		actionError = '';
		try {
			payment = await resolveSandboxPayment(payment.id, outcome);
			resolved = outcome;
		} catch (error) {
			actionError =
				error instanceof ApiServiceError ? error.message : 'No se pudo completar el pago.';
		} finally {
			busy = '';
		}
	}

	const amountLabel = $derived(
		payment ? formatCurrency(payment.amountCents, payment.currencyCode) : ''
	);
	const shortRef = $derived(payment?.externalRef ? payment.externalRef.slice(0, 8).toUpperCase() : '—');
</script>

<svelte:head>
	<title>Pago seguro | Izeco</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="checkout">
	<header class="co-head">
		<span class="co-badge">
			<svg viewBox="0 0 20 20" aria-hidden="true">
				<path d="M6.2 9V6.6a3.8 3.8 0 0 1 7.6 0V9" />
				<rect x="4.6" y="9" width="10.8" height="7" rx="1.6" />
			</svg>
			Pasarela sandbox
		</span>
		<h1>Finalizar compra</h1>
		<p>Estás en un entorno de pruebas. No se cobra dinero real.</p>
	</header>

	{#if isLoading}
		<p class="co-state">Cargando el pago…</p>
	{:else if loadError}
		<section class="co-card">
			<p class="co-alert" role="alert">{loadError}</p>
			<a class="co-link" href="/catalogo">Volver al catálogo</a>
		</section>
	{:else if payment}
		<section class="co-card" aria-labelledby="co-amount">
			<div class="co-merchant">
				<img src="/logo.png" alt="Izeco" />
				<div>
					<strong>Izeco</strong>
					<span>Plataforma de economía circular</span>
				</div>
			</div>

			<p id="co-amount" class="co-amount">{amountLabel}</p>
			<p class="co-desc">{payment.description || 'Compra en Izeco'}</p>

			<dl class="co-meta">
				<div>
					<dt>Estado</dt>
					<dd>
						<span class="co-pill {resolved || payment.status}">
							{STATUS_LABEL[payment.status] ?? payment.status}
						</span>
					</dd>
				</div>
				<div>
					<dt>Referencia</dt>
					<dd>#{shortRef}</dd>
				</div>
			</dl>

			{#if resolved}
				<div class="co-result {resolved}" role="status">
					{#if resolved === 'approved'}
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<circle cx="12" cy="12" r="9" />
							<path d="m7.5 12.2 3 3 6-6.4" />
						</svg>
						<div>
							<strong>Pago aprobado</strong>
							<p>Ya registramos tu compra. Te avisamos por notificaciones.</p>
						</div>
					{:else if resolved === 'rejected'}
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<circle cx="12" cy="12" r="9" />
							<path d="m8.5 8.5 7 7m0-7-7 7" />
						</svg>
						<div>
							<strong>Pago rechazado</strong>
							<p>El pago no se completó. Puedes intentarlo de nuevo.</p>
						</div>
					{:else}
						<svg viewBox="0 0 24 24" aria-hidden="true">
							<circle cx="12" cy="12" r="9" />
							<path d="M9 9l6 6M15 9l-6 6" />
						</svg>
						<div>
							<strong>Pago cancelado</strong>
							<p>Cancelaste la transacción antes de completarla.</p>
						</div>
					{/if}
				</div>

				<div class="co-actions">
					<a class="co-btn ghost" href="/catalogo">Seguir explorando</a>
					<a class="co-btn primary" href="/dashboard">Ir a mi panel</a>
				</div>
			{:else}
				<!-- Formulario decorativo: la pasarela simulada no procesa tarjetas. -->
				<div class="co-fields" aria-hidden="true">
					<span class="co-label">Número de tarjeta</span>
					<div class="co-input">4242 4242 4242 4242</div>
					<div class="co-row">
						<div>
							<span class="co-label">Vence</span>
							<div class="co-input">12/30</div>
						</div>
						<div>
							<span class="co-label">CVC</span>
							<div class="co-input">123</div>
						</div>
					</div>
				</div>

				{#if actionError}
					<p class="co-alert" role="alert">{actionError}</p>
				{/if}

				<div class="co-actions">
					<button
						class="co-btn ghost"
						type="button"
						disabled={busy !== ''}
						onclick={() => resolve('rejected')}
					>
						{busy === 'rejected' ? 'Rechazando…' : 'Rechazar pago'}
					</button>
					<button
						class="co-btn primary"
						type="button"
						disabled={busy !== ''}
						onclick={() => resolve('approved')}
					>
						{busy === 'approved' ? 'Procesando…' : `Pagar ${amountLabel}`}
					</button>
				</div>
				<p class="co-note">
					Al continuar aceptas que este es un pago simulado de demostración.
				</p>
			{/if}
		</section>
	{/if}
</main>

<style>
	.checkout {
		display: grid;
		justify-items: center;
		gap: 18px;
		padding: 40px 16px 56px;
	}

	.co-head {
		width: min(100%, 460px);
		text-align: center;
	}

	.co-badge {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		padding: 5px 11px;
		border: 1px solid var(--iz-line-strong);
		border-radius: 999px;
		background: var(--iz-amber-100);
		color: var(--iz-amber);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.03em;
		text-transform: uppercase;
	}

	.co-badge svg {
		width: 13px;
		height: 13px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.6;
	}

	.co-head h1 {
		margin: 12px 0 4px;
		color: var(--iz-ink);
		font-size: 26px;
		letter-spacing: -0.5px;
	}

	.co-head p {
		margin: 0;
		color: var(--iz-muted);
		font-size: 14px;
	}

	.co-state {
		color: var(--iz-muted);
	}

	.co-card {
		display: grid;
		width: min(100%, 460px);
		gap: 16px;
		padding: 24px;
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-lg);
		background: var(--iz-surface);
		box-shadow: var(--iz-shadow-md);
	}

	.co-merchant {
		display: flex;
		align-items: center;
		gap: 12px;
		padding-bottom: 16px;
		border-bottom: 1px solid var(--iz-line);
	}

	.co-merchant img {
		width: 44px;
		height: 44px;
		object-fit: contain;
	}

	.co-merchant strong {
		display: block;
		color: var(--iz-ink);
		font-size: 15px;
	}

	.co-merchant span {
		color: var(--iz-muted);
		font-size: 12px;
	}

	.co-amount {
		margin: 0;
		color: var(--iz-ink);
		font-size: 34px;
		font-weight: 750;
		letter-spacing: -1px;
	}

	.co-desc {
		margin: -8px 0 0;
		color: var(--iz-ink-soft);
		font-size: 14px;
	}

	.co-meta {
		display: flex;
		justify-content: space-between;
		gap: 12px;
		margin: 0;
		padding: 12px 0;
		border-top: 1px solid var(--iz-line);
		border-bottom: 1px solid var(--iz-line);
	}

	.co-meta dt {
		color: var(--iz-muted);
		font-size: 11px;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.co-meta dd {
		margin: 4px 0 0;
		color: var(--iz-ink-soft);
		font-size: 13px;
		font-weight: 650;
	}

	.co-pill {
		display: inline-block;
		padding: 3px 10px;
		border-radius: 999px;
		background: var(--iz-surface-muted);
		color: var(--iz-ink-soft);
		font-size: 12px;
		font-weight: 650;
		text-transform: capitalize;
	}

	.co-pill.approved {
		background: var(--iz-green-100);
		color: var(--iz-green-700);
	}

	.co-pill.rejected,
	.co-pill.cancelled {
		background: #fbe6e4;
		color: var(--iz-danger);
	}

	.co-fields {
		display: grid;
		gap: 6px;
	}

	.co-fields .co-label {
		color: var(--iz-muted);
		font-size: 11px;
		font-weight: 650;
		text-transform: uppercase;
		letter-spacing: 0.04em;
	}

	.co-input {
		padding: 11px 13px;
		border: 1px solid var(--iz-line-strong);
		border-radius: var(--iz-radius-sm);
		background: var(--iz-surface-muted);
		color: var(--iz-faint);
		font-size: 14px;
		letter-spacing: 0.06em;
	}

	.co-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 12px;
		margin-top: 6px;
	}

	.co-result {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 16px;
		border-radius: var(--iz-radius-md);
		background: var(--iz-surface-muted);
	}

	.co-result svg {
		width: 26px;
		height: 26px;
		flex: 0 0 auto;
		fill: none;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.8;
	}

	.co-result strong {
		color: var(--iz-ink);
		font-size: 15px;
	}

	.co-result p {
		margin: 3px 0 0;
		color: var(--iz-ink-soft);
		font-size: 13px;
	}

	.co-result.approved {
		background: var(--iz-green-50);
	}

	.co-result.approved svg {
		stroke: var(--iz-green-600);
	}

	.co-result.rejected,
	.co-result.cancelled {
		background: #fbe6e4;
	}

	.co-result.rejected svg,
	.co-result.cancelled svg {
		stroke: var(--iz-danger);
	}

	.co-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
	}

	.co-btn {
		flex: 1 1 auto;
		padding: 13px 18px;
		border: 1px solid transparent;
		border-radius: var(--iz-radius-md);
		font: inherit;
		font-size: 14px;
		font-weight: 700;
		text-align: center;
		text-decoration: none;
		cursor: pointer;
		transition:
			background-color 150ms ease,
			transform 150ms ease;
	}

	.co-btn.primary {
		background: var(--iz-green-700);
		color: #fff;
	}

	.co-btn.primary:hover:not(:disabled) {
		transform: translateY(-1px);
		background: var(--iz-green-800);
	}

	.co-btn.ghost {
		border-color: var(--iz-line-strong);
		background: var(--iz-surface);
		color: var(--iz-ink-soft);
	}

	.co-btn.ghost:hover:not(:disabled) {
		background: var(--iz-surface-muted);
	}

	.co-btn:disabled {
		cursor: progress;
		opacity: 0.7;
	}

	.co-note {
		margin: 0;
		color: var(--iz-faint);
		font-size: 12px;
		text-align: center;
	}

	.co-alert {
		margin: 0;
		padding: 11px 13px;
		border-radius: var(--iz-radius-sm);
		background: #fbe6e4;
		color: var(--iz-danger);
		font-size: 13px;
	}

	.co-link {
		color: var(--iz-green-700);
		font-weight: 650;
	}
</style>
