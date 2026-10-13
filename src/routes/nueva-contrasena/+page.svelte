<script lang="ts">
	import { onMount } from 'svelte';
	import {
		AuthServiceError,
		clearRecoveryDetails,
		getRecoveryDetails,
		resetPassword
	} from '../../lib/services/auth/auth.service.js';

	let email = $state('');
	let code = $state('');
	let password = $state('');
	let confirmPassword = $state('');
	let isReady = $state(false);
	let isSubmitting = $state(false);
	let isComplete = $state(false);
	let errorMessage = $state('');

	onMount(() => {
		try {
			const recovery = getRecoveryDetails();
			if (!recovery) {
				window.location.replace('/recuperar-contrasena');
				return;
			}

			email = recovery.email;
			code = recovery.code;
			isReady = true;
		} catch {
			errorMessage = 'No se pudo recuperar el proceso. Solicita un nuevo código.';
		}
	});

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';
		if (password !== confirmPassword) {
			errorMessage = 'Las contraseñas no coinciden.';
			return;
		}

		isSubmitting = true;
		try {
			await resetPassword(email, code, password);
			clearRecoveryDetails();
			isComplete = true;
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
	<title>Nueva contraseña</title>
	<meta name="description" content="Crea una nueva contraseña para tu cuenta." />
</svelte:head>

<main class="password-page">
	<section class="password-card" aria-labelledby="password-title">
		{#if isComplete}
			<div class="success-icon" aria-hidden="true">
				<svg viewBox="0 0 48 48" fill="none">
					<circle cx="24" cy="24" r="21" />
					<path d="m14 24 7 7 14-15" />
				</svg>
			</div>
			<h1 id="password-title">Contraseña actualizada</h1>
			<p class="description">Ya puedes iniciar sesión con tu nueva contraseña.</p>
			<a class="submit-button" href="/">Volver a iniciar sesión</a>
		{:else}
			<div class="password-icon" aria-hidden="true">
				<svg viewBox="0 0 40 40" fill="none">
					<path
						d="M12.5 17V12a7.5 7.5 0 0 1 15 0v5m-18 0h21a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2h-21a2 2 0 0 1-2-2V19a2 2 0 0 1 2-2Z"
					/>
					<circle cx="20" cy="25" r="2" />
					<path d="M20 27v3" />
				</svg>
			</div>
			<header>
				<p class="step-label">ÚLTIMO PASO</p>
				<h1 id="password-title">Crea una nueva contraseña</h1>
				<p class="description">Elige una contraseña segura para proteger tu cuenta.</p>
			</header>

			<form onsubmit={handleSubmit}>
				<label for="password">Nueva contraseña</label>
				<input
					id="password"
					name="password"
					type="password"
					placeholder="Al menos 8 caracteres"
					autocomplete="new-password"
					minlength="8"
					bind:value={password}
					disabled={!isReady}
					required
				/>

				<label for="confirm-password">Confirma tu nueva contraseña</label>
				<input
					id="confirm-password"
					name="confirm-password"
					type="password"
					placeholder="Repite tu nueva contraseña"
					autocomplete="new-password"
					minlength="8"
					bind:value={confirmPassword}
					disabled={!isReady}
					required
				/>

				{#if errorMessage}
					<p class="form-message" role="alert">{errorMessage}</p>
				{/if}

				<button class="submit-button" type="submit" disabled={!isReady || isSubmitting}>
					{isSubmitting ? 'Guardando...' : 'Cambiar contraseña'}
				</button>
			</form>
		{/if}

		{#if !isComplete}
			<a class="back-link" href="/verificar-codigo">Volver al código</a>
		{/if}
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

	.password-page {
		display: grid;
		min-height: 100vh;
		min-height: 100svh;
		place-items: center;
		padding: 24px 16px;
	}

	.password-card {
		width: min(100%, 380px);
		padding: 28px 25px 24px;
		border: 1px solid rgb(255 255 255 / 35%);
		border-radius: 19px;
		background: rgb(237 241 229 / 92%);
		box-shadow: 0 14px 38px rgb(32 51 38 / 18%);
		backdrop-filter: blur(12px);
	}

	.password-icon,
	.success-icon {
		display: grid;
		width: 50px;
		height: 50px;
		place-items: center;
		margin: 0 auto 14px;
		border-radius: 50%;
		background: rgb(50 104 71 / 10%);
		color: #326847;
	}

	.password-icon svg {
		width: 26px;
		height: 26px;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.7;
	}

	.success-icon svg {
		width: 44px;
		height: 44px;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 2.5;
	}

	.success-icon circle {
		fill: rgb(50 104 71 / 10%);
	}

	header {
		margin-bottom: 20px;
		text-align: center;
	}

	.step-label {
		margin: 0 0 7px;
		color: #54805e;
		font-size: 9px;
		font-weight: 750;
		letter-spacing: 1.2px;
	}

	h1 {
		margin: 0;
		font-size: 21px;
		letter-spacing: -0.4px;
		text-align: center;
	}

	.description {
		margin: 7px 0 0;
		color: #718078;
		font-size: 12px;
		line-height: 1.45;
		text-align: center;
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
		color: #9e352f;
		font-size: 12px;
		line-height: 1.45;
	}

	.submit-button {
		display: flex;
		width: 100%;
		min-height: 42px;
		align-items: center;
		justify-content: center;
		margin-top: 2px;
		border: 0;
		border-radius: 10px;
		background: #326847;
		color: #fff;
		font: inherit;
		font-size: 12px;
		font-weight: 650;
		text-align: center;
		text-decoration: none;
		cursor: pointer;
	}

	.submit-button:hover:not(:disabled) {
		background: #28583b;
	}

	.submit-button:disabled {
		cursor: wait;
		opacity: 0.7;
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
