<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getAccessToken } from '#lib/services/auth/auth.service.js';
	import { updateMyRole } from '#lib/services/api/api.service.js';
	import { loadSession, session } from '#lib/services/api/session.svelte.js';

	type RoleChoice = 'comprador' | 'emprendedor' | 'voluntario';

	const choices: {
		role: RoleChoice;
		title: string;
		tagline: string;
		bullets: string[];
		tone: 'comprador' | 'emprendedor' | 'voluntario';
	}[] = [
		{
			role: 'comprador',
			title: 'Quiero comprar',
			tagline: 'Encuentra productos honestos de socios locales.',
			bullets: [
				'Explora el catálogo por categorías',
				'Sigue tus compras y pagos',
				'Cada compra apoya a un socio'
			],
			tone: 'comprador'
		},
		{
			role: 'emprendedor',
			title: 'Quiero vender',
			tagline: 'Publica tu emprendimiento y sus productos.',
			bullets: [
				'Ficha propia en el directorio de socios',
				'Publica productos con foto y precio',
				'Recibe avisos de tus ventas'
			],
			tone: 'emprendedor'
		},
		{
			role: 'voluntario',
			title: 'Quiero ser voluntario',
			tagline: 'Súmate a las jornadas de la comunidad.',
			bullets: [
				'Inscríbete a las jornadas abiertas',
				'Suma tu impacto jornada a jornada',
				'Conoce a otros voluntarios'
			],
			tone: 'voluntario'
		}
	];

	let isReady = $state(false);
	let pendingRole = $state<RoleChoice | null>(null);
	let errorMessage = $state('');

	const currentRole = $derived(session.user?.role ?? '');
	const firstName = $derived(session.user?.name?.split(' ')[0] ?? '');

	onMount(() => {
		if (!getAccessToken()) {
			void goto('/iniciar-sesion');
			return;
		}

		isReady = true;
		void loadSession();
	});

	async function choose(role: RoleChoice) {
		if (pendingRole) return;
		errorMessage = '';
		pendingRole = role;
		try {
			await updateMyRole(role);
			await loadSession(true);
			await goto('/dashboard');
		} catch (error) {
			errorMessage =
				error instanceof Error
					? error.message
					: 'No se pudo guardar tu elección. Inténtalo de nuevo.';
		} finally {
			pendingRole = null;
		}
	}
</script>

<svelte:head>
	<title>Elige cómo usar Izeco</title>
	<meta
		name="description"
		content="Elige si quieres comprar, vender o ser voluntario en Izeco. Podrás cambiarlo cuando quieras."
	/>
</svelte:head>

<main class="role-page">
	<section class="hero" aria-labelledby="role-title">
		<div class="emblem" aria-hidden="true">
			<svg viewBox="0 0 48 48" fill="none">
				<path d="M24 38V19" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
				<path
					d="M24 30c-7 0-12-3.6-14-9.4C17 20 22.5 23 24 30Z"
					fill="#8fc668"
					stroke="#477e43"
					stroke-width="1.4"
					stroke-linejoin="round"
				/>
				<path
					d="M24 24c.8-6.4 5.8-10.6 13-11.3-.7 6.4-5 10.7-13 11.3Z"
					fill="#a8d47f"
					stroke="#477e43"
					stroke-width="1.4"
					stroke-linejoin="round"
				/>
				<path d="M19 39h10" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" />
			</svg>
		</div>

		<p class="eyebrow">Tu cuenta está lista</p>
		<h1 id="role-title">
			{firstName ? `Gracias, ${firstName}.` : 'Gracias por sumarte.'}
			<br />¿Cómo quieres usar Izeco?
		</h1>
		<p class="subtitle">
			Elige un camino para empezar. Puedes cambiarlo cuando quieras desde tu perfil.
		</p>
	</section>

	{#if errorMessage}
		<p class="banner" role="alert">{errorMessage}</p>
	{/if}

	{#if isReady}
		<section class="choices" aria-label="Elige tu rol">
			{#each choices as choice (choice.role)}
				<article class="choice" class:is-current={currentRole === choice.role} data-tone={choice.tone}>
					<div class="choice-icon" aria-hidden="true">
						{#if choice.role === 'comprador'}
							<svg viewBox="0 0 24 24">
								<circle cx="11" cy="11" r="6.2" />
								<path d="m15.6 15.6 4.4 4.4" />
							</svg>
						{:else if choice.role === 'emprendedor'}
							<svg viewBox="0 0 24 24">
								<path d="M4 9.5 12 4l8 5.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V9.5Z" />
								<path d="M9.5 20v-5.5h5V20" />
							</svg>
						{:else}
							<svg viewBox="0 0 24 24">
								<path d="M12 20s-7-4.3-7-9.2A4.1 4.1 0 0 1 12 8.2a4.1 4.1 0 0 1 7 2.6c0 4.9-7 9.2-7 9.2Z" />
							</svg>
						{/if}
					</div>

					{#if currentRole === choice.role}
						<span class="badge">Tu rol actual</span>
					{/if}

					<h2>{choice.title}</h2>
					<p class="tagline">{choice.tagline}</p>

					<ul>
						{#each choice.bullets as bullet (bullet)}
							<li>{bullet}</li>
						{/each}
					</ul>

					<button
						type="button"
						class="choose-button"
						disabled={pendingRole !== null || currentRole === choice.role}
						onclick={() => choose(choice.role)}
					>
						{pendingRole === choice.role
							? 'Guardando…'
							: currentRole === choice.role
								? 'Rol actual'
								: 'Elegir'}
					</button>
				</article>
			{/each}
		</section>

		<p class="footnote">
			<button type="button" class="skip" onclick={() => goto('/dashboard')}>
				Prefiero decidirlo más tarde
			</button>
		</p>
	{/if}
</main>

<style>
	:global(html) {
		min-width: 320px;
		min-height: 100%;
		background: transparent;
	}

	:global(body) {
		min-width: 320px;
		min-height: 100vh;
		margin: 0;
		color: #263d37;
		font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
		-webkit-font-smoothing: antialiased;
	}

	:global(*) {
		box-sizing: border-box;
	}

	.role-page {
		display: flex;
		min-height: 100vh;
		min-height: 100svh;
		flex-direction: column;
		align-items: center;
		gap: 22px;
		padding: 34px 20px 46px;
	}

	.hero {
		width: min(100%, 1020px);
		padding: 34px 32px 32px;
		border-radius: 20px;
		background: linear-gradient(104deg, #1b4733 0%, #276149 58%, #3d7f57 100%);
		box-shadow: 0 18px 38px rgb(27 71 51 / 22%);
		color: #eaf3e6;
		text-align: center;
	}

	.emblem {
		display: grid;
		width: 68px;
		height: 68px;
		margin: 0 auto 14px;
		place-items: center;
		border-radius: 50%;
		background: #edf3e3;
		box-shadow: 0 8px 18px rgb(12 30 20 / 22%);
		color: #1b4733;
	}

	.emblem svg {
		width: 40px;
		height: 40px;
	}

	.eyebrow {
		margin: 0 0 10px;
		color: #a9d089;
		font-size: 10.5px;
		font-weight: 750;
		letter-spacing: 1.6px;
		text-transform: uppercase;
	}

	h1 {
		margin: 0;
		color: #f6faf3;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 34px;
		font-weight: 600;
		letter-spacing: -0.7px;
		line-height: 1.18;
	}

	.subtitle {
		max-width: 560px;
		margin: 12px auto 0;
		color: #c8dcc4;
		font-size: 13.5px;
		line-height: 1.55;
	}

	.banner {
		width: min(100%, 1020px);
		margin: 0;
		padding: 12px 16px;
		border: 1px solid #eccfc8;
		border-radius: 12px;
		background: #fbf0ec;
		color: #9e352f;
		font-size: 12.5px;
		text-align: center;
	}

	.choices {
		display: grid;
		width: min(100%, 1020px);
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 18px;
	}

	.choice {
		display: flex;
		flex-direction: column;
		padding: 24px 22px 22px;
		border: 1px solid #dcd8cb;
		border-radius: 18px;
		background: #fff;
		box-shadow: 0 6px 20px rgb(32 51 38 / 7%);
		transition:
			transform 160ms ease,
			box-shadow 160ms ease,
			border-color 160ms ease;
	}

	.choice[data-tone='comprador'] {
		border-color: #cfe0c6;
		background: #f6faf3;
	}

	.choice[data-tone='emprendedor'] {
		border-color: #e3d2a8;
		background: #fdf8ec;
	}

	.choice[data-tone='voluntario'] {
		border-color: #c9dbdd;
		background: #f4f9f9;
	}

	.choice:hover {
		transform: translateY(-3px);
		box-shadow: 0 16px 32px rgb(32 51 38 / 13%);
	}

	.choice.is-current {
		border-color: #3d7f57;
		box-shadow: 0 0 0 3px rgb(61 127 87 / 16%);
	}

	.choice-icon {
		display: grid;
		width: 46px;
		height: 46px;
		place-items: center;
		margin-bottom: 14px;
		border-radius: 13px;
		background: #e7f0e0;
		color: #276149;
	}

	.choice[data-tone='emprendedor'] .choice-icon {
		background: #f6ecd2;
		color: #8a6a25;
	}

	.choice[data-tone='voluntario'] .choice-icon {
		background: #e2eff0;
		color: #2f6b70;
	}

	.choice-icon svg {
		width: 24px;
		height: 24px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.7;
	}

	.badge {
		align-self: flex-start;
		margin-bottom: 9px;
		padding: 4px 10px;
		border-radius: 999px;
		background: #2c6a49;
		color: #f2f8ee;
		font-size: 10px;
		font-weight: 700;
		letter-spacing: 0.8px;
		text-transform: uppercase;
	}

	.choice h2 {
		margin: 0;
		color: #1f3a30;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 22px;
		font-weight: 600;
		letter-spacing: -0.3px;
	}

	.tagline {
		margin: 7px 0 0;
		color: #6d7f76;
		font-size: 12.5px;
		line-height: 1.5;
	}

	ul {
		margin: 15px 0 20px;
		padding: 0;
		list-style: none;
	}

	li {
		position: relative;
		margin-bottom: 8px;
		padding-left: 16px;
		color: #3c4f47;
		font-size: 12.5px;
		line-height: 1.45;
	}

	li::before {
		position: absolute;
		top: 6px;
		left: 0;
		width: 6px;
		height: 6px;
		border-radius: 50%;
		background: #6d9c60;
		content: '';
	}

	.choose-button {
		width: 100%;
		margin-top: auto;
		padding: 12px;
		border: 0;
		border-radius: 11px;
		background: #326847;
		color: #f4f7f2;
		font: inherit;
		font-size: 13px;
		font-weight: 650;
		cursor: pointer;
		transition:
			background-color 150ms ease,
			transform 150ms ease;
	}

	.choose-button:hover:not(:disabled) {
		transform: translateY(-1px);
		background: #28583b;
	}

	.choose-button:disabled {
		background: #dfe4d9;
		color: #7d8a80;
		cursor: default;
	}

	.choose-button:focus-visible,
	.skip:focus-visible {
		outline: 2px solid #315e43;
		outline-offset: 2px;
	}

	.footnote {
		margin: 0;
		text-align: center;
	}

	.skip {
		padding: 6px 10px;
		border: 0;
		background: transparent;
		color: #6d7f76;
		font: inherit;
		font-size: 12.5px;
		font-weight: 600;
		cursor: pointer;
		text-decoration: underline;
		text-underline-offset: 3px;
	}

	.skip:hover {
		color: #326847;
	}

	@media (max-width: 880px) {
		.choices {
			grid-template-columns: minmax(0, 1fr);
			max-width: 460px;
		}

		h1 {
			font-size: 27px;
		}

		.hero {
			padding: 28px 22px 26px;
		}
	}
</style>
