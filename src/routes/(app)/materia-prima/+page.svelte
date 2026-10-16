<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import {
		createProductCheckout,
		getPublicProducts,
		ApiServiceError,
		type Product
	} from '#lib/services/api/api.service.js';
	import { loadSession, session } from '#lib/services/api/session.svelte.js';
	import { formatCurrency, toPlainText } from '#lib/utils/format.js';

	const PAGE_SIZE = 12;

	let products = $state<Product[]>([]);
	let total = $state(0);
	let isLoading = $state(true);
	let isLoadingMore = $state(false);
	let errorMessage = $state('');
	let pageNumber = $state(1);
	let totalPages = $state(1);
	let buyingProductId = $state('');
	let buyError = $state('');
	let allowed = $state(false);

	const searchTerm = $derived(page.url.searchParams.get('q') ?? '');

	// Solo socios (emprendedor) y administradores ven la materia prima.
	onMount(() => {
		void loadSession().then(() => {
			const role = session.user?.role;
			if (role === 'emprendedor' || role === 'admin') {
				allowed = true;
			} else {
				void goto('/dashboard');
			}
		});
	});

	// La grilla se recarga sola si la búsqueda del header navega con ?q=.
	$effect(() => {
		if (!allowed) return;
		void loadProducts(searchTerm);
	});

	async function loadProducts(term: string) {
		isLoading = true;
		errorMessage = '';
		pageNumber = 1;
		try {
			const result = await getPublicProducts({
				page: 1,
				limit: PAGE_SIZE,
				q: term || undefined,
				type: 'materia_prima'
			});
			products = result.items;
			total = result.total;
			totalPages = result.totalPages;
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'No se pudo cargar la materia prima.';
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
				type: 'materia_prima'
			});
			products = [...products, ...result.items];
			pageNumber += 1;
			totalPages = result.totalPages;
		} catch (error) {
			errorMessage =
				error instanceof Error ? error.message : 'No se pudo cargar más materia prima.';
		} finally {
			isLoadingMore = false;
		}
	}

	/**
	 * Crea la intención de pago en la pasarela y redirige al checkout hosted.
	 * El monto lo fija el servidor con el precio del producto.
	 */
	async function buyProduct(product: Product) {
		if (buyingProductId) return;
		buyError = '';
		buyingProductId = product.id;
		try {
			const session = await createProductCheckout(product);
			window.location.href = session.checkoutUrl;
		} catch (error) {
			buyError =
				error instanceof ApiServiceError
					? error.message
					: 'No se pudo iniciar el pago. Inténtalo de nuevo.';
			buyingProductId = '';
		}
	}
</script>

<svelte:head>
	<title>Materia prima | Izeco</title>
	<meta
		name="description"
		content="Materia prima recuperada en las jornadas de limpieza y puesta en circulación por Izeco para darle una segunda vida."
	/>
</svelte:head>

{#if allowed}
	<section class="hero">
	<div class="hero-copy">
		<p class="hero-eyebrow">
			<svg viewBox="0 0 24 24" aria-hidden="true"
				><path d="M12 21c0-6 0-9 8-12 0 8-3 11-8 12Z" /><path
					d="M12 21C12 14 10 9 4 6c-1 7 2 12 8 15Z"
				/></svg
			>
			Vendida por la plataforma
		</p>
		<h1>Materia prima<br /><em>con trazabilidad.</em></h1>
		<p class="hero-text">
			El material que recuperamos en las jornadas de limpieza se limpia, clasifica y vuelve al
			ciclo como materia prima lista para transformar. Aquí no hay intermediarios: la vendemos
			nosotros.
		</p>

		<ol class="chain" aria-label="Cómo nace la materia prima">
			<li><span>1</span> Jornada de limpieza</li>
			<li><span>2</span> Reciclables clasificados</li>
			<li><span>3</span> Materia prima</li>
			<li><span>4</span> Tu proceso</li>
		</ol>
	</div>

	<div class="hero-art" aria-hidden="true">
		<span class="hero-tag tag-top">Recuperado</span>
		<span class="hero-circle">
			<svg viewBox="0 0 64 64"
				><path d="M20 42c8-2 14-6 18-13" /><path d="M24 20h20v20" /><path
					d="M44 20 22 42"
				/></svg
			>
		</span>
		<span class="hero-tag tag-bottom">{total} materiales</span>
	</div>
</section>

<section class="shelf-head">
	<div>
		<p class="eyebrow">Material recuperado</p>
		<h2>Elige tu materia prima</h2>
	</div>
</section>

{#if searchTerm}
	<p class="search-note">
		Resultados para <strong>“{searchTerm}”</strong>
		<a href="/materia-prima">Limpiar</a>
	</p>
{/if}

{#if errorMessage}
	<p class="banner" role="alert">{errorMessage}</p>
{/if}

{#if buyError}
	<p class="banner" role="alert">{buyError}</p>
{/if}

{#if isLoading}
	<p class="state">Cargando materia prima…</p>
{:else if products.length === 0}
	<p class="state">
		{searchTerm
			? 'No encontramos materia prima con esa búsqueda.'
			: 'Todavía no hay materia prima publicada.'}
	</p>
{:else}
	<section class="grid" aria-label="Materia prima">
		{#each products as product (product.id)}
			<article class="pcard">
				<a class="pcard-link" href={`/catalogo/${product.id}`} aria-label={`Ver ${product.name}`}>
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

						<span class="pcard-tag">Materia prima</span>
						<span class="pcard-impact">
							<svg viewBox="0 0 24 24" aria-hidden="true"
								><path d="M12 21c0-6 0-9 8-12 0 8-3 11-8 12Z" /><path
									d="M12 21C12 14 10 9 4 6c-1 7 2 12 8 15Z"
									/></svg
								>
							Segunda vida
						</span>
					</div>

					<div class="pcard-body">
						<strong>{product.name}</strong>
						{#if product.description}
							<span class="pcard-desc">{toPlainText(product.description, 72)}</span>
						{/if}
					</div>
				</a>

				<div class="pcard-foot">
					<span class="pcard-price">
						{formatCurrency(product.priceCents, product.currencyCode)}
					</span>
					<button
						class="pcard-buy"
						type="button"
						disabled={buyingProductId === product.id ||
							(product.stock !== null && product.stock <= 0)}
						onclick={() => buyProduct(product)}
					>
						{#if buyingProductId === product.id}
							Abriendo…
						{:else if product.stock !== null && product.stock <= 0}
							Agotado
						{:else}
							Comprar
						{/if}
					</button>
				</div>
			</article>
		{/each}
	</section>

	{#if pageNumber < totalPages}
		<button class="more" type="button" onclick={loadMore} disabled={isLoadingMore}>
			{isLoadingMore ? 'Cargando…' : 'Cargar más materia prima'}
		</button>
	{/if}
{/if}
{/if}

<style>
	.hero {
		position: relative;
		display: grid;
		grid-template-columns: minmax(0, 1.2fr) minmax(0, 0.8fr);
		overflow: hidden;
		align-items: center;
		gap: 20px;
		margin-bottom: 34px;
		padding: 34px 38px;
		border-radius: var(--iz-radius-lg);
		background: linear-gradient(104deg, #3d3520 0%, #6d5a2c 55%, #977d3c 100%);
		box-shadow: 0 18px 38px rgb(61 53 32 / 22%);
	}

	.hero-eyebrow {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 16px;
		color: #e9dcae;
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
		color: #faf6ea;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 42px;
		font-weight: 500;
		line-height: 1.06;
		letter-spacing: -1px;
	}

	.hero h1 em {
		color: #f2d27a;
		font-style: normal;
	}

	.hero-text {
		max-width: 470px;
		margin: 0 0 22px;
		color: #efe6cf;
		font-size: 13px;
		line-height: 1.65;
	}

	.chain {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.chain li {
		display: inline-flex;
		align-items: center;
		gap: 7px;
		padding: 6px 12px 6px 7px;
		border-radius: 999px;
		background: rgb(255 255 255 / 14%);
		color: #f6efda;
		font-size: 11.5px;
		font-weight: 600;
	}

	.chain span {
		display: grid;
		width: 18px;
		height: 18px;
		place-items: center;
		border-radius: 50%;
		background: #f2d27a;
		color: #4a3c18;
		font-size: 10.5px;
		font-weight: 800;
	}

	.hero-art {
		position: relative;
		display: grid;
		min-height: 220px;
		place-items: center;
	}

	.hero-circle {
		display: grid;
		width: 168px;
		height: 168px;
		place-items: center;
		border-radius: 50%;
		background: #f6efda;
		box-shadow: 0 16px 36px rgb(30 24 8 / 30%);
	}

	.hero-circle svg {
		width: 86px;
		height: 86px;
		fill: none;
		stroke: #6d5a2c;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 2.6;
	}

	.hero-tag {
		position: absolute;
		padding: 7px 13px;
		border-radius: 9px;
		background: #ffffff;
		box-shadow: 0 10px 22px rgb(30 24 8 / 26%);
		color: #4a3c18;
		font-size: 11.5px;
		font-weight: 700;
	}

	.tag-top {
		top: 8%;
		right: 6%;
		transform: rotate(3deg);
	}

	.tag-bottom {
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

	.search-note a {
		padding: 5px 12px;
		border: 1px solid var(--iz-line);
		border-radius: 999px;
		background: var(--iz-surface);
		color: var(--iz-green-700);
		font-size: 11.5px;
		font-weight: 650;
		text-decoration: none;
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

	.pcard-link {
		display: flex;
		flex: 1;
		flex-direction: column;
		color: inherit;
		text-decoration: none;
	}

	.pcard-link:focus-visible {
		outline: 2px solid var(--iz-green-600);
		outline-offset: -2px;
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

	.pcard-media::after {
		content: '';
		position: absolute;
		inset: auto 0 0 0;
		height: 46%;
		background: linear-gradient(to top, rgb(38 30 10 / 58%), transparent);
		pointer-events: none;
	}

	.pcard-placeholder {
		display: grid;
		height: 100%;
		place-items: center;
		background: linear-gradient(140deg, #f2edda, #e4dcc0);
	}

	.pcard-placeholder svg {
		width: 46px;
		height: 46px;
		fill: none;
		stroke: #8a7538;
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
		color: #6d5a2c;
		font-size: 10px;
		font-weight: 650;
	}

	.pcard-impact {
		position: absolute;
		z-index: 1;
		bottom: 11px;
		left: 11px;
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: #fbf6e6;
		font-size: 10.5px;
		font-weight: 650;
		text-shadow: 0 1px 6px rgb(30 22 6 / 55%);
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
		padding: 14px 14px 8px;
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
		gap: 10px;
		margin-top: auto;
		padding: 8px 14px 14px;
	}

	.pcard-price {
		color: var(--iz-ink);
		font-size: 15px;
		font-weight: 700;
	}

	.pcard-buy {
		padding: 8px 15px;
		border: 0;
		border-radius: 999px;
		background: #6d5a2c;
		color: #fbf6e6;
		font: inherit;
		font-size: 12px;
		font-weight: 650;
		white-space: nowrap;
		cursor: pointer;
		transition:
			background 140ms ease,
			transform 140ms ease;
	}

	.pcard-buy:hover:not(:disabled) {
		background: #57471f;
		transform: translateY(-1px);
	}

	.pcard-buy:disabled {
		background: var(--iz-line-strong);
		color: var(--iz-muted);
		cursor: not-allowed;
	}

	.more {
		display: block;
		width: 100%;
		margin-top: 18px;
		padding: 13px;
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-sm);
		background: var(--iz-surface);
		color: #6d5a2c;
		font: inherit;
		font-size: 12.5px;
		font-weight: 650;
		cursor: pointer;
	}

	.more:hover:not(:disabled) {
		background: #f6f1e2;
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
			font-size: 31px;
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
