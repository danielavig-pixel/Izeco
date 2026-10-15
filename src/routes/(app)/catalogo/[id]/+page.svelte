<script lang="ts">
	import { page } from '$app/state';
	import { onMount } from 'svelte';
	import {
		createProductCheckout,
		getCategoryCounts,
		getPublicEntrepreneurs,
		getPublicProductById,
		ApiServiceError,
		type CategoryCount,
		type Entrepreneur,
		type Product
	} from '#lib/services/api/api.service.js';
	import { formatCurrency, initials, toPlainText } from '#lib/utils/format.js';

	const id = $derived(page.params.id ?? '');

	let product = $state<Product | null>(null);
	let origin = $state<Entrepreneur | null>(null);
	let categoryName = $state('');
	let isLoading = $state(true);
	let errorMessage = $state('');
	let coverFailed = $state(false);
	let galleryIndex = $state(0);
	let buying = $state(false);
	let buyError = $state('');

	// El detalle de producto trae solo el id del socio; se resuelve con el listado público.
	onMount(async () => {
		await load(id);
	});

	$effect(() => {
		if (id) void load(id);
	});

	async function load(currentId: string) {
		if (!currentId) return;
		isLoading = true;
		errorMessage = '';
		product = null;
		origin = null;
		coverFailed = false;
		galleryIndex = 0;

		try {
			const found = await getPublicProductById(currentId);
			product = found;

			const [counts, entrepreneurs] = await Promise.all([
				getCategoryCounts().catch(() => [] as CategoryCount[]),
				found.entrepreneurId
					? getPublicEntrepreneurs({ limit: 50 }).catch(() => ({
							items: [] as Entrepreneur[],
							total: 0,
							page: 1,
							limit: 50,
							totalPages: 1
						}))
					: Promise.resolve({
							items: [] as Entrepreneur[],
							total: 0,
							page: 1,
							limit: 50,
							totalPages: 1
						})
			]);

			categoryName = counts.find((count) => count.categoryId === found.categoryId)?.name ?? '';
			origin = entrepreneurs.items.find((e) => e.id === found.entrepreneurId) ?? null;
		} catch (error) {
			errorMessage =
				error instanceof ApiServiceError && error.status === 404
					? 'No encontramos este producto.'
					: error instanceof Error
						? error.message
						: 'No se pudo cargar el producto.';
		} finally {
			isLoading = false;
		}
	}

	function selectImage(index: number) {
		galleryIndex = index;
	}

	async function buy() {
		if (!product || buying) return;
		buyError = '';
		buying = true;
		try {
			const session = await createProductCheckout(product);
			window.location.href = session.checkoutUrl;
		} catch (error) {
			buyError =
				error instanceof ApiServiceError
					? error.message
					: 'No se pudo iniciar el pago. Inténtalo de nuevo.';
			buying = false;
		}
	}
</script>

<svelte:head>
	<title>{product ? `${product.name} | Izeco` : 'Producto | Izeco'}</title>
	<meta
		name="description"
		content={product
			? `${product.name}: ${toPlainText(product.description, 160)}`
			: 'Producto del catálogo de Izeco.'}
	/>
</svelte:head>

<a class="back" href="/catalogo">
	<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11 5 6 10l5 5" /></svg>
	Volver al catálogo
</a>

{#if isLoading}
	<p class="state">Cargando producto…</p>
{:else if errorMessage}
	<div class="error-card">
		<p role="alert">{errorMessage}</p>
		<a href="/catalogo">Volver al catálogo</a>
	</div>
{:else if product}
	<header class="hero">
		<p class="eyebrow">Catálogo · Compra con impacto</p>
		<h1>{product.name}</h1>
		<div class="tags">
			{#if categoryName}
				<span class="tag">{categoryName}</span>
			{/if}
			{#if product.available !== null}
				<span class="tag">
					{product.available > 0 ? `Quedan ${product.available} disponibles` : 'Agotado'}
				</span>
			{:else}
				<span class="tag">Disponible</span>
			{/if}
		</div>
	</header>

	{#if product.images.length > 0 && !coverFailed}
		<figure class="cover">
			<img
				src={product.images[galleryIndex] ?? product.imageUrl}
				alt={product.name}
				onerror={() => (coverFailed = true)}
			/>
			{#if product.images.length > 1}
				<div class="thumbs" role="group" aria-label="Imágenes del producto">
					{#each product.images as image, index (image)}
						<button
							class="thumb"
							class:active={index === galleryIndex}
							type="button"
							onclick={() => selectImage(index)}
							aria-label={`Ver imagen ${index + 1}`}
						>
							<img src={image} alt="" loading="lazy" />
						</button>
					{/each}
				</div>
			{/if}
		</figure>
	{/if}

	<div class="columns">
		<section class="panel">
			<h2>Sobre este producto</h2>
			<p class="description">{toPlainText(product.description, 4000)}</p>
		</section>

		<aside class="side">
			<section class="panel buy">
				<h2>Precio</h2>
				<p class="price">{formatCurrency(product.priceCents, product.currencyCode)}</p>

				{#if product.available !== null && product.available <= 0}
					<p class="hint">Este producto está agotado por ahora.</p>
					<button class="primary" type="button" disabled>Agotado</button>
				{:else}
					{#if product.available !== null}
						<p class="hint">Quedan {product.available} unidades disponibles.</p>
					{/if}
					<button class="primary" type="button" onclick={buy} disabled={buying}>
						{buying ? 'Abriendo…' : 'Comprar ahora'}
					</button>
				{/if}

				{#if buyError}
					<p class="feedback error" role="alert">{buyError}</p>
				{/if}
			</section>

			{#if origin}
				<section class="panel origin">
					<h2>De dónde salió</h2>
					<p class="panel-sub">El socio local que elabora este producto.</p>
					<div class="origin-card">
						{#if origin.logoUrl}
							<img class="origin-logo" src={origin.logoUrl} alt="" loading="lazy" />
						{:else}
							<span class="origin-logo" aria-hidden="true">{initials(origin.name)}</span>
						{/if}
						<div class="origin-id">
							<strong>{origin.name}</strong>
							{#if origin.category}
								<span class="origin-category">{origin.category}</span>
							{/if}
						</div>
					</div>
					{#if origin.description}
						<p class="origin-desc">{toPlainText(origin.description, 180)}</p>
					{/if}
					<a class="origin-link" href={`/emprendimientos/${origin.slug}`}>
						Ver emprendimiento
						<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M8 5h7v7" /></svg>
					</a>
				</section>
			{/if}
		</aside>
	</div>
{/if}

<style>
	.back {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		margin-bottom: 16px;
		color: var(--iz-muted);
		font-size: 12.5px;
		font-weight: 600;
		text-decoration: none;
	}

	.back:hover {
		color: var(--iz-green-700);
	}

	.back svg {
		width: 15px;
		height: 15px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.8;
	}

	.state {
		margin: 0;
		padding: 46px 20px;
		color: var(--iz-muted);
		font-size: 13px;
		text-align: center;
	}

	.error-card {
		padding: 34px 24px;
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-md);
		background: var(--iz-surface);
		text-align: center;
	}

	.error-card p {
		margin: 0 0 14px;
		color: var(--iz-muted);
		font-size: 13px;
	}

	.error-card a {
		color: var(--iz-green-700);
		font-size: 12.5px;
		font-weight: 650;
	}

	.hero {
		margin-bottom: 18px;
		padding: 30px 28px;
		border-radius: var(--iz-radius-lg);
		background: linear-gradient(104deg, #1b4733 0%, #276149 58%, #3d7f57 100%);
		box-shadow: 0 18px 38px rgb(27 71 51 / 20%);
	}

	.eyebrow {
		margin: 0 0 10px;
		color: #a9d089;
		font-size: 10px;
		font-weight: 750;
		letter-spacing: 1.4px;
		text-transform: uppercase;
	}

	.hero h1 {
		margin: 0;
		color: #f6faf3;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 33px;
		font-weight: 600;
		letter-spacing: -0.6px;
		line-height: 1.16;
	}

	.tags {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 16px;
	}

	.tag {
		padding: 5px 12px;
		border-radius: 999px;
		background: rgb(255 255 255 / 16%);
		color: #e4f0e2;
		font-size: 11px;
		font-weight: 650;
	}

	.cover {
		margin: 0 0 18px;
		overflow: hidden;
		border-radius: var(--iz-radius-md);
		box-shadow: var(--iz-shadow-md);
	}

	.cover > img {
		display: block;
		width: 100%;
		height: 320px;
		object-fit: cover;
	}

	.thumbs {
		display: flex;
		gap: 8px;
		padding: 10px;
		background: var(--iz-surface);
		overflow-x: auto;
	}

	.thumb {
		flex: 0 0 auto;
		width: 56px;
		height: 56px;
		padding: 0;
		overflow: hidden;
		border: 2px solid transparent;
		border-radius: 8px;
		background: var(--iz-surface-muted);
		cursor: pointer;
	}

	.thumb.active {
		border-color: var(--iz-green-600);
	}

	.thumb img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.columns {
		display: grid;
		grid-template-columns: minmax(0, 1.6fr) minmax(300px, 1fr);
		gap: 18px;
	}

	.side {
		display: flex;
		flex-direction: column;
		gap: 18px;
	}

	.panel {
		padding: 22px;
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-md);
		background: var(--iz-surface);
		box-shadow: var(--iz-shadow-sm);
	}

	.panel h2 {
		margin: 0 0 10px;
		color: var(--iz-ink);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 19px;
		font-weight: 600;
	}

	.panel-sub {
		margin: -4px 0 12px;
		color: var(--iz-muted);
		font-size: 12px;
	}

	.description {
		margin: 0;
		color: var(--iz-ink-soft);
		font-size: 13px;
		line-height: 1.7;
	}

	.price {
		margin: 0 0 12px;
		color: var(--iz-ink);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 28px;
		font-weight: 600;
	}

	.hint {
		margin: 0 0 14px;
		color: var(--iz-muted);
		font-size: 12.5px;
		line-height: 1.55;
	}

	.primary {
		width: 100%;
		padding: 12px;
		border: 0;
		border-radius: 11px;
		background: var(--iz-green-800);
		color: #f4f7f2;
		font: inherit;
		font-size: 13px;
		font-weight: 650;
		cursor: pointer;
	}

	.primary:hover:not(:disabled) {
		background: var(--iz-green-900);
	}

	.primary:disabled {
		background: #dfe4d9;
		color: #7d8a80;
		cursor: default;
	}

	.feedback {
		margin: 12px 0 0;
		font-size: 12px;
		line-height: 1.5;
	}

	.feedback.error {
		color: var(--iz-danger);
	}

	.origin-card {
		display: flex;
		align-items: center;
		gap: 12px;
		margin-bottom: 12px;
	}

	.origin-logo {
		display: grid;
		width: 48px;
		height: 48px;
		flex: 0 0 auto;
		place-items: center;
		border-radius: 12px;
		background: #ddd1b6;
		color: #6a5b3e;
		font-size: 15px;
		font-weight: 700;
		object-fit: cover;
	}

	.origin-id {
		display: flex;
		flex-direction: column;
		gap: 2px;
	}

	.origin-id strong {
		color: var(--iz-ink);
		font-size: 15px;
		font-weight: 650;
	}

	.origin-category {
		color: var(--iz-muted);
		font-size: 12px;
	}

	.origin-desc {
		margin: 0 0 12px;
		color: var(--iz-muted);
		font-size: 12.5px;
		line-height: 1.55;
	}

	.origin-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--iz-green-700);
		font-size: 12px;
		font-weight: 650;
		text-decoration: none;
	}

	.origin-link svg {
		width: 13px;
		height: 13px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.7;
	}

	@media (max-width: 980px) {
		.columns {
			grid-template-columns: minmax(0, 1fr);
		}

		.cover > img {
			height: 200px;
		}

		.hero h1 {
			font-size: 26px;
		}
	}
</style>
