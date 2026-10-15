<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		getCategoryCounts,
		getProductCategoryTree,
		getPublicEntrepreneurs,
		getPublicProducts,
		type CategoryCount,
		type Entrepreneur,
		type Product
	} from '#lib/services/api/api.service.js';
	import { formatCurrency, initials, toPlainText } from '#lib/utils/format.js';

	const PAGE_SIZE = 12;

	type Chip = { label: string; slug: string; count: number };

	let products = $state<Product[]>([]);
	let chips = $state<Chip[]>([]);
	let featured = $state<Entrepreneur | null>(null);
	let sociosCount = $state(0);
	let totalProducts = $state(0);

	let isLoading = $state(true);
	let isLoadingMore = $state(false);
	let errorMessage = $state('');
	let pageNumber = $state(1);
	let totalPages = $state(1);
	// Hasta tener el mapeo slug -> id no se puede filtrar por categoría.
	let referenceReady = $state(false);

	// slug -> id de categoria, para poder filtrar desde la URL.
	let categoryIdBySlug = new Map<string, string>();
	let categoryNameById = new Map<string, string>();

	const searchTerm = $derived(page.url.searchParams.get('q') ?? '');
	const categorySlug = $derived(page.url.searchParams.get('categoria') ?? '');

	onMount(async () => {
		await loadReference();
		referenceReady = true;
	});

	// Se vuelve a pedir la grilla cuando cambian la búsqueda o la categoría,
	// incluso si el buscador del header navega estando ya en el catálogo.
	// Con ?categoria=... se espera al mapeo de categorías para no pedir de más.
	$effect(() => {
		const term = searchTerm;
		const slug = categorySlug;
		if (slug && !referenceReady) return;
		void loadProducts(term, slug);
	});

	async function loadReference() {
		try {
			const [counts, tree, entrepreneurs] = await Promise.all([
				getCategoryCounts(),
				getProductCategoryTree(),
				getPublicEntrepreneurs({ limit: 1 })
			]);

			categoryIdBySlug = new Map(tree.map((node) => [node.slug, node.id]));
			categoryNameById = new Map(counts.map((count) => [count.categoryId, count.name]));

			const visible = counts
				.filter((count) => count.products > 0 && count.name.toLowerCase() !== 'root')
				.sort((a, b) => b.products - a.products);
			chips = visible.map((count) => ({
				label: count.name,
				slug:
					tree.find((node) => node.id === count.categoryId)?.slug ??
					count.name.toLowerCase().replace(/\s+/g, '-'),
				count: count.products
			}));
			totalProducts = visible.reduce((total, count) => total + count.products, 0);

			featured = entrepreneurs.items[0] ?? null;
			if (featured) {
				// El listado público pagina por defecto; el total real de socios viene aparte.
				const all = await getPublicEntrepreneurs({ limit: 50 });
				sociosCount = all.total;
			} else {
				sociosCount = 0;
			}
		} catch {
			// Si fallan los datos de referencia, la grilla igual intenta cargar.
		}
	}

	async function loadProducts(term: string, slug: string) {
		isLoading = true;
		errorMessage = '';
		pageNumber = 1;
		try {
			const result = await getPublicProducts({
				page: 1,
				limit: PAGE_SIZE,
				q: term || undefined,
				categoryId: slug ? categoryIdBySlug.get(slug) : undefined
			});
			products = result.items;
			totalPages = result.totalPages;
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'No se pudo cargar el catálogo.';
			products = [];
		} finally {
			isLoading = false;
		}
	}

	async function loadMore() {
		if (isLoadingMore || pageNumber >= totalPages) return;
		isLoadingMore = true;
		try {
			const result = await getPublicProducts({
				page: pageNumber + 1,
				limit: PAGE_SIZE,
				q: searchTerm || undefined,
				categoryId: categorySlug ? categoryIdBySlug.get(categorySlug) : undefined
			});
			products = [...products, ...result.items];
			pageNumber += 1;
			totalPages = result.totalPages;
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'No se pudieron cargar más productos.';
		} finally {
			isLoadingMore = false;
		}
	}

	function categoryNameOf(product: Product): string {
		return categoryNameById.get(product.categoryId) || '';
	}

	function selectCategory(slug: string) {
		const params = new URLSearchParams(page.url.searchParams.toString());
		if (slug) params.set('categoria', slug);
		else params.delete('categoria');
		const query = params.toString();
		void goto(query ? `/catalogo?${query}` : '/catalogo');
	}

	function scrollToShelf() {
		document.getElementById('catalogo-grilla')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
</script>

<svelte:head>
	<title>Catálogo | Izeco</title>
	<meta
		name="description"
		content="Productos honestos de socios locales: alimentos, cuidado personal y hogar con impacto."
	/>
</svelte:head>

<section class="hero">
	<div class="hero-copy">
		<p class="hero-eyebrow">
			<svg viewBox="0 0 24 24" aria-hidden="true"
				><path d="M12 21c0-6 0-9 8-12 0 8-3 11-8 12Z" /><path
					d="M12 21C12 14 10 9 4 6c-1 7 2 12 8 15Z"
				/></svg
			>
			Mercado con propósito
		</p>
		<h1>Compra algo que<br /><em>cuida el mundo.</em></h1>
		<p class="hero-text">
			Productos honestos, hechos por socios locales que convierten sus oficios en impacto para la
			comunidad.
		</p>
		<div class="hero-actions">
			<button class="hero-cta" type="button" onclick={scrollToShelf}>
				Explorar novedades
				<svg viewBox="0 0 20 20" aria-hidden="true"
					><path d="M5 15 15 5M8 5h7v7" /></svg
				>
			</button>
			<span class="hero-socios">
				<svg viewBox="0 0 24 24" aria-hidden="true"
					><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path
						d="M16 6.5a3 3 0 0 1 0 6"
					/></svg
				>
				{sociosCount} socios activos
			</span>
		</div>
	</div>

	<div class="hero-art" aria-hidden="true">
		<span class="hero-tag tag-local">Hecho localmente</span>
		<span class="hero-circle">
			<svg viewBox="0 0 64 64"
				><path d="M32 54c0-13 0-19 14-25 0 14-6 22-14 25Z" /><path
					d="M32 54C32 41 28 32 15 26c-1 14 5 24 17 28Z"
				/><path d="M32 54V38" /></svg
			>
		</span>
		<span class="hero-tag tag-count">{totalProducts} productos</span>
	</div>
</section>

<section class="shelf-head" id="catalogo-grilla">
	<div>
		<p class="eyebrow">Selección de la comunidad</p>
		<h2>Encuentra tu próximo favorito</h2>
	</div>

	<div class="chips" role="group" aria-label="Filtrar por categoría">
		<button
			class="chip"
			class:active={!categorySlug}
			type="button"
			onclick={() => selectCategory('')}
		>
			Todos
		</button>
		{#each chips as chip (chip.slug)}
			<button
				class="chip"
				class:active={categorySlug === chip.slug}
				type="button"
				onclick={() => selectCategory(chip.slug)}
			>
				{chip.label}
			</button>
		{/each}
	</div>
</section>

{#if featured}
	<article class="socio">
		<span class="socio-avatar" aria-hidden="true">{initials(featured.name)}</span>
		<div class="socio-id">
			<p class="socio-eyebrow">
				Socio destacado{featured.category ? ` · ${featured.category}` : ''}
			</p>
			<h3>{featured.name}</h3>
		</div>
		<div class="socio-side">
			{#if featured.description}
				<p>{toPlainText(featured.description, 140)}</p>
			{/if}
			<a
				class="socio-link"
				href={featured.slug ? `/emprendimientos/${featured.slug}` : '/emprendimientos'}
			>
				Ver socio
				<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M8 5h7v7" /></svg>
			</a>
		</div>
	</article>
{/if}

{#if searchTerm}
	<p class="search-note">
		Resultados para <strong>“{searchTerm}”</strong>
		<button type="button" onclick={() => goto('/catalogo')}>Limpiar</button>
	</p>
{/if}

{#if errorMessage}
	<p class="banner" role="alert">{errorMessage}</p>
{/if}

{#if isLoading}
	<p class="state">Cargando catálogo…</p>
{:else if products.length === 0}
	<p class="state">
		{searchTerm
			? 'No encontramos productos con esa búsqueda.'
			: 'Todavía no hay productos publicados en esta categoría.'}
	</p>
{:else}
	<section class="grid" aria-label="Productos">
		{#each products as product (product.id)}
			<article class="pcard">
				<div class="pcard-media">
					{#if product.imageUrl}
						<img src={product.imageUrl} alt={product.name} loading="lazy" />
					{:else}
						<span class="pcard-placeholder" aria-hidden="true">
							<svg viewBox="0 0 24 24"
								><path d="M12 21c0-6 0-9 8-12 0 8-3 11-8 12Z" /><path
									d="M12 21C12 14 10 9 4 6c-1 7 2 12 8 15Z"
								/></svg
							>
						</span>
					{/if}

					{#if categoryNameOf(product)}
						<span class="pcard-tag">{categoryNameOf(product)}</span>
					{/if}

					<span class="pcard-heart" aria-hidden="true">
						<svg viewBox="0 0 20 20"
							><path d="M3 7.5 5 4h10l2 3.5M4.2 7.5h11.6V16H4.2Z" /><path
								d="M8 16v-4h4v4"
							/></svg
						>
					</span>

					<span class="pcard-impact">
						<svg viewBox="0 0 24 24" aria-hidden="true"
							><path d="M12 21c0-6 0-9 8-12 0 8-3 11-8 12Z" /><path
								d="M12 21C12 14 10 9 4 6c-1 7 2 12 8 15Z"
							/></svg
						>
						Compra con impacto
					</span>
				</div>

				<div class="pcard-body">
					<strong>{product.name}</strong>
					{#if product.description}
						<span class="pcard-desc">{toPlainText(product.description, 70)}</span>
					{/if}
					<div class="pcard-foot">
						<span class="pcard-price">
							{formatCurrency(product.priceCents, product.currencyCode)}
						</span>
						<span class="pcard-arrow" aria-hidden="true">
							<svg viewBox="0 0 20 20"><path d="M6 14 14 6M8.5 6H14v5.5" /></svg>
						</span>
					</div>
				</div>
			</article>
		{/each}
	</section>

	{#if pageNumber < totalPages}
		<button class="more" type="button" onclick={loadMore} disabled={isLoadingMore}>
			{isLoadingMore ? 'Cargando…' : 'Cargar más productos'}
		</button>
	{/if}
{/if}

<style>
	.hero {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1.15fr) minmax(0, 1fr);
		overflow: hidden;
		align-items: center;
		gap: 20px;
		margin-bottom: 34px;
		padding: 34px 38px;
		border-radius: var(--iz-radius-lg);
		background: linear-gradient(104deg, #1b4733 0%, #276149 52%, #3d7f57 100%);
		box-shadow: 0 18px 38px rgb(27 71 51 / 22%);
	}

	.hero-eyebrow {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 16px;
		color: #b6d9b6;
		font-size: 10.5px;
		font-weight: 700;
		letter-spacing: 0.9px;
		text-transform: uppercase;
	}

	.hero-eyebrow svg {
		width: 16px;
		height: 16px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.5;
	}

	.hero h1 {
		margin: 0 0 16px;
		color: #f3f8f2;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 44px;
		font-weight: 500;
		line-height: 1.06;
		letter-spacing: -1px;
	}

	.hero h1 em {
		color: #b6e08d;
		font-style: normal;
	}

	.hero-text {
		max-width: 430px;
		margin: 0 0 24px;
		color: #cfe2d2;
		font-size: 13px;
		line-height: 1.65;
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 22px;
	}

	.hero-cta {
		display: inline-flex;
		align-items: center;
		gap: 9px;
		padding: 11px 18px;
		border: 0;
		border-radius: 9px;
		background: #ffffff;
		color: #1b4733;
		font: inherit;
		font-size: 12.5px;
		font-weight: 650;
		cursor: pointer;
	}

	.hero-cta svg {
		width: 14px;
		height: 14px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.7;
	}

	.hero-socios {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		color: #d5e7d7;
		font-size: 12.5px;
	}

	.hero-socios svg {
		width: 18px;
		height: 18px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.5;
	}

	.hero-art {
		position: relative;
		display: grid;
		min-height: 230px;
		place-items: center;
	}

	.hero-circle {
		display: grid;
		width: 178px;
		height: 178px;
		place-items: center;
		border-radius: 50%;
		background: #e8f4e2;
		box-shadow: 0 16px 36px rgb(12 45 30 / 22%);
	}

	.hero-circle svg {
		width: 92px;
		height: 92px;
		fill: none;
		stroke: #2f6b45;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 2.4;
	}

	.hero-tag {
		position: absolute;
		padding: 7px 13px;
		border-radius: 9px;
		background: #ffffff;
		box-shadow: 0 10px 22px rgb(12 45 30 / 20%);
		color: #1b4733;
		font-size: 11.5px;
		font-weight: 700;
	}

	.tag-local {
		top: 8%;
		right: 6%;
		transform: rotate(3deg);
	}

	.tag-count {
		bottom: 10%;
		left: 8%;
		transform: rotate(-2deg);
	}

	.shelf-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 18px;
		scroll-margin-top: 90px;
	}

	.eyebrow {
		margin: 0 0 9px;
		color: var(--iz-muted);
		font-size: 10px;
		font-weight: 750;
		letter-spacing: 1.4px;
		text-transform: uppercase;
	}

	.shelf-head h2 {
		margin: 0;
		color: var(--iz-ink);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 30px;
		font-weight: 600;
		letter-spacing: -0.7px;
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

	.socio {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 16px;
		margin-bottom: 18px;
		padding: 18px 22px;
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-md);
		background: var(--iz-surface);
		box-shadow: var(--iz-shadow-sm);
	}

	.socio-avatar {
		display: grid;
		width: 46px;
		height: 46px;
		flex: 0 0 auto;
		place-items: center;
		border-radius: 12px;
		background: #ddd1b6;
		color: #6a5b3e;
		font-size: 15px;
		font-weight: 700;
	}

	.socio-id {
		min-width: 190px;
	}

	.socio-eyebrow {
		margin: 0 0 4px;
		color: var(--iz-muted);
		font-size: 10px;
		font-weight: 750;
		letter-spacing: 1.1px;
		text-transform: uppercase;
	}

	.socio-id h3 {
		margin: 0;
		color: var(--iz-ink);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 21px;
		font-weight: 600;
	}

	.socio-side {
		display: flex;
		min-width: 220px;
		flex: 1;
		align-items: center;
		gap: 18px;
	}

	.socio-side p {
		flex: 1;
		margin: 0;
		color: var(--iz-muted);
		font-size: 12.5px;
		line-height: 1.5;
	}

	.socio-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--iz-green-700);
		font-size: 12px;
		font-weight: 650;
		white-space: nowrap;
		text-decoration: none;
	}

	.socio-link svg {
		width: 13px;
		height: 13px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.7;
	}

	.search-note {
		display: flex;
		align-items: center;
		gap: 10px;
		margin: 0 0 14px;
		color: var(--iz-muted);
		font-size: 12.5px;
	}

	.search-note strong {
		color: var(--iz-ink);
	}

	.search-note button {
		padding: 5px 12px;
		border: 1px solid var(--iz-line);
		border-radius: 999px;
		background: var(--iz-surface);
		color: var(--iz-green-700);
		font: inherit;
		font-size: 11.5px;
		font-weight: 650;
		cursor: pointer;
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
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 16px;
	}

	.pcard {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-md);
		background: var(--iz-surface);
		box-shadow: var(--iz-shadow-sm);
		transition:
			transform 160ms ease,
			box-shadow 160ms ease;
	}

	.pcard:hover {
		transform: translateY(-2px);
		box-shadow: var(--iz-shadow-md);
	}

	.pcard-media {
		position: relative;
		display: block;
		height: 176px;
		background: var(--iz-surface-muted);
	}

	.pcard-media img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	/* Velo inferior para que "Compra con impacto" se lea sobre fotos claras. */
	.pcard-media::after {
		content: '';
		position: absolute;
		inset: auto 0 0 0;
		height: 46%;
		background: linear-gradient(to top, rgb(12 34 22 / 58%), transparent);
		pointer-events: none;
	}

	.pcard-placeholder {
		display: grid;
		height: 100%;
		place-items: center;
		background: linear-gradient(140deg, #e7f0e4, #d5e6d3);
	}

	.pcard-placeholder svg {
		width: 46px;
		height: 46px;
		fill: none;
		stroke: var(--iz-green-600);
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.6;
	}

	.pcard-tag {
		position: absolute;
		z-index: 1;
		top: 11px;
		left: 11px;
		padding: 4px 11px;
		border-radius: 999px;
		background: rgb(255 255 255 / 93%);
		color: #3d5a46;
		font-size: 10px;
		font-weight: 650;
	}

	.pcard-heart {
		position: absolute;
		z-index: 1;
		top: 11px;
		right: 11px;
		display: grid;
		width: 30px;
		height: 30px;
		place-items: center;
		border-radius: 50%;
		background: rgb(255 255 255 / 93%);
		color: #6f7d74;
	}

	.pcard-heart svg {
		width: 16px;
		height: 16px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.5;
	}

	.pcard-impact {
		position: absolute;
		z-index: 1;
		bottom: 11px;
		left: 11px;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: #f4f8f2;
		font-size: 10.5px;
		font-weight: 650;
		text-shadow: 0 1px 6px rgb(12 30 20 / 55%);
	}

	.pcard-impact svg {
		width: 14px;
		height: 14px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.6;
	}

	.pcard-body {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 6px;
		padding: 14px;
	}

	.pcard-body strong {
		color: var(--iz-ink);
		font-size: 13.5px;
		font-weight: 650;
	}

	.pcard-desc {
		display: -webkit-box;
		overflow: hidden;
		color: var(--iz-muted);
		font-size: 11.5px;
		line-height: 1.45;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}

	.pcard-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: auto;
		padding-top: 8px;
	}

	.pcard-price {
		color: var(--iz-ink);
		font-size: 15px;
		font-weight: 700;
	}

	.pcard-arrow {
		display: grid;
		width: 28px;
		height: 28px;
		place-items: center;
		border-radius: 50%;
		background: var(--iz-green-100);
		color: var(--iz-green-700);
	}

	.pcard-arrow svg {
		width: 15px;
		height: 15px;
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

	@media (max-width: 1200px) {
		.hero {
			grid-template-columns: minmax(0, 1fr);
		}

		.hero-art {
			display: none;
		}

		.grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	@media (max-width: 820px) {
		.hero {
			padding: 26px 22px;
		}

		.hero h1 {
			font-size: 32px;
		}

		.grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 520px) {
		.grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
