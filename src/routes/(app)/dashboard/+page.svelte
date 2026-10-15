<script lang="ts">
	import { onMount } from 'svelte';
	import {
		getMyNotifications,
		getMyPayments,
		getMyVolunteerSignups,
		getPublicProducts,
		getPublicVolunteerActivities,
		type NotificationItem,
		type Payment,
		type Product,
		type VolunteerActivity,
		type VolunteerSignup
	} from '#lib/services/api/api.service.js';
	import { loadSession, session } from '#lib/services/api/session.svelte.js';
	import {
		firstName,
		formatCurrency,
		formatDateTimeParts,
		formatRelativeTime,
		greeting,
		toPlainText
	} from '#lib/utils/format.js';

	// La API no expone una métrica de CO₂ por usuario: se estima a partir de la
	// actividad real (compras aprobadas y jornadas inscritas).
	const KG_CO2_PER_PURCHASE = 2.4;
	const KG_CO2_PER_JORNADA = 3.1;

	const MONTHS_SHORT = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

	type Stat = { label: string; value: string; hint: string; tone: string; icon: string };

	let isLoading = $state(true);
	let errorMessage = $state('');

	let purchases = $state(0);
	let approvedCount = $state(0);
	let approvedTotalCents = $state(0);
	let pendingCount = $state(0);
	let currencyCode = $state('COP');
	let signupCount = $state(0);
	let upcomingSignups = $state(0);

	let products = $state<Product[]>([]);
	let notifications = $state<NotificationItem[]>([]);
	let jornada = $state<VolunteerActivity | null>(null);
	let monthly = $state<{ label: string; value: number }[]>([]);

	let heroName = $state('');
	let todayGreeting = $state('');

	onMount(async () => {
		heroName = firstName(session.user?.name ?? '');
		todayGreeting = greeting();
		void loadSession();

		const [paymentsResult, signupsResult, notificationsResult, productsResult, volunteerResult] =
			await Promise.allSettled([
				getMyPayments({ limit: 100 }),
				getMyVolunteerSignups({ limit: 100 }),
				getMyNotifications({ limit: 3 }),
				getPublicProducts({ limit: 3 }),
				getPublicVolunteerActivities({ limit: 3 })
			]);

		let failed = false;

		if (paymentsResult.status === 'fulfilled') {
			applyPayments(paymentsResult.value);
		} else {
			failed = true;
		}

		const signups = signupsResult.status === 'fulfilled' ? signupsResult.value : null;
		if (signups) {
			applySignups(signups.items, signups.total);
		} else {
			failed = true;
		}

		if (notificationsResult.status === 'fulfilled') {
			notifications = notificationsResult.value.items;
		} else {
			failed = true;
		}

		if (productsResult.status === 'fulfilled') {
			products = productsResult.value.items;
		} else {
			failed = true;
		}

		if (volunteerResult.status === 'fulfilled') {
			jornada = pickUpcomingActivity(volunteerResult.value.items);
		}

		monthly = buildMonthly(
			paymentsResult.status === 'fulfilled' ? paymentsResult.value.items : [],
			signups?.items ?? []
		);

		heroName = firstName(session.user?.name ?? '');
		errorMessage = failed
			? 'Algunos datos no se pudieron cargar. Revisa tu conexión e inténtalo de nuevo.'
			: '';
		isLoading = false;
	});

	function applyPayments(page: { items: Payment[]; total: number }) {
		purchases = page.total;
		approvedCount = page.items.filter((payment) => payment.status === 'aprobado').length;
		approvedTotalCents = page.items
			.filter((payment) => payment.status === 'aprobado')
			.reduce((total, payment) => total + payment.amountCents, 0);
		pendingCount = page.items.filter((payment) => payment.status === 'pendiente').length;
		currencyCode = page.items[0]?.currencyCode ?? 'COP';
	}

	function applySignups(items: VolunteerSignup[], total: number) {
		signupCount = total;
		const now = Date.now();
		const upcoming = items.filter((signup) => {
			const start = signup.activity?.startsAt;
			return start ? new Date(start).getTime() >= now : false;
		}).length;
		upcomingSignups = upcoming || Math.min(total, items.length);
	}

	function pickUpcomingActivity(items: VolunteerActivity[]): VolunteerActivity | null {
		const now = Date.now();
		const upcoming = items
			.filter((item) => (item.startsAt ? new Date(item.startsAt).getTime() >= now : true))
			.sort((a, b) => (a.startsAt ?? '').localeCompare(b.startsAt ?? ''));
		return upcoming[0] ?? items[0] ?? null;
	}

	function buildMonthly(payments: Payment[], signups: VolunteerSignup[]) {
		const now = new Date();
		const buckets = Array.from({ length: 8 }, (_, index) => {
			const date = new Date(now.getFullYear(), now.getMonth() - (7 - index), 1);
			return {
				year: date.getFullYear(),
				month: date.getMonth(),
				label: MONTHS_SHORT[date.getMonth()],
				value: 0
			};
		});

		const register = (value: string | null | undefined) => {
			if (!value) return;
			const date = new Date(value);
			if (Number.isNaN(date.getTime())) return;
			const bucket = buckets.find(
				(item) => item.year === date.getFullYear() && item.month === date.getMonth()
			);
			if (bucket) bucket.value += 1;
		};

		payments.forEach((payment) => register(payment.createdAt));
		signups.forEach((signup) => register(signup.activity?.startsAt ?? signup.createdAt));

		return buckets.map(({ label, value }) => ({ label, value }));
	}

	const stats = $derived([
		{
			label: 'Compras realizadas',
			value: purchases.toString(),
			hint: `${approvedCount} aprobadas`,
			tone: 'green',
			icon: 'receipt'
		},
		{
			label: 'Pagos aprobados',
			value: formatCurrency(approvedTotalCents, currencyCode),
			hint: `${approvedCount} pagos`,
			tone: 'purple',
			icon: 'card'
		},
		{
			label: 'Pagos pendientes',
			value: pendingCount.toString(),
			hint: 'Por revisar',
			tone: 'amber',
			icon: 'clock'
		},
		{
			label: 'Jornadas inscritas',
			value: signupCount.toString(),
			hint: `${upcomingSignups} próximas`,
			tone: 'blue',
			icon: 'people'
		}
	] satisfies Stat[]);

	const estimatedCo2 = $derived(
		approvedCount * KG_CO2_PER_PURCHASE + signupCount * KG_CO2_PER_JORNADA
	);
	const chartMax = $derived(Math.max(...monthly.map((month) => month.value), 1));

	function barHeight(value: number): string {
		if (value <= 0) return '8%';
		return `${Math.max(10, Math.round((value / chartMax) * 100))}%`;
	}

	function notificationTone(type: string): string {
		if (type === 'pago' || type === 'reembolso') return 'green';
		if (type === 'voluntariado') return 'blue';
		if (type === 'emprendimiento' || type === 'campana') return 'amber';
		return 'grey';
	}

	function formatActivityDate(value: string | null): string {
		const { day, time } = formatDateTimeParts(value);
		if (!day) return '';
		return `${day}, ${time}`;
	}
</script>

<svelte:head>
	<title>Inicio | Izeco</title>
	<meta
		name="description"
		content="Tu panel de Izeco: compras, pagos, jornadas, productos recomendados e impacto."
	/>
</svelte:head>

{#if isLoading}
	<p class="page-state">Cargando tu panel…</p>
{:else}
	<section class="page-head">
		<div>
			<p class="eyebrow"><span class="eyebrow-dot" aria-hidden="true"></span>Panel personal</p>
			<h1>{todayGreeting}{heroName ? `, ${heroName}` : ''}</h1>
			<p class="subtitle">Pequeñas decisiones, grandes cambios.</p>
		</div>
		<a class="primary-button" href="/catalogo">
			<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M10 4v12M4 10h12" /></svg>
			Explorar productos
		</a>
	</section>

	{#if errorMessage}
		<p class="error-banner" role="alert">{errorMessage}</p>
	{/if}

	<section class="stats" aria-label="Resumen de tu actividad">
		{#each stats as stat (stat.label)}
			<article class="stat-card">
				<span class="stat-icon {stat.tone}" aria-hidden="true">
					{#if stat.icon === 'receipt'}
						<svg viewBox="0 0 24 24"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2Z" /><path d="M9 8h6M9 12h6" /></svg>
					{:else if stat.icon === 'card'}
						<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2.5" /><path d="M3 10h18" /></svg>
					{:else if stat.icon === 'clock'}
						<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></svg>
					{:else}
						<svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0" /><path d="M16 6.5a3 3 0 0 1 0 6M17 19a5.5 5.5 0 0 0-2.2-4.4" /></svg>
					{/if}
				</span>
				<div class="stat-body">
					<p class="stat-label">{stat.label}</p>
					<p class="stat-value">{stat.value}</p>
					<p class="stat-hint"><span aria-hidden="true">↗</span>{stat.hint}</p>
				</div>
			</article>
		{/each}
	</section>

	<section class="split-hero">
		<article class="hero">
			<p class="hero-eyebrow">
				<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21c0-6 0-9 8-12 0 8-3 11-8 12Z" /><path d="M12 21C12 14 10 9 4 6c-1 7 2 12 8 15Z" /></svg>
				Comunidad Izeco
			</p>
			<h2>Tu consumo<br />deja huella.</h2>
			<p>Descubre emprendimientos que están transformando la forma de hacer las cosas.</p>
			<a class="hero-button" href="/catalogo">
				Ver catálogo
				<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M8 5h7v7" /></svg>
			</a>
			<span class="hero-emblem" aria-hidden="true">
				<svg viewBox="0 0 48 48"><path d="M24 40c0-11 0-16 12-21 0 12-5 19-12 21Z" /><path d="M24 40C24 29 21 22 12 18c-1 11 4 19 12 22Z" /><path d="M24 40V29" /></svg>
			</span>
			<span class="hero-ring" aria-hidden="true"></span>
		</article>

		<article class="impact-card">
			<header>
				<p class="card-eyebrow">Tu impacto</p>
				<button class="more" type="button" aria-label="Opciones de impacto">···</button>
			</header>
			<p class="impact-title">Una elección a la vez</p>
			<p class="impact-value">
				{estimatedCo2.toFixed(1)}<span>kg</span>
				<small class="impact-tag">estimado</small>
			</p>
			<p class="impact-caption">de CO₂ evitado</p>
			<div class="chart" role="img" aria-label="Actividad estimada de los últimos ocho meses">
				{#each monthly as month (month.label)}
					<span class="bar-slot">
						<span class="bar" style="height: {barHeight(month.value)}"></span>
						<span class="bar-label">{month.label}</span>
					</span>
				{/each}
			</div>
		</article>
	</section>

	<section class="split-main">
		<article class="panel">
			<header class="panel-head">
				<div>
					<p class="card-eyebrow">Para ti</p>
					<h3>Productos recomendados</h3>
				</div>
				<a class="panel-link" href="/catalogo">
					Ver catálogo
					<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M5 15 15 5M8 5h7v7" /></svg>
				</a>
			</header>

			{#if products.length === 0}
				<p class="empty">Aún no hay productos publicados en el catálogo.</p>
			{:else}
				<div class="product-grid">
					{#each products as product (product.id)}
						<a class="product-card" href="/catalogo">
							<span class="product-media">
								{#if product.imageUrl}
									<img src={product.imageUrl} alt={product.name} loading="lazy" />
								{:else}
									<span class="product-placeholder" aria-hidden="true">
										<svg viewBox="0 0 24 24"><path d="M12 21c0-6 0-9 8-12 0 8-3 11-8 12Z" /><path d="M12 21C12 14 10 9 4 6c-1 7 2 12 8 15Z" /></svg>
									</span>
								{/if}
								{#if product.categoryName}
									<span class="product-tag">{product.categoryName}</span>
								{/if}
								<span class="product-heart" aria-hidden="true">
									<svg viewBox="0 0 20 20"><path d="M10 16s-6-3.6-6-8a3.4 3.4 0 0 1 6-2.2A3.4 3.4 0 0 1 16 8c0 4.4-6 8-6 8Z" /></svg>
								</span>
							</span>
							<span class="product-body">
								<strong>{product.name}</strong>
								{#if product.entrepreneurName}
									<span class="product-seller">
										<svg viewBox="0 0 20 20" aria-hidden="true"><path d="M3.5 8 5 4h10l1.5 4M4 8h12v7.5H4ZM8 15.5v-4h4v4" /></svg>
										{product.entrepreneurName}
									</span>
								{/if}
								<span class="product-foot">
									<span class="product-price">{formatCurrency(product.priceCents, product.currencyCode)}</span>
									<span class="product-arrow" aria-hidden="true">
										<svg viewBox="0 0 20 20"><path d="M6 14 14 6M8.5 6H14v5.5" /></svg>
									</span>
								</span>
							</span>
						</a>
					{/each}
				</div>
			{/if}
		</article>

		<article class="panel">
			<header class="panel-head">
				<div>
					<p class="card-eyebrow">Últimos movimientos</p>
					<h3>Actividad reciente</h3>
				</div>
				<button class="more" type="button" aria-label="Opciones de actividad">···</button>
			</header>

			{#if notifications.length === 0}
				<p class="empty">Todavía no registras movimientos.</p>
			{:else}
				<ul class="activity">
					{#each notifications as item (item.id)}
						<li>
							<span class="activity-icon {notificationTone(item.type)}" aria-hidden="true">
								{#if item.type === 'pago' || item.type === 'reembolso'}
									<svg viewBox="0 0 24 24"><rect x="3" y="6" width="18" height="13" rx="2.5" /><path d="M3 11h18" /></svg>
								{:else if item.type === 'voluntariado'}
									<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.2" /><path d="M6 19a6 6 0 0 1 12 0" /></svg>
								{:else}
									<svg viewBox="0 0 24 24"><path d="M12 4a5 5 0 0 1 5 5c0 3.4 1.4 4.8 1.4 4.8H5.6S7 12.4 7 9a5 5 0 0 1 5-5Z" /><path d="M10.2 17a2 2 0 0 0 3.6 0" /></svg>
								{/if}
							</span>
						<div class="activity-body">
							<strong>{toPlainText(item.title, 80)}</strong>
							{#if item.body}
								<span>{toPlainText(item.body, 160)}</span>
							{/if}
						</div>
							<span class="activity-time">{formatRelativeTime(item.createdAt)}</span>
						</li>
					{/each}
				</ul>
				<a class="ghost-button" href="/notificaciones">Ver toda la actividad</a>
			{/if}
		</article>
	</section>

	{#if jornada}
		<section class="jornada">
			<span class="jornada-icon" aria-hidden="true">
				<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>
			</span>
			<div class="jornada-body">
				<strong>Jornada recomendada para ti</strong>
				<span>
					{jornada.title}{#if jornada.startsAt} · {formatActivityDate(jornada.startsAt)}{/if}
				</span>
			</div>
			<div class="jornada-side">
				{#if jornada.location}
					<span class="jornada-place">
						<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-6-5.2-6-10a6 6 0 0 1 12 0c0 4.8-6 10-6 10Z" /><circle cx="12" cy="11" r="2.2" /></svg>
						{jornada.location}
					</span>
				{/if}
				<a class="jornada-button" href="/jornadas">Ver jornada</a>
			</div>
		</section>
	{/if}
{/if}

<style>
	.page-state {
		margin: 90px auto;
		color: var(--iz-muted);
		font-size: 13px;
		text-align: center;
	}

	.page-head {
		display: flex;
		flex-wrap: wrap;
		align-items: flex-end;
		justify-content: space-between;
		gap: 16px;
		margin-bottom: 20px;
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
		font-size: 34px;
		font-weight: 600;
		letter-spacing: -0.6px;
	}

	.subtitle {
		margin: 6px 0 0;
		color: var(--iz-muted);
		font-size: 13px;
	}

	.primary-button {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 11px 18px;
		border-radius: 10px;
		background: var(--iz-green-800);
		box-shadow: 0 6px 16px rgb(31 71 54 / 22%);
		color: #f4f7f2;
		font-size: 13px;
		font-weight: 600;
		text-decoration: none;
	}

	.primary-button svg {
		width: 15px;
		height: 15px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-width: 1.8;
	}

	.primary-button:hover {
		background: var(--iz-green-900);
	}

	.error-banner {
		margin: 0 0 16px;
		padding: 11px 14px;
		border: 1px solid #eccfc8;
		border-radius: 10px;
		background: #fbf0ec;
		color: var(--iz-danger);
		font-size: 12px;
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(4, minmax(0, 1fr));
		gap: 14px;
		margin-bottom: 16px;
	}

	.stat-card {
		display: flex;
		align-items: flex-start;
		gap: 12px;
		padding: 16px;
		border: 1px solid var(--iz-line);
		border-radius: 14px;
		background: var(--iz-surface);
	}

	.stat-icon {
		display: grid;
		width: 38px;
		height: 38px;
		flex: 0 0 auto;
		place-items: center;
		border-radius: 11px;
	}

	.stat-icon svg {
		width: 19px;
		height: 19px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.6;
	}

	.stat-icon.green {
		background: var(--iz-green-100);
		color: var(--iz-green-600);
	}

	.stat-icon.purple {
		background: var(--iz-purple-100);
		color: var(--iz-purple);
	}

	.stat-icon.amber {
		background: var(--iz-amber-100);
		color: var(--iz-amber);
	}

	.stat-icon.blue {
		background: var(--iz-blue-100);
		color: var(--iz-blue);
	}

	.stat-label {
		margin: 2px 0 0;
		color: var(--iz-muted);
		font-size: 11.5px;
	}

	.stat-value {
		margin: 3px 0 0;
		color: var(--iz-ink);
		font-size: 23px;
		font-weight: 700;
		letter-spacing: -0.5px;
	}

	.stat-hint {
		display: flex;
		align-items: center;
		gap: 4px;
		margin: 5px 0 0;
		color: var(--iz-green-600);
		font-size: 11px;
	}

	.split-hero {
		display: grid;
		grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr);
		gap: 16px;
		margin-bottom: 16px;
	}

	.hero {
		position: relative;
		overflow: hidden;
		padding: 28px;
		border-radius: 16px;
		background: var(--iz-green-800);
		color: #eaf3ea;
	}

	.hero-eyebrow {
		display: flex;
		align-items: center;
		gap: 8px;
		margin: 0 0 14px;
		color: #a9d0ad;
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

	.hero h2 {
		margin: 0 0 14px;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 38px;
		font-weight: 500;
		line-height: 1.06;
		letter-spacing: -0.8px;
	}

	.hero p {
		max-width: 260px;
		margin: 0 0 20px;
		color: #cfe0d1;
		font-size: 12.5px;
		line-height: 1.6;
	}

	.hero-button {
		display: inline-flex;
		align-items: center;
		gap: 8px;
		padding: 10px 16px;
		border-radius: 9px;
		background: var(--iz-green-100);
		color: var(--iz-green-800);
		font-size: 12.5px;
		font-weight: 650;
		text-decoration: none;
	}

	.hero-button svg {
		width: 14px;
		height: 14px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.7;
	}

	.hero-emblem {
		position: absolute;
		top: 50%;
		right: 14%;
		display: grid;
		width: 116px;
		height: 116px;
		place-items: center;
		border-radius: 50%;
		background: var(--iz-green-100);
		transform: translateY(-50%);
	}

	.hero-emblem svg {
		width: 58px;
		height: 58px;
		fill: none;
		stroke: var(--iz-green-700);
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 2;
	}

	.hero-ring {
		position: absolute;
		top: 50%;
		right: 8%;
		width: 210px;
		height: 210px;
		border: 1px solid rgb(214 236 213 / 26%);
		border-radius: 50%;
		transform: translateY(-50%) rotate(-12deg);
	}

	.impact-card,
	.panel {
		padding: 18px;
		border: 1px solid var(--iz-line);
		border-radius: 16px;
		background: var(--iz-surface);
	}

	.impact-card header,
	.panel-head {
		display: flex;
		align-items: flex-start;
		justify-content: space-between;
		gap: 12px;
	}

	.card-eyebrow {
		margin: 0;
		color: var(--iz-green-600);
		font-size: 10px;
		font-weight: 750;
		letter-spacing: 1.1px;
		text-transform: uppercase;
	}

	.more {
		padding: 2px 6px;
		border: 0;
		border-radius: 6px;
		background: transparent;
		color: var(--iz-faint);
		font-size: 16px;
		line-height: 1;
		cursor: pointer;
	}

	.more:hover {
		background: #f2f1ec;
	}

	.impact-title {
		margin: 12px 0 0;
		color: var(--iz-ink-soft);
		font-size: 13px;
	}

	.impact-value {
		margin: 12px 0 0;
		color: var(--iz-ink);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 34px;
		font-weight: 600;
		letter-spacing: -0.8px;
	}

	.impact-value span {
		margin-left: 4px;
		font-size: 14px;
		font-family: 'Segoe UI', system-ui, sans-serif;
	}

	.impact-tag {
		margin-left: 8px;
		padding: 2px 7px;
		border-radius: 999px;
		background: #eef3ec;
		color: #6d7a72;
		font-family: 'Segoe UI', system-ui, sans-serif;
		font-size: 9.5px;
		font-weight: 700;
		letter-spacing: 0.6px;
		text-transform: uppercase;
		vertical-align: middle;
	}

	.impact-caption {
		margin: 2px 0 18px;
		color: var(--iz-muted);
		font-size: 11.5px;
	}

	.chart {
		display: flex;
		height: 108px;
		align-items: flex-end;
		justify-content: space-between;
		gap: 6px;
	}

	.bar-slot {
		display: flex;
		height: 100%;
		flex: 1;
		flex-direction: column;
		justify-content: flex-end;
		gap: 8px;
	}

	.bar {
		border-radius: 5px 5px 2px 2px;
		background: var(--iz-green-300);
	}

	.bar-slot:last-child .bar {
		background: var(--iz-green-600);
	}

	.bar-label {
		color: var(--iz-faint);
		font-size: 9.5px;
		text-align: center;
	}

	.split-main {
		display: grid;
		grid-template-columns: minmax(0, 1.55fr) minmax(0, 1fr);
		gap: 16px;
		margin-bottom: 16px;
	}

	h3 {
		margin: 5px 0 0;
		color: var(--iz-ink);
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 19px;
		font-weight: 600;
		letter-spacing: -0.3px;
	}

	.panel-link {
		display: inline-flex;
		align-items: center;
		gap: 6px;
		color: var(--iz-green-700);
		font-size: 11.5px;
		font-weight: 650;
		text-decoration: none;
	}

	.panel-link svg {
		width: 13px;
		height: 13px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.7;
	}

	.empty {
		margin: 22px 0 8px;
		color: var(--iz-muted);
		font-size: 12.5px;
	}

	.product-grid {
		display: grid;
		grid-template-columns: repeat(3, minmax(0, 1fr));
		gap: 12px;
		margin-top: 16px;
	}

	.product-card {
		display: flex;
		flex-direction: column;
		overflow: hidden;
		border: 1px solid var(--iz-line);
		border-radius: 12px;
		background: var(--iz-surface);
		color: inherit;
		text-decoration: none;
		transition: box-shadow 160ms ease;
	}

	.product-card:hover {
		box-shadow: 0 10px 24px rgb(28 58 44 / 10%);
	}

	.product-media {
		position: relative;
		display: block;
		height: 118px;
		background: var(--iz-surface-muted);
	}

	.product-media img {
		width: 100%;
		height: 100%;
		object-fit: cover;
	}

	.product-placeholder {
		display: grid;
		height: 100%;
		place-items: center;
		background: linear-gradient(140deg, #e7f0e4, #d5e6d3);
	}

	.product-placeholder svg {
		width: 40px;
		height: 40px;
		fill: none;
		stroke: var(--iz-green-600);
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.6;
	}

	.product-tag {
		position: absolute;
		top: 9px;
		left: 9px;
		padding: 3px 9px;
		border-radius: 999px;
		background: rgb(255 255 255 / 92%);
		color: #3d5a46;
		font-size: 9.5px;
		font-weight: 650;
	}

	.product-heart {
		position: absolute;
		top: 9px;
		right: 9px;
		display: grid;
		width: 26px;
		height: 26px;
		place-items: center;
		border-radius: 50%;
		background: rgb(255 255 255 / 92%);
		color: var(--iz-muted);
	}

	.product-heart svg {
		width: 14px;
		height: 14px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.5;
	}

	.product-body {
		display: flex;
		flex: 1;
		flex-direction: column;
		gap: 5px;
		padding: 12px;
	}

	.product-body strong {
		color: var(--iz-ink);
		font-size: 12.5px;
		font-weight: 650;
	}

	.product-seller {
		display: flex;
		align-items: center;
		gap: 5px;
		color: var(--iz-muted);
		font-size: 10.5px;
	}

	.product-seller svg {
		width: 13px;
		height: 13px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.5;
	}

	.product-foot {
		display: flex;
		align-items: center;
		justify-content: space-between;
		margin-top: auto;
		padding-top: 6px;
	}

	.product-price {
		color: var(--iz-ink);
		font-size: 14px;
		font-weight: 700;
	}

	.product-arrow {
		display: grid;
		width: 26px;
		height: 26px;
		place-items: center;
		border-radius: 50%;
		background: #e8f1e7;
		color: var(--iz-green-700);
	}

	.product-arrow svg {
		width: 14px;
		height: 14px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.7;
	}

	.activity {
		margin: 16px 0 18px;
		padding: 0;
		list-style: none;
	}

	.activity li {
		display: flex;
		align-items: flex-start;
		gap: 11px;
		padding: 11px 0;
		border-bottom: 1px solid var(--iz-line);
	}

	.activity li:last-child {
		border-bottom: 0;
	}

	.activity-icon {
		display: grid;
		width: 34px;
		height: 34px;
		flex: 0 0 auto;
		place-items: center;
		border-radius: 10px;
	}

	.activity-icon svg {
		width: 17px;
		height: 17px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.6;
	}

	.activity-icon.green {
		background: var(--iz-green-100);
		color: var(--iz-green-600);
	}

	.activity-icon.blue {
		background: var(--iz-blue-100);
		color: var(--iz-blue);
	}

	.activity-icon.amber {
		background: var(--iz-amber-100);
		color: var(--iz-amber);
	}

	.activity-icon.grey {
		background: var(--iz-surface-muted);
		color: var(--iz-muted);
	}

	.activity-body {
		display: flex;
		min-width: 0;
		flex: 1;
		flex-direction: column;
		gap: 3px;
	}

	.activity-body strong {
		color: var(--iz-ink);
		font-size: 12.5px;
		font-weight: 650;
	}

	.activity-body span {
		display: -webkit-box;
		overflow: hidden;
		color: var(--iz-muted);
		font-size: 11px;
		line-height: 1.45;
		-webkit-box-orient: vertical;
		-webkit-line-clamp: 2;
		line-clamp: 2;
	}

	.activity-time {
		flex: 0 0 auto;
		color: var(--iz-faint);
		font-size: 10.5px;
		white-space: nowrap;
	}

	.ghost-button {
		display: block;
		padding: 10px;
		border: 1px solid #dfe5dc;
		border-radius: 9px;
		color: var(--iz-green-700);
		font-size: 12px;
		font-weight: 650;
		text-align: center;
		text-decoration: none;
	}

	.ghost-button:hover {
		background: #f4f8f3;
	}

	.jornada {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		gap: 14px;
		padding: 14px 18px;
		border: 1px solid #dbe7d6;
		border-radius: 14px;
		background: var(--iz-green-50);
	}

	.jornada-icon {
		display: grid;
		width: 38px;
		height: 38px;
		flex: 0 0 auto;
		place-items: center;
		border-radius: 50%;
		background: var(--iz-green-800);
		color: var(--iz-green-50);
	}

	.jornada-icon svg {
		width: 20px;
		height: 20px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.6;
	}

	.jornada-body {
		display: flex;
		min-width: 220px;
		flex: 1;
		flex-direction: column;
		gap: 3px;
	}

	.jornada-body strong {
		color: var(--iz-green-800);
		font-size: 13px;
		font-weight: 700;
	}

	.jornada-body span {
		color: #4f6a58;
		font-size: 12px;
	}

	.jornada-side {
		display: flex;
		align-items: center;
		gap: 18px;
	}

	.jornada-place {
		display: flex;
		align-items: center;
		gap: 6px;
		color: #4f6a58;
		font-size: 12px;
	}

	.jornada-place svg {
		width: 15px;
		height: 15px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.5;
	}

	.jornada-button {
		padding: 10px 18px;
		border-radius: 9px;
		background: var(--iz-green-800);
		color: #f4f7f2;
		font-size: 12.5px;
		font-weight: 650;
		text-decoration: none;
	}

	.jornada-button:hover {
		background: var(--iz-green-900);
	}

	@media (max-width: 1140px) {
		.stats {
			grid-template-columns: repeat(2, minmax(0, 1fr));
		}

		.split-hero,
		.split-main {
			grid-template-columns: minmax(0, 1fr);
		}

		.hero-emblem,
		.hero-ring {
			display: none;
		}
	}

	@media (max-width: 720px) {
		h1 {
			font-size: 27px;
		}

		.hero h2 {
			font-size: 30px;
		}

		.product-grid {
			grid-template-columns: minmax(0, 1fr);
		}

		.jornada-side {
			width: 100%;
			justify-content: space-between;
		}
	}
</style>
