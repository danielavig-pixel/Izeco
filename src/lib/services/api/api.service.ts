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
	imageUrl: string;
	slug: string;
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
}

export interface VolunteerSignup {
	id: string;
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
	status: string;
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
		categoryName:
			pickString(category, ['name', 'title']) || pickString(raw, ['categoryName', 'category']),
		entrepreneurName:
			pickString(entrepreneur, ['name', 'title', 'businessName']) ||
			pickString(raw, ['entrepreneurName', 'businessName', 'sellerName']),
		imageUrl: firstImage(raw),
		slug: pickString(raw, ['slug'])
	};
}

function normalizeVolunteer(raw: unknown): VolunteerActivity | null {
	if (!isRecord(raw)) return null;
	const title = pickString(raw, ['title', 'name']);
	if (!title) return null;

	return {
		id: pickString(raw, ['id', 'volunteerId', 'activityId', 'uuid']),
		title,
		description: pickString(raw, ['description', 'summary']),
		location: pickString(raw, ['location', 'place', 'address', 'city']),
		startsAt: pickDate(raw, ['startsAt', 'startAt', 'startDate', 'date']),
		endsAt: pickDate(raw, ['endsAt', 'endAt', 'endDate']),
		imageUrl: firstImage(raw),
		status: pickString(raw, ['status', 'state']).toLowerCase()
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
		status: pickString(raw, ['status', 'state']).toLowerCase(),
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

export async function getMyPayments(
	params: { page?: number; limit?: number; status?: string } = {}
): Promise<Paginated<Payment>> {
	const payload = await apiRequest(`/payments/mine${query(params)}`);
	return toPage(payload, normalizePayment);
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
	} = {}
): Promise<Paginated<Product>> {
	const payload = await apiRequest(`/products/public${query(params)}`, { auth: false });
	return toPage(payload, normalizeProduct);
}

export async function getPublicVolunteerActivities(
	params: { page?: number; limit?: number; status?: string } = {}
): Promise<Paginated<VolunteerActivity>> {
	const payload = await apiRequest(`/volunteer/public${query(params)}`, { auth: false });
	return toPage(payload, normalizeVolunteer);
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
