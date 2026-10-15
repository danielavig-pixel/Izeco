<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import {
		AuthServiceError,
		clearRegistrationVerificationEmail,
		getRegistrationVerificationEmail,
		getRegistrationVerificationResendSeconds,
		markRegistrationVerificationSent,
		resendRegistrationVerification,
		verifyRegistrationEmail
	} from '../../lib/services/auth/auth.service.js';

	let digits = $state(['', '', '', '', '', '']);
	let email = $state('');
	let isReady = $state(false);
	let isResending = $state(false);
	let isSubmitting = $state(false);
	let resendSeconds = $state(0);
	let errorMessage = $state('');
	let resendMessage = $state('');

	onMount(() => {
		try {
			const verificationEmail = getRegistrationVerificationEmail();
			if (!verificationEmail) {
				void goto('/registro');
				return;
			}

			email = verificationEmail;
			isReady = true;
			resendSeconds = getRegistrationVerificationResendSeconds();
			document.getElementById('code-0')?.focus();

			const interval = window.setInterval(() => {
				if (resendSeconds > 0) resendSeconds -= 1;
			}, 1000);

			return () => window.clearInterval(interval);
		} catch {
			errorMessage = 'No se pudo recuperar el proceso. Regístrate de nuevo.';
		}
	});

	async function handleResendCode() {
		if (!email || resendSeconds > 0 || isResending) return;

		errorMessage = '';
		resendMessage = '';
		isResending = true;
		try {
			await resendRegistrationVerification(email);
			markRegistrationVerificationSent();
			digits = ['', '', '', '', '', ''];
			resendSeconds = getRegistrationVerificationResendSeconds();
			resendMessage = 'Si la cuenta está pendiente, recibirás un nuevo código.';
			focusDigit(0);
		} catch (error) {
			errorMessage =
				error instanceof AuthServiceError
					? error.message
					: 'No se pudo reenviar el código. Inténtalo de nuevo.';
		} finally {
			isResending = false;
		}
	}

	function focusDigit(index: number) {
		document.getElementById(`code-${index}`)?.focus();
	}

	function fillDigits(startIndex: number, value: string) {
		const numbers = value.replace(/\D/g, '').slice(0, 6 - startIndex);
		if (!numbers) {
			digits[startIndex] = '';
			return;
		}

		for (let offset = 0; offset < numbers.length; offset += 1) {
			digits[startIndex + offset] = numbers[offset];
		}

		focusDigit(Math.min(startIndex + numbers.length, digits.length - 1));
	}

	function handleInput(index: number, event: Event) {
		const input = event.currentTarget;
		if (!(input instanceof HTMLInputElement)) return;
		fillDigits(index, input.value);
		input.value = digits[index];
	}

	function handlePaste(index: number, event: ClipboardEvent) {
		event.preventDefault();
		fillDigits(index, event.clipboardData?.getData('text') ?? '');
	}

	function handleKeydown(index: number, event: KeyboardEvent) {
		if (event.key === 'Backspace' && !digits[index] && index > 0) {
			digits[index - 1] = '';
			focusDigit(index - 1);
		} else if (event.key === 'ArrowLeft' && index > 0) {
			focusDigit(index - 1);
		} else if (event.key === 'ArrowRight' && index < digits.length - 1) {
			focusDigit(index + 1);
		}
	}

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		errorMessage = '';
		const code = digits.join('');
		if (!/^\d{6}$/.test(code)) {
			errorMessage = 'Ingresa los 6 dígitos del código que recibiste.';
			return;
		}

		isSubmitting = true;
		try {
			await verifyRegistrationEmail(email, code);
			clearRegistrationVerificationEmail();
			await goto('/dashboard');
		} catch (error) {
			errorMessage =
				error instanceof AuthServiceError
					? error.message
					: 'No se pudo verificar el código. Inténtalo de nuevo.';
		} finally {
			isSubmitting = false;
		}
	}
</script>

<svelte:head>
	<title>Verificar correo</title>
	<meta name="description" content="Confirma el código enviado a tu correo para activar tu cuenta." />
</svelte:head>

<main class="verification-page">
	<section class="verification-card" aria-labelledby="verification-title">
		<div class="mail-icon" aria-hidden="true">
			<svg viewBox="0 0 48 48" fill="none">
				<rect x="6" y="11" width="36" height="26" rx="5" />
				<path d="m8 15 16 12 16-12" />
			</svg>
		</div>

		<header>
			<p class="step-label">VERIFICACIÓN DE CUENTA</p>
			<h1 id="verification-title">Revisa tu correo</h1>
			<p class="description">
				Enviamos un código de 6 dígitos a
				<strong>{email || 'tu correo electrónico'}</strong>. Escríbelo para activar tu cuenta.
			</p>
		</header>

		<form onsubmit={handleSubmit}>
			<fieldset disabled={!isReady} aria-label="Código de verificación de seis dígitos">
				<div class="code-inputs">
					{#each digits as digit, index}
						<input
							id="code-{index}"
							class="code-digit"
							type="text"
							inputmode="numeric"
							autocomplete={index === 0 ? 'one-time-code' : 'off'}
							aria-label="Dígito {index + 1}"
							value={digit}
							maxlength="6"
							oninput={(event) => handleInput(index, event)}
							onpaste={(event) => handlePaste(index, event)}
							onkeydown={(event) => handleKeydown(index, event)}
							required
						/>
					{/each}
				</div>
			</fieldset>

			{#if errorMessage}
				<p class="form-message" role="alert">{errorMessage}</p>
			{/if}

			{#if resendMessage}
				<p class="resend-message" role="status">{resendMessage}</p>
			{/if}

			<button class="continue-button" type="submit" disabled={!isReady || isSubmitting}>
				{isSubmitting ? 'Verificando...' : 'Verificar cuenta'}
				<svg viewBox="0 0 20 20" aria-hidden="true">
					<path d="M3.5 10h12m-5-5 5 5-5 5" />
				</svg>
			</button>
		</form>

		<div class="resend-row">
			<span>¿No recibiste el código?</span>
			<button
				class="resend-button"
				type="button"
				disabled={!isReady || isResending || resendSeconds > 0}
				onclick={handleResendCode}
			>
				{#if isResending}
					Enviando...
				{:else if resendSeconds > 0}
					Reenviar en {resendSeconds}s
				{:else}
					Reenviar código
				{/if}
			</button>
		</div>

		<a class="back-link" href="/registro">Volver</a>
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

	.verification-page {
		display: grid;
		min-height: 100vh;
		min-height: 100svh;
		place-items: center;
		padding: 24px 16px;
	}

	.verification-card {
		width: min(100%, 390px);
		padding: 30px 27px 24px;
		border: 1px solid rgb(255 255 255 / 35%);
		border-radius: 19px;
		background: rgb(237 241 229 / 92%);
		box-shadow: 0 14px 38px rgb(32 51 38 / 18%);
		backdrop-filter: blur(12px);
	}

	.mail-icon {
		display: grid;
		width: 54px;
		height: 54px;
		place-items: center;
		margin: 0 auto 18px;
		border-radius: 50%;
		background: rgb(50 104 71 / 10%);
		color: #326847;
	}

	.mail-icon svg {
		width: 28px;
		height: 28px;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.8;
	}

	header {
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
		color: #263d37;
		font-size: 22px;
		letter-spacing: -0.4px;
	}

	.description {
		margin: 8px 0 23px;
		color: #718078;
		font-size: 12px;
		line-height: 1.5;
		overflow-wrap: anywhere;
	}

	.description strong {
		color: #30463f;
		font-weight: 650;
	}

	fieldset {
		min-width: 0;
		margin: 0;
		padding: 0;
		border: 0;
	}

	.code-inputs {
		display: flex;
		justify-content: center;
		gap: 10px;
		margin-bottom: 20px;
	}

	.code-digit {
		width: 43px;
		height: 48px;
		padding: 0;
		border: 1px solid #cbd4c7;
		border-radius: 9px;
		outline: none;
		background: rgb(255 255 255 / 52%);
		color: #263d37;
		font: inherit;
		font-size: 22px;
		font-weight: 700;
		text-align: center;
		transition:
			border-color 150ms ease,
			box-shadow 150ms ease,
			background-color 150ms ease;
	}

	.code-digit:focus {
		border-color: #54805e;
		background: #fff;
		box-shadow: 0 0 0 3px rgb(84 128 94 / 14%);
	}

	.form-message {
		margin: 0 0 12px;
		color: #9e352f;
		font-size: 11px;
		line-height: 1.4;
		text-align: center;
	}

	.resend-message {
		margin: -5px 0 12px;
		color: #315e43;
		font-size: 11px;
		line-height: 1.4;
		text-align: center;
	}

	.continue-button {
		display: flex;
		width: 100%;
		min-height: 42px;
		align-items: center;
		justify-content: center;
		gap: 9px;
		border: 0;
		border-radius: 10px;
		background: #326847;
		color: #fff;
		font: inherit;
		font-size: 12px;
		font-weight: 650;
		cursor: pointer;
		transition: background-color 150ms ease;
	}

	.continue-button:hover:not(:disabled) {
		background: #28583b;
	}

	.continue-button:disabled {
		cursor: wait;
		opacity: 0.7;
	}

	.continue-button svg {
		width: 15px;
		height: 15px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.5;
	}

	.continue-button:focus-visible,
	.back-link:focus-visible,
	.resend-button:focus-visible {
		outline: 2px solid #315e43;
		outline-offset: 3px;
	}

	.resend-row {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: center;
		gap: 3px 5px;
		margin-top: 16px;
		color: #718078;
		font-size: 11px;
	}

	.resend-button {
		padding: 2px 0;
		border: 0;
		background: transparent;
		color: #326847;
		font: inherit;
		font-weight: 650;
		cursor: pointer;
	}

	.resend-button:disabled {
		color: #89958e;
		cursor: not-allowed;
	}

	.back-link {
		display: block;
		margin-top: 12px;
		color: #326847;
		font-size: 11px;
		text-align: center;
		text-decoration: underline;
		text-underline-offset: 2px;
	}

	@media (max-width: 360px) {
		.verification-card {
			padding-right: 18px;
			padding-left: 18px;
		}

		.code-inputs {
			gap: 7px;
		}

		.code-digit {
			width: 40px;
		}
	}
</style>
