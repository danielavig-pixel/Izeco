<script lang="ts">
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { getAccessToken } from '#lib/services/auth/auth.service.js';
	import {
		ApiServiceError,
		cancelVolunteerSignup,
		getActivityCollections,
		getMyVolunteerSignups,
		getPublicVolunteerActivity,
		materialLabel,
		signupToVolunteer,
		type ActivityCollection,
		type VolunteerActivity
	} from '#lib/services/api/api.service.js';
	import { formatDateTimeParts, toPlainText } from '#lib/utils/format.js';

	let activity = $state<VolunteerActivity | null>(null);
	let collections = $state<ActivityCollection[]>([]);
	let mySignupStatus = $state('');
	let isLoading = $state(true);
	let isSubmitting = $state(false);
	let errorMessage = $state('');
	let actionMessage = $state('');
	let actionError = $state('');
	let coverFailed = $state(false);
	let hasSession = $state(false);

	const id = $derived(page.params.id ?? '');
	const start = $derived(formatDateTimeParts(activity?.startsAt ?? null));
	const end = $derived(formatDateTimeParts(activity?.endsAt ?? null));

	$effect(() => {
		if (id) void load(id);
	});

	async function load(currentId: string) {
		isLoading = true;
		errorMessage = '';
		actionMessage = '';
		actionError = '';
		activity = null;
		collections = [];
		mySignupStatus = '';
		coverFailed = false;
		hasSession = Boolean(getAccessToken());

		try {
			const [found, materiales] = await Promise.all([
				getPublicVolunteerActivity(currentId),
				getActivityCollections(currentId)
			]);
			activity = found;
			collections = materiales;

			if (hasSession) {
				const mine = await getMyVolunteerSignups({ limit: 50 });
				const signup = mine.items.find(
					(item) => item.activityId === currentId || item.activity?.id === currentId
				);
				mySignupStatus = signup?.status ?? '';
			}
		} catch (error) {
			errorMessage =
				error instanceof ApiServiceError && error.status === 404
					? 'No encontramos esta jornada.'
					: error instanceof Error
						? error.message
						: 'No se pudo cargar la jornada.';
		} finally {
			isLoading = false;
		}
	}

	async function refreshCounters() {
		if (!activity) return;
		try {
			activity = await getPublicVolunteerActivity(activity.id);
		} catch {
			// Los cupos son informativos: si falla, se conserva lo ya mostrado.
		}
	}

	async function handleSignup() {
		if (!activity || isSubmitting) return;
		actionError = '';
		actionMessage = '';
		isSubmitting = true;
		try {
			await signupToVolunteer(activity.id);
			mySignupStatus = 'pendiente';
			actionMessage = 'Listo, tu inscripción quedó pendiente de confirmación.';
			await refreshCounters();
		} catch (error) {
			actionError =
				error instanceof Error ? error.message : 'No se pudo completar tu inscripción.';
		} finally {
			isSubmitting = false;
		}
	}

	async function handleCancel() {
		if (!activity || isSubmitting) return;
		actionError = '';
		actionMessage = '';
		isSubmitting = true;
		try {
			await cancelVolunteerSignup(activity.id);
			mySignupStatus = 'cancelado';
			actionMessage = 'Cancelamos tu inscripción y liberamos el cupo.';
			await refreshCounters();
		} catch (error) {
			actionError =
				error instanceof Error ? error.message : 'No se pudo cancelar tu inscripción.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>{activity ? `${activity.title} | Izeco` : 'Jornada | Izeco'}</title>
	<meta
		name="description"
		content={activity
			? `${activity.title}: jornada de voluntariado en ${activity.location || 'la comunidad'}.`
			: 'Jornada de voluntariado de Izeco.'}
	/>
</svelte:head>

<a class="back" href="/jornadas">
	<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11 5 6 10l5 5" /></svg>
	Todas las jornadas
</a>

{#if isLoading}
	<p class="state">Cargando jornada…</p>
{:else if errorMessage}
	<div class="error-card">
		<p role="alert">{errorMessage}</p>
		<a href="/jornadas">Volver a las jornadas</a>
	</div>
{:else if activity}
	<header class="hero">
		<p class="eyebrow">
			Voluntariado{start.day ? ` · ${start.day}` : ''}{start.time ? `, ${start.time}` : ''}
		</p>
		<h1>{activity.title}</h1>
		{#if activity.location}
			<p class="place">
				<svg viewBox="0 0 24 24" aria-hidden="true"
					><path d="M12 21s6-5.2 6-10a6 6 0 1 0-12 0c0 4.8 6 10 6 10Z" /><circle cx="12" cy="11" r="2.2" /></svg
				>
				{activity.location}
			</p>
		{/if}
		<div class="tags">
			<span class="tag">
				{#if activity.remaining === null}
					Cupos abiertos
				{:else if activity.remaining === 0}
					Sin cupos
				{:else}
					Quedan {activity.remaining} de {activity.slots} cupos
				{/if}
			</span>
			{#if start.time && end.time}
				<span class="tag">{start.time} — {end.time}</span>
			{/if}
		</div>
	</header>

	{#if activity.imageUrl && !coverFailed}
		<figure class="cover">
			<img src={activity.imageUrl} alt={activity.title} onerror={() => (coverFailed = true)} />
		</figure>
	{/if}

	<div class="columns">
		<section class="panel">
			<h2>Qué se hace</h2>
			<p class="description">{toPlainText(activity.description, 4000)}</p>
		</section>

		<aside class="side">
			<section class="panel signup">
				<h2>Tu cupo</h2>

				{#if !hasSession}
					<p class="hint">Entra a tu cuenta para reservar un cupo en esta jornada.</p>
					<button class="primary" type="button" onclick={() => goto('/iniciar-sesion')}>
						Iniciar sesión
					</button>
				{:else if mySignupStatus === 'confirmado'}
					<p class="hint ok">
						Ya estás confirmado en esta jornada. Si no puedes ir, escribe al organizador para
						liberar tu cupo.
					</p>
				{:else if activity.status !== 'abierta'}
					<p class="hint">
						{activity.status === 'finalizada'
							? 'Esta jornada ya se realizó.'
							: 'Las inscripciones de esta jornada están cerradas.'}
					</p>
				{:else if mySignupStatus === 'pendiente'}
					<p class="hint ok">Tu inscripción está pendiente de confirmación.</p>
					<button
						class="secondary"
						type="button"
						onclick={handleCancel}
						disabled={isSubmitting}
					>
						{isSubmitting ? 'Cancelando…' : 'Cancelar inscripción'}
					</button>
				{:else if activity.remaining === 0}
					<p class="hint">No quedan cupos disponibles en esta jornada.</p>
					<button class="primary" type="button" disabled>Sin cupos</button>
				{:else}
					{#if activity.remaining !== null}
						<p class="hint">
							Quedan {activity.remaining} cupos. La inscripción queda pendiente hasta que el
							organizador la confirme.
						</p>
					{:else}
						<p class="hint">Inscripción abierta. No hay límite de cupos.</p>
					{/if}
					<button class="primary" type="button" onclick={handleSignup} disabled={isSubmitting}>
						{isSubmitting ? 'Inscribiendo…' : 'Inscribirme'}
					</button>
				{/if}

				{#if actionMessage}
					<p class="feedback ok" role="status">{actionMessage}</p>
				{/if}
				{#if actionError}
					<p class="feedback error" role="alert">{actionError}</p>
				{/if}
			</section>

			<section class="panel">
				<h2>Material recolectado</h2>
				<p class="panel-sub">Lo que la jornada recuperó y en qué se transformó.</p>

				{#if collections.length === 0}
					<p class="hint">Todavía no hay material registrado en esta jornada.</p>
				{:else}
					<ul class="materials">
						{#each collections as item (item.id)}
							<li>
								<span class="material-name">{materialLabel(item.material)}</span>
								<span class="material-qty">{item.quantityLabel}</span>
								{#if item.notes}<span class="material-note">{item.notes}</span>{/if}
								{#if item.rawMaterialProductName}
									<span class="material-link">
										<svg viewBox="0 0 20 20" aria-hidden="true"
											><path d="M11 5 6 10l5 5" /></svg
										>
										Se transformó en {item.rawMaterialProductName}
									</span>
								{/if}
							</li>
						{/each}
					</ul>
				{/if}
			</section>
		</aside>
	</div>
{/if}

<style>
	.back {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 16px;
		color: var(--iz-muted);
		font-size: 12.5px;
		font-weight: 600;
		text-decoration: none;
	}

	.back:hover {
		color: var(--iz-green-700);
	}

	.back svg {
		width: 15px;
		height: 15px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.8;
	}

	.state {
		margin: 0;
		padding: 46px 20px;
		color: var(--iz-muted);
		font-size: 13px;
		text-align: center;
	}

	.error-card {
		padding: 34px 24px;
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-md);
		background: var(--iz-surface);
		text-align: center;
	}

	.error-card p {
		margin: 0 0 14px;
		color: var(--iz-muted);
		font-size: 13px;
	}

	.error-card a {
		color: var(--iz-green-700);
		font-size: 12.5px;
		font-weight: 650;
	}

	.hero {
		margin-bottom: 18px;
		padding: 30px 28px;
		border-radius: var(--iz-radius-lg);
		background: linear-gradient(104deg, #1b4733 0%, #276149 58%, #3d7f57 100%);
		box-shadow: 0 18px 38px rgb(27 71 51 / 20%);
	}

	.eyebrow {
		margin: 0 0 10px;
		color: #a9d089;
		font-size: 10px;
		font-weight: 750;
		letter-spacing: 1.4px;
		text-transform: uppercase;
	}

	.hero h1 {
		margin: 0;
		color: #f6faf3;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 33px;
		font-weight: 600;
		letter-spacing: -0.6px;
		line-height: 1.16;
	}

	.place {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		margin: 10px 0 0;
		color: #c8dcc4;
		font-size: 13px;
	}

	.place svg {
		width: 16px;
		height: 16px;
		fill: none;
		stroke: #a9d089;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.6;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 16px;
	}

	.tag {
		padding: 5px 12px;
		border-radius: 999px;
		background: rgb(255 255 255 / 16%);
		color: #e4f0e2;
		font-size: 11px;
		font-weight: 650;
	}

	.cover {
		margin: 0 0 18px;
		overflow: hidden;
		border-radius: var(--iz-radius-md);
		box-shadow: var(--iz-shadow-md);
	}

	.cover img {
		display: block;
		width: 100%;
		height: 280px;
		object-fit: cover;
	}

	.columns {
		display: grid;
		grid-template-columns: minmax(0, 1.6fr) minmax(300px, 1fr);
		gap: 18px;
	}

	.side {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.panel {
		padding: 22px;
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-md);
		background: var(--iz-surface);
		box-shadow: var(--iz-shadow-sm);
	}

	.panel h2 {
		margin: 0 0 10px;
		color: var(--iz-ink);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 19px;
		font-weight: 600;
	}

	.panel-sub {
		margin: -4px 0 12px;
		color: var(--iz-muted);
		font-size: 12px;
	}

	.description {
		margin: 0;
		color: var(--iz-ink-soft);
		font-size: 13px;
		line-height: 1.7;
	}

	.hint {
		margin: 0 0 14px;
		color: var(--iz-muted);
		font-size: 12.5px;
		line-height: 1.55;
	}

	.hint.ok {
		color: var(--iz-green-700);
		font-weight: 600;
	}

	.primary,
	.secondary {
		width: 100%;
		padding: 12px;
		border: 0;
		border-radius: 11px;
		font: inherit;
		font-size: 13px;
		font-weight: 650;
		cursor: pointer;
	}

	.primary {
		background: var(--iz-green-800);
		color: #f4f7f2;
	}

	.primary:hover:not(:disabled) {
		background: var(--iz-green-900);
	}

	.primary:disabled {
		background: #dfe4d9;
		color: #7d8a80;
		cursor: default;
	}

	.secondary {
		border: 1px solid var(--iz-line-strong);
		background: var(--iz-surface);
		color: var(--iz-danger);
	}

	.secondary:hover:not(:disabled) {
		background: #fbf0ec;
	}

	.feedback {
		margin: 12px 0 0;
		font-size: 12px;
		line-height: 1.5;
	}

	.feedback.ok {
		color: var(--iz-green-700);
	}

	.feedback.error {
		color: var(--iz-danger);
	}

	.materials {
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.materials li {
		display: flex;
		flex-wrap: wrap;
		align-items: baseline;
		gap: 8px;
		padding: 10px 0;
		border-top: 1px solid var(--iz-line);
	}

	.materials li:first-child {
		border-top: 0;
		padding-top: 0;
	}

	.material-name {
		color: var(--iz-ink);
		font-size: 12.5px;
		font-weight: 650;
	}

	.material-qty {
		padding: 3px 9px;
		border-radius: 999px;
		background: var(--iz-green-100);
		color: var(--iz-green-800);
		font-size: 11px;
		font-weight: 700;
	}

	.material-note {
		width: 100%;
		color: var(--iz-muted);
		font-size: 11.5px;
	}

	.material-link {
		display: inline-flex;
		align-items: center;
		gap: 5px;
		color: var(--iz-green-700);
		font-size: 11.5px;
		font-weight: 650;
	}

	.material-link svg {
		width: 12px;
		height: 12px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.8;
	}

	@media (max-width: 980px) {
		.columns {
			grid-template-columns: minmax(0, 1fr);
		}

		.cover img {
			height: 200px;
		}

		.hero h1 {
			font-size: 26px;
		}
	}
</style>
