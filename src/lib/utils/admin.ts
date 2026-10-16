/**
 * Utilidades del panel de administración.
 *
 * Las respuestas de /admin/overview y /admin/reports/* no están tipadas en el
 * Swagger, así que aquí se describen de forma tolerante: se recorren los objetos
 * y se extraen métricas legibles sin depender de la forma exacta.
 */

const LABELS: Record<string, string> = {
	users: 'Usuarios',
	totalUsers: 'Usuarios',
	activeUsers: 'Usuarios activos',
	inactiveUsers: 'Usuarios inactivos',
	admins: 'Administradores',
	entrepreneurs: 'Emprendimientos',
	entrepreneurships: 'Emprendimientos',
	totalEntrepreneurs: 'Emprendimientos',
	pendingEntrepreneurs: 'Emprendimientos por revisar',
	approvedEntrepreneurs: 'Emprendimientos aprobados',
	rejectedEntrepreneurs: 'Emprendimientos rechazados',
	suspendedEntrepreneurs: 'Emprendimientos suspendidos',
	products: 'Productos',
	totalProducts: 'Productos',
	publishedProducts: 'Productos publicados',
	rawMaterials: 'Materia prima',
	materiaPrima: 'Materia prima',
	draftProducts: 'Productos en borrador',
	archivedProducts: 'Productos archivados',
	categories: 'Categorías',
	campaigns: 'Campañas',
	activeCampaigns: 'Campañas activas',
	finishedCampaigns: 'Campañas finalizadas',
	volunteers: 'Voluntariados',
	volunteerActivities: 'Jornadas',
	activities: 'Jornadas',
	openActivities: 'Jornadas abiertas',
	signups: 'Inscripciones',
	pendingSignups: 'Inscripciones pendientes',
	confirmedSignups: 'Inscripciones confirmadas',
	rejectedSignups: 'Inscripciones rechazadas',
	collections: 'Recolecciones',
	payments: 'Pagos',
	totalPayments: 'Pagos',
	approvedPayments: 'Pagos aprobados',
	pendingPayments: 'Pagos pendientes',
	rejectedPayments: 'Pagos rechazados',
	refundedPayments: 'Pagos reembolsados',
	subscriptions: 'Suscripciones',
	notifications: 'Notificaciones',
	unread: 'Sin leer',
	buyers: 'Compradores',
	sellers: 'Vendedores',
	money: 'Dinero',
	revenue: 'Ingresos',
	amounts: 'Montos',
	count: 'Cantidad',
	total: 'Total',
	active: 'Activos',
	inactive: 'Inactivos',
	approved: 'Aprobados',
	pending: 'Pendientes',
	rejected: 'Rechazados',
	completed: 'Completados',
	refunded: 'Reembolsados',
	cancelled: 'Cancelados',
	byRole: 'Por rol',
	byStatus: 'Por estado',
	byMaterial: 'Por material',
	byUnit: 'Por unidad',
	byCategory: 'Por categoría',
	totalCents: 'Total',
	approvedCents: 'Aprobado',
	pendingCents: 'Pendiente',
	refundedCents: 'Reembolsado',
	rejectedCents: 'Rechazado',
	collectedQuantity: 'Cantidad recolectada'
};

/** Convierte una clave camelCase / snake_case en una etiqueta legible en español. */
export function humanizeKey(key: string): string {
	if (!key) return '';
	if (LABELS[key]) return LABELS[key];
	const words = key
		.replace(/[_-]+/g, ' ')
		.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
		.trim()
		.split(/\s+/)
		.filter(Boolean);
	if (!words.length) return key;
	const phrase = words.join(' ').toLowerCase();
	return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

/** ¿La clave representa un monto en centavos? */
export function isMoneyKey(key: string): boolean {
	return /cent/i.test(key);
}

export interface Metric {
	key: string;
	label: string;
	value: number;
	money: boolean;
}

export interface MetricGroup {
	key: string;
	label: string;
	metrics: Metric[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function numericValue(value: unknown): number | null {
	if (typeof value === 'number' && Number.isFinite(value)) return value;
	if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
		return Number(value);
	}
	return null;
}

// Títulos de los grupos de /admin/overview. Las claves del API vienen sin
// tildes ("campanas"), así que aquí se escriben correctamente en español.
const GROUP_LABELS: Record<string, string> = {
	usuarios: 'Usuarios',
	emprendimientos: 'Emprendimientos',
	productos: 'Productos',
	materiaPrima: 'Materia prima',
	campanas: 'Campañas',
	voluntariados: 'Voluntariados',
	inscripciones: 'Inscripciones',
	notificaciones: 'Notificaciones',
	dinero: 'Dinero',
	donaciones: 'Donaciones'
};

/**
 * Describe la respuesta de /admin/overview como grupos de métricas. Un valor
 * numérico suelto se muestra como su propia tarjeta; un objeto anidado se
 * muestra como un grupo con sus métricas.
 */
export function describeOverview(raw: Record<string, unknown> | null): MetricGroup[] {
	if (!raw) return [];
	const groups: MetricGroup[] = [];
	const loose: Metric[] = [];

	for (const [key, value] of Object.entries(raw)) {
		const numeric = numericValue(value);
		if (numeric !== null) {
			loose.push({
				key,
				label: humanizeKey(key),
				value: numeric,
				money: isMoneyKey(key)
			});
			continue;
		}
		if (isRecord(value)) {
			const metrics: Metric[] = [];
			for (const [childKey, childValue] of Object.entries(value)) {
				const childNumeric = numericValue(childValue);
				if (childNumeric === null) continue;
				metrics.push({
					key: `${key}.${childKey}`,
					label: humanizeKey(childKey),
					value: childNumeric,
					money: isMoneyKey(childKey) || isMoneyKey(key)
				});
			}
			if (metrics.length) {
				groups.push({ key, label: GROUP_LABELS[key] ?? humanizeKey(key), metrics });
			}
		}
	}

	if (loose.length) groups.unshift({ key: 'total', label: 'Resumen general', metrics: loose });
	return groups;
}

export interface SeriesPoint {
	label: string;
	value: number;
}

const DATE_KEYS = ['date', 'day', 'fecha', 'dia', 'timestamp', 'label', 'period'];

function findArray(raw: unknown, depth = 0): Record<string, unknown>[] | null {
	if (Array.isArray(raw)) {
		const records = raw.filter(isRecord);
		if (records.length) return records;
		return null;
	}
	if (!isRecord(raw) || depth > 3) return null;
	for (const value of Object.values(raw)) {
		const found = findArray(value, depth + 1);
		if (found) return found;
	}
	return null;
}

/**
 * Extrae una serie temporal de un reporte. Busca el primer array de objetos con
 * un campo de fecha y toma el primer campo numérico (prioriza `preferredKeys`).
 */
export function extractSeries(raw: Record<string, unknown> | null, preferredKeys: string[] = []): SeriesPoint[] {
	if (!raw) return [];
	const records = findArray(raw);
	if (!records || records.length === 0) return [];

	const dateKey = DATE_KEYS.find((key) => records.some((record) => typeof record[key] === 'string'));
	if (!dateKey) return [];

	const numericKeys = new Set<string>();
	for (const record of records) {
		for (const [key, value] of Object.entries(record)) {
			if (key !== dateKey && numericValue(value) !== null) numericKeys.add(key);
		}
	}
	if (numericKeys.size === 0) return [];

	const valueKey =
		preferredKeys.find((key) => numericKeys.has(key)) ?? [...numericKeys][0];

	return records.map((record) => {
		const label = formatShortDate(record[dateKey]);
		return { label, value: numericValue(record[valueKey]) ?? 0 };
	});
}

function formatShortDate(value: unknown): string {
	if (typeof value !== 'string' && typeof value !== 'number') return '';
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return String(value);
	return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(date);
}
