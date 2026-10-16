const CURRENCY_LOCALES: Record<string, string> = {
	COP: 'es-CO',
	CLP: 'es-CL',
	MXN: 'es-MX',
	ARS: 'es-AR',
	PEN: 'es-PE',
	EUR: 'es-ES',
	USD: 'en-US'
};

export function formatCurrency(amountCents: number, currencyCode = 'COP'): string {
	const locale = CURRENCY_LOCALES[currencyCode.toUpperCase()] ?? 'es-CO';
	try {
		return new Intl.NumberFormat(locale, {
			style: 'currency',
			currency: currencyCode.toUpperCase(),
			maximumFractionDigits: 0
		}).format(amountCents / 100);
	} catch {
		return `$${Math.round(amountCents / 100).toLocaleString('es-CO')}`;
	}
}

const DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', {
	day: 'numeric',
	month: 'short',
	year: 'numeric'
});

const TIME_FORMATTER = new Intl.DateTimeFormat('es-CO', {
	hour: 'numeric',
	minute: '2-digit'
});

export function formatLongDate(date: Date = new Date()): string {
	return DATE_FORMATTER.format(date).replace('.', '');
}

// Versión compacta para la barra superior: "15 oct".
const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('es-CO', {
	day: 'numeric',
	month: 'short'
});

export function formatShortDate(date: Date = new Date()): string {
	// es-CO produce "15 de oct"; lo dejamos en "15 oct" para la barra.
	return SHORT_DATE_FORMATTER.format(date).replace('.', '').replace(/ de /g, ' ');
}

export function formatDateTimeParts(value: string | null): { day: string; time: string } {
	if (!value) return { day: '', time: '' };
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return { day: '', time: '' };
	return { day: formatLongDate(date), time: TIME_FORMATTER.format(date) };
}

export function formatRelativeTime(value: string | null): string {
	if (!value) return '';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return '';

	const diffMs = Date.now() - date.getTime();
	const diffMinutes = Math.round(diffMs / 60000);
	if (diffMinutes < 1) return 'Ahora mismo';
	if (diffMinutes < 60) return `Hace ${diffMinutes} min`;

	const diffHours = Math.round(diffMinutes / 60);
	if (diffHours < 24) return `Hace ${diffHours} h`;

	const yesterday = new Date();
	yesterday.setDate(yesterday.getDate() - 1);
	if (date.toDateString() === yesterday.toDateString()) {
		return `Ayer, ${TIME_FORMATTER.format(date)}`;
	}

	return formatLongDate(date);
}

const ROLE_LABELS: Record<string, string> = {
	admin: 'Administrador',
	emprendedor: 'Emprendedor',
	comprador: 'Comprador',
	voluntario: 'Voluntario'
};

export function formatRole(role: string): string {
	return ROLE_LABELS[role?.toLowerCase()] ?? 'Miembro';
}

export function firstName(fullName: string): string {
	const trimmed = fullName?.trim() ?? '';
	if (!trimmed) return '';
	return trimmed.split(/\s+/)[0];
}

export function initials(fullName: string): string {
	const parts = (fullName?.trim() ?? '').split(/\s+/).filter(Boolean);
	if (parts.length === 0) return '?';
	if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
	return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * La API entrega el cuerpo de algunas notificaciones como el HTML del correo
 * enviado (con estilos inline). Aquí se convierte a texto legible y se recorta
 * para poder mostrarlo en una lista.
 */
export function toPlainText(value: string, maxLength = 240): string {
	if (!value) return '';

	let text = value;
	if (/<[a-z][\s\S]*>/i.test(value)) {
		const spaced = separateBlocks(value);
		if (typeof DOMParser !== 'undefined') {
			try {
				const doc = new DOMParser().parseFromString(spaced, 'text/html');
				doc.querySelectorAll('style, script, head').forEach((node) => node.remove());
				text = doc.body?.textContent ?? '';
			} catch {
				text = stripTags(spaced);
			}
		} else {
			text = stripTags(spaced);
		}
	}

	text = text
		.replace(/&nbsp;/g, ' ')
		.replace(/&amp;/g, '&')
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#39;/g, "'")
		.replace(/\s+/g, ' ')
		.trim();

	return text.length > maxLength ? `${text.slice(0, maxLength).trimEnd()}…` : text;
}

// Unir el texto de bloques distintos necesita separación explícita: sin esto
// "</p><p>" produce "contrasenaHola" al leer textContent.
function separateBlocks(value: string): string {
	return value
		.replace(/<\/\s*(p|div|h[1-6]|li|tr|td|th|section|article|ul|ol|table|blockquote)\s*>/gi, ' $& ')
		.replace(/<br\s*\/?>/gi, ' ');
}

function stripTags(value: string): string {
	return value
		.replace(/<style[\s\S]*?<\/style>/gi, ' ')
		.replace(/<script[\s\S]*?<\/script>/gi, ' ')
		.replace(/<[^>]*>/g, ' ');
}

export function greeting(date: Date = new Date()): string {
	const hour = date.getHours();
	if (hour < 12) return 'Buenos días';
	if (hour < 19) return 'Buenas tardes';
	return 'Buenas noches';
}
