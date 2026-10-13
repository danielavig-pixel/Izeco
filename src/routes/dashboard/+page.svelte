<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { getAccessToken, logout } from '../../lib/services/auth/auth.service.js';

	let isCheckingSession = $state(true);
	let isAuthenticated = $state(false);
	let errorMessage = $state('');

	onMount(() => {
		try {
			if (!getAccessToken()) {
				void goto('/');
				return;
			}

			isAuthenticated = true;
		} catch {
			errorMessage = 'No se pudo comprobar tu sesión en este navegador.';
		} finally {
			isCheckingSession = false;
		}
	});

	async function handleLogout() {
		try {
			logout();
			await goto('/');
		} catch {
			errorMessage = 'No se pudo cerrar la sesión. Inténtalo de nuevo.';
		}
	}
</script>

<svelte:head>
	<title>Panel | Sesión iniciada</title>
	<meta name="description" content="Panel de tu cuenta." />
</svelte:head>

<main class="dashboard-page">
	<section class="dashboard-card" aria-live="polite">
		{#if isCheckingSession}
			<p class="status-message">Comprobando tu sesión...</p>
		{:else if errorMessage}
			<p class="error-message" role="alert">{errorMessage}</p>
		{:else if isAuthenticated}
			<div class="success-icon" aria-hidden="true">
				<svg viewBox="0 0 48 48" fill="none">
					<circle cx="24" cy="24" r="21" />
					<path d="m14 24 7 7 14-15" />
				</svg>
			</div>
			<h1>¡Iniciaste sesión!</h1>
			<p>Tu acceso fue correcto. Ya estás dentro de tu cuenta.</p>
			<button type="button" onclick={handleLogout}>Cerrar sesión</button>
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

	.dashboard-page {
		display: grid;
		min-height: 100vh;
		min-height: 100svh;
		place-items: center;
		padding: 24px 16px;
	}

	.dashboard-card {
		width: min(100%, 420px);
		padding: 38px 30px;
		border: 1px solid rgb(255 255 255 / 35%);
		border-radius: 19px;
		background: rgb(237 241 229 / 92%);
		box-shadow: 0 14px 38px rgb(32 51 38 / 18%);
		backdrop-filter: blur(12px);
		text-align: center;
	}

	.success-icon {
		width: 54px;
		height: 54px;
		margin: 0 auto 14px;
		color: #326847;
	}

	.success-icon svg {
		width: 100%;
		height: 100%;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 2.5;
	}

	.success-icon circle {
		fill: rgb(50 104 71 / 10%);
	}

	h1 {
		margin: 0;
		color: #263d37;
		font-size: clamp(23px, 6vw, 30px);
		letter-spacing: -0.5px;
	}

	p {
		margin: 10px 0 24px;
		color: #718078;
		font-size: 14px;
		line-height: 1.5;
	}

	.status-message,
	.error-message {
		margin: 0;
	}

	.error-message {
		color: #9e352f;
	}

	button {
		min-height: 42px;
		padding: 0 22px;
		border: 0;
		border-radius: 10px;
		background: #326847;
		color: white;
		font: inherit;
		font-size: 13px;
		font-weight: 650;
		cursor: pointer;
	}

	button:hover {
		background: #28583b;
	}

	button:focus-visible {
		outline: 2px solid #315e43;
		outline-offset: 3px;
	}
</style>
