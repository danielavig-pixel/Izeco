<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		getMyEntrepreneurHistory,
		getMyEntrepreneurs,
		resubmitEntrepreneur,
		submitEntrepreneur,
		updateMyEntrepreneur,
		type EntrepreneurInput,
		type EntrepreneurStatusLogEntry,
		type MyEntrepreneur
	} from '#lib/services/api/api.service.js';
	import { loadSession, session } from '#lib/services/api/session.svelte.js';
	import { formatDateTimeParts, initials, toPlainText } from '#lib/utils/format.js';

	const STATUS_META: Record<string, { label: string; tone: string; hint: string }> = {
		pendiente: {
			label: 'En revisión',
			tone: 'pending',
			hint: 'Un administrador revisará tu ficha. Te avisaremos cuando esté lista.'
		},
		aprobado: {
			label: 'Publicado',
			tone: 'ok',
			hint: 'Tu emprendimiento ya aparece en el directorio público de Izeco.'
		},
		rechazado: {
			label: 'Rechazado',
			tone: 'bad',
			hint: 'Corrige lo que indica el motivo y vuelve a enviarlo a revisión.'
		},
		suspendido: {
			label: 'Suspendido',
			tone: 'warn',
			hint: 'Tu ficha está suspendida. Ajusta la información y reenvíala a revisión.'
		}
	};

	let checking = $state(true);
	let isLoading = $state(true);
	let loaded = $state(false);
	let errorMessage = $state('');
	let notice = $state('');

	let ficha = $state<MyEntrepreneur | null>(null);
	let history = $state<EntrepreneurStatusLogEntry[]>([]);

	let formOpen = $state(false);
	let isEditing = $state(false);
	let isSaving = $state(false);
	let resubmitting = $state(false);

	let name = $state('');
	let description = $state('');
	let category = $state('');
	let logoUrl = $state('');
	let contactPhone = $state('');
	let contactEmail = $state('');

	const status = $derived(
		ficha
			? (STATUS_META[ficha.status] ?? { label: ficha.status || 'Sin estado', tone: 'pending', hint: '' })
			: null
	);
	const canResubmit = $derived(ficha?.status === 'rechazado' || ficha?.status === 'suspendido');

	onMount(() => {
		void loadSession().then(() => {
			if (session.user?.role !== 'emprendedor') {
				void goto('/dashboard');
				return;
			}
			checking = false;
			void loadFicha();
		});
	});

	async function loadFicha() {
		isLoading = true;
		errorMessage = '';
		try {
			const result = await getMyEntrepreneurs({ limit: 1 });
			ficha = result.items[0] ?? null;
			if (ficha) {
				formOpen = false;
				void loadHistory(ficha.id);
			} else {
				openCreateForm();
			}
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'No se pudo cargar tu emprendimiento.';
			ficha = null;
		} finally {
			isLoading = false;
			loaded = true;
		}
	}

	async function loadHistory(id: string) {
		try {
			history = await getMyEntrepreneurHistory(id);
		} catch {
			history = [];
		}
	}

	function resetForm() {
		name = '';
		description = '';
		category = '';
		logoUrl = '';
		contactPhone = '';
		contactEmail = '';
	}

	function openCreateForm() {
		isEditing = false;
		resetForm();
		formOpen = true;
	}

	function openEditForm() {
		if (!ficha) return;
		isEditing = true;
		name = ficha.name;
		description = ficha.description;
		category = ficha.category;
		logoUrl = ficha.logoUrl;
		contactPhone = ficha.contactPhone;
		contactEmail = ficha.contactEmail;
		formOpen = true;
	}

	function cancelForm() {
		if (!ficha) return;
		formOpen = false;
	}

	function buildInput(): EntrepreneurInput {
		const input: EntrepreneurInput = {
			name: name.trim(),
			description: description.trim()
		};
		if (category.trim()) input.category = category.trim();
		if (logoUrl.trim()) input.logoUrl = logoUrl.trim();
		if (contactPhone.trim()) input.contactPhone = contactPhone.trim();
		if (contactEmail.trim()) input.contactEmail = contactEmail.trim();
		return input;
	}

	async function submitForm(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';
		notice = '';

		if (name.trim().length < 2) {
			errorMessage = 'El nombre debe tener al menos 2 caracteres.';
			return;
		}
		if (description.trim().length < 20) {
			errorMessage = 'La descripción debe tener al menos 20 caracteres.';
			return;
		}

		isSaving = true;
		try {
			const input = buildInput();
			if (isEditing && ficha) {
				ficha = await updateMyEntrepreneur(ficha.id, input);
				notice = 'Guardamos los cambios de tu emprendimiento.';
				void loadHistory(ficha.id);
			} else {
				ficha = await submitEntrepreneur(input);
				notice =
					'¡Listo! Enviamos tu emprendimiento a revisión. Un administrador lo aprobará pronto.';
				void loadHistory(ficha.id);
			}
			formOpen = false;
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'No se pudo guardar el emprendimiento.';
		} finally {
			isSaving = false;
		}
	}

	async function resubmit() {
		if (!ficha) return;
		errorMessage = '';
		notice = '';
		resubmitting = true;
		try {
			ficha = await resubmitEntrepreneur(ficha.id);
			notice = 'Tu emprendimiento volvió a quedar en revisión.';
			void loadHistory(ficha.id);
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'No se pudo reenviar el emprendimiento.';
		} finally {
			resubmitting = false;
		}
	}

	function statusLabel(value: string): string {
		return STATUS_META[value]?.label ?? value;
	}
</script>

<svelte:head>
	<title>Mi emprendimiento | Izeco</title>
	<meta
		name="description"
		content="Registra y gestiona tu emprendimiento en Izeco. Toda ficha pasa por revisión antes de publicarse."
	/>
</svelte:head>

{#if checking}
	<p class="state">Comprobando tu sesión…</p>
{:else}
	<section class="page-head">
		<div>
			<p class="eyebrow"><span class="eyebrow-dot" aria-hidden="true"></span>Portal del socio</p>
			<h1>Mi emprendimiento</h1>
			<p class="subtitle">
				Cada socio puede registrar <strong>un solo</strong> emprendimiento. Antes de aparecer en el
				directorio, un administrador revisa y aprueba tu ficha.
			</p>
		</div>
	</section>

	{#if errorMessage}
		<p class="banner error" role="alert">{errorMessage}</p>
	{/if}
	{#if notice}
		<p class="banner ok" role="status">{notice}</p>
	{/if}

	{#if isLoading}
		<p class="state">Cargando tu emprendimiento…</p>
	{:else if !loaded}
		<p class="state">No pudimos cargar la información.</p>
	{:else}
		{#if ficha && !formOpen}
			<article class="ficha">
				<header class="ficha-head">
					{#if ficha.logoUrl}
						<img class="ficha-logo" src={ficha.logoUrl} alt={ficha.name} />
					{:else}
						<span class="ficha-logo initials" aria-hidden="true">{initials(ficha.name)}</span>
					{/if}
					<div class="ficha-id">
						{#if ficha.category}
							<p class="ficha-cat">{ficha.category}</p>
						{/if}
						<h2>{ficha.name}</h2>
						{#if ficha.createdAt}
							<p class="ficha-since">Creado el {formatDateTimeParts(ficha.createdAt).day}</p>
						{/if}
					</div>
					{#if status}
						<span class="badge {status.tone}">{status.label}</span>
					{/if}
				</header>

				<p class="ficha-desc">{ficha.description}</p>

				{#if ficha.contactPhone || ficha.contactEmail}
					<dl class="ficha-contact">
						{#if ficha.contactPhone}
							<div><dt>Teléfono</dt><dd>{ficha.contactPhone}</dd></div>
						{/if}
						{#if ficha.contactEmail}
							<div><dt>Correo</dt><dd>{ficha.contactEmail}</dd></div>
						{/if}
					</dl>
				{/if}

				{#if status}
					<p class="status-hint {status.tone}">{status.hint}</p>
				{/if}

				{#if ficha.reviewNote && (ficha.status === 'rechazado' || ficha.status === 'suspendido')}
					<p class="review-note" role="note">
						<strong>Motivo del administrador:</strong>
						{toPlainText(ficha.reviewNote, 400)}
					</p>
				{/if}

				<div class="actions">
					<button class="btn ghost" type="button" onclick={openEditForm}>Editar ficha</button>
					{#if canResubmit}
						<button class="btn primary" type="button" onclick={resubmit} disabled={resubmitting}>
							{resubmitting ? 'Enviando…' : 'Reenviar a revisión'}
						</button>
					{/if}
					{#if ficha.status === 'aprobado' && ficha.slug}
						<a class="btn ghost" href={`/emprendimientos/${ficha.slug}`}>Ver ficha pública</a>
					{/if}
				</div>

				{#if history.length > 0}
					<section class="timeline" aria-label="Historial de revisión">
						<h3>Historial de revisión</h3>
						<ol>
							{#each history as entry (entry.id)}
								<li>
									<span class="dot" class:ok={entry.toStatus === 'aprobado'} class:bad={entry.toStatus === 'rechazado' || entry.toStatus === 'suspendido'}></span>
									<div>
										<p class="tl-title">
											{statusLabel(entry.toStatus)}
											<span class="tl-role">{entry.actorRole || 'izeco'}</span>
										</p>
										{#if entry.note}
											<p class="tl-note">{toPlainText(entry.note, 300)}</p>
										{/if}
										{#if entry.createdAt}
											<p class="tl-date">{formatDateTimeParts(entry.createdAt).day}</p>
										{/if}
									</div>
								</li>
							{/each}
						</ol>
					</section>
				{/if}
			</article>
		{:else}
			<section class="form-card">
				<h2>{isEditing ? 'Editar emprendimiento' : 'Registrar mi emprendimiento'}</h2>
				<p class="form-sub">
					Cuéntanos sobre tu negocio. Los campos con <span aria-hidden="true">*</span> son obligatorios.
				</p>

				<form onsubmit={submitForm}>
					<label class="field">
						<span>Nombre del negocio *</span>
						<input type="text" bind:value={name} maxlength="150" placeholder="Ej. Miel Dorada" required />
					</label>

					<label class="field">
						<span>Descripción *</span>
						<textarea
							bind:value={description}
							rows="4"
							maxlength="2000"
							placeholder="Qué haces, cómo lo haces y por qué es especial (mínimo 20 caracteres)."
							required
						></textarea>
						<small>{description.trim().length} / 20 caracteres mínimos</small>
					</label>

					<label class="field">
						<span>Categoría</span>
						<input type="text" bind:value={category} maxlength="100" placeholder="Ej. Alimentos, Textil, Artesanía" />
					</label>

					<label class="field">
						<span>URL del logo</span>
						<input type="url" bind:value={logoUrl} maxlength="255" placeholder="https://…" />
					</label>

					<div class="field-row">
						<label class="field">
							<span>Teléfono de contacto</span>
							<input type="tel" bind:value={contactPhone} maxlength="100" placeholder="+57 300 000 0000" />
						</label>
						<label class="field">
							<span>Correo de contacto</span>
							<input type="email" bind:value={contactEmail} maxlength="255" placeholder="hola@minegocio.com" />
						</label>
					</div>

					<div class="actions">
						{#if isEditing}
							<button class="btn ghost" type="button" onclick={cancelForm} disabled={isSaving}>
								Cancelar
							</button>
						{/if}
						<button class="btn primary" type="submit" disabled={isSaving}>
							{isSaving
								? 'Guardando…'
								: isEditing
									? 'Guardar cambios'
									: 'Enviar a revisión'}
						</button>
					</div>
				</form>
			</section>
		{/if}
	{/if}
{/if}

<style>
	.page-head {
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
		max-width: 620px;
		margin: 6px 0 0;
		color: var(--iz-muted);
		font-size: 13px;
		line-height: 1.6;
	}

	.banner {
		margin: 0 0 14px;
		padding: 11px 14px;
		border-radius: var(--iz-radius-sm);
		font-size: 12.5px;
	}

	.banner.error {
		border: 1px solid #eccfc8;
		background: #fbf0ec;
		color: var(--iz-danger);
	}

	.banner.ok {
		border: 1px solid var(--iz-green-300);
		background: var(--iz-green-50);
		color: var(--iz-green-800);
	}

	.state {
		margin: 0;
		padding: 46px 20px;
		color: var(--iz-muted);
		font-size: 13px;
		text-align: center;
	}

	.ficha,
	.form-card {
		max-width: 760px;
		padding: 24px;
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-md);
		background: var(--iz-surface);
		box-shadow: var(--iz-shadow-sm);
	}

	.ficha-head {
		display: flex;
		align-items: center;
		gap: 14px;
	}

	.ficha-logo {
		width: 58px;
		height: 58px;
		flex: 0 0 auto;
		border-radius: 14px;
		object-fit: cover;
	}

	.ficha-logo.initials {
		display: grid;
		place-items: center;
		background: #ddd1b6;
		color: #6a5b3e;
		font-size: 18px;
		font-weight: 700;
	}

	.ficha-id {
		min-width: 0;
		flex: 1 1 auto;
	}

	.ficha-cat {
		margin: 0 0 3px;
		color: var(--iz-muted);
		font-size: 10px;
		font-weight: 750;
		letter-spacing: 1.1px;
		text-transform: uppercase;
	}

	.ficha-id h2 {
		margin: 0;
		color: var(--iz-ink);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 22px;
		font-weight: 600;
		letter-spacing: -0.3px;
	}

	.ficha-since {
		margin: 4px 0 0;
		color: var(--iz-faint);
		font-size: 11.5px;
	}

	.badge {
		flex: 0 0 auto;
		padding: 6px 12px;
		border-radius: 999px;
		font-size: 11px;
		font-weight: 700;
		letter-spacing: 0.4px;
		text-transform: uppercase;
	}

	.badge.pending {
		background: #fdf3dc;
		color: #8a6416;
	}

	.badge.ok {
		background: var(--iz-green-100);
		color: var(--iz-green-800);
	}

	.badge.bad {
		background: #fbf0ec;
		color: var(--iz-danger);
	}

	.badge.warn {
		background: #fdeede;
		color: #97540f;
	}

	.ficha-desc {
		margin: 18px 0 0;
		color: var(--iz-ink-soft);
		font-size: 13.5px;
		line-height: 1.65;
		white-space: pre-line;
	}

	.ficha-contact {
		display: flex;
		flex-wrap: wrap;
		gap: 18px;
		margin: 16px 0 0;
	}

	.ficha-contact dt {
		margin: 0;
		color: var(--iz-faint);
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.8px;
		text-transform: uppercase;
	}

	.ficha-contact dd {
		margin: 2px 0 0;
		color: var(--iz-ink);
		font-size: 13px;
	}

	.status-hint {
		margin: 16px 0 0;
		padding: 11px 14px;
		border-radius: var(--iz-radius-sm);
		font-size: 12.5px;
	}

	.status-hint.pending {
		background: #fdf7e8;
		color: #8a6416;
	}

	.status-hint.ok {
		background: var(--iz-green-50);
		color: var(--iz-green-800);
	}

	.status-hint.bad {
		background: #fbf0ec;
		color: var(--iz-danger);
	}

	.status-hint.warn {
		background: #fdf3e6;
		color: #97540f;
	}

	.review-note {
		margin: 12px 0 0;
		padding: 11px 14px;
		border: 1px dashed #e0b7ac;
		border-radius: var(--iz-radius-sm);
		background: #fdf6f3;
		color: var(--iz-ink-soft);
		font-size: 12.5px;
		line-height: 1.55;
	}

	.actions {
		display: flex;
		flex-wrap: wrap;
		gap: 10px;
		margin-top: 20px;
	}

	.btn {
		padding: 10px 18px;
		border-radius: var(--iz-radius-sm);
		font: inherit;
		font-size: 12.5px;
		font-weight: 650;
		text-decoration: none;
		cursor: pointer;
	}

	.btn.primary {
		border: 1px solid var(--iz-green-800);
		background: var(--iz-green-800);
		color: #f4f7f2;
	}

	.btn.primary:hover:not(:disabled) {
		background: var(--iz-green-900);
	}

	.btn.ghost {
		border: 1px solid var(--iz-line);
		background: var(--iz-surface);
		color: var(--iz-ink-soft);
	}

	.btn.ghost:hover:not(:disabled) {
		border-color: var(--iz-green-300);
		color: var(--iz-green-800);
	}

	.btn:disabled {
		opacity: 0.6;
		cursor: wait;
	}

	.timeline {
		margin-top: 22px;
		padding-top: 18px;
		border-top: 1px solid var(--iz-line);
	}

	.timeline h3 {
		margin: 0 0 14px;
		color: var(--iz-ink);
		font-size: 12px;
		font-weight: 750;
		letter-spacing: 1px;
		text-transform: uppercase;
	}

	.timeline ol {
		display: flex;
		flex-direction: column;
		gap: 14px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.timeline li {
		display: flex;
		gap: 12px;
	}

	.timeline .dot {
		width: 10px;
		height: 10px;
		flex: 0 0 auto;
		margin-top: 4px;
		border-radius: 50%;
		background: var(--iz-faint);
	}

	.timeline .dot.ok {
		background: var(--iz-green-600);
	}

	.timeline .dot.bad {
		background: var(--iz-danger);
	}

	.tl-title {
		margin: 0;
		color: var(--iz-ink);
		font-size: 13px;
		font-weight: 650;
	}

	.tl-role {
		margin-left: 6px;
		color: var(--iz-faint);
		font-size: 11px;
		font-weight: 500;
		text-transform: capitalize;
	}

	.tl-note {
		margin: 3px 0 0;
		color: var(--iz-muted);
		font-size: 12.5px;
		line-height: 1.5;
	}

	.tl-date {
		margin: 3px 0 0;
		color: var(--iz-faint);
		font-size: 11px;
	}

	.form-card h2 {
		margin: 0;
		color: var(--iz-ink);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 22px;
		font-weight: 600;
	}

	.form-sub {
		margin: 6px 0 18px;
		color: var(--iz-muted);
		font-size: 12.5px;
	}

	.form-card form {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.field {
		display: flex;
		flex-direction: column;
		gap: 6px;
	}

	.field > span {
		color: var(--iz-ink-soft);
		font-size: 12px;
		font-weight: 650;
	}

	.field small {
		color: var(--iz-faint);
		font-size: 11px;
	}

	.field input,
	.field textarea {
		width: 100%;
		padding: 11px 13px;
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-sm);
		background: var(--iz-surface);
		color: var(--iz-ink);
		font: inherit;
		font-size: 13px;
	}

	.field textarea {
		resize: vertical;
	}

	.field input:focus,
	.field textarea:focus {
		border-color: var(--iz-green-600);
		outline: 0;
		box-shadow: 0 0 0 3px rgb(63 122 82 / 12%);
	}

	.field-row {
		display: grid;
		grid-template-columns: repeat(2, minmax(0, 1fr));
		gap: 16px;
	}

	@media (max-width: 640px) {
		.field-row {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
