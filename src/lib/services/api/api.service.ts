import { getAccessToken } from '../auth/auth.service.js';

/**
 * Cliente HTTP de la API de Izeco.
 * Documentación: https://reseedb.vercel.app/docs
 *
 * Las respuestas de los endpoints autenticados no están tipadas en el Swagger,
 * así que cada recurso pasa por un normalizador tolerante: acepta distintas
 * formas de paginación ({ items } o array) y distintos nombres de campo.
 */

const API_BASE_URL = 'https://reseedb.vercel.app';

export class ApiServiceError extends Error {
	constructor(
		message: string,
		public readonly status?: number
	) {
		super(message);
		this.name = 'ApiServiceError';
	}
}

export interface Paginated<T> {
	items: T[];
	total: number;
	page: number;
	limit: number;
	totalPages: number;
}

export interface UserProfile {
	id: string;
	name: string;
	email: string;
	role: string;
	bio: string;
	phone: string;
	isActive: boolean;
	createdAt: string | null;
}

export interface Payment {
	id: string;
	amountCents: number;
	currencyCode: string;
	status: string;
	description: string;
	/** Referencia de la pasarela; el checkout sandbox la usa como identificador. */
	externalRef?: string;
	refundedAmountCents?: number;
	confirmedAt?: string | null;
	createdAt: string | null;
}

export interface NotificationItem {
	id: string;
	type: string;
	title: string;
	body: string;
	isRead: boolean;
	createdAt: string | null;
}

export interface Product {
	id: string;
	name: string;
	description: string;
	priceCents: number;
	currencyCode: string;
	categoryId: string;
	categoryName: string;
	entrepreneurId: string;
	entrepreneurName: string;
	stock: number | null;
	/** Unidades disponibles; null = sin límite (servicio). */
	available: number | null;
	imageUrl: string;
	/** Todas las imágenes del producto (galería). */
	images: string[];
	slug: string;
	/** "artesania" (socios) o "materia_prima" (plataforma). */
	type: string;
	isRawMaterial: boolean;
}

export interface VolunteerActivity {
	id: string;
	title: string;
	description: string;
	location: string;
	startsAt: string | null;
	endsAt: string | null;
	imageUrl: string;
	status: string;
	/** null = cupos ilimitados. */
	slots: number | null;
	taken: number;
	remaining: number | null;
}

/** Material recolectado en una jornada (endpoint publico). */
export interface ActivityCollection {
	id: string;
	material: string;
	unit: string;
	/** Ya viene formateado por la API: "45.500 kg". */
	quantityLabel: string;
	collectedAt: string | null;
	notes: string;
	rawMaterialProductName: string;
}

// Etiquetas de los materiales recolectados (la API los entrega como slug).
const MATERIAL_LABELS: Record<string, string> = {
	pet: 'Botellas PET',
	plastico_filme: 'Plástico film',
	plastico_rigido: 'Plástico rígido',
	carton: 'Cartón',
	papel: 'Papel',
	aluminio: 'Aluminio',
	vidrio: 'Vidrio',
	metal: 'Metal',
	organico: 'Orgánico',
	otro: 'Otro material'
};

export function materialLabel(material: string): string {
	return MATERIAL_LABELS[material?.toLowerCase()] ?? 'Material';
}

export interface Campaign {
	id: string;
	title: string;
	slug: string;
	summary: string;
	description: string;
	imageUrl: string;
	goalCents: number | null;
	donationUrl: string;
	status: string;
	startsAt: string | null;
	endsAt: string | null;
	isActive: boolean;
	createdAt: string | null;
}

/** Resultado de inscribirse o cancelar una inscripcion a una jornada. */
export interface VolunteerSignupResult {
	id: string;
	activityId: string;
	activityTitle: string;
	status: string;
	note: string;
	createdAt: string | null;
}

export interface VolunteerSignup {
	id: string;
	activityId: string;
	activityTitle: string;
	status: string;
	createdAt: string | null;
	activity: VolunteerActivity | null;
}

export interface CategoryCount {
	categoryId: string;
	name: string;
	products: number;
}

export interface CategoryNode {
	id: string;
	name: string;
	slug: string;
	children: CategoryNode[];
}

export interface Entrepreneur {
	id: string;
	name: string;
	slug: string;
	description: string;
	category: string;
	logoUrl: string;
	contactPhone: string;
	contactEmail: string;
	status: string;
	createdAt: string | null;
}

/**
 * Ficha propia del socio (GET /entrepreneurs/mine). Añade el estado de
 * revisión y el motivo que dejó el admin al rechazar o suspender.
 */
export interface MyEntrepreneur extends Entrepreneur {
	ownerId: string;
	reviewNote: string;
	updatedAt: string | null;
}

export interface EntrepreneurInput {
	name: string;
	description: string;
	category?: string;
	logoUrl?: string;
	contactPhone?: string;
	contactEmail?: string;
}

export interface EntrepreneurStatusLogEntry {
	id: string;
	toStatus: string;
	actorRole: string;
	note: string;
	createdAt: string | null;
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pickString(source: Record<string, unknown> | null, keys: string[]): string {
	if (!source) return '';
	for (const key of keys) {
		const value = source[key];
		if (typeof value === 'string' && value.trim()) return value;
		if (typeof value === 'number' && Number.isFinite(value)) return String(value);
	}
	return '';
}

function pickNullableNumber(
	source: Record<string, unknown> | null,
	keys: string[]
): number | null {
	if (!source) return null;
	for (const key of keys) {
		const value = source[key];
		if (typeof value === 'number' && Number.isFinite(value)) return value;
		if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
			return Number(value);
		}
	}
	return null;
}

function pickNumber(source: Record<string, unknown> | null, keys: string[]): number {
	if (!source) return 0;
	for (const key of keys) {
		const value = source[key];
		if (typeof value === 'number' && Number.isFinite(value)) return value;
		if (typeof value === 'string' && value.trim() && Number.isFinite(Number(value))) {
			return Number(value);
		}
	}
	return 0;
}

function pickBoolean(source: Record<string, unknown> | null, keys: string[]): boolean {
	if (!source) return false;
	for (const key of keys) {
		const value = source[key];
		if (typeof value === 'boolean') return value;
	}
	return false;
}

function pickDate(source: Record<string, unknown> | null, keys: string[]): string | null {
	const value = pickString(source, keys);
	if (!value) return null;
	const parsed = new Date(value);
	return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

/** Todas las imágenes del producto, en orden; fallback a la primera imagen. */
function imageList(source: Record<string, unknown> | null): string[] {
	if (!source) return [];
	for (const key of ['images', 'photos', 'gallery']) {
		const value = source[key];
		if (Array.isArray(value)) {
			const urls = value
				.map((item) =>
					typeof item === 'string'
						? item
						: isRecord(item)
							? pickString(item, ['url', 'imageUrl'])
							: ''
				)
				.filter((url) => url.trim());
			if (urls.length) return urls;
		}
	}		const single = firstImage(source);
	return single ? [single] : [];
}

/** Busca el emprendimiento que produjo un producto (por id), si existe. */
function entrepreneurOfProduct(
	product: Product,
	entrepreneurs: Entrepreneur[]
): Entrepreneur | null {
	if (!product.entrepreneurId) return null;
	return entrepreneurs.find((e) => e.id === product.entrepreneurId) ?? null;
}

function categoryNameOf(product: Product, counts: CategoryCount[]): string {
	if (product.categoryName) return product.categoryName;
	return counts.find((count) => count.categoryId === product.categoryId)?.name ?? '';
}

function firstImage(source: Record<string, unknown> | null): string {
	if (!source) return '';
	const single = pickString(source, ['imageUrl', 'image', 'coverUrl', 'logoUrl']);
	if (single) return single;

	for (const key of ['images', 'photos', 'gallery']) {
		const value = source[key];
		if (Array.isArray(value)) {
			const first = value.find((item) => typeof item === 'string' && item.trim());
			if (typeof first === 'string') return first;
			const objectImage = value.find((item) => isRecord(item) && pickString(item, ['url', 'imageUrl']));
			if (isRecord(objectImage)) return pickString(objectImage, ['url', 'imageUrl']);
		}
	}
	return '';
}

function normalizeUser(raw: unknown): UserProfile | null {
	if (!isRecord(raw)) return null;
	const user = isRecord(raw.user) ? raw.user : raw;
	if (!isRecord(user)) return null;

	const name = pickString(user, ['name', 'fullName', 'firstName']);
	const email = pickString(user, ['email']);
	if (!name && !email) return null;

	return {
		id: pickString(user, ['id', 'userId', 'uuid']),
		name: name || email.split('@')[0],
		email,
		role: pickString(user, ['role', 'type']).toLowerCase(),
		bio: pickString(user, ['bio', 'description']),
		phone: pickString(user, ['phone', 'phoneNumber']),
		isActive: pickBoolean(user, ['isActive', 'active']),
		createdAt: pickDate(user, ['createdAt', 'created_at', 'registeredAt'])
	};
}

function normalizePayment(raw: unknown): Payment | null {
	if (!isRecord(raw)) return null;
	const id = pickString(raw, ['id', 'paymentId', 'uuid']);
	const amountCents = pickNumber(raw, ['amountCents', 'amount_cents', 'amount']);
	if (!id && !amountCents) return null;

	return {
		id,
		amountCents,
		currencyCode: pickString(raw, ['currencyCode', 'currency_code', 'currency']) || 'COP',
		status: pickString(raw, ['status', 'state']).toLowerCase(),
		description: pickString(raw, ['description', 'concept', 'title', 'reference']),
		externalRef: pickString(raw, ['externalRef', 'external_ref']) || undefined,
		refundedAmountCents:
			pickNullableNumber(raw, ['refundedAmountCents', 'refunded_amount_cents', 'refundedCents']) ?? 0,
		confirmedAt: pickDate(raw, ['confirmedAt', 'confirmed_at']),
		createdAt: pickDate(raw, ['createdAt', 'created_at', 'date', 'paidAt'])
	};
}

const NOTIFICATION_TITLES: Record<string, string> = {
	registro: 'Registro completado',
	verificacion: 'Correo verificado',
	pago: 'Pago confirmado',
	reembolso: 'Reembolso procesado',
	emprendimiento: 'Nuevo emprendimiento',
	voluntariado: 'Inscripción a jornada',
	campana: 'Nueva campaña',
	sistema: 'Novedad de Izeco'
};

function normalizeNotification(raw: unknown): NotificationItem | null {
	if (!isRecord(raw)) return null;
	const type = pickString(raw, ['type', 'kind', 'category']).toLowerCase();
	const title =
		pickString(raw, ['title', 'subject', 'subjectLine', 'name']) || NOTIFICATION_TITLES[type] || 'Novedad';
	const body = pickString(raw, ['message', 'body', 'content', 'description', 'text', 'preview']);
	if (!title && !body) return null;

	return {
		id: pickString(raw, ['id', 'notificationId', 'uuid']),
		type,
		title,
		body,
		isRead: pickBoolean(raw, ['isRead', 'read', 'leido', 'seen']),
		createdAt: pickDate(raw, ['createdAt', 'created_at', 'sentAt', 'date'])
	};
}

function normalizeProduct(raw: unknown): Product | null {
	if (!isRecord(raw)) return null;
	const name = pickString(raw, ['name', 'title', 'productName']);
	if (!name) return null;

	const category = isRecord(raw.category) ? raw.category : null;
	const entrepreneur = isRecord(raw.entrepreneur)
		? raw.entrepreneur
		: isRecord(raw.entrepreneurship)
			? raw.entrepreneurship
			: isRecord(raw.seller)
				? raw.seller
				: null;

	return {
		id: pickString(raw, ['id', 'productId', 'uuid']),
		name,
		description: pickString(raw, ['description', 'summary']),
		priceCents: pickNumber(raw, ['priceCents', 'price_cents', 'price']),
		currencyCode: pickString(raw, ['currencyCode', 'currency_code', 'currency']) || 'COP',
		categoryId: pickString(raw, ['categoryId', 'category_id']),
		entrepreneurId: pickString(raw, ['entrepreneurId', 'entrepreneur_id']),
		stock: isRecord(raw) && 'stock' in raw && typeof raw.stock === 'number' ? raw.stock : null,
		available: pickNullableNumber(raw, ['available', 'stock']),
		images: imageList(raw),
		categoryName:
			pickString(category, ['name', 'title']) || pickString(raw, ['categoryName', 'category']),
		entrepreneurName:
			pickString(entrepreneur, ['name', 'title', 'businessName']) ||
			pickString(raw, ['entrepreneurName', 'businessName', 'sellerName']),
		imageUrl: firstImage(raw),
		slug: pickString(raw, ['slug']),
		type:
			pickString(raw, ['type', 'productType', 'kind']).toLowerCase() ||
			(pickBoolean(raw, ['isRawMaterial', 'rawMaterial']) ? 'materia_prima' : 'artesania'),
		isRawMaterial:
			pickBoolean(raw, ['isRawMaterial', 'rawMaterial']) ||
			pickString(raw, ['type', 'productType', 'kind']).toLowerCase() === 'materia_prima'
	};
}

function normalizeVolunteer(raw: unknown): VolunteerActivity | null {
	if (!isRecord(raw)) return null;
	const title = pickString(raw, ['title', 'name']);
	if (!title) return null;

	const slots = pickNullableNumber(raw, ['slots', 'capacity', 'quota']);
	const taken = pickNumber(raw, ['taken', 'signed', 'signups']);
	const remaining = pickNullableNumber(raw, ['remaining', 'left', 'available']);

	return {
		id: pickString(raw, ['id', 'volunteerId', 'activityId', 'uuid']),
		title,
		description: pickString(raw, ['description', 'summary']),
		location: pickString(raw, ['location', 'place', 'address', 'city']),
		startsAt: pickDate(raw, ['startsAt', 'startAt', 'startDate', 'date']),
		endsAt: pickDate(raw, ['endsAt', 'endAt', 'endDate']),
		imageUrl: firstImage(raw),
		status: pickString(raw, ['status', 'state']).toLowerCase(),
		slots,
		taken,
		// Sin cupos declarados la jornada es abierta: no hay "quedan N".
		remaining: remaining ?? (slots === null ? null : Math.max(0, slots - taken))
	};
}

function normalizeCollection(raw: unknown): ActivityCollection | null {
	if (!isRecord(raw)) return null;
	const material = pickString(raw, ['material', 'materialType']).toLowerCase();
	const quantityLabel = pickString(raw, ['quantityLabel', 'quantity_label']);
	if (!material && !quantityLabel) return null;

	return {
		id: pickString(raw, ['id', 'collectionId']),
		material,
		unit: pickString(raw, ['unit']).toLowerCase(),
		quantityLabel,
		collectedAt: pickDate(raw, ['collectedAt', 'collected_at', 'date']),
		notes: pickString(raw, ['notes', 'note']),
		rawMaterialProductName: pickString(raw, ['rawMaterialProductName', 'rawMaterialProduct'])
	};
}

function normalizeCampaign(raw: unknown): Campaign | null {
	if (!isRecord(raw)) return null;
	const title = pickString(raw, ['title', 'name']);
	const slug = pickString(raw, ['slug']);
	if (!title && !slug) return null;

	return {
		id: pickString(raw, ['id', 'campaignId']),
		title: title || slug,
		slug,
		summary: pickString(raw, ['summary', 'subtitle']),
		description: pickString(raw, ['description', 'body']),
		imageUrl: firstImage(raw),
		goalCents: pickNullableNumber(raw, ['goalCents', 'goal_cents']),
		donationUrl: pickString(raw, ['donationUrl', 'donation_url']),
		status: pickString(raw, ['status', 'state']).toLowerCase(),
		startsAt: pickDate(raw, ['startsAt', 'startAt', 'startDate']),
		endsAt: pickDate(raw, ['endsAt', 'endAt', 'endDate']),
		isActive: pickBoolean(raw, ['isActive', 'active']),
		createdAt: pickDate(raw, ['createdAt', 'created_at'])
	};
}

function normalizeSignupResult(raw: unknown): VolunteerSignupResult | null {
	if (!isRecord(raw)) return null;
	const activityId = pickString(raw, ['activityId', 'activity_id']);
	if (!activityId) return null;

	return {
		id: pickString(raw, ['id', 'signupId']),
		activityId,
		activityTitle: pickString(raw, ['activityTitle', 'title']),
		status: pickString(raw, ['status', 'state']).toLowerCase(),
		note: pickString(raw, ['note']),
		createdAt: pickDate(raw, ['createdAt', 'created_at'])
	};
}

function normalizeCategoryCount(raw: unknown): CategoryCount | null {
	if (!isRecord(raw)) return null;
	const categoryId = pickString(raw, ['categoryId', 'id', 'category_id']);
	const name = pickString(raw, ['name', 'categoryName']);
	if (!categoryId && !name) return null;
	return { categoryId, name, products: pickNumber(raw, ['products', 'count', 'total']) };
}

function normalizeCategoryNode(raw: unknown): CategoryNode | null {
	if (!isRecord(raw)) return null;
	const id = pickString(raw, ['id', 'categoryId']);
	const name = pickString(raw, ['name']);
	if (!id && !name) return null;
	const rawChildren = Array.isArray(raw.children) ? raw.children : [];
	return {
		id,
		name,
		slug: pickString(raw, ['slug']),
		children: rawChildren
			.map(normalizeCategoryNode)
			.filter((child): child is CategoryNode => child !== null)
	};
}

function normalizeEntrepreneur(raw: unknown): Entrepreneur | null {
	if (!isRecord(raw)) return null;
	const name = pickString(raw, ['name', 'businessName', 'title']);
	if (!name) return null;
	return {
		id: pickString(raw, ['id', 'entrepreneurId']),
		name,
		slug: pickString(raw, ['slug']),
		description: pickString(raw, ['description', 'summary']),
		category: pickString(raw, ['category', 'categoryName']),
		logoUrl: pickString(raw, ['logoUrl', 'logo', 'imageUrl']),
		contactPhone: pickString(raw, ['contactPhone', 'contact_phone', 'phone']),
		contactEmail: pickString(raw, ['contactEmail', 'contact_email', 'email']),
		status: pickString(raw, ['status', 'state']).toLowerCase(),
		createdAt: pickDate(raw, ['createdAt', 'created_at'])
	};
}

/**
 * Normaliza la vista del dueño (mine / por id). Reutiliza el normalizador
 * público y añade los campos de revisión.
 */
function normalizeMyEntrepreneur(raw: unknown): MyEntrepreneur | null {
	const base = normalizeEntrepreneur(raw);
	if (!base || !isRecord(raw)) return null;
	return {
		...base,
		ownerId: pickString(raw, ['ownerId', 'owner_id']),
		reviewNote: pickString(raw, ['reviewNote', 'review_note']),
		updatedAt: pickDate(raw, ['updatedAt', 'updated_at'])
	};
}

function normalizeStatusLogEntry(raw: unknown): EntrepreneurStatusLogEntry | null {
	if (!isRecord(raw)) return null;
	return {
		id: pickString(raw, ['id']),
		toStatus: pickString(raw, ['toStatus', 'to_status', 'status']).toLowerCase(),
		actorRole: pickString(raw, ['actorRole', 'actor_role']).toLowerCase(),
		note: pickString(raw, ['note', 'reviewNote', 'review_note']),
		createdAt: pickDate(raw, ['createdAt', 'created_at'])
	};
}

function normalizeSignup(raw: unknown): VolunteerSignup | null {
	if (!isRecord(raw)) return null;
	const nested =
		(isRecord(raw.volunteer) && raw.volunteer) ||
		(isRecord(raw.activity) && raw.activity) ||
		(isRecord(raw.volunteerActivity) && raw.volunteerActivity) ||
		(isRecord(raw.jornada) && raw.jornada) ||
		null;

	const activity = nested ? normalizeVolunteer(nested) : null;
	if (!activity && !pickString(raw, ['id', 'signupId'])) return null;

	return {
		id: pickString(raw, ['id', 'signupId', 'uuid']),
		activityId: pickString(raw, ['activityId', 'activity_id']),
		activityTitle: pickString(raw, ['activityTitle', 'activity_title']),
		status: pickString(raw, ['status', 'state']).toLowerCase(),
		createdAt: pickDate(raw, ['createdAt', 'created_at', 'signedUpAt', 'date']),
		activity
	};
}

function toPage<T>(raw: unknown, normalize: (value: unknown) => T | null): Paginated<T> {
	const record = isRecord(raw) ? raw : null;
	const rawItems = Array.isArray(raw)
		? raw
		: record && Array.isArray(record.items)
			? record.items
			: record && Array.isArray(record.data)
				? record.data
				: record && Array.isArray(record.results)
					? record.results
					: [];

	const items = rawItems.map(normalize).filter((item): item is T => item !== null);
	const reportedTotal = pickNumber(record, ['total', 'count', 'totalItems']);

	return {
		items,
		total: reportedTotal || items.length,
		page: pickNumber(record, ['page', 'currentPage']) || 1,
		limit: pickNumber(record, ['limit', 'perPage', 'pageSize']) || items.length,
		totalPages: pickNumber(record, ['totalPages', 'pages']) || 1
	};
}

function getApiMessage(payload: unknown): string | undefined {
	if (typeof payload === 'string') return payload;
	if (!isRecord(payload)) return undefined;

	const message = payload.message;
	if (typeof message === 'string') return message;
	if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
		return message.join(' ');
	}

	const error = payload.error;
	return typeof error === 'string' ? error : undefined;
}

async function apiRequest(
	path: string,
	options: { method?: string; body?: unknown; auth?: boolean; signal?: AbortSignal } = {}
): Promise<unknown> {
	const { method = 'GET', body, auth = true, signal } = options;
	const headers: Record<string, string> = {};

	if (body !== undefined) headers['Content-Type'] = 'application/json';
	if (auth) {
		const token = getAccessToken();
		if (token) headers.Authorization = `Bearer ${token}`;
	}

	let response: Response;
	try {
		response = await fetch(`${API_BASE_URL}${path}`, {
			method,
			headers,
			body: body === undefined ? undefined : JSON.stringify(body),
			signal
		});
	} catch {
		throw new ApiServiceError(
			'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.'
		);
	}

	const responseText = await response.text();
	let payload: unknown;
	if (responseText) {
		try {
			payload = JSON.parse(responseText);
		} catch {
			throw new ApiServiceError('El servidor devolvió una respuesta no válida.');
		}
	}

	if (!response.ok) {
		const message =
			response.status === 401
				? 'Tu sesión expiró o no es válida. Vuelve a iniciar sesión.'
				: (getApiMessage(payload) ?? 'La solicitud no pudo completarse. Inténtalo de nuevo.');
		throw new ApiServiceError(message, response.status);
	}

	return payload;
}

function query(params: Record<string, string | number | undefined>): string {
	const search = new URLSearchParams();
	for (const [key, value] of Object.entries(params)) {
		if (value !== undefined && value !== '') search.set(key, String(value));
	}
	const result = search.toString();
	return result ? `?${result}` : '';
}

/* ------------------------------------------------------------------ */
/* Endpoints                                                           */
/* ------------------------------------------------------------------ */

export async function getMyProfile(): Promise<UserProfile> {
	const payload = await apiRequest('/users/me');
	const profile = normalizeUser(payload);
	if (!profile) throw new ApiServiceError('No se pudo leer tu perfil.');
	return profile;
}

/**
 * Elige el rol con el que quiero usar la plataforma. La API solo acepta
 * comprador, emprendedor o voluntario (nunca admin).
 */
export async function updateMyRole(role: string): Promise<UserProfile> {
	const payload = await apiRequest('/users/me', { method: 'PATCH', body: { role } });
	const profile = normalizeUser(payload);
	if (!profile) throw new ApiServiceError('No se pudo leer tu perfil.');
	return profile;
}

export async function getMyPayments(
	params: { page?: number; limit?: number; status?: string } = {}
): Promise<Paginated<Payment>> {
	const payload = await apiRequest(`/payments/mine${query(params)}`);
	return toPage(payload, normalizePayment);
}

/** Detalle de un pago: lo ve el comprador, el vendedor o un admin. */
export async function getPaymentById(id: string): Promise<Payment> {
	const payload = await apiRequest(`/payments/${encodeURIComponent(id)}`);
	const payment = normalizePayment(payload);
	if (!payment) throw new ApiServiceError('No se pudo leer el pago.');
	return payment;
}

/**
 * Resuelve un pago pendiente en la pasarela simulada (sandbox): lo aprueba,
 * rechaza o cancela como haría el PSP. Solo está disponible mientras la
 * pasarela activa sea la "dummy"; con una pasarela real el servidor responde 403.
 */
export async function resolveSandboxPayment(
	id: string,
	outcome: 'approved' | 'rejected' | 'cancelled'
): Promise<Payment> {
	const payload = await apiRequest(`/payments/${encodeURIComponent(id)}/sandbox`, {
		method: 'POST',
		body: { outcome }
	});
	const payment = normalizePayment(payload);
	if (!payment) throw new ApiServiceError('No se pudo resolver el pago.');
	return payment;
}

/**
 * Intención de pago para un producto (checkout hosted). Devuelve la URL de la
 * pasarela a la que hay que redirigir al comprador. Requiere sesión.
 */
export interface CheckoutSession {
	paymentId: string;
	checkoutUrl: string;
	status: string;
}

function normalizeCheckout(raw: unknown): CheckoutSession | null {
	if (!isRecord(raw)) return null;
	const checkoutUrl = pickString(raw, ['checkoutUrl', 'checkout_url', 'url', 'initPoint']);
	if (!checkoutUrl) return null;
	const payment = isRecord(raw.payment) ? raw.payment : raw;
	return {
		paymentId: pickString(payment, ['id', 'paymentId', 'uuid']),
		checkoutUrl,
		status: pickString(payment, ['status', 'state']).toLowerCase() || 'pendiente'
	};
}

/**
 * Crea la intención de pago de un producto y devuelve la sesión de checkout.
 * El monto sale del precio del producto (nunca del cliente). Con la pasarela
 * sandbox, la app resuelve el pago en su propia página `/checkout/[id]`; con
 * una pasarela real se redirige a `checkoutUrl`.
 */
export async function createProductCheckout(product: Product): Promise<CheckoutSession> {
	const payload = await apiRequest('/payments/checkout', {
		method: 'POST',
		body: {
			amountCents: product.priceCents,
			currencyCode: product.currencyCode || 'COP',
			description: product.name,
			entrepreneurId: product.entrepreneurId || undefined,
			metadata: { productId: product.id }
		}
	});
	const session = normalizeCheckout(payload);
	if (!session || !session.paymentId) throw new ApiServiceError('No se pudo iniciar el pago.');
	return session;
}

export async function getMyVolunteerSignups(
	params: { page?: number; limit?: number; status?: string } = {}
): Promise<Paginated<VolunteerSignup>> {
	const payload = await apiRequest(`/volunteer/mine${query(params)}`);
	return toPage(payload, normalizeSignup);
}

export async function getMyNotifications(
	params: { page?: number; limit?: number; unread?: boolean; type?: string } = {}
): Promise<Paginated<NotificationItem>> {
	const payload = await apiRequest(
		`/notifications/mine${query({
			page: params.page,
			limit: params.limit,
			unread: params.unread ? 'true' : undefined,
			type: params.type
		})}`
	);
	return toPage(payload, normalizeNotification);
}

export async function getUnreadNotificationCount(): Promise<number> {
	const payload = await apiRequest('/notifications/unread-count');
	const record = isRecord(payload) ? payload : null;
	return pickNumber(record, ['count', 'unread', 'unreadCount', 'total']);
}

export async function markNotificationRead(id: string): Promise<void> {
	if (!id) return;
	await apiRequest(`/notifications/${encodeURIComponent(id)}/read`, { method: 'POST' });
}

export async function getPublicProducts(
	params: {
		page?: number;
		limit?: number;
		q?: string;
		categoryId?: string;
		entrepreneurId?: string;
		type?: string;
	} = {}
): Promise<Paginated<Product>> {
	const payload = await apiRequest(`/products/public${query(params)}`, { auth: false });
	return toPage(payload, normalizeProduct);
}

export async function getPublicProductById(id: string): Promise<Product> {
	const payload = await apiRequest(`/products/public/${encodeURIComponent(id)}`, { auth: false });
	const product = normalizeProduct(payload);
	if (!product) throw new ApiServiceError('No se pudo leer este producto.', 404);
	return product;
}

export async function getPublicVolunteerActivities(
	params: { page?: number; limit?: number; status?: string } = {}
): Promise<Paginated<VolunteerActivity>> {
	const payload = await apiRequest(`/volunteer/public${query(params)}`, { auth: false });
	return toPage(payload, normalizeVolunteer);
}

export async function getPublicVolunteerActivity(id: string): Promise<VolunteerActivity> {
	const payload = await apiRequest(`/volunteer/public/${encodeURIComponent(id)}`, {
		auth: false
	});
	const activity = normalizeVolunteer(payload);
	if (!activity) throw new ApiServiceError('No se pudo leer esta jornada.', 404);
	return activity;
}

/** Material recolectado en una jornada: cierra la traza material -> materia prima. */
export async function getActivityCollections(id: string): Promise<ActivityCollection[]> {
	const payload = await apiRequest(`/volunteer/public/${encodeURIComponent(id)}/collections`, {
		auth: false
	});
	const rawItems = Array.isArray(payload)
		? payload
		: isRecord(payload) && Array.isArray(payload.items)
			? payload.items
			: [];
	return rawItems
		.map(normalizeCollection)
		.filter((item): item is ActivityCollection => item !== null);
}

/** Inscribirme: la inscripcion queda pendiente hasta que la confirmen. */
export async function signupToVolunteer(id: string): Promise<VolunteerSignupResult> {
	const payload = await apiRequest(`/volunteer/${encodeURIComponent(id)}/signup`, {
		method: 'POST'
	});
	const result = normalizeSignupResult(payload);
	if (!result) throw new ApiServiceError('No se pudo confirmar tu inscripción.');
	return result;
}

/** Cancelar mi inscripcion: libera el cupo. */
export async function cancelVolunteerSignup(id: string): Promise<VolunteerSignupResult> {
	const payload = await apiRequest(`/volunteer/${encodeURIComponent(id)}/signup`, {
		method: 'DELETE'
	});
	const result = normalizeSignupResult(payload);
	if (!result) throw new ApiServiceError('No se pudo cancelar tu inscripción.');
	return result;
}

export async function getPublicCampaigns(
	params: { page?: number; limit?: number } = {}
): Promise<Paginated<Campaign>> {
	const payload = await apiRequest(`/campaigns/public${query(params)}`, { auth: false });
	return toPage(payload, normalizeCampaign);
}

export async function getPublicCampaignBySlug(slug: string): Promise<Campaign> {
	const payload = await apiRequest(`/campaigns/public/${encodeURIComponent(slug)}`, {
		auth: false
	});
	const campaign = normalizeCampaign(payload);
	if (!campaign) throw new ApiServiceError('No se pudo leer esta campaña.', 404);
	return campaign;
}

export async function getProductCategoryTree(): Promise<CategoryNode[]> {
	const payload = await apiRequest('/product-categories/public/tree', { auth: false });
	const rawItems = Array.isArray(payload)
		? payload
		: isRecord(payload) && Array.isArray(payload.items)
			? payload.items
			: [];
	return rawItems.map(normalizeCategoryNode).filter((node): node is CategoryNode => node !== null);
}

export async function getCategoryCounts(): Promise<CategoryCount[]> {
	const payload = await apiRequest('/product-categories/public/counts', { auth: false });
	const rawItems = Array.isArray(payload)
		? payload
		: isRecord(payload) && Array.isArray(payload.items)
			? payload.items
			: [];
	return rawItems
		.map(normalizeCategoryCount)
		.filter((item): item is CategoryCount => item !== null);
}

export async function getPublicEntrepreneurs(
	params: { page?: number; limit?: number; q?: string; categoria?: string } = {}
): Promise<Paginated<Entrepreneur>> {
	const payload = await apiRequest(`/entrepreneurs/public${query(params)}`, { auth: false });
	return toPage(payload, normalizeEntrepreneur);
}

export async function getPublicEntrepreneurBySlug(slug: string): Promise<Entrepreneur> {
	const payload = await apiRequest(`/entrepreneurs/public/${encodeURIComponent(slug)}`, {
		auth: false
	});
	const record = isRecord(payload) && isRecord(payload.entrepreneur) ? payload.entrepreneur : payload;
	const entrepreneur = normalizeEntrepreneur(record);
	if (!entrepreneur) throw new ApiServiceError('No se pudo leer este emprendimiento.', 404);
	return entrepreneur;
}

/* ------------------------------------------------------------------ */
/* Mi emprendimiento (socio)                                           */
/* ------------------------------------------------------------------ */

function unwrapEntrepreneur(payload: unknown): unknown {
	return isRecord(payload) && isRecord(payload.entrepreneur) ? payload.entrepreneur : payload;
}

/** Crea la ficha del socio. La API solo admite una por usuario. */
export async function submitEntrepreneur(input: EntrepreneurInput): Promise<MyEntrepreneur> {
	const payload = await apiRequest('/entrepreneurs', { method: 'POST', body: input });
	const entrepreneur = normalizeMyEntrepreneur(unwrapEntrepreneur(payload));
	if (!entrepreneur) throw new ApiServiceError('No se pudo leer el emprendimiento creado.');
	return entrepreneur;
}

/** Mis fichas (paginado). La API devuelve una sola por socio. */
export async function getMyEntrepreneurs(
	params: { page?: number; limit?: number } = {}
): Promise<Paginated<MyEntrepreneur>> {
	const payload = await apiRequest(`/entrepreneurs/mine${query(params)}`);
	return toPage(payload, normalizeMyEntrepreneur);
}

export async function getMyEntrepreneur(id: string): Promise<MyEntrepreneur> {
	const payload = await apiRequest(`/entrepreneurs/${encodeURIComponent(id)}`);
	const entrepreneur = normalizeMyEntrepreneur(unwrapEntrepreneur(payload));
	if (!entrepreneur) throw new ApiServiceError('No se pudo leer este emprendimiento.', 404);
	return entrepreneur;
}

export async function updateMyEntrepreneur(
	id: string,
	input: Partial<EntrepreneurInput>
): Promise<MyEntrepreneur> {
	const payload = await apiRequest(`/entrepreneurs/${encodeURIComponent(id)}`, {
		method: 'PATCH',
		body: input
	});
	const entrepreneur = normalizeMyEntrepreneur(unwrapEntrepreneur(payload));
	if (!entrepreneur) throw new ApiServiceError('No se pudo guardar el emprendimiento.');
	return entrepreneur;
}

/** Reenvía a revisión una ficha rechazada o suspendida. */
export async function resubmitEntrepreneur(id: string): Promise<MyEntrepreneur> {
	const payload = await apiRequest(`/entrepreneurs/${encodeURIComponent(id)}/resubmit`, {
		method: 'POST'
	});
	const entrepreneur = normalizeMyEntrepreneur(unwrapEntrepreneur(payload));
	if (!entrepreneur) throw new ApiServiceError('No se pudo reenviar el emprendimiento.');
	return entrepreneur;
}

export async function getMyEntrepreneurHistory(
	id: string
): Promise<EntrepreneurStatusLogEntry[]> {
	const payload = await apiRequest(`/entrepreneurs/${encodeURIComponent(id)}/history`);
	const rawItems = Array.isArray(payload)
		? payload
		: isRecord(payload) && Array.isArray(payload.items)
			? payload.items
			: isRecord(payload) && Array.isArray(payload.history)
				? payload.history
				: [];
	return rawItems
		.map(normalizeStatusLogEntry)
		.filter((entry): entry is EntrepreneurStatusLogEntry => entry !== null);
}

/* ------------------------------------------------------------------ */
/* Administración                                                      */
/* ------------------------------------------------------------------ */

export interface ReportRange {
	from?: string;
	to?: string;
	tz?: string;
}

/** Usuario del listado de administración, con contadores de actividad. */
export interface AdminUser extends UserProfile {
	entrepreneurs?: number;
	products?: number;
	payments?: number;
}

/** Producto visto desde el panel de moderación (cualquier estado). */
export interface AdminProduct {
	id: string;
	name: string;
	description: string;
	priceCents: number;
	currencyCode: string;
	status: string;
	isActive: boolean;
	isArchived: boolean;
	/** null = sin stock finito (o no informado por el endpoint). */
	stock: number | null;
	imageUrl: string;
	categoryName: string;
	entrepreneurId: string;
	entrepreneurName: string;
	createdAt: string | null;
	/** "artesania" o "materia_prima". */
	type: string;
	isRawMaterial: boolean;
}

/** Inscripción a una jornada con los datos del voluntario. */
export interface AdminSignup {
	id: string;
	activityId: string;
	activityTitle: string;
	status: string;
	note: string;
	volunteerId: string;
	volunteerName: string;
	volunteerEmail: string;
	createdAt: string | null;
}

/** Material recolectado, con su cantidad en unidad base de la API. */
export interface AdminCollection {
	id: string;
	activityId: string;
	activityTitle: string;
	material: string;
	materialName: string;
	quantity: number;
	unit: string;
	label: string;
	rawMaterialProductId: string;
	rawMaterialProductName: string;
	collectedAt: string | null;
	notes: string;
}

export interface CollectionSummaryRow {
	material: string;
	materialName: string;
	unit: string;
	label: string;
	total: number;
}

export interface AdminPayment extends Payment {
	buyerName: string;
	buyerEmail: string;
	sellerName: string;
	refundedCents: number;
}

export const COLLECTION_UNITS: { value: string; label: string }[] = [
	{ value: 'kg', label: 'Kilogramos (kg)' },
	{ value: 'unidad', label: 'Unidades' },
	{ value: 'bulto', label: 'Bultos' }
];

export const MATERIAL_OPTIONS: { value: string; label: string }[] = Object.entries(
	MATERIAL_LABELS
).map(([value, label]) => ({ value, label }));

/** Convierte la cantidad en unidad base (gramos/piezas) a un texto legible. */
export function collectionQuantityLabel(quantity: number, unit: string): string {
	if (!Number.isFinite(quantity)) return '';
	if (unit === 'kg') {
		return `${(quantity / 1000).toLocaleString('es-CO', { maximumFractionDigits: 2 })} kg`;
	}
	if (unit === 'unidad') return `${quantity.toLocaleString('es-CO')} unidades`;
	if (unit === 'bulto') return `${quantity.toLocaleString('es-CO')} bultos`;
	return quantity.toLocaleString('es-CO');
}

function normalizeAdminUser(raw: unknown): AdminUser | null {
	const base = normalizeUser(raw);
	if (!base) return null;
	const record = isRecord(raw) ? raw : null;
	return {
		...base,
		entrepreneurs:
			pickNullableNumber(record, ['entrepreneursCount', 'entrepreneurshipsCount', 'entrepreneurships']) ??
			undefined,
		products: pickNullableNumber(record, ['productsCount', 'products']) ?? undefined,
		payments: pickNullableNumber(record, ['paymentsCount', 'payments']) ?? undefined
	};
}

function normalizeAdminProduct(raw: unknown): AdminProduct | null {
	if (!isRecord(raw)) return null;
	const name = pickString(raw, ['name', 'title', 'productName']);
	if (!name) return null;

	const category = isRecord(raw.category) ? raw.category : null;
	const entrepreneur = isRecord(raw.entrepreneur)
		? raw.entrepreneur
		: isRecord(raw.entrepreneurship)
			? raw.entrepreneurship
			: isRecord(raw.seller)
				? raw.seller
				: null;
	const status = pickString(raw, ['status', 'state', 'publicationStatus']).toLowerCase();

	return {
		id: pickString(raw, ['id', 'productId', 'uuid']),
		name,
		description: pickString(raw, ['description', 'summary']),
		priceCents: pickNumber(raw, ['priceCents', 'price_cents', 'price']),
		currencyCode: pickString(raw, ['currencyCode', 'currency_code', 'currency']) || 'COP',
		status: status || (pickBoolean(raw, ['isPublished', 'published']) ? 'publicado' : 'borrador'),
		isActive: pickBoolean(raw, ['isActive', 'active']),
		isArchived:
			pickBoolean(raw, ['isArchived', 'archived', 'deleted', 'isDeleted']) ||
			Boolean(pickDate(raw, ['archivedAt', 'deletedAt'])),
		stock: pickNullableNumber(raw, ['stock']),
		imageUrl: firstImage(raw),
		categoryName:
			pickString(category, ['name', 'title']) || pickString(raw, ['categoryName', 'category']),
		entrepreneurId: pickString(raw, ['entrepreneurId', 'entrepreneur_id']),
		entrepreneurName:
			pickString(entrepreneur, ['name', 'title', 'businessName']) ||
			pickString(raw, ['entrepreneurName', 'businessName', 'sellerName']),
		createdAt: pickDate(raw, ['createdAt', 'created_at']),
		type:
			pickString(raw, ['type', 'productType', 'kind']).toLowerCase() ||
			(pickBoolean(raw, ['isRawMaterial', 'rawMaterial']) ? 'materia_prima' : 'artesania'),
		isRawMaterial:
			pickBoolean(raw, ['isRawMaterial', 'rawMaterial']) ||
			pickString(raw, ['type', 'productType', 'kind']).toLowerCase() === 'materia_prima'
	};
}

function normalizeAdminSignup(raw: unknown): AdminSignup | null {
	if (!isRecord(raw)) return null;
	const id = pickString(raw, ['id', 'signupId', 'uuid']);
	const activityId = pickString(raw, ['activityId', 'activity_id']);
	if (!id && !activityId) return null;

	const volunteer =
		(isRecord(raw.volunteer) && raw.volunteer) ||
		(isRecord(raw.user) && raw.user) ||
		(isRecord(raw.volunteerUser) && raw.volunteerUser) ||
		null;
	const activity =
		(isRecord(raw.activity) && raw.activity) ||
		(isRecord(raw.volunteerActivity) && raw.volunteerActivity) ||
		(isRecord(raw.jornada) && raw.jornada) ||
		null;

	return {
		id,
		activityId,
		activityTitle:
			pickString(raw, ['activityTitle', 'activity_title']) ||
			pickString(activity, ['title', 'name']),
		status: pickString(raw, ['status', 'state']).toLowerCase(),
		note: pickString(raw, ['note', 'reason', 'reviewNote']),
		volunteerId: pickString(raw, ['volunteerId', 'userId']) || pickString(volunteer, ['id', 'userId']),
		volunteerName:
			pickString(raw, ['volunteerName', 'userName']) || pickString(volunteer, ['name', 'fullName']),
		volunteerEmail:
			pickString(raw, ['volunteerEmail', 'userEmail']) || pickString(volunteer, ['email']),
		createdAt: pickDate(raw, ['createdAt', 'created_at', 'signedUpAt', 'date'])
	};
}

function normalizeAdminCollection(raw: unknown): AdminCollection | null {
	if (!isRecord(raw)) return null;
	const material = pickString(raw, ['material', 'materialType']).toLowerCase();
	const quantity = pickNumber(raw, ['quantity', 'amount', 'weight']);
	const unit = pickString(raw, ['unit', 'measureUnit']).toLowerCase();
	if (!material && !quantity) return null;

	const activity =
		(isRecord(raw.activity) && raw.activity) ||
		(isRecord(raw.volunteerActivity) && raw.volunteerActivity) ||
		null;
	const rawProduct = isRecord(raw.rawMaterialProduct) ? raw.rawMaterialProduct : null;

	return {
		id: pickString(raw, ['id', 'collectionId']),
		activityId: pickString(raw, ['activityId', 'activity_id']) || pickString(activity, ['id']),
		activityTitle:
			pickString(raw, ['activityTitle', 'activity_title']) || pickString(activity, ['title', 'name']),
		material,
		materialName: materialLabel(material),
		quantity,
		unit,
		label: collectionQuantityLabel(quantity, unit),
		rawMaterialProductId:
			pickString(raw, ['rawMaterialProductId']) || pickString(rawProduct, ['id']),
		rawMaterialProductName:
			pickString(raw, ['rawMaterialProductName']) || pickString(rawProduct, ['name']),
		collectedAt: pickDate(raw, ['collectedAt', 'collected_at', 'date']),
		notes: pickString(raw, ['notes', 'note'])
	};
}

function normalizeCollectionSummary(raw: unknown): CollectionSummaryRow | null {
	if (!isRecord(raw)) return null;
	const material = (pickString(raw, ['material', 'materialType']) || '').toLowerCase();
	const unit = (pickString(raw, ['unit']) || '').toLowerCase();
	const total = pickNumber(raw, ['total', 'quantity', 'sum', 'amount', 'totalQuantity']);
	if (!material && !unit) return null;
	return {
		material,
		materialName: materialLabel(material),
		unit,
		total,
		label: collectionQuantityLabel(total, unit)
	};
}

function normalizeAdminPayment(raw: unknown): AdminPayment | null {
	const base = normalizePayment(raw);
	if (!base || !isRecord(raw)) return null;
	const buyer =
		(isRecord(raw.buyer) && raw.buyer) ||
		(isRecord(raw.user) && raw.user) ||
		(isRecord(raw.customer) && raw.customer) ||
		null;
	const seller =
		(isRecord(raw.seller) && raw.seller) ||
		(isRecord(raw.entrepreneur) && raw.entrepreneur) ||
		null;

	return {
		...base,
		buyerName:
			pickString(raw, ['buyerName', 'userName', 'customerName']) ||
			pickString(buyer, ['name', 'fullName']),
		buyerEmail:
			pickString(raw, ['buyerEmail', 'userEmail', 'customerEmail']) || pickString(buyer, ['email']),
		sellerName:
			pickString(raw, ['sellerName', 'entrepreneurName']) || pickString(seller, ['name', 'businessName']),
		refundedCents: pickNumber(raw, ['refundedCents', 'refunded_cents', 'refunded'])
	};
}

function reportQuery(params: ReportRange): string {
	return query({ from: params.from, to: params.to, tz: params.tz });
}

/* — Resumen y reportes — */

export async function getAdminOverview(): Promise<Record<string, unknown> | null> {
	const payload = await apiRequest('/admin/overview');
	return isRecord(payload) ? payload : null;
}

export async function getAdminActivityReport(
	params: ReportRange = {}
): Promise<Record<string, unknown> | null> {
	const payload = await apiRequest(`/admin/reports/activity${reportQuery(params)}`);
	return isRecord(payload) ? payload : null;
}

export async function getAdminUsersReport(
	params: ReportRange = {}
): Promise<Record<string, unknown> | null> {
	const payload = await apiRequest(`/admin/reports/users${reportQuery(params)}`);
	return isRecord(payload) ? payload : null;
}

export async function getAdminEntrepreneursReport(
	params: ReportRange = {}
): Promise<Record<string, unknown> | null> {
	const payload = await apiRequest(`/admin/reports/entrepreneurs${reportQuery(params)}`);
	return isRecord(payload) ? payload : null;
}

export async function getAdminPaymentsReport(
	params: ReportRange = {}
): Promise<Record<string, unknown> | null> {
	const payload = await apiRequest(`/admin/reports/payments${reportQuery(params)}`);
	return isRecord(payload) ? payload : null;
}

export async function getAdminVolunteerReport(
	params: ReportRange = {}
): Promise<Record<string, unknown> | null> {
	const payload = await apiRequest(`/admin/reports/volunteer${reportQuery(params)}`);
	return isRecord(payload) ? payload : null;
}

/* — Usuarios — */

export async function getAdminUsers(
	params: {
		page?: number;
		limit?: number;
		role?: string;
		q?: string;
		isActive?: boolean;
	} = {}
): Promise<Paginated<AdminUser>> {
	const payload = await apiRequest(
		`/admin/users${query({
			page: params.page,
			limit: params.limit,
			role: params.role,
			q: params.q,
			isActive: params.isActive === undefined ? undefined : params.isActive ? 'true' : 'false'
		})}`
	);
	return toPage(payload, normalizeAdminUser);
}

export async function getAdminUser(
	id: string
): Promise<{ user: UserProfile; raw: Record<string, unknown> }> {
	const payload = await apiRequest(`/admin/users/${encodeURIComponent(id)}`);
	const record = isRecord(payload) && isRecord(payload.user) ? payload.user : payload;
	const user = normalizeUser(record);
	if (!user) throw new ApiServiceError('No se pudo leer este usuario.');
	return { user, raw: isRecord(payload) ? payload : {} };
}

export async function changeAdminUserRole(id: string, role: string): Promise<void> {
	await apiRequest(`/admin/users/${encodeURIComponent(id)}/role`, {
		method: 'PATCH',
		body: { role }
	});
}

export async function changeAdminUserStatus(
	id: string,
	isActive: boolean,
	reason = ''
): Promise<void> {
	await apiRequest(`/admin/users/${encodeURIComponent(id)}/status`, {
		method: 'PATCH',
		body: { isActive, reason: reason || undefined }
	});
}

/* — Moderación de productos — */

export async function getModerationProducts(
	params: {
		page?: number;
		limit?: number;
		status?: string;
		q?: string;
		includeArchived?: boolean;
		type?: string;
	} = {}
): Promise<Paginated<AdminProduct>> {
	const payload = await apiRequest(
		`/admin/moderation/products${query({
			page: params.page,
			limit: params.limit,
			status: params.status,
			q: params.q,
			includeArchived: params.includeArchived ? 'true' : undefined,
			type: params.type
		})}`
	);
	return toPage(payload, normalizeAdminProduct);
}

export async function adminUnpublishProduct(id: string): Promise<void> {
	await apiRequest(`/admin/moderation/products/${encodeURIComponent(id)}/unpublish`, {
		method: 'POST'
	});
}

export async function adminRestoreProduct(id: string): Promise<void> {
	await apiRequest(`/admin/moderation/products/${encodeURIComponent(id)}/restore`, {
		method: 'POST'
	});
}

/* — Materia prima (la vende la plataforma) — */

export interface RawMaterialInput {
	name: string;
	description: string;
	/** Precio en centavos (unidad menor). */
	priceCents: number;
	categoryId: string;
	stock?: number;
	images?: string[];
	isActive?: boolean;
}

export async function getAdminRawMaterials(
	params: {
		page?: number;
		limit?: number;
		status?: string;
		q?: string;
		includeArchived?: boolean;
	} = {}
): Promise<Paginated<AdminProduct>> {
	const payload = await apiRequest(
		`/admin/raw-materials${query({
			page: params.page,
			limit: params.limit,
			status: params.status,
			q: params.q,
			includeArchived: params.includeArchived ? 'true' : undefined
		})}`
	);
	return toPage(payload, normalizeAdminProduct);
}

export async function createAdminRawMaterial(input: RawMaterialInput): Promise<AdminProduct> {
	const payload = await apiRequest('/admin/raw-materials', { method: 'POST', body: input });
	const material = normalizeAdminProduct(payload);
	if (!material) throw new ApiServiceError('No se pudo crear la materia prima.');
	return material;
}

export async function updateAdminRawMaterial(
	id: string,
	input: Partial<RawMaterialInput>
): Promise<AdminProduct> {
	const payload = await apiRequest(`/admin/raw-materials/${encodeURIComponent(id)}`, {
		method: 'PATCH',
		body: input
	});
	const material = normalizeAdminProduct(payload);
	if (!material) throw new ApiServiceError('No se pudo actualizar la materia prima.');
	return material;
}

export async function publishAdminRawMaterial(id: string): Promise<void> {
	await apiRequest(`/admin/raw-materials/${encodeURIComponent(id)}/publish`, { method: 'POST' });
}

export async function unpublishAdminRawMaterial(id: string): Promise<void> {
	await apiRequest(`/admin/raw-materials/${encodeURIComponent(id)}/unpublish`, { method: 'POST' });
}

export async function archiveAdminRawMaterial(id: string): Promise<void> {
	await apiRequest(`/admin/raw-materials/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function restoreAdminRawMaterial(id: string): Promise<void> {
	await apiRequest(`/admin/raw-materials/${encodeURIComponent(id)}/restore`, { method: 'POST' });
}

/* — Emprendimientos (revisión) — */

export async function getEntrepreneurReviewQueue(
	params: { page?: number; limit?: number; q?: string } = {}
): Promise<Paginated<Entrepreneur>> {
	const payload = await apiRequest(`/entrepreneurs/admin/review${query(params)}`);
	return toPage(payload, normalizeEntrepreneur);
}

export async function getArchivedEntrepreneurs(
	params: { page?: number; limit?: number } = {}
): Promise<Paginated<Entrepreneur>> {
	const payload = await apiRequest(`/entrepreneurs/admin/archived${query(params)}`);
	return toPage(payload, normalizeEntrepreneur);
}

export async function reviewEntrepreneur(
	id: string,
	action: 'approve' | 'reject' | 'suspend',
	note = ''
): Promise<void> {
	await apiRequest(`/entrepreneurs/${encodeURIComponent(id)}/${action}`, {
		method: 'POST',
		body: { note: note || undefined }
	});
}

export async function restoreEntrepreneur(id: string): Promise<void> {
	await apiRequest(`/entrepreneurs/${encodeURIComponent(id)}/restore`, { method: 'POST' });
}

/* — Campañas — */

export interface CampaignInput {
	title: string;
	summary?: string;
	description: string;
	imageUrl?: string;
	goalCents?: number;
	donationUrl?: string;
	startsAt?: string;
	endsAt?: string;
}

export async function getAdminCampaigns(
	params: { page?: number; limit?: number; status?: string } = {}
): Promise<Paginated<Campaign>> {
	const payload = await apiRequest(`/campaigns${query(params)}`);
	return toPage(payload, normalizeCampaign);
}

export async function getArchivedCampaigns(
	params: { page?: number; limit?: number } = {}
): Promise<Paginated<Campaign>> {
	const payload = await apiRequest(`/campaigns/admin/archived${query(params)}`);
	return toPage(payload, normalizeCampaign);
}

export async function createCampaign(input: CampaignInput): Promise<void> {
	await apiRequest('/campaigns', { method: 'POST', body: input });
}

export async function updateCampaign(id: string, input: Partial<CampaignInput>): Promise<void> {
	await apiRequest(`/campaigns/${encodeURIComponent(id)}`, { method: 'PATCH', body: input });
}

export async function publishCampaign(id: string): Promise<void> {
	await apiRequest(`/campaigns/${encodeURIComponent(id)}/publish`, { method: 'POST' });
}

export async function closeCampaign(id: string): Promise<void> {
	await apiRequest(`/campaigns/${encodeURIComponent(id)}/close`, { method: 'POST' });
}

export async function notifyCampaign(id: string): Promise<void> {
	await apiRequest(`/campaigns/${encodeURIComponent(id)}/notify`, { method: 'POST' });
}

export async function archiveCampaign(id: string): Promise<void> {
	await apiRequest(`/campaigns/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function restoreCampaign(id: string): Promise<void> {
	await apiRequest(`/campaigns/${encodeURIComponent(id)}/restore`, { method: 'POST' });
}

/* — Voluntariados — */

export interface VolunteerInput {
	title: string;
	description: string;
	location?: string;
	startsAt: string;
	endsAt?: string;
	slots?: number;
	imageUrl?: string;
}

export async function getAdminVolunteerActivities(
	params: { page?: number; limit?: number; status?: string } = {}
): Promise<Paginated<VolunteerActivity>> {
	const payload = await apiRequest(`/volunteer${query(params)}`);
	return toPage(payload, normalizeVolunteer);
}

export async function getArchivedVolunteerActivities(
	params: { page?: number; limit?: number } = {}
): Promise<Paginated<VolunteerActivity>> {
	const payload = await apiRequest(`/volunteer/admin/archived${query(params)}`);
	return toPage(payload, normalizeVolunteer);
}

export async function createVolunteerActivity(input: VolunteerInput): Promise<void> {
	await apiRequest('/volunteer', { method: 'POST', body: input });
}

export async function updateVolunteerActivity(
	id: string,
	input: Partial<VolunteerInput>
): Promise<void> {
	await apiRequest(`/volunteer/${encodeURIComponent(id)}`, { method: 'PATCH', body: input });
}

export async function archiveVolunteerActivity(id: string): Promise<void> {
	await apiRequest(`/volunteer/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

export async function openVolunteerActivity(id: string): Promise<void> {
	await apiRequest(`/volunteer/${encodeURIComponent(id)}/open`, { method: 'POST' });
}

export async function closeVolunteerActivity(id: string): Promise<void> {
	await apiRequest(`/volunteer/${encodeURIComponent(id)}/close`, { method: 'POST' });
}

export async function finishVolunteerActivity(id: string): Promise<void> {
	await apiRequest(`/volunteer/${encodeURIComponent(id)}/finish`, { method: 'POST' });
}

export async function restoreVolunteerActivity(id: string): Promise<void> {
	await apiRequest(`/volunteer/${encodeURIComponent(id)}/restore`, { method: 'POST' });
}

export async function getAdminSignups(
	params: { page?: number; limit?: number; status?: string; activityId?: string } = {}
): Promise<Paginated<AdminSignup>> {
	const payload = await apiRequest(`/volunteer/admin/signups${query(params)}`);
	return toPage(payload, normalizeAdminSignup);
}

export async function confirmVolunteerSignup(id: string, note = ''): Promise<void> {
	await apiRequest(`/volunteer/signups/${encodeURIComponent(id)}/confirm`, {
		method: 'POST',
		body: { note: note || undefined }
	});
}

export async function rejectVolunteerSignup(id: string, note: string): Promise<void> {
	await apiRequest(`/volunteer/signups/${encodeURIComponent(id)}/reject`, {
		method: 'POST',
		body: { note }
	});
}

/* — Recolecciones de material — */

export interface CollectionInput {
	material: string;
	quantity: number;
	unit: string;
	collectedAt?: string;
	rawMaterialProductId?: string;
	notes?: string;
}

export async function getAdminCollections(
	params: {
		page?: number;
		limit?: number;
		material?: string;
		activityId?: string;
		rawMaterialProductId?: string;
		from?: string;
		to?: string;
	} = {}
): Promise<Paginated<AdminCollection>> {
	const payload = await apiRequest(`/volunteer/admin/collections${query(params)}`);
	return toPage(payload, normalizeAdminCollection);
}

export async function getCollectionSummary(
	params: {
		page?: number;
		limit?: number;
		material?: string;
		activityId?: string;
		rawMaterialProductId?: string;
		from?: string;
		to?: string;
	} = {}
): Promise<Paginated<CollectionSummaryRow>> {
	const payload = await apiRequest(`/volunteer/admin/collections/summary${query(params)}`);
	return toPage(payload, normalizeCollectionSummary);
}

export async function createCollection(activityId: string, input: CollectionInput): Promise<void> {
	await apiRequest(`/volunteer/admin/activities/${encodeURIComponent(activityId)}/collections`, {
		method: 'POST',
		body: input
	});
}

export async function updateCollection(id: string, input: Partial<CollectionInput>): Promise<void> {
	await apiRequest(`/volunteer/admin/collections/${encodeURIComponent(id)}`, {
		method: 'PATCH',
		body: input
	});
}

export async function unlinkCollection(id: string): Promise<void> {
	await apiRequest(`/volunteer/admin/collections/${encodeURIComponent(id)}/unlink`, {
		method: 'DELETE'
	});
}

/* — Pagos — */

export async function getAdminPayments(
	params: { page?: number; limit?: number; status?: string } = {}
): Promise<Paginated<AdminPayment>> {
	const payload = await apiRequest(`/payments/admin/list${query(params)}`);
	return toPage(payload, normalizeAdminPayment);
}

/* — Categorías — */

export async function createProductCategory(input: {
	name: string;
	parentId?: string;
	isActive?: boolean;
}): Promise<void> {
	await apiRequest('/product-categories', { method: 'POST', body: input });
}

export async function updateProductCategory(
	id: string,
	input: { name?: string; isActive?: boolean }
): Promise<void> {
	await apiRequest(`/product-categories/${encodeURIComponent(id)}`, {
		method: 'PATCH',
		body: input
	});
}

export async function deactivateProductCategory(id: string): Promise<void> {
	await apiRequest(`/product-categories/${encodeURIComponent(id)}`, { method: 'DELETE' });
}

/* — Notificaciones y difusión — */

export interface BroadcastInput {
	subject: string;
	message: string;
	link?: string;
}

export async function broadcastNotification(input: BroadcastInput): Promise<void> {
	await apiRequest('/admin/notifications/broadcast', { method: 'POST', body: input });
}

export async function getAdminNotifications(
	params: { page?: number; limit?: number; type?: string } = {}
): Promise<Paginated<NotificationItem>> {
	const payload = await apiRequest(`/notifications/admin/list${query(params)}`);
	return toPage(payload, normalizeNotification);
}

export async function getAdminNotificationStats(): Promise<Record<string, unknown> | null> {
	const payload = await apiRequest('/notifications/admin/stats');
	return isRecord(payload) ? payload : null;
}
