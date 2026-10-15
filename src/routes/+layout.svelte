<script lang="ts">
	import favicon from '#lib/assets/favicon.svg';
	import type { LayoutProps } from './$types';

	let { children }: LayoutProps = $props();
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
	<meta name="theme-color" content="#f7f5f0" />
</svelte:head>

{@render children()}

<style>
	/* Paleta única de Izeco: todo el producto usa estos tokens. */
	:global(:root) {
		/* Superficies */
		--iz-bg: #f7f5f0;
		--iz-surface: #ffffff;
		--iz-surface-muted: #f2f0ea;
		--iz-header: #fbfaf7;

		/* Líneas y sombras */
		--iz-line: #e6e3da;
		--iz-line-strong: #d6d2c7;
		--iz-shadow-sm: 0 1px 2px rgb(31 42 36 / 5%);
		--iz-shadow-md: 0 10px 24px rgb(31 42 36 / 9%);
		--iz-shadow-lg: 0 18px 42px rgb(31 42 36 / 14%);

		/* Texto */
		--iz-ink: #1f2a24;
		--iz-ink-soft: #3d4a43;
		--iz-muted: #7c857e;
		--iz-faint: #9aa39c;

		/* Verdes */
		--iz-green-900: #17352a;
		--iz-green-800: #1f4736;
		--iz-green-700: #2b5c45;
		--iz-green-600: #3f7a52;
		--iz-green-300: #a9d0ad;
		--iz-green-100: #e4f0e2;
		--iz-green-50: #eef5ec;

		/* Acentos */
		--iz-amber: #d98b2b;
		--iz-amber-100: #fbeedd;
		--iz-purple: #6b5bd2;
		--iz-purple-100: #eae7fb;
		--iz-blue: #4869cc;
		--iz-blue-100: #e4ebfb;
		--iz-danger: #9e352f;

		--iz-radius-sm: 10px;
		--iz-radius-md: 14px;
		--iz-radius-lg: 18px;

		color-scheme: light;
	}

	:global(html) {
		min-width: 320px;
		min-height: 100%;
		background: var(--iz-bg);
	}

	:global(body) {
		min-width: 320px;
		min-height: 100vh;
		margin: 0;
		background: var(--iz-bg);
		color: var(--iz-ink);
		font-family:
			'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
		-webkit-font-smoothing: antialiased;
	}

	:global(*) {
		box-sizing: border-box;
	}
</style>
