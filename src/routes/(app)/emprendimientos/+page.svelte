<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		getPublicEntrepreneurs,
		type Entrepreneur
	} from '#lib/services/api/api.service.js';
	import { initials, toPlainText } from '#lib/utils/format.js';

	const PAGE_SIZE = 9;

	let entrepreneurs = $state<Entrepreneur[]>([]);
	let chips = $state<{ label: string; count: number }[]>([]);
	let total = $state(0);

	let isLoading = $state(true);
	let isLoadingMore = $state(false);
	let errorMessage = $state('');
	let pageNumber = $state(1);
	let totalPages = $state(1);
	let searchTermInput = $state('');
	// Hay socios con logoUrl que ya no responde: se cae a las iniciales.
	let brokenLogos = $state<Record<string, boolean>>({});

	const searchTerm = $derived(page.url.searchParams.get('q') ?? '');
	const category = $derived(page.url.searchParams.get('categoria') ?? '');

	onMount(async () => {
		await loadCategories();
	});

	$effect(() => {
		const term = searchTerm;
		const cat = category;
		void loadList(term, cat);
	});

	// Las categorías no tienen endpoint propio: se derivan del directorio.
	async function loadCategories() {
		try {
			const all = await getPublicEntrepreneurs({ limit: 50 });
			const counts = new Map<string, number>();
			for (const item of all.items) {
				const key = item.category?.trim();
				if (!key) continue;
				counts.set(key, (counts.get(key) ?? 0) + 1);
			}
			chips = [...counts.entries()]
				.sort((a, b) => b[1] - a[1])
				.map(([label, count]) => ({ label, count }));
		} catch {
			// Sin categorías la grilla igual carga.
		}
	}

	async function loadList(term: string, cat: string) {
		isLoading = true;
		errorMessage = '';
		pageNumber = 1;
		searchTermInput = term;
		try {
			const result = await getPublicEntrepreneurs({
				page: 1,
				limit: PAGE_SIZE,
				q: term || undefined,
				categoria: cat || undefined
			});
			entrepreneurs = result.items;
			total = result.total;
			totalPages = result.totalPages;
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'No se pudieron cargar los emprendimientos.';
			entrepreneurs = [];
			total = 0;
		} finally {
			isLoading = false;
		}
	}

	async function loadMore() {
		if (isLoadingMore || pageNumber >= totalPages) return;
		isLoadingMore = true;
		try {
			const result = await getPublicEntrepreneurs({
				page: pageNumber + 1,
				limit: PAGE_SIZE,
				q: searchTerm || undefined,
				categoria: category || undefined
			});
			entrepreneurs = [...entrepreneurs, ...result.items];
			pageNumber += 1;
			totalPages = result.totalPages;
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'No se pudieron cargar más emprendimientos.';
		} finally {
			isLoadingMore = false;
		}
	}

	function updateParams(patch: { q?: string; categoria?: string }) {
		const params = new URLSearchParams(page.url.searchParams.toString());
		for (const [key, value] of Object.entries(patch)) {
			if (value) params.set(key, value);
			else params.delete(key);
		}
		const query = params.toString();
		void goto(query ? `/emprendimientos?${query}` : '/emprendimientos');
	}

	function handleSearch(event: SubmitEvent) {
		event.preventDefault();
		updateParams({ q: searchTermInput.trim() });
	}
</script>

<svelte:head>
	<title>Emprendimientos | Izeco</title>
	<meta
		name="description"
		content="Directorio de socios de Izeco: conoce los emprendimientos locales y sus productos."
	/>
</svelte:head>

<section class="page-head">
	<div>
		<p class="eyebrow"><span class="eyebrow-dot" aria-hidden="true"></span>Comunidad Izeco</p>
		<h1>Conoce a los socios</h1>
		<p class="subtitle">
			{total} {total === 1 ? 'emprendimiento' : 'emprendimientos'} que convierten su oficio en
			impacto para la comunidad.
		</p>
	</div>

	<div class="chips" role="group" aria-label="Filtrar por categoría">
		<button class="chip" class:active={!category} type="button" onclick={() => updateParams({ categoria: '' })}>
			Todos
		</button>
		{#each chips as chip (chip.label)}
			<button
				class="chip"
				class:active={category === chip.label}
				type="button"
				onclick={() => updateParams({ categoria: chip.label })}
			>
				{chip.label}
			</button>
		{/each}
	</div>
</section>

<div class="toolbar">
	<form class="search" onsubmit={handleSearch} role="search">
		<svg viewBox="0 0 20 20" aria-hidden="true">
			<circle cx="9" cy="9" r="5.2" />
			<path d="m13 13 4 4" />
		</svg>
		<input
			type="search"
			name="q"
			placeholder="Buscar socio por nombre o descripción…"
			aria-label="Buscar emprendimiento"
			bind:value={searchTermInput}
		/>
		<button class="search-button" type="submit">Buscar</button>
	</form>
</div>

{#if errorMessage}
	<p class="banner" role="alert">{errorMessage}</p>
{/if}

{#if isLoading}
	<p class="state">Cargando emprendimientos…</p>
{:else if entrepreneurs.length === 0}
	<p class="state">
		{searchTerm || category
			? 'No encontramos socios con esos filtros.'
			: 'Todavía no hay emprendimientos publicados.'}
	</p>
{:else}
	<section class="grid" aria-label="Emprendimientos">
		{#each entrepreneurs as socio (socio.id)}
			<article class="ecard">
				<header class="ecard-head">
					{#if socio.logoUrl && !brokenLogos[socio.id]}
						<img
							class="ecard-logo"
							src={socio.logoUrl}
							alt={socio.name}
							loading="lazy"
							onerror={() => (brokenLogos = { ...brokenLogos, [socio.id]: true })}
						/>
					{:else}
						<span class="ecard-logo initials" aria-hidden="true">{initials(socio.name)}</span>
					{/if}
					<div class="ecard-id">
						{#if socio.category}
							<p class="ecard-cat">{socio.category}</p>
						{/if}
						<h2>{socio.name}</h2>
					</div>
				</header>

				{#if socio.description}
					<p class="ecard-desc">{toPlainText(socio.description, 180)}</p>
				{/if}

				<footer class="ecard-foot">
					<span class="ecard-since">
						<svg viewBox="0 0 24 24" aria-hidden="true"
							><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg
						>
						Socios de Izeco
					</span>
					<a class="ecard-link" href={`/emprendimientos/${socio.slug}`}>
						Ver ficha
						<svg viewBox="0 0 20 20" aria-hidden="true"
							><path d="M5 15 15 5M8 5h7v7" /></svg
						>
					</a>
				</footer>
			</article>
		{/each}
	</section>

	{#if pageNumber < totalPages}
		<button class="more" type="button" onclick={loadMore} disabled={isLoadingMore}>
			{isLoadingMore ? 'Cargando…' : 'Cargar más socios'}
		</button>
	{/if}
{/if}

<style>
	.page-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 18px;
	}

	.eyebrow {
		display: flex;
		align-items: center;
		gap: 7px;
		margin: 0 0 8px;
		color: var(--iz-green-600);
		font-size: 10px;
		font-weight: 750;
		letter-spacing: 1.4px;
		text-transform: uppercase;
	}

	.eyebrow-dot {
		width: 7px;
		height: 7px;
		border-radius: 50%;
		background: var(--iz-green-600);
	}

	h1 {
		margin: 0;
		color: var(--iz-ink);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 32px;
		font-weight: 600;
		letter-spacing: -0.6px;
	}

	.subtitle {
		max-width: 560px;
		margin: 6px 0 0;
		color: var(--iz-muted);
		font-size: 13px;
	}

	.chips {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
	}

	.chip {
		padding: 9px 17px;
		border: 1px solid var(--iz-line);
		border-radius: 999px;
		background: var(--iz-surface);
		color: var(--iz-ink-soft);
		font: inherit;
		font-size: 12.5px;
		font-weight: 600;
		cursor: pointer;
	}

	.chip:hover {
		border-color: var(--iz-green-300);
	}

	.chip.active {
		border-color: var(--iz-green-300);
		background: var(--iz-green-100);
		color: var(--iz-green-800);
	}

	.toolbar {
		margin-bottom: 18px;
	}

	.search {
		display: flex;
		max-width: 520px;
		align-items: center;
		gap: 9px;
		padding: 6px 6px 6px 13px;
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-sm);
		background: var(--iz-surface);
	}

	.search:focus-within {
		border-color: var(--iz-green-600);
		box-shadow: 0 0 0 3px rgb(63 122 82 / 12%);
	}

	.search svg {
		width: 16px;
		height: 16px;
		flex: 0 0 auto;
		fill: none;
		stroke: var(--iz-faint);
		stroke-linecap: round;
		stroke-width: 1.7;
	}

	.search input {
		width: 100%;
		min-width: 0;
		border: 0;
		outline: 0;
		background: transparent;
		color: var(--iz-ink);
		font: inherit;
		font-size: 13px;
	}

	.search input::placeholder {
		color: var(--iz-faint);
	}

	.search-button {
		flex: 0 0 auto;
		padding: 9px 16px;
		border: 0;
		border-radius: 8px;
		background: var(--iz-green-800);
		color: #f4f7f2;
		font: inherit;
		font-size: 12.5px;
		font-weight: 650;
		cursor: pointer;
	}

	.search-button:hover {
		background: var(--iz-green-900);
	}

	.banner {
		margin: 0 0 14px;
		padding: 11px 14px;
		border: 1px solid #eccfc8;
		border-radius: var(--iz-radius-sm);
		background: #fbf0ec;
		color: var(--iz-danger);
		font-size: 12px;
	}

	.state {
		margin: 0;
		padding: 46px 20px;
		color: var(--iz-muted);
		font-size: 13px;
		text-align: center;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 16px;
	}

	.ecard {
		display: flex;
		flex-direction: column;
		gap: 12px;
		padding: 20px;
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-md);
		background: var(--iz-surface);
		box-shadow: var(--iz-shadow-sm);
		transition:
			transform 160ms ease,
			box-shadow 160ms ease;
	}

	.ecard:hover {
		transform: translateY(-2px);
		box-shadow: var(--iz-shadow-md);
	}

	.ecard-head {
		display: flex;
		align-items: center;
		gap: 13px;
	}

	.ecard-logo {
		width: 50px;
		height: 50px;
		flex: 0 0 auto;
		border-radius: 13px;
		object-fit: cover;
	}

	.ecard-logo.initials {
		display: grid;
		place-items: center;
		background: #ddd1b6;
		color: #6a5b3e;
		font-size: 16px;
		font-weight: 700;
	}

	.ecard-id {
		min-width: 0;
	}

	.ecard-cat {
		margin: 0 0 3px;
		color: var(--iz-muted);
		font-size: 10px;
		font-weight: 750;
		letter-spacing: 1.1px;
		text-transform: uppercase;
	}

	.ecard-id h2 {
		margin: 0;
		color: var(--iz-ink);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 20px;
		font-weight: 600;
		letter-spacing: -0.3px;
	}

	.ecard-desc {
		display: -webkit-box;
		min-height: 54px;
		overflow: hidden;
		margin: 0;
		color: var(--iz-muted);
		font-size: 12.5px;
		line-height: 1.55;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 3;
		line-clamp: 3;
	}

	.ecard-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
		margin-top: auto;
		padding-top: 14px;
		border-top: 1px solid var(--iz-line);
	}

	.ecard-since {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--iz-faint);
		font-size: 11.5px;
	}

	.ecard-since svg {
		width: 15px;
		height: 15px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.5;
	}

	.ecard-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--iz-green-700);
		font-size: 12.5px;
		font-weight: 650;
		white-space: nowrap;
		text-decoration: none;
	}

	.ecard-link svg {
		width: 13px;
		height: 13px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.7;
	}

	.more {
		display: block;
		width: 100%;
		margin-top: 18px;
		padding: 13px;
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-sm);
		background: var(--iz-surface);
		color: var(--iz-green-700);
		font: inherit;
		font-size: 12.5px;
		font-weight: 650;
		cursor: pointer;
	}

	.more:hover:not(:disabled) {
		background: var(--iz-green-50);
	}

	.more:disabled {
		color: var(--iz-faint);
		cursor: wait;
	}

	@media (max-width: 1080px) {
		.grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 700px) {
		.grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
