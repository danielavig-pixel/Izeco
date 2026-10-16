<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		AuthServiceError,
		register,
		saveRegistrationVerificationEmail
	} from '../../lib/services/auth/auth.service.js';

	let name = $state('');
	let email = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let showPassword = $state(false);
	let showConfirmPassword = $state(false);
	let isSubmitting = $state(false);
	let errorMessage = $state('');

	async function handleRegister(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';

		if (password.length < 8) {
			errorMessage = 'La contraseña debe tener al menos 8 caracteres.';
			return;
		}

		if (password !== confirmPassword) {
			errorMessage = 'Las contraseñas no coinciden.';
			return;
		}

		isSubmitting = true;
		try {
			// El rol se elige despues de crear la cuenta, en /elegir-rol.
			const result = await register(name.trim(), email, password);
			if (result.requiresVerification) {
				saveRegistrationVerificationEmail(email);
				await goto('/verificar-correo');
			} else {
				await goto('/elegir-rol');
			}
		} catch (error) {
			errorMessage =
				error instanceof AuthServiceError
					? error.message
					: 'Ocurrió un error inesperado al crear la cuenta.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Crear cuenta</title>
	<meta name="description" content="Crea una cuenta para empezar a usar la plataforma." />
</svelte:head>

<main class="register-page">
	<section class="register-card" aria-labelledby="register-title">
		<!-- LOGO: imagen real de la marca, servida desde static/logo.png. -->
		<div class="brand-mark">
			<img src="/logo.png" alt="Izeco" />
		</div>

		<header class="card-heading">
			<h1 id="register-title">Crear cuenta</h1>
			<p>Empieza tu camino con nosotros.<br />En el siguiente paso eliges cómo usar la plataforma.</p>
		</header>

		<form onsubmit={handleRegister}>
			<label for="name">Nombre completo</label>
			<div class="input-wrap">
				<svg class="field-icon" viewBox="0 0 20 20" aria-hidden="true">
					<path
						d="M10 10a3.4 3.4 0 1 0 0-6.8 3.4 3.4 0 0 0 0 6.8Zm0 1.6c-3.2 0-5.8 1.8-5.8 4v1.2c0 .5.4.9.9.9h9.8c.5 0 .9-.4.9-.9V15.6c0-2.2-2.6-4-5.8-4Z"
						fill="currentColor"
					/>
				</svg>
				<input
					id="name"
					name="name"
					type="text"
					placeholder="Ingresa tu nombre completo"
					autocomplete="name"
					bind:value={name}
					required
				/>
			</div>

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
					placeholder="Mínimo 8 caracteres"
					autocomplete="new-password"
					bind:value={password}
					minlength="8"
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

			<label for="confirm-password">Confirmar contraseña</label>
			<div class="input-wrap">
				<svg class="field-icon lock-icon" viewBox="0 0 20 20" aria-hidden="true">
					<path
						d="M6.1 8V5.8a3.9 3.9 0 0 1 7.8 0V8h.5c.8 0 1.4.6 1.4 1.4v6.1c0 .8-.6 1.4-1.4 1.4H5.6c-.8 0-1.4-.6-1.4-1.4V9.4c0-.8.6-1.4 1.4-1.4h.5Zm1.8 0h4.2V5.8a2.1 2.1 0 0 0-4.2 0V8Z"
						fill="currentColor"
					/>
					<circle cx="10" cy="12" r="1.1" fill="#edf1e5" />
				</svg>
				<input
					id="confirm-password"
					name="confirm-password"
					type={showConfirmPassword ? 'text' : 'password'}
					placeholder="Repite tu contraseña"
					autocomplete="new-password"
					bind:value={confirmPassword}
					required
				/>
				<button
					class="visibility-toggle"
					type="button"
					aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
					onclick={() => (showConfirmPassword = !showConfirmPassword)}
				>
					{#if showConfirmPassword}
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

			{#if errorMessage}
				<p class="form-message error-message" role="alert">{errorMessage}</p>
			{/if}

			<button class="submit-button" type="submit" disabled={isSubmitting}>
				<span>{isSubmitting ? 'Creando cuenta...' : 'Crear cuenta'}</span>
				{#if !isSubmitting}
					<svg viewBox="0 0 20 20" aria-hidden="true">
						<path d="M3.5 10h12m-5-5 5 5-5 5" />
					</svg>
				{/if}
			</button>
		</form>

		<p class="card-footer">
			¿Ya tienes cuenta? <a href="/iniciar-sesion">Inicia sesión</a>
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
		font-family: 'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
		-webkit-font-smoothing: antialiased;
	}

	:global(*) {
		box-sizing: border-box;
	}

	.register-page {
		display: grid;
		min-height: 100vh;
		min-height: 100svh;
		place-items: center;
		padding: 24px 16px;
		/* FONDO: fotografía del paisaje con un velo verde para que la tarjeta resalte. */
		background:
			linear-gradient(180deg, rgb(23 53 42 / 35%), rgb(23 53 42 / 55%)),
			url('/fondo.jpg') center / cover no-repeat;
	}

	.register-card {
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

	.brand-mark img {
		width: auto;
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
		.register-card {
			padding-right: 19px;
			padding-left: 19px;
		}
	}
</style>
