<script lang="ts">
	import { goto } from '$app/navigation';
	import { AuthServiceError, login } from '../lib/services/auth/auth.service.js';

	let email = $state('');
	let password = $state('');
	let showPassword = $state(false);
	let isSubmitting = $state(false);
	let errorMessage = $state('');

	async function handleLogin(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';
		isSubmitting = true;

		try {
			await login(email, password);
			await goto('/dashboard');
		} catch (error) {
			errorMessage =
				error instanceof AuthServiceError
					? error.message
					: 'Ocurrió un error inesperado al iniciar sesión.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Iniciar sesión</title>
	<meta
		name="description"
		content="Inicia sesión para acceder a tu cuenta."
	/>
</svelte:head>

<main class="login-page">
	<section class="login-card" aria-labelledby="login-title">
		<!-- LOGO: Este SVG está dibujado inline. Puedes reemplazarlo por una imagen guardada en src/lib/assets/. -->
		<div class="brand-mark" aria-hidden="true">
			<svg viewBox="0 0 92 68" fill="none">
				<path d="M46 54V29" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
				<path
					d="M46 39c-10 0-17-5-20-13 10-1 18 3 20 13Z"
					fill="#70ad57"
					stroke="#477e43"
					stroke-width="1.5"
					stroke-linejoin="round"
				/>
				<path
					d="M46 32c1-9 8-15 18-16-1 9-7 15-18 16Z"
					fill="#8fc668"
					stroke="#477e43"
					stroke-width="1.5"
					stroke-linejoin="round"
				/>
				<path
					d="M45 47c-8 0-13-4-16-10 8 0 14 3 16 10Zm3-6c2-8 8-12 16-12-2 7-7 12-16 12Z"
					fill="#477e43"
				/>
				<path d="M38 55h16" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
				<circle cx="24" cy="24" r="3" fill="#49382f" />
				<circle cx="68" cy="24" r="3" fill="#49382f" />
				<path d="m20 19 2-4m7 4 2-4M63 19l-2-4m7 4-2-4" stroke="#49382f" stroke-width="1.5" stroke-linecap="round" />
			</svg>
		</div>

		<header class="card-heading">
			<h1 id="login-title">Iniciar sesión</h1>
			<p>Qué bueno tenerte de vuelta.<br />Accede a tu cuenta para continuar.</p>
		</header>

		<form onsubmit={handleLogin}>
			<label for="email">Correo electrónico</label>
			<div class="input-wrap">
				<svg class="field-icon" viewBox="0 0 20 20" aria-hidden="true">
					<path
						d="M3.2 5.5h13.6c.7 0 1.2.5 1.2 1.2v7.6c0 .7-.5 1.2-1.2 1.2H3.2c-.7 0-1.2-.5-1.2-1.2V6.7c0-.7.5-1.2 1.2-1.2Z"
						fill="currentColor"
					/>
					<path d="m3 6.5 7 5 7-5" stroke="#edf1e5" stroke-width="1.3" stroke-linecap="round" />
				</svg>
				<input
					id="email"
					name="email"
					type="email"
					placeholder="Ingresa tu correo electrónico"
					autocomplete="email"
					bind:value={email}
					required
				/>
			</div>

			<label for="password">Contraseña</label>
			<div class="input-wrap">
				<svg class="field-icon lock-icon" viewBox="0 0 20 20" aria-hidden="true">
					<path
						d="M6.1 8V5.8a3.9 3.9 0 0 1 7.8 0V8h.5c.8 0 1.4.6 1.4 1.4v6.1c0 .8-.6 1.4-1.4 1.4H5.6c-.8 0-1.4-.6-1.4-1.4V9.4c0-.8.6-1.4 1.4-1.4h.5Zm1.8 0h4.2V5.8a2.1 2.1 0 0 0-4.2 0V8Z"
						fill="currentColor"
					/>
					<circle cx="10" cy="12" r="1.1" fill="#edf1e5" />
				</svg>
				<input
					id="password"
					name="password"
					type={showPassword ? 'text' : 'password'}
					placeholder="Ingresa tu contraseña"
					autocomplete="current-password"
					bind:value={password}
					required
				/>
				<button
					class="visibility-toggle"
					type="button"
					aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
					onclick={() => (showPassword = !showPassword)}
				>
					{#if showPassword}
						<svg viewBox="0 0 20 20" aria-hidden="true">
							<path d="M2.5 10s2.6-4.3 7.5-4.3 7.5 4.3 7.5 4.3-2.6 4.3-7.5 4.3S2.5 10 2.5 10Z" />
							<circle cx="10" cy="10" r="2" />
							<path d="m3 3 14 14" />
						</svg>
					{:else}
						<svg viewBox="0 0 20 20" aria-hidden="true">
							<path d="M2.5 10s2.6-4.3 7.5-4.3 7.5 4.3 7.5 4.3-2.6 4.3-7.5 4.3S2.5 10 2.5 10Z" />
							<circle cx="10" cy="10" r="2" />
						</svg>
					{/if}
				</button>
			</div>

			<div class="forgot-password">
				<a href="/recuperar-contrasena">¿Olvidaste tu contraseña?</a>
			</div>

			{#if errorMessage}
				<p class="form-message error-message" role="alert">{errorMessage}</p>
			{/if}
			<button class="submit-button" type="submit" disabled={isSubmitting}>
				<span>{isSubmitting ? 'Iniciando sesión...' : 'Iniciar sesión'}</span>
				{#if !isSubmitting}
					<svg viewBox="0 0 20 20" aria-hidden="true">
						<path d="M3.5 10h12m-5-5 5 5-5 5" />
					</svg>
				{/if}
			</button>
		</form>			<p class="card-footer">
				¿Aún no tienes cuenta? <a href="/registro">Créala aquí</a>
			</p>
	</section>
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
		font-family:
			'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
		-webkit-font-smoothing: antialiased;
	}

	:global(*) {
		box-sizing: border-box;
	}

	.login-page {
		display: grid;
		min-height: 100vh;
		min-height: 100svh;
		place-items: center;
		padding: 24px 16px;
		/* FONDO: Configura aquí background o background-image; la tarjeta conserva su propio estilo. */
	}

	.login-card {
		width: min(100%, 328px);
		padding: 17px 21px 19px;
		border: 1px solid rgb(255 255 255 / 35%);
		border-radius: 19px;
		background: rgb(237 241 229 / 92%);
		box-shadow: 0 14px 38px rgb(32 51 38 / 18%);
		backdrop-filter: blur(12px);
	}

	.brand-mark {
		display: flex;
		height: 57px;
		justify-content: center;
		color: #49382f;
	}

	.brand-mark svg {
		width: 82px;
		height: 60px;
	}

	.card-heading {
		margin: 3px 0 16px;
		text-align: center;
	}

	h1 {
		margin: 0;
		color: #263d37;
		font-size: 21px;
		font-weight: 700;
		letter-spacing: -0.45px;
		line-height: 1.2;
	}

	.card-heading p {
		margin: 4px 0 0;
		color: #718078;
		font-size: 10px;
		line-height: 1.35;
	}

	form {
		display: flex;
		flex-direction: column;
	}

	label {
		margin: 0 0 5px;
		color: #30463f;
		font-size: 9px;
		font-weight: 650;
	}

	.input-wrap {
		position: relative;
		display: flex;
		height: 35px;
		align-items: center;
		margin-bottom: 12px;
		border: 1px solid #cbd4c7;
		border-radius: 8px;
		background: rgb(255 255 255 / 35%);
		transition:
			border-color 150ms ease,
			box-shadow 150ms ease,
			background-color 150ms ease;
	}

	.input-wrap:focus-within {
		border-color: #54805e;
		background: rgb(255 255 255 / 62%);
		box-shadow: 0 0 0 3px rgb(84 128 94 / 12%);
	}

	.field-icon {
		width: 13px;
		height: 13px;
		flex: 0 0 auto;
		margin-left: 9px;
		color: #304740;
	}

	.lock-icon {
		width: 13px;
		height: 15px;
	}

	input {
		width: 100%;
		min-width: 0;
		height: 100%;
		padding: 0 9px;
		border: 0;
		outline: 0;
		background: transparent;
		color: #2b403a;
		font: inherit;
		font-size: 9px;
	}

	input::placeholder {
		color: #8b9891;
		opacity: 1;
	}

	.visibility-toggle {
		display: grid;
		width: 31px;
		height: 100%;
		flex: 0 0 auto;
		place-items: center;
		padding: 0;
		border: 0;
		border-radius: 0 7px 7px 0;
		background: transparent;
		color: #64756d;
		cursor: pointer;
	}

	.visibility-toggle svg {
		width: 14px;
		height: 14px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.6;
	}

	.visibility-toggle:focus-visible,
	.submit-button:focus-visible {
		outline: 2px solid #315e43;
		outline-offset: 2px;
	}

	.form-message {
		margin: -3px 0 10px;
		font-size: 10px;
		line-height: 1.4;
	}

	.forgot-password {
		margin: -7px 0 11px;
		text-align: right;
	}

	.forgot-password a {
		color: #326847;
		font-size: 9px;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	.error-message {
		color: #9e352f;
	}

	.submit-button {
		display: flex;
		width: 100%;
		height: 36px;
		align-items: center;
		justify-content: center;
		gap: 9px;
		margin-top: 1px;
		border: 0;
		border-radius: 10px;
		background: #326847;
		box-shadow: 0 3px 8px rgb(40 88 58 / 15%);
		color: #fff;
		font: inherit;
		font-size: 10px;
		font-weight: 650;
		cursor: pointer;
		transition:
			background-color 150ms ease,
			transform 150ms ease;
	}

	.submit-button:hover:not(:disabled) {
		transform: translateY(-1px);
		background: #28583b;
	}

	.submit-button:disabled {
		cursor: wait;
		opacity: 0.75;
	}

	.submit-button svg {
		width: 15px;
		height: 15px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.5;
	}

	.card-footer {
		margin: 12px 0 0;
		color: #708078;
		font-size: 9px;
		text-align: center;
	}

	.card-footer a {
		color: #326847;
		font-weight: 650;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	@media (max-width: 380px) {
		.login-card {
			padding-right: 19px;
			padding-left: 19px;
		}
	}
</style>
