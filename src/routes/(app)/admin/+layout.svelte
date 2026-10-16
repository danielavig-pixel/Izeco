<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { loadSession, session } from '#lib/services/api/session.svelte.js';
	import '#lib/styles/admin.css';

	let { children } = $props();

	const links = [
		{ href: '/admin', label: 'Resumen', icon: 'grid' },
		{ href: '/admin/usuarios', label: 'Usuarios', icon: 'users' },
		{ href: '/admin/emprendimientos', label: 'Emprendimientos', icon: 'store' },
		{ href: '/admin/moderacion', label: 'Moderación', icon: 'box' },
		{ href: '/admin/materia-prima', label: 'Materia prima', icon: 'leaf' },
		{ href: '/admin/campanas', label: 'Campañas', icon: 'flag' },
		{ href: '/admin/voluntariados', label: 'Voluntariados', icon: 'heart' },
		{ href: '/admin/recolecciones', label: 'Recolecciones', icon: 'recycle' },
		{ href: '/admin/categorias', label: 'Categorías', icon: 'tag' },
		{ href: '/admin/pagos', label: 'Pagos', icon: 'card' },
		{ href: '/admin/difusion', label: 'Difusión', icon: 'mail' }
	];

	let checked = $state(false);

	onMount(() => {
		void loadSession().then(() => {
			checked = true;
		});
	});

	$effect(() => {
		if (checked && session.user?.role !== 'admin') {
			void goto('/dashboard');
		}
	});

	function isActive(href: string): boolean {
		const path = page.url.pathname;
		return href === '/admin' ? path === '/admin' : path === href || path.startsWith(`${href}/`);
	}
</script>

{#if !checked}
	<p class="ad-state">Comprobando tus permisos…</p>
{:else if session.user?.role === 'admin'}
	<div class="ad-shell">
		<aside class="ad-aside" aria-label="Secciones de administración">
			<p class="ad-aside-title">Administración</p>
			{#each links as link (link.href)}
				<a class:active={isActive(link.href)} class="ad-nav-link" href={link.href}>
					<svg viewBox="0 0 24 24" aria-hidden="true">
						{#if link.icon === 'grid'}
							<rect x="4" y="4" width="7" height="7" rx="1.6" />
							<rect x="13" y="4" width="7" height="7" rx="1.6" />
							<rect x="4" y="13" width="7" height="7" rx="1.6" />
							<rect x="13" y="13" width="7" height="7" rx="1.6" />
						{:else if link.icon === 'users'}
							<circle cx="9" cy="8" r="3.2" />
							<path d="M3.5 19a5.5 5.5 0 0 1 11 0M16 6.5a3 3 0 0 1 0 6M17.5 19a5.5 5.5 0 0 0-2-4.3" />
						{:else if link.icon === 'store'}
							<path d="M3.5 8 5 4h14l1.5 4M4 8h16v11H4ZM9 19v-5.5h6V19" />
						{:else if link.icon === 'box'}
							<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9L12 3Z" />
							<path d="m4 7.5 8 4.5 8-4.5M12 12v9" />
						{:else if link.icon === 'leaf'}
							<path d="M12 21c0-6 0-9 8-12 0 8-3 11-8 12Z" />
							<path d="M12 21C12 14 10 9 4 6c-1 7 2 12 8 15Z" />
						{:else if link.icon === 'flag'}
							<path d="M5 21V4M5 5h11l-1.5 3L16 11H5" />
						{:else if link.icon === 'heart'}
							<path d="M12 20s-7-4.3-7-9.2A4.1 4.1 0 0 1 12 8.2a4.1 4.1 0 0 1 7 2.6c0 4.9-7 9.2-7 9.2Z" />
						{:else if link.icon === 'recycle'}
							<path d="M7 7 4 12h4M17 17l3-5h-4M9.5 4.5 12 8.2l3.5-2M7.6 19.5h8.8" />
						{:else if link.icon === 'tag'}
							<path d="M4 4h7l9 9-7 7-9-9V4Z" />
							<circle cx="8" cy="8" r="1.3" />
						{:else if link.icon === 'card'}
							<rect x="3" y="5" width="18" height="14" rx="2.5" />
							<path d="M3 10h18" />
						{:else}
							<rect x="3" y="5" width="18" height="14" rx="2" />
							<path d="m4 7 8 6 8-6" />
						{/if}
					</svg>
					{link.label}
				</a>
			{/each}
		</aside>

		<div class="ad-content">
			{@render children()}
		</div>
	</div>
{/if}
