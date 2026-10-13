<script lang="ts">
	import { goto } from '$app/navigation';
	import {
		AuthServiceError,
		requestPasswordReset,
		saveRecoveryEmail
	} from '../../lib/services/auth/auth.service.js';

	let email = $state('');
	let isSubmitting = $state(false);
	let errorMessage = $state('');

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';

		isSubmitting = true;
		try {
			await requestPasswordReset(email);
			saveRecoveryEmail(email);
			await goto('/verificar-codigo');
		} catch (error) {
			errorMessage =
				error instanceof AuthServiceError
					? error.message
					: 'Ocurrió un error inesperado. Inténtalo de nuevo.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Recuperar contraseña</title>
	<meta name="description" content="Recupera el acceso a tu cuenta." />
</svelte:head>

<main class="recovery-page">
	<section class="recovery-card" aria-labelledby="recovery-title">
		<div class="recovery-icon" aria-hidden="true">
			<svg viewBox="0 0 40 40" fill="none">
				<path
					d="M12.5 17V12a7.5 7.5 0 0 1 15 0v5m-18 0h21a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2h-21a2 2 0 0 1-2-2V19a2 2 0 0 1 2-2Z"
				/>
				<circle cx="20" cy="25" r="2" />
				<path d="M20 27v3" />
			</svg>
		</div>

		<header>
			<h1 id="recovery-title">Recupera tu cuenta</h1>
			<p>Te enviaremos un código para restablecer tu contraseña.</p>
		</header>

		<form onsubmit={handleSubmit}>
			<label for="email">Correo electrónico</label>
			<input
				id="email"
				name="email"
				type="email"
				placeholder="Ingresa tu correo electrónico"
				autocomplete="email"
				bind:value={email}
				required
			/>

			{#if errorMessage}
				<p class="form-message error-message" role="alert">{errorMessage}</p>
			{/if}
			<button class="submit-button" type="submit" disabled={isSubmitting}>
				{isSubmitting ? 'Enviando...' : 'Enviar código'}
			</button>
		</form>

		<a class="back-link" href="/">Volver a iniciar sesión</a>
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

	.recovery-page {
		display: grid;
		min-height: 100vh;
		min-height: 100svh;
		place-items: center;
		padding: 24px 16px;
	}

	.recovery-card {
		width: min(100%, 380px);
		padding: 28px 25px 24px;
		border: 1px solid rgb(255 255 255 / 35%);
		border-radius: 19px;
		background: rgb(237 241 229 / 92%);
		box-shadow: 0 14px 38px rgb(32 51 38 / 18%);
		backdrop-filter: blur(12px);
	}

	.recovery-icon {
		display: grid;
		width: 46px;
		height: 46px;
		place-items: center;
		margin: 0 auto 12px;
		border-radius: 50%;
		background: rgb(50 104 71 / 10%);
		color: #326847;
	}

	.recovery-icon svg {
		width: 25px;
		height: 25px;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.7;
	}

	header {
		margin-bottom: 20px;
		text-align: center;
	}

	h1 {
		margin: 0;
		font-size: 21px;
		letter-spacing: -0.4px;
	}

	header p {
		margin: 6px 0 0;
		color: #718078;
		font-size: 12px;
		line-height: 1.45;
	}

	form {
		display: flex;
		flex-direction: column;
	}

	label {
		margin: 0 0 5px;
		color: #30463f;
		font-size: 11px;
		font-weight: 650;
	}

	input {
		width: 100%;
		height: 40px;
		margin-bottom: 14px;
		padding: 0 11px;
		border: 1px solid #cbd4c7;
		border-radius: 8px;
		outline: none;
		background: rgb(255 255 255 / 35%);
		color: #2b403a;
		font: inherit;
		font-size: 12px;
		transition:
			border-color 150ms ease,
			box-shadow 150ms ease;
	}

	input::placeholder {
		color: #8b9891;
	}

	input:focus {
		border-color: #54805e;
		box-shadow: 0 0 0 3px rgb(84 128 94 / 12%);
	}

	.form-message {
		margin: 0 0 12px;
		font-size: 12px;
		line-height: 1.45;
	}

	.error-message {
		color: #9e352f;
	}

	.submit-button {
		width: 100%;
		min-height: 42px;
		margin-top: 2px;
		border: 0;
		border-radius: 10px;
		background: #326847;
		color: #fff;
		font: inherit;
		font-size: 12px;
		font-weight: 650;
		cursor: pointer;
	}

	.submit-button:hover:not(:disabled) {
		background: #28583b;
	}

	.submit-button:disabled {
		cursor: wait;
		opacity: 0.75;
	}

	.submit-button:focus-visible,
	.back-link:focus-visible {
		outline: 2px solid #315e43;
		outline-offset: 3px;
	}

	.back-link {
		display: block;
		margin-top: 17px;
		color: #326847;
		font-size: 11px;
		text-align: center;
		text-decoration: underline;
		text-underline-offset: 2px;
	}
</style>
