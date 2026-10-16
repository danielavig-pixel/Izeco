<script lang="ts">
	interface Props {
		page: number;
		totalPages: number;
		onchange: (page: number) => void;
		disabled?: boolean;
	}

	let { page, totalPages, onchange, disabled = false }: Props = $props();

	const canPrev = $derived(page > 1);
	const canNext = $derived(page < totalPages);
</script>

{#if totalPages > 1}
	<nav class="ad-pagination" aria-label="Paginación">
		<button
			class="ad-btn ghost small"
			type="button"
			disabled={disabled || !canPrev}
			onclick={() => onchange(page - 1)}
		>
			Anterior
		</button>
		<span>Página {page} de {totalPages}</span>
		<button
			class="ad-btn ghost small"
			type="button"
			disabled={disabled || !canNext}
			onclick={() => onchange(page + 1)}
		>
			Siguiente
		</button>
	</nav>
{/if}
