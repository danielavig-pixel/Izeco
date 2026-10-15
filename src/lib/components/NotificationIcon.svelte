<script lang="ts">
	let { type, size = 'md' }: { type: string; size?: 'sm' | 'md' } = $props();

	const tone = $derived(
		type === 'pago' || type === 'reembolso'
			? 'green'
			: type === 'voluntariado'
				? 'blue'
				: type === 'emprendimiento' || type === 'campana'
					? 'amber'
					: 'grey'
	);
</script>

<span class="notification-icon {tone} {size}" aria-hidden="true">
	{#if type === 'pago' || type === 'reembolso'}
		<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 11h18" /></svg>
	{:else if type === 'voluntariado'}
		<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.2" /><path d="M6 19a6 6 0 0 1 12 0" /></svg>
	{:else if type === 'registro' || type === 'verificacion'}
		<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>
	{:else if type === 'emprendimiento' || type === 'campana'}
		<svg viewBox="0 0 24 24"><path d="M4 8h16M6 8v10a1.5 1.5 0 0 0 1.5 1.5h9A1.5 1.5 0 0 0 18 18V8" /><path d="M9.5 8V6a2.5 2.5 0 0 1 5 0v2" /></svg>
	{:else}
		<svg viewBox="0 0 24 24"><path d="M12 4a5 5 0 0 1 5 5c0 3.4 1.4 4.8 1.4 4.8H5.6S7 12.4 7 9a5 5 0 0 1 5-5Z" /><path d="M10.2 17a2 2 0 0 0 3.6 0" /></svg>
	{/if}
</span>

<style>
	.notification-icon {
		display: grid;
		flex: 0 0 auto;
		place-items: center;
		border-radius: 10px;
	}

	.notification-icon.md {
		width: 34px;
		height: 34px;
	}

	.notification-icon.sm {
		width: 30px;
		height: 30px;
		border-radius: 9px;
	}

	.notification-icon svg {
		width: 17px;
		height: 17px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.6;
	}

	.notification-icon.sm svg {
		width: 15px;
		height: 15px;
	}

	.notification-icon.green {
		background: var(--iz-green-100);
		color: var(--iz-green-600);
	}

	.notification-icon.blue {
		background: var(--iz-blue-100);
		color: var(--iz-blue);
	}

	.notification-icon.amber {
		background: var(--iz-amber-100);
		color: var(--iz-amber);
	}

	.notification-icon.grey {
		background: var(--iz-surface-muted);
		color: var(--iz-muted);
	}
</style>
