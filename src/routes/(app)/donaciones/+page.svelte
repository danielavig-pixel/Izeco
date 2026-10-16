<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		createDonation,
		getDonationSummary,
		getMyDonations,
		type Donation,
		type DonationSummary
	} from '#lib/services/api/api.service.js';
	import { formatCurrency, formatDateTimeParts, formatRelativeTime } from '#lib/utils/format.js';

	// Presets en pesos: la API siempre recibe centavos.
	const PRESETS = [10000, 25000, 50000, 100000];

	const STATUS_LABEL: Record<string, string> = {
		pendiente: 'Pendiente',
		aprobado: 'Confirmada',
		rechazado: 'Rechazada',
		cancelado: 'Cancelada',
		reembolsado: 'Reembolsada'
	};

	let summary = $state<DonationSummary | null>(null);
	let donations = $state<Donation[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state('');

	let amount = $state('');
	let destination = $state('');
	let message = $state('');
	let anonymous = $state(false);
	let isSubmitting = $state(false);
	let formError = $state('');
	let amountInput = $state<HTMLInputElement | null>(null);
	let formAnchor = $state<HTMLElement | null>(null);
	let brokenCovers = $state<Record<string, boolean>>({});

	// Permite llegar desde una campaña con ?campana=<id> y preseleccionar el destino.
	const requestedCampaign = page.url.searchParams.get('campana') ?? '';

	onMount(() => {
		void load();
	});

	async function load() {
		isLoading = true;
		errorMessage = '';
		try {
			const [state, mine] = await Promise.all([getDonationSummary(), getMyDonations({ limit: 6 })]);
			summary = state;
			donations = mine.items;
			if (requestedCampaign && state.campaigns.some((c) => c.id === requestedCampaign)) {
				destination = requestedCampaign;
			}
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'No se pudieron cargar las donaciones.';
		} finally {
			isLoading = false;
		}
	}

	const amountCents = $derived(Math.round((Number(amount.replace(/[^\d]/g, '')) || 0) * 100));

	const destinationName = $derived(
		destination
			? (summary?.campaigns.find((campaign) => campaign.id === destination)?.title ?? '')
			: 'el fondo general'
	);

	function pickPreset(value: number) {
		amount = String(value);
		formError = '';
	}

	/** El botón de cada campaña solo apunta el formulario a esa campaña. */
	function donateTo(campaignId: string) {
		destination = campaignId;
		formError = '';
		formAnchor?.scrollIntoView({ behavior: 'smooth', block: 'center' });
		amountInput?.focus({ preventScroll: true });
	}

	async function submit(event: SubmitEvent) {
		event.preventDefault();
		formError = '';

		if (amountCents < 1000) {
			formError = 'El aporte mínimo es de $10.';
			return;
		}

		isSubmitting = true;
		try {
			const result = await createDonation({
				amountCents,
				campaignId: destination || null,
				message,
				anonymous
			});
			await goto(`/checkout/${result.paymentId}`);
		} catch (error) {
			formError = error instanceof Error ? error.message : 'No se pudo registrar tu aporte.';
		} finally {
			isSubmitting = false;
		}
	}

	function statusTone(status: string): string {
		if (status === 'aprobado') return 'green';
		if (status === 'rechazado' || status === 'cancelado') return 'red';
		if (status === 'reembolsado') return 'purple';
		return 'amber';
	}

	function progressPercent(raised: number, goal: number | null): number {
		if (!goal || goal <= 0) return 0;
		return Math.min(100, Math.round((raised / goal) * 100));
	}
</script>

<svelte:head>
	<title>Donaciones | Izeco</title>
	<meta
		name="description"
		content="Apoya las campañas de Izeco y el fondo general que sostiene la plataforma."
	/>
</svelte:head>

<section class="page-head">
	<div>
		<p class="eyebrow"><span class="eyebrow-dot"></span> Comunidad Izeco</p>
		<h1>Donaciones</h1>
		<p class="subtitle">
			Tus aportes financian las campañas de la plataforma y el trabajo de acompañamiento a los
			emprendimientos locales. Elige un monto, paga y listo.
		</p>
	</div>
</section>

{#if errorMessage}
	<p class="banner" role="alert">{errorMessage}</p>
{/if}

{#if isLoading}
	<p class="state">Cargando donaciones…</p>
{:else if summary}
	<!-- Aporte: fondo general o campaña -->
	<section class="give" bind:this={formAnchor}>
		<div class="give-info">
			<p class="give-eyebrow">Tu aporte</p>
			<h2>Donar a {destinationName}</h2>
			<p class="give-total">
				{formatCurrency(summary.totals.raisedCents)}
				<span>
					recaudados entre {summary.totals.donors}
					{summary.totals.donors === 1 ? 'persona' : 'personas'}
				</span>
			</p>
			<p class="give-hint">
				{formatCurrency(summary.general.raisedCents)} van al fondo general y
				{formatCurrency(summary.totals.raisedCents - summary.general.raisedCents)} a campañas.
			</p>
		</div>

		<form class="give-form" onsubmit={submit}>
			<div class="field">
				<label for="d-destination">Destino</label>
				<select id="d-destination" bind:value={destination}>
					<option value="">Fondo general de Izeco</option>
					{#each summary.campaigns as campaign (campaign.id)}
						<option value={campaign.id}>{campaign.title}</option>
					{/each}
				</select>
			</div>

			<div class="field">
				<label for="d-amount">Monto en pesos</label>
				<div class="amount-row">
					<input
						id="d-amount"
						bind:this={amountInput}
						bind:value={amount}
						type="number"
						inputmode="numeric"
						min="10"
						step="1000"
						placeholder="25000"
					/>
					<span class="suffix">COP</span>
				</div>
				<div class="presets">
					{#each PRESETS as preset (preset)}
						<button
							type="button"
							class:active={amountCents === preset * 100}
							onclick={() => pickPreset(preset)}
						>
							{formatCurrency(preset * 100)}
						</button>
					{/each}
				</div>
			</div>

			<div class="field">
				<label for="d-message">Mensaje (opcional)</label>
				<input
					id="d-message"
					bind:value={message}
					type="text"
					maxlength="280"
					placeholder="En memoria de…, por el río…"
				/>
			</div>

			<label class="check">
				<input type="checkbox" bind:checked={anonymous} />
				Quiero que mi aporte sea anónimo
			</label>

			{#if formError}
				<p class="form-error" role="alert">{formError}</p>
			{/if}

			<button class="primary" type="submit" disabled={isSubmitting}>
				{isSubmitting ? 'Preparando el pago…' : `Donar ${amountCents > 0 ? formatCurrency(amountCents) : ''}`}
			</button>
			<p class="form-note">El pago se completa en la pasarela simulada de Izeco.</p>
		</form>
	</section>

	<!-- Campañas con meta -->
	<section class="block">
		<div class="block-head">
			<h2>Campañas que puedes apoyar</h2>
			<a class="link" href="/campanas">Ver todas</a>
		</div>

		{#if summary.campaigns.length === 0}
			<p class="state">Todavía no hay campañas activas.</p>
		{:else}
			<div class="grid">
				{#each summary.campaigns as campaign (campaign.id)}
					<article class="ccard">
						<div class="cover">
							{#if campaign.imageUrl && !brokenCovers[campaign.id]}
								<img
									src={campaign.imageUrl}
									alt={campaign.title}
									loading="lazy"
									onerror={() => (brokenCovers[campaign.id] = true)}
								/>
							{/if}
						</div>
						<div class="ccard-body">
							<h3>{campaign.title}</h3>
							{#if campaign.summary}
								<p class="ccard-summary">{campaign.summary}</p>
							{/if}

							<div class="progress">
								<div class="bar">
									<span
										style="width: {progressPercent(campaign.raisedCents, campaign.goalCents)}%"
									></span>
								</div>
								<p class="progress-label">
									{#if campaign.goalCents}
										<strong>{formatCurrency(campaign.raisedCents)}</strong>
										de {formatCurrency(campaign.goalCents)}
									{:else}
										<strong>{formatCurrency(campaign.raisedCents)}</strong> recaudados
									{/if}
									<span>
										{campaign.donors}
										{campaign.donors === 1 ? 'aporte' : 'aportes'}
									</span>
								</p>
							</div>

							<button class="secondary" type="button" onclick={() => donateTo(campaign.id)}>
								Donar a esta campaña
							</button>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</section>

	<!-- Muro de aportes -->
	{#if summary.recent.length > 0}
		<section class="block">
			<div class="block-head">
				<h2>Aportes recientes</h2>
			</div>
			<ul class="wall">
				{#each summary.recent as item (item.id)}
					<li>
						<span class="wall-amount">{formatCurrency(item.amountCents)}</span>
						<span class="wall-who">
							{item.donorName ?? 'Alguien de la comunidad'}
							{#if item.campaignTitle}
								· <a href="/campanas/{item.campaignSlug}">{item.campaignTitle}</a>
							{:else}
								· Fondo general
							{/if}
						</span>
						{#if item.message}
							<span class="wall-message">“{item.message}”</span>
						{/if}
						<span class="wall-when">{formatRelativeTime(item.confirmedAt ?? item.createdAt)}</span>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<!-- Historial propio -->
	<section class="block">
		<div class="block-head">
			<h2>Mis donaciones</h2>
		</div>

		{#if donations.length === 0}
			<p class="state">Aún no has hecho aportes. Tu primera donación aparecerá aquí.</p>
		{:else}
			<ul class="mine">
				{#each donations as item (item.id)}
					{@const when = formatDateTimeParts(item.confirmedAt ?? item.createdAt)}
					<li>
						<div class="mine-main">
							<p class="mine-title">
								{formatCurrency(item.amountCents)}
								<span class="mine-dest">
									{item.campaignTitle ?? 'Fondo general'}
								</span>
							</p>
							{#if item.message}
								<p class="mine-message">“{item.message}”</p>
							{/if}
							<p class="mine-date">{when.day} · {when.time}</p>
						</div>
						<div class="mine-side">
							<span class="badge {statusTone(item.status)}">
								{STATUS_LABEL[item.status] ?? item.status}
							</span>
							{#if item.status === 'pendiente' && item.paymentId}
								<a class="link" href="/checkout/{item.paymentId}">Completar pago</a>
							{/if}
						</div>
					</li>
				{/each}
			</ul>
		{/if}
	</section>
{/if}

<style>
	.page-head {
		margin-bottom: 20px;
	}

	h1 {
		margin: 6px 0 0;
		color: var(--iz-ink);
		font-size: 30px;
		letter-spacing: -0.5px;
	}

	.eyebrow {
		display: flex;
		align-items: center;
		gap: 7px;
		margin: 0;
		color: var(--iz-green-600);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 1.2px;
		text-transform: uppercase;
	}

	.eyebrow-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: currentcolor;
	}

	.subtitle {
		max-width: 720px;
		margin: 8px 0 0;
		color: var(--iz-ink-soft);
		font-size: 13.5px;
		line-height: 1.6;
	}

	.banner {
		margin: 0 0 16px;
		padding: 12px 14px;
		border: 1px solid #f0d9d6;
		border-radius: var(--iz-radius-md);
		background: #fdf2f0;
		color: #8c3b34;
		font-size: 13px;
	}

	.state {
		margin: 26px 0;
		color: var(--iz-muted);
		font-size: 13px;
	}

	/* — Aporte — */
	.give {
		display: grid;
		grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
		gap: 28px;
		padding: 26px;
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-lg);
		background: var(--iz-green-800);
		color: #eef5ec;
	}

	.give-eyebrow {
		margin: 0;
		color: var(--iz-green-300);
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 1.2px;
		text-transform: uppercase;
	}

	.give-info h2 {
		margin: 8px 0 0;
		font-size: 26px;
		letter-spacing: -0.4px;
	}

	.give-total {
		margin: 16px 0 6px;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 34px;
		line-height: 1;
	}

	.give-total span {
		display: block;
		margin-top: 6px;
		color: var(--iz-green-300);
		font-family: inherit;
		font-size: 12.5px;
	}

	.give-hint {
		margin: 14px 0 0;
		color: #cfe3cc;
		font-size: 12.5px;
		line-height: 1.6;
	}

	.give-form {
		display: flex;
		flex-direction: column;
		gap: 14px;
		padding: 20px;
		border-radius: var(--iz-radius-md);
		background: var(--iz-surface);
		color: var(--iz-ink);
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.field label {
		color: var(--iz-ink-soft);
		font-size: 11.5px;
		font-weight: 650;
	}

	select,
	input[type='text'],
	input[type='number'] {
		width: 100%;
		padding: 9px 11px;
		border: 1px solid var(--iz-line-strong);
		border-radius: var(--iz-radius-sm);
		background: var(--iz-surface);
		color: var(--iz-ink);
		font-size: 13.5px;
	}

	select:focus-visible,
	input:focus-visible {
		outline: 2px solid var(--iz-green-600);
		outline-offset: 1px;
	}

	.amount-row {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.suffix {
		color: var(--iz-muted);
		font-size: 12px;
		font-weight: 650;
	}

	.presets {
		display: flex;
		flex-wrap: wrap;
		gap: 6px;
	}

	.presets button {
		padding: 6px 10px;
		border: 1px solid var(--iz-line-strong);
		border-radius: 999px;
		background: var(--iz-surface-muted);
		color: var(--iz-ink-soft);
		font-size: 12px;
		cursor: pointer;
	}

	.presets button.active {
		border-color: var(--iz-green-600);
		background: var(--iz-green-50);
		color: var(--iz-green-800);
		font-weight: 650;
	}

	.check {
		display: flex;
		align-items: center;
		gap: 8px;
		color: var(--iz-ink-soft);
		font-size: 12.5px;
	}

	.check input {
		width: 15px;
		height: 15px;
	}

	.form-error {
		margin: 0;
		color: #8c3b34;
		font-size: 12.5px;
	}

	.primary {
		padding: 11px 16px;
		border: 0;
		border-radius: var(--iz-radius-sm);
		background: var(--iz-green-700);
		color: #fff;
		font-size: 13.5px;
		font-weight: 650;
		cursor: pointer;
	}

	.primary:disabled {
		opacity: 0.65;
		cursor: progress;
	}

	.form-note {
		margin: 0;
		color: var(--iz-muted);
		font-size: 11.5px;
	}

	/* — Bloques — */
	.block {
		margin-top: 30px;
	}

	.block-head {
		display: flex;
		align-items: baseline;
		justify-content: space-between;
		gap: 12px;
		margin-bottom: 14px;
	}

	.block-head h2 {
		margin: 0;
		color: var(--iz-ink);
		font-size: 19px;
		letter-spacing: -0.3px;
	}

	.link {
		color: var(--iz-green-600);
		font-size: 12.5px;
		font-weight: 650;
		text-decoration: none;
	}

	.link:hover {
		text-decoration: underline;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 14px;
	}

	.ccard {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-md);
		background: var(--iz-surface);
		box-shadow: var(--iz-shadow-sm);
	}

	.cover {
		height: 118px;
		background:
			radial-gradient(circle at 70% 30%, rgb(255 255 255 / 22%), transparent 55%),
			linear-gradient(135deg, var(--iz-green-600), var(--iz-green-900));
	}

	.cover img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.ccard-body {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 10px;
		padding: 16px;
	}

	.ccard-body h3 {
		margin: 0;
		color: var(--iz-ink);
		font-size: 15.5px;
	}

	.ccard-summary {
		margin: 0;
		color: var(--iz-ink-soft);
		font-size: 12.5px;
		line-height: 1.55;
	}

	.progress {
		margin-top: auto;
	}

	.bar {
		height: 7px;
		overflow: hidden;
		border-radius: 999px;
		background: var(--iz-surface-muted);
	}

	.bar span {
		display: block;
		height: 100%;
		border-radius: 999px;
		background: var(--iz-green-600);
	}

	.progress-label {
		display: flex;
		justify-content: space-between;
		gap: 8px;
		margin: 8px 0 0;
		color: var(--iz-muted);
		font-size: 11.5px;
	}

	.progress-label strong {
		color: var(--iz-ink);
	}

	.secondary {
		padding: 9px 12px;
		border: 1px solid var(--iz-line-strong);
		border-radius: var(--iz-radius-sm);
		background: var(--iz-surface);
		color: var(--iz-green-800);
		font-size: 12.5px;
		font-weight: 650;
		cursor: pointer;
	}

	.secondary:hover {
		border-color: var(--iz-green-600);
		background: var(--iz-green-50);
	}

	/* — Muro — */
	.wall,
	.mine {
		margin: 0;
		padding: 0;
		list-style: none;
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-md);
		background: var(--iz-surface);
	}

	.wall li {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 6px 10px;
		padding: 13px 16px;
		border-bottom: 1px solid var(--iz-line);
		font-size: 12.5px;
	}

	.wall li:last-child,
	.mine li:last-child {
		border-bottom: 0;
	}

	.wall-amount {
		color: var(--iz-green-700);
		font-weight: 700;
	}

	.wall-who {
		color: var(--iz-ink-soft);
	}

	.wall-who a {
		color: var(--iz-green-600);
		text-decoration: none;
	}

	.wall-message {
		color: var(--iz-ink-soft);
		font-style: italic;
	}

	.wall-when {
		margin-left: auto;
		color: var(--iz-faint);
	}

	.mine li {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 14px;
		padding: 14px 16px;
		border-bottom: 1px solid var(--iz-line);
	}

	.mine-title {
		margin: 0;
		color: var(--iz-ink);
		font-size: 14px;
		font-weight: 650;
	}

	.mine-dest {
		color: var(--iz-ink-soft);
		font-size: 12.5px;
		font-weight: 500;
	}

	.mine-message {
		margin: 4px 0 0;
		color: var(--iz-muted);
		font-size: 12px;
		font-style: italic;
	}

	.mine-date {
		margin: 4px 0 0;
		color: var(--iz-faint);
		font-size: 11.5px;
	}

	.mine-side {
		display: flex;
		flex: 0 0 auto;
		flex-direction: column;
		align-items: flex-end;
		gap: 6px;
	}

	.badge {
		padding: 4px 9px;
		border-radius: 999px;
		font-size: 11px;
		font-weight: 650;
	}

	.badge.green {
		background: var(--iz-green-100);
		color: var(--iz-green-800);
	}

	.badge.amber {
		background: var(--iz-amber-100);
		color: #8a5a13;
	}

	.badge.red {
		background: #f7e4e1;
		color: #8c3b34;
	}

	.badge.purple {
		background: var(--iz-purple-100);
		color: #4b3f9e;
	}

	@media (max-width: 860px) {
		.give {
			grid-template-columns: minmax(0, 1fr);
			padding: 20px;
		}

		.mine li {
			flex-direction: column;
			align-items: flex-start;
		}

		.mine-side {
			align-items: flex-start;
		}
	}
</style>
