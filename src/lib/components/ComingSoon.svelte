<script lang="ts">
	let { title, description }: { title: string; description: string } = $props();
</script>

<section class="soon">
	<span class="soon-icon" aria-hidden="true">
		<svg viewBox="0 0 24 24">
			<path d="M12 21c0-6 0-9 8-12 0 8-3 11-8 12Z" />
			<path d="M12 21C12 14 10 9 4 6c-1 7 2 12 8 15Z" />
		</svg>
	</span>
	<h1>{title}</h1>
	<p>{description}</p>
	<a class="back" href="/dashboard">Volver al inicio</a>
</section>

<style>
	.soon {
		display: grid;
		max-width: 420px;
		margin: 70px auto;
		padding: 34px 28px;
		border: 1px solid #e7e4dc;
		border-radius: 18px;
		background: #fff;
		text-align: center;
	}

	.soon-icon {
		display: grid;
		width: 54px;
		height: 54px;
		place-items: center;
		margin: 0 auto 16px;
		border-radius: 50%;
		background: #e6f0e4;
		color: #3f7a52;
	}

	.soon-icon svg {
		width: 26px;
		height: 26px;
		fill: none;
		stroke: currentColor;
		stroke-linecap: round;
		stroke-linejoin: round;
		stroke-width: 1.7;
	}

	h1 {
		margin: 0;
		color: #1c3a2c;
		font-family: Georgia, 'Times New Roman', serif;
		font-size: 24px;
		font-weight: 600;
	}

	p {
		margin: 9px 0 20px;
		color: #7b857e;
		font-size: 13px;
		line-height: 1.6;
	}

	.back {
		justify-self: center;
		padding: 10px 18px;
		border-radius: 9px;
		background: #1f4736;
		color: #f4f7f2;
		font-size: 12.5px;
		font-weight: 600;
		text-decoration: none;
	}

	.back:hover {
		background: #17352a;
	}
</style>
