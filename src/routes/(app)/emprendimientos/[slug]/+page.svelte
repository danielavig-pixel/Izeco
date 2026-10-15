<script lang="ts">
	import { page } from '$app/state';
	import {
		ApiServiceError,
		getPublicEntrepreneurBySlug,
		getPublicProducts,
		type Entrepreneur,
		type Product
	} from '#lib/services/api/api.service.js';
	import { formatCurrency, initials, toPlainText } from '#lib/utils/format.js';

	let socio = $state<Entrepreneur | null>(null);
	let products = $state<Product[]>([]);
	let isLoading = $state(true);
	let errorMessage = $state('');
	let logoFailed = $state(false);

	const slug = $derived(page.params.slug ?? '');

	$effect(() => {
		if (slug) void load(slug);
	});

	async function load(currentSlug: string) {
		isLoading = true;
		errorMessage = '';
		socio = null;
		products = [];
		logoFailed = false;
		try {
			const found = await getPublicEntrepreneurBySlug(currentSlug);
			socio = found;
			const catalog = await getPublicProducts({ entrepreneurId: found.id, limit: 12 });
			products = catalog.items;
		} catch (error) {
			errorMessage =
				error instanceof ApiServiceError && error.status === 404
					? 'No encontramos este emprendimiento.'
					: error instanceof Error
						? error.message
						: 'No se pudo cargar la ficha.';
		} finally {
			isLoading = false;
		}
	}
</script>

<svelte:head>
	<title>{socio ? `${socio.name} | Izeco` : 'Emprendimiento | Izeco'}</title>
	<meta
		name="description"
		content={socio
			? `${socio.name}: ${toPlainText(socio.description, 120)}`
			: 'Ficha de un emprendimiento de Izeco.'}
	/>
</svelte:head>

<a class="back" href="/emprendimientos">
	<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M11 5 6 10l5 5" /></svg>
	Todos los socios
</a>

{#if isLoading}
	<p class="state">Cargando ficha…</p>
{:else if errorMessage}
	<div class="error-card">
		<p role="alert">{errorMessage}</p>
		<a href="/emprendimientos">Volver al directorio</a>
	</div>
{:else if socio}
	<header class="socio-head">
		{#if socio.logoUrl && !logoFailed}
			<img class="socio-logo" src={socio.logoUrl} alt={socio.name} onerror={() => (logoFailed = true)} />
		{:else}
			<span class="socio-logo initials" aria-hidden="true">{initials(socio.name)}</span>
		{/if}

		<div class="socio-main">
			{#if socio.category}
				<p class="eyebrow">Socio de Izeco · {socio.category}</p>
			{:else}
				<p class="eyebrow">Socio de Izeco</p>
			{/if}
			<h1>{socio.name}</h1>
			{#if socio.description}
				<p class="socio-desc">{toPlainText(socio.description, 400)}</p>
			{/if}

			{#if socio.status || socio.contactEmail || socio.contactPhone}
				<div class="socio-tags">
					{#if socio.status}
						<span class="tag">{socio.status === 'aprobado' ? 'Verificado' : socio.status}</span>
					{/if}
					{#if socio.contactEmail}
						<a class="tag" href={`mailto:${socio.contactEmail}`}>{socio.contactEmail}</a>
					{/if}
					{#if socio.contactPhone}
						<a class="tag" href={`tel:${socio.contactPhone.replace(/[^+\d]/g, '')}`}>
							{socio.contactPhone}
						</a>
					{/if}
				</div>
			{/if}
		</div>
	</header>

	<section class="panel">
		<h2>Productos de {socio.name}</h2>

		{#if products.length === 0}
			<p class="empty">Este socio todavía no tiene productos publicados.</p>
		{:else}
			<div class="grid">
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
						</div>
						<div class="pcard-body">
							<strong>{product.name}</strong>
							<span class="pcard-price">
								{formatCurrency(product.priceCents, product.currencyCode)}
							</span>
						</div>
					</article>
				{/each}
			</div>
		{/if}
	</section>
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

	.socio-head {
		display: flex;
		align-items: flex-start;
		gap: 20px;
		margin-bottom: 18px;
		padding: 28px;
		border-radius: var(--iz-radius-lg);
		background: linear-gradient(104deg, #1b4733 0%, #276149 58%, #3d7f57 100%);
		box-shadow: 0 18px 38px rgb(27 71 51 / 20%);
	}

	.socio-logo {
		width: 74px;
		height: 74px;
		flex: 0 0 auto;
		border-radius: 18px;
		object-fit: cover;
	}

	.socio-logo.initials {
		display: grid;
		place-items: center;
		background: #e8f4e2;
		color: #2f6b45;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 26px;
		font-weight: 700;
	}

	.socio-main {
		min-width: 0;
	}

	.eyebrow {
		margin: 0 0 8px;
		color: #b6d9b6;
		font-size: 10.5px;
		font-weight: 700;
		letter-spacing: 1.1px;
		text-transform: uppercase;
	}

	h1 {
		margin: 0;
		color: #f3f8f2;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 34px;
		font-weight: 500;
		letter-spacing: -0.8px;
	}

	.socio-desc {
		max-width: 680px;
		margin: 12px 0 0;
		color: #cfe2d2;
		font-size: 13px;
		line-height: 1.65;
	}

	.socio-tags {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin-top: 16px;
	}

	.tag {
		display: inline-flex;
		align-items: center;
		padding: 5px 12px;
		border-radius: 999px;
		background: rgb(255 255 255 / 16%);
		color: #e4f0e2;
		font-size: 11px;
		font-weight: 650;
		text-decoration: none;
	}

	a.tag:hover {
		background: rgb(255 255 255 / 26%);
	}

	.panel {
		padding: 22px;
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-md);
		background: var(--iz-surface);
		box-shadow: var(--iz-shadow-sm);
	}

	.panel h2 {
		margin: 0 0 16px;
		color: var(--iz-ink);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 20px;
		font-weight: 600;
	}

	.empty {
		margin: 0;
		padding: 22px 0;
		color: var(--iz-muted);
		font-size: 12.5px;
	}

	.grid {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 14px;
	}

	.pcard {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border: 1px solid var(--iz-line);
		border-radius: 12px;
		background: var(--iz-surface);
	}

	.pcard-media {
		display: block;
		height: 140px;
		background: var(--iz-surface-muted);
	}

	.pcard-media img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.pcard-placeholder {
		display: grid;
		height: 100%;
		place-items: center;
		background: linear-gradient(140deg, #e7f0e4, #d5e6d3);
	}

	.pcard-placeholder svg {
		width: 40px;
		height: 40px;
		fill: none;
		stroke: var(--iz-green-600);
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.6;
	}

	.pcard-body {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 6px;
		padding: 12px;
	}

	.pcard-body strong {
		color: var(--iz-ink);
		font-size: 13px;
		font-weight: 650;
	}

	.pcard-price {
		margin-top: auto;
		color: var(--iz-ink);
		font-size: 14px;
		font-weight: 700;
	}

	@media (max-width: 1080px) {
		.grid {
			grid-template-columns: repeat(3, minmax(0, 1fr));
		}
	}

	@media (max-width: 760px) {
		.socio-head {
			flex-direction: column;
			padding: 22px;
		}

		h1 {
			font-size: 26px;
		}

		.grid {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}
	}

	@media (max-width: 460px) {
		.grid {
			grid-template-columns: minmax(0, 1fr);
		}
	}
</style>
