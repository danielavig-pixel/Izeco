<script lang="ts">
	// Landing pública: lo primero que ve quien entra a Izeco antes de iniciar
	// sesión. Presenta la plataforma, cómo funciona y quiénes somos.
	const features = [
		{
			icon: 'catalog',
			title: 'Catálogo con impacto',
			text: 'Compra productos hechos con material recuperado por emprendedores locales.'
		},
		{
			icon: 'store',
			title: 'Emprendimientos locales',
			text: 'Descubre, sigue y apoya a los negocios que transforman su comunidad.'
		},
		{
			icon: 'material',
			title: 'Materia prima recuperada',
			text: 'Vende y compra material limpio y clasificado: PET, cartón, vidrio, tela y más.'
		},
		{
			icon: 'campaign',
			title: 'Campañas ambientales',
			text: 'Súmate a campañas de reciclaje y educación ambiental en tu zona.'
		},
		{
			icon: 'volunteer',
			title: 'Jornadas de voluntariado',
			text: 'Inscríbete a jornadas de recolección y suma horas de impacto real.'
		},
		{
			icon: 'payment',
			title: 'Pagos seguros',
			text: 'Cobra y paga dentro de la plataforma, con reembolsos y trazabilidad.'
		},
		{
			icon: 'bell',
			title: 'Todo en un solo lugar',
			text: 'Sigue tus compras, inscripciones y avisos con notificaciones claras.'
		}
	];

	const steps = [
		{
			n: '01',
			title: 'Elige tu rol',
			text: 'Entra como comprador, emprendedor o voluntario. Puedes ser más de uno.'
		},
		{
			n: '02',
			title: 'Actúa con propósito',
			text: 'Compra con impacto, publica tu emprendimiento o súmate a una jornada.'
		},
		{
			n: '03',
			title: 'Multiplica el impacto',
			text: 'Cada residuo recuperado vuelve al ciclo como materia prima o producto.'
		}
	];

	const values = ['Sostenibilidad', 'Comunidad', 'Transparencia', 'Innovación local'];
</script>

{#snippet featureIcon(name: string)}
	<svg viewBox="0 0 24 24" aria-hidden="true">
		{#if name === 'catalog'}
			<path d="M6 8h12l-1 11H7L6 8Z" />
			<path d="M9 8a3 3 0 0 1 6 0" />
		{:else if name === 'store'}
			<path d="M4 9l1.2-4h13.6L20 9" />
			<path d="M4 9h16v10H4z" />
			<path d="M9.5 19v-5h5v5" />
		{:else if name === 'material'}
			<path d="M12 3.5 5 8v8l7 4.5 7-4.5V8l-7-4.5Z" />
			<path d="M5 8l7 4.5L19 8M12 12.5V20.5" />
		{:else if name === 'campaign'}
			<path d="M4 10v4l12 5V5L4 10Z" />
			<path d="M16 8.5a4 4 0 0 1 0 7M7 14v4" />
		{:else if name === 'volunteer'}
			<path d="M7 4v3M17 4v3" />
			<path d="M4.5 8h15v11h-15z" />
			<path d="M9 13.5l2 2 4-4.2" />
		{:else if name === 'payment'}
			<rect x="3.5" y="6" width="17" height="12" rx="2.2" />
			<path d="M3.5 10h17M7 14.5h3" />
		{:else}
			<path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 6 2 6.5 2 6.5H4.5S6.5 16 6.5 10Z" />
			<path d="M10.5 20a1.8 1.8 0 0 0 3 0" />
		{/if}
	</svg>
{/snippet}

<svelte:head>
	<title>Izeco | Recicla, emprende y transforma</title>
	<meta
		name="description"
		content="Izeco conecta a emprendedores, compradores y voluntarios para convertir los residuos en oportunidades: catálogo con impacto, materia prima recuperada, campañas y jornadas de reciclaje."
	/>
</svelte:head>

<div class="landing">
	<header class="site-head">
		<a class="brand" href="/" aria-label="Izeco, inicio">
			<img src="/logo.png" alt="" />
			<span>Izeco</span>
		</a>

		<nav class="site-nav" aria-label="Secciones">
			<a href="#que-hacemos">Qué hacemos</a>
			<a href="#como-funciona">Cómo funciona</a>
			<a href="#pagos">Pagos</a>
			<a href="#nosotros">Nosotros</a>
		</nav>

		<div class="site-cta">
			<a class="btn ghost" href="/iniciar-sesion">Iniciar sesión</a>
			<a class="btn solid" href="/registro">Crear cuenta</a>
		</div>
	</header>

	<main>
		<!-- HERO -->
		<section class="hero" aria-labelledby="hero-title">
			<div class="hero-copy">
				<span class="eyebrow">Economía circular en acción</span>
				<h1 id="hero-title">Dale una segunda vida a lo que otros desechan</h1>
				<p>
					Izeco reúne a quienes reciclan, emprenden y compran con propósito. Transformamos
					residuos en materia prima, productos y comunidades más sostenibles.
				</p>
				<div class="hero-actions">
					<a class="btn solid lg" href="/registro">Empieza gratis</a>
					<a class="btn ghost lg" href="#que-hacemos">Conoce la plataforma</a>
				</div>
			</div>

			<div class="hero-visual" aria-hidden="true">
				<img src="/fondo.jpg" alt="" />
				<div class="hero-chip">
					<img src="/logo.png" alt="" />
					<div>
						<strong>Residuo → recurso</strong>
						<span>Recolectamos, clasificamos y devolvemos valor</span>
					</div>
				</div>
			</div>
		</section>

		<!-- QUÉ HACEMOS -->
		<section id="que-hacemos" class="section" aria-labelledby="que-title">
			<div class="section-head">
				<span class="eyebrow">Todo lo que hacemos</span>
				<h2 id="que-title">Una plataforma, todo el ciclo del reciclaje</h2>
				<p>
					Desde la recolección hasta la compra final, Izeco conecta cada eslabón para que nada
					se pierda.
				</p>
			</div>

			<div class="feature-grid">
				{#each features as feature (feature.title)}
					<article class="feature">
						<span class="feature-icon">{@render featureIcon(feature.icon)}</span>
						<h3>{feature.title}</h3>
						<p>{feature.text}</p>
					</article>
				{/each}
			</div>
		</section>

		<!-- CÓMO FUNCIONA -->
		<section id="como-funciona" class="section band" aria-labelledby="como-title">
			<div class="section-head">
				<span class="eyebrow">Cómo funciona</span>
				<h2 id="como-title">Empezar toma tres pasos</h2>
			</div>

			<ol class="steps">
				{#each steps as step (step.n)}
					<li class="step">
						<span class="step-n">{step.n}</span>
						<h3>{step.title}</h3>
						<p>{step.text}</p>
					</li>
				{/each}
			</ol>
		</section>

		<!-- PAGOS -->
		<section id="pagos" class="section" aria-labelledby="pagos-title">
			<div class="split">
				<div class="split-copy">
					<span class="eyebrow">Pagos</span>
					<h2 id="pagos-title">Pagos simples y seguros</h2>
					<p>
						Compra y vende dentro de Izeco sin salir de la plataforma. Confirmamos cada
						transacción, guardamos el historial y gestionamos reembolsos totales o parciales.
					</p>
					<ul class="checks">
						<li>Checkout propio con confirmación inmediata.</li>
						<li>Historial de pagos para compradores, emprendedores y administración.</li>
						<li>Reembolsos y trazabilidad para resolver cualquier novedad.</li>
					</ul>
				</div>
				<div class="split-card" aria-hidden="true">
					<div class="pay-row">
						<strong>Compra en Izeco</strong>
						<span class="pay-amount">$ 45.000</span>
					</div>
					<div class="pay-line"></div>
					<div class="pay-row small">
						<span>Estado</span>
						<span class="pay-pill">Aprobado</span>
					</div>
					<div class="pay-row small">
						<span>Referencia</span>
						<span>#IZ-2049</span>
					</div>
				</div>
			</div>
		</section>

		<!-- NOSOTROS -->
		<section id="nosotros" class="section band" aria-labelledby="nosotros-title">
			<div class="section-head">
				<span class="eyebrow">Sobre nosotros</span>
				<h2 id="nosotros-title">Quiénes somos</h2>
			</div>

			<div class="about">
				<div class="about-brand">
					<img src="/logo.png" alt="Izeco" />
					<p>
						Izeco nace de una idea sencilla: los residuos no son basura, son el inicio de algo
						nuevo. Somos una comunidad que conecta reciclaje, emprendimiento e impacto ambiental.
					</p>
					<ul class="values">
						{#each values as value (value)}
							<li>{value}</li>
						{/each}
					</ul>
				</div>

				<div class="about-cards">
					<article class="about-card">
						<h3>Misión</h3>
						<p>
							Impulsar una economía circular donde los residuos se convierten en oportunidades:
							conectamos emprendedores, compradores y voluntarios para que cada compra sostenga
							un negocio local y cuide el planeta.
						</p>
					</article>
					<article class="about-card">
						<h3>Visión</h3>
						<p>
							Ser la red de economía circular de referencia en Latinoamérica, donde reciclar
							sea fácil, rentable y cotidiano, y cada comunidad vea en sus residuos un recurso
							valioso.
						</p>
					</article>
				</div>
			</div>
		</section>

		<!-- CTA FINAL -->
		<section class="cta-band" aria-labelledby="cta-title">
			<h2 id="cta-title">Tu próximo paso puede cambiar una comunidad</h2>
			<p>Únete gratis y empieza a comprar, vender o ser voluntario hoy mismo.</p>
			<div class="hero-actions">
				<a class="btn solid lg" href="/registro">Crear mi cuenta</a>
				<a class="btn ghost lg" href="/iniciar-sesion">Ya tengo cuenta</a>
			</div>
		</section>
	</main>

	<footer class="site-foot">
		<div class="foot-brand">
			<img src="/logo.png" alt="" />
			<span>Izeco</span>
		</div>
		<p>Economía circular, emprendimiento local y voluntariado en un solo lugar.</p>
		<nav aria-label="Enlaces">
			<a href="#que-hacemos">Qué hacemos</a>
			<a href="#como-funciona">Cómo funciona</a>
			<a href="#nosotros">Nosotros</a>
			<a href="/iniciar-sesion">Iniciar sesión</a>
		</nav>
	</footer>
</div>

<style>
	.landing {
		min-height: 100vh;
		background: var(--iz-bg);
	}

	/* ---------- Header ---------- */
	.site-head {
		position: sticky;
		top: 0;
		z-index: 20;
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 12px clamp(16px, 4vw, 48px);
		border-bottom: 1px solid var(--iz-line);
		background: color-mix(in srgb, var(--iz-header) 92%, transparent);
		backdrop-filter: blur(10px);
	}

	.brand,
	.foot-brand {
		display: flex;
		align-items: center;
		gap: 10px;
		color: var(--iz-ink);
		font-size: 20px;
		font-weight: 750;
		text-decoration: none;
		letter-spacing: -0.4px;
	}

	.brand img {
		width: 40px;
		height: 40px;
		object-fit: contain;
	}

	.site-nav {
		display: flex;
		gap: 22px;
	}

	.site-nav a {
		color: var(--iz-ink-soft);
		font-size: 14px;
		font-weight: 600;
		text-decoration: none;
	}

	.site-nav a:hover {
		color: var(--iz-green-700);
	}

	.site-cta {
		display: flex;
		gap: 8px;
	}

	/* ---------- Botones ---------- */
	.btn {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		padding: 9px 16px;
		border: 1px solid transparent;
		border-radius: var(--iz-radius-md);
		font-size: 14px;
		font-weight: 700;
		text-decoration: none;
		white-space: nowrap;
		transition:
			background-color 150ms ease,
			transform 150ms ease,
			border-color 150ms ease;
	}

	.btn.solid {
		background: var(--iz-green-700);
		color: #fff;
	}

	.btn.solid:hover {
		transform: translateY(-1px);
		background: var(--iz-green-800);
	}

	.btn.ghost {
		border-color: var(--iz-line-strong);
		background: var(--iz-surface);
		color: var(--iz-ink-soft);
	}

	.btn.ghost:hover {
		background: var(--iz-surface-muted);
	}

	.btn.lg {
		padding: 13px 22px;
		font-size: 15px;
	}

	/* ---------- Hero ---------- */
	.hero {
		display: grid;
		grid-template-columns: 1.05fr 0.95fr;
		align-items: center;
		gap: clamp(24px, 5vw, 64px);
		max-width: 1180px;
		margin: 0 auto;
		padding: clamp(40px, 7vw, 88px) clamp(16px, 4vw, 48px);
	}

	.eyebrow {
		display: inline-block;
		margin-bottom: 12px;
		color: var(--iz-green-700);
		font-size: 12px;
		font-weight: 750;
		letter-spacing: 0.08em;
		text-transform: uppercase;
	}

	.hero h1 {
		margin: 0 0 16px;
		color: var(--iz-ink);
		font-size: clamp(32px, 5vw, 52px);
		line-height: 1.06;
		letter-spacing: -1.6px;
	}

	.hero-copy > p {
		max-width: 46ch;
		margin: 0 0 26px;
		color: var(--iz-ink-soft);
		font-size: clamp(15px, 1.6vw, 18px);
		line-height: 1.6;
	}

	.hero-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 12px;
	}

	.hero-visual {
		position: relative;
		border-radius: 22px;
		overflow: hidden;
		box-shadow: var(--iz-shadow-lg);
	}

	.hero-visual > img {
		display: block;
		width: 100%;
		height: clamp(260px, 34vw, 400px);
		object-fit: cover;
	}

	.hero-chip {
		position: absolute;
		right: 16px;
		bottom: 16px;
		left: 16px;
		display: flex;
		align-items: center;
		gap: 12px;
		padding: 12px 14px;
		border-radius: var(--iz-radius-md);
		background: rgb(255 255 255 / 92%);
		backdrop-filter: blur(8px);
	}

	.hero-chip img {
		width: 38px;
		height: 38px;
		object-fit: contain;
	}

	.hero-chip strong {
		display: block;
		color: var(--iz-ink);
		font-size: 14px;
	}

	.hero-chip span {
		color: var(--iz-muted);
		font-size: 12px;
	}

	/* ---------- Secciones ---------- */
	.section {
		max-width: 1180px;
		margin: 0 auto;
		padding: clamp(44px, 6vw, 78px) clamp(16px, 4vw, 48px);
	}

	.section.band {
		max-width: none;
		background: var(--iz-surface-muted);
	}

	.section.band > * {
		max-width: 1180px;
		margin-right: auto;
		margin-left: auto;
	}

	.section-head {
		max-width: 640px;
		margin-bottom: 36px;
	}

	.section-head h2,
	.split-copy h2 {
		margin: 0 0 10px;
		color: var(--iz-ink);
		font-size: clamp(24px, 3.4vw, 34px);
		letter-spacing: -0.8px;
	}

	.section-head p {
		margin: 0;
		color: var(--iz-muted);
		font-size: 16px;
		line-height: 1.6;
	}

	/* ---------- Features ---------- */
	.feature-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 16px;
	}

	.feature {
		padding: 22px;
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-lg);
		background: var(--iz-surface);
		box-shadow: var(--iz-shadow-sm);
	}

	.feature-icon {
		display: grid;
		width: 44px;
		height: 44px;
		place-items: center;
		margin-bottom: 14px;
		border-radius: 12px;
		background: var(--iz-green-50);
		color: var(--iz-green-700);
	}

	.feature-icon svg {
		width: 24px;
		height: 24px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.6;
	}

	.feature h3 {
		margin: 0 0 6px;
		color: var(--iz-ink);
		font-size: 16px;
	}

	.feature p {
		margin: 0;
		color: var(--iz-muted);
		font-size: 14px;
		line-height: 1.55;
	}

	/* ---------- Steps ---------- */
	.steps {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
		gap: 16px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.step {
		padding: 24px;
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-lg);
		background: var(--iz-surface);
	}

	.step-n {
		display: inline-block;
		margin-bottom: 10px;
		color: var(--iz-amber);
		font-size: 26px;
		font-weight: 800;
		letter-spacing: -1px;
	}

	.step h3 {
		margin: 0 0 6px;
		color: var(--iz-ink);
		font-size: 17px;
	}

	.step p {
		margin: 0;
		color: var(--iz-muted);
		font-size: 14px;
		line-height: 1.55;
	}

	/* ---------- Split / Pagos ---------- */
	.split {
		display: grid;
		grid-template-columns: 1.1fr 0.9fr;
		align-items: center;
		gap: clamp(24px, 5vw, 56px);
	}

	.split-copy > p {
		margin: 0 0 18px;
		color: var(--iz-ink-soft);
		font-size: 16px;
		line-height: 1.6;
	}

	.checks {
		display: grid;
		gap: 10px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.checks li {
		position: relative;
		padding-left: 28px;
		color: var(--iz-ink-soft);
		font-size: 15px;
	}

	.checks li::before {
		content: '';
		position: absolute;
		top: 3px;
		left: 0;
		width: 16px;
		height: 16px;
		border-radius: 50%;
		background: var(--iz-green-100);
		box-shadow: inset 0 0 0 2px var(--iz-green-600);
	}

	.split-card {
		padding: 24px;
		border: 1px solid var(--iz-line);
		border-radius: var(--iz-radius-lg);
		background: var(--iz-surface);
		box-shadow: var(--iz-shadow-md);
	}

	.pay-row {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 12px;
	}

	.pay-row strong {
		color: var(--iz-ink);
		font-size: 15px;
	}

	.pay-amount {
		color: var(--iz-ink);
		font-size: 20px;
		font-weight: 750;
		letter-spacing: -0.5px;
	}

	.pay-line {
		margin: 16px 0;
		border-top: 1px dashed var(--iz-line-strong);
	}

	.pay-row.small {
		color: var(--iz-muted);
		font-size: 13px;
	}

	.pay-row.small + .pay-row.small {
		margin-top: 10px;
	}

	.pay-pill {
		padding: 3px 10px;
		border-radius: 999px;
		background: var(--iz-green-100);
		color: var(--iz-green-700);
		font-weight: 700;
	}

	/* ---------- Nosotros ---------- */
	.about {
		display: grid;
		grid-template-columns: 0.9fr 1.1fr;
		gap: clamp(24px, 5vw, 56px);
	}

	.about-brand img {
		width: 96px;
		height: 96px;
		object-fit: contain;
	}

	.about-brand p {
		margin: 14px 0 18px;
		color: var(--iz-ink-soft);
		font-size: 15px;
		line-height: 1.65;
	}

	.values {
		display: flex;
		flex-wrap: wrap;
		gap: 8px;
		margin: 0;
		padding: 0;
		list-style: none;
	}

	.values li {
		padding: 5px 12px;
		border: 1px solid var(--iz-line-strong);
		border-radius: 999px;
		background: var(--iz-surface);
		color: var(--iz-ink-soft);
		font-size: 13px;
		font-weight: 600;
	}

	.about-cards {
		display: grid;
		gap: 16px;
	}

	.about-card {
		padding: 22px;
		border: 1px solid var(--iz-line);
		border-left: 4px solid var(--iz-green-600);
		border-radius: var(--iz-radius-lg);
		background: var(--iz-surface);
		box-shadow: var(--iz-shadow-sm);
	}

	.about-card h3 {
		margin: 0 0 8px;
		color: var(--iz-green-700);
		font-size: 15px;
		letter-spacing: 0.02em;
		text-transform: uppercase;
	}

	.about-card p {
		margin: 0;
		color: var(--iz-ink-soft);
		font-size: 15px;
		line-height: 1.65;
	}

	/* ---------- CTA final ---------- */
	.cta-band {
		display: grid;
		justify-items: center;
		gap: 10px;
		max-width: 1180px;
		margin: 0 auto clamp(40px, 6vw, 72px);
		padding: clamp(36px, 5vw, 60px) clamp(16px, 4vw, 48px);
		border-radius: 24px;
		background:
			linear-gradient(180deg, rgb(23 53 42 / 92%), rgb(23 53 42 / 96%)),
			url('/fondo.jpg') center / cover no-repeat;
		text-align: center;
	}

	.cta-band h2 {
		max-width: 22ch;
		margin: 0;
		color: #fff;
		font-size: clamp(24px, 3.6vw, 36px);
		letter-spacing: -0.8px;
	}

	.cta-band p {
		margin: 0 0 14px;
		color: rgb(255 255 255 / 82%);
		font-size: 16px;
	}

	.cta-band .btn.ghost {
		border-color: rgb(255 255 255 / 45%);
		background: rgb(255 255 255 / 12%);
		color: #fff;
	}

	.cta-band .btn.ghost:hover {
		background: rgb(255 255 255 / 22%);
	}

	/* ---------- Footer ---------- */
	.site-foot {
		display: flex;
		flex-wrap: wrap;
		align-items: center;
		justify-content: space-between;
		gap: 16px;
		padding: 28px clamp(16px, 4vw, 48px);
		border-top: 1px solid var(--iz-line);
		background: var(--iz-surface);
	}

	.foot-brand img {
		width: 34px;
		height: 34px;
		object-fit: contain;
	}

	.site-foot p {
		flex: 1 1 240px;
		margin: 0;
		color: var(--iz-muted);
		font-size: 13px;
	}

	.site-foot nav {
		display: flex;
		flex-wrap: wrap;
		gap: 16px;
	}

	.site-foot nav a {
		color: var(--iz-ink-soft);
		font-size: 13px;
		font-weight: 600;
		text-decoration: none;
	}

	.site-foot nav a:hover {
		color: var(--iz-green-700);
	}

	/* ---------- Responsive ---------- */
	@media (max-width: 900px) {
		.hero,
		.split,
		.about {
			grid-template-columns: 1fr;
		}

		.hero-visual {
			order: -1;
		}

		.site-nav {
			display: none;
		}
	}

	@media (max-width: 560px) {
		.site-head {
			flex-wrap: wrap;
		}

		.site-cta {
			width: 100%;
		}

		.site-cta .btn {
			flex: 1;
		}

		.hero-actions .btn {
			flex: 1 1 100%;
		}

		.cta-band .btn {
			flex: 1 1 100%;
		}
	}
</style>
