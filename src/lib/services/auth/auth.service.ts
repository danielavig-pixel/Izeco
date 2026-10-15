const AUTH_API_URL = 'https://reseedb.vercel.app/auth';
const ACCESS_TOKEN_KEY = 'accessToken';
const RECOVERY_EMAIL_KEY = 'passwordRecoveryEmail';
const RECOVERY_CODE_KEY = 'passwordRecoveryCode';
const RECOVERY_CODE_SENT_AT_KEY = 'passwordRecoveryCodeSentAt';
const RECOVERY_RESEND_COOLDOWN_SECONDS = 60;
const VERIFICATION_EMAIL_KEY = 'registrationVerificationEmail';
const VERIFICATION_SENT_AT_KEY = 'registrationVerificationSentAt';
const VERIFICATION_RESEND_COOLDOWN_SECONDS = 60;

export type RegisterRole = 'emprendedor' | 'comprador' | 'voluntario';

export class AuthServiceError extends Error {
	constructor(
		message: string,
		public readonly status?: number
	) {
		super(message);
		this.name = 'AuthServiceError';
	}
}

function getApiMessage(payload: unknown): string | undefined {
	if (typeof payload === 'string') return payload;
	if (typeof payload !== 'object' || payload === null) return undefined;

	const message = 'message' in payload ? payload.message : undefined;
	if (typeof message === 'string') return message;
	if (Array.isArray(message) && message.every((item) => typeof item === 'string')) {
		return message.join(' ');
	}

	const error = 'error' in payload ? payload.error : undefined;
	return typeof error === 'string' ? error : undefined;
}

async function postAuthRequest(path: string, body: unknown): Promise<unknown> {
	let response: Response;
	try {
		response = await fetch(`${AUTH_API_URL}${path}`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(body)
		});
	} catch {
		throw new AuthServiceError(
			'No se pudo conectar con el servidor. Comprueba tu conexión e inténtalo de nuevo.'
		);
	}

	const responseText = await response.text();
	let payload: unknown;
	if (responseText) {
		try {
			payload = JSON.parse(responseText);
		} catch {
			throw new AuthServiceError('El servidor devolvió una respuesta no válida. Inténtalo de nuevo.');
		}
	}

	if (!response.ok) {
		const message =
			response.status === 429
				? 'Has superado el límite de intentos. Espera un minuto e inténtalo de nuevo.'
				: (getApiMessage(payload) ?? 'La solicitud no pudo completarse. Inténtalo de nuevo.');
		throw new AuthServiceError(message, response.status);
	}

	return payload;
}

export async function login(email: string, password: string): Promise<void> {
	const payload = await postAuthRequest('/login', { email, password });

	if (!storeAccessToken(payload)) {
		throw new AuthServiceError('La respuesta de inicio de sesión no contiene un token válido.');
	}
}

function storeAccessToken(payload: unknown): boolean {
	if (
		typeof payload !== 'object' ||
		payload === null ||
		!('accessToken' in payload) ||
		typeof payload.accessToken !== 'string' ||
		payload.accessToken.length === 0
	) {
		return false;
	}

	try {
		localStorage.setItem(ACCESS_TOKEN_KEY, payload.accessToken);
	} catch {
		throw new AuthServiceError('No se pudo guardar la sesión en este navegador.');
	}

	return true;
}

function hasVerificationPending(payload: unknown): boolean {
	return (
		typeof payload === 'object' &&
		payload !== null &&
		'requiresVerification' in payload &&
		payload.requiresVerification === true
	);
}

export async function register(
	name: string,
	email: string,
	password: string,
	role: RegisterRole
): Promise<{ requiresVerification: boolean }> {
	const payload = await postAuthRequest('/register', { name, email, password, role });

	if (storeAccessToken(payload)) {
		return { requiresVerification: false };
	}

	if (hasVerificationPending(payload)) {
		return { requiresVerification: true };
	}

	throw new AuthServiceError('La respuesta del registro no es válida. Inténtalo de nuevo.');
}

export async function verifyRegistrationEmail(email: string, code: string): Promise<void> {
	const payload = await postAuthRequest('/verify-email', { email, code });

	if (!storeAccessToken(payload)) {
		throw new AuthServiceError('La respuesta de verificación no contiene un token válido.');
	}
}

export async function resendRegistrationVerification(email: string): Promise<void> {
	await postAuthRequest('/resend-verification', { email });
}

export function saveRegistrationVerificationEmail(email: string): void {
	try {
		sessionStorage.setItem(VERIFICATION_EMAIL_KEY, email);
		sessionStorage.setItem(VERIFICATION_SENT_AT_KEY, Date.now().toString());
	} catch {
		throw new AuthServiceError('No se pudo guardar temporalmente el proceso de verificación.');
	}
}

export function markRegistrationVerificationSent(): void {
	try {
		sessionStorage.setItem(VERIFICATION_SENT_AT_KEY, Date.now().toString());
	} catch {
		throw new AuthServiceError('No se pudo actualizar el tiempo de reenvío del código.');
	}
}

export function getRegistrationVerificationEmail(): string | null {
	return sessionStorage.getItem(VERIFICATION_EMAIL_KEY);
}

export function getRegistrationVerificationResendSeconds(): number {
	const sentAt = Number(sessionStorage.getItem(VERIFICATION_SENT_AT_KEY));
	if (!Number.isFinite(sentAt) || sentAt <= 0) return 0;

	return Math.max(
		0,
		VERIFICATION_RESEND_COOLDOWN_SECONDS - Math.floor((Date.now() - sentAt) / 1000)
	);
}

export function clearRegistrationVerificationEmail(): void {
	sessionStorage.removeItem(VERIFICATION_EMAIL_KEY);
	sessionStorage.removeItem(VERIFICATION_SENT_AT_KEY);
}

export async function requestPasswordReset(email: string): Promise<void> {
	await postAuthRequest('/forgot-password', { email });
}

export async function resetPassword(email: string, code: string, password: string): Promise<void> {
	await postAuthRequest('/reset-password', { email, code, password });
}

export function saveRecoveryEmail(email: string): void {
	try {
		sessionStorage.setItem(RECOVERY_EMAIL_KEY, email);
		sessionStorage.removeItem(RECOVERY_CODE_KEY);
		sessionStorage.setItem(RECOVERY_CODE_SENT_AT_KEY, Date.now().toString());
	} catch {
		throw new AuthServiceError('No se pudo guardar temporalmente el proceso de recuperación.');
	}
}

export function markRecoveryCodeSent(): void {
	try {
		sessionStorage.setItem(RECOVERY_CODE_SENT_AT_KEY, Date.now().toString());
	} catch {
		throw new AuthServiceError('No se pudo actualizar el tiempo de reenvío del código.');
	}
}

export function getRecoveryResendSeconds(): number {
	const sentAt = Number(sessionStorage.getItem(RECOVERY_CODE_SENT_AT_KEY));
	if (!Number.isFinite(sentAt) || sentAt <= 0) return 0;

	return Math.max(
		0,
		RECOVERY_RESEND_COOLDOWN_SECONDS - Math.floor((Date.now() - sentAt) / 1000)
	);
}

export function getRecoveryEmail(): string | null {
	return sessionStorage.getItem(RECOVERY_EMAIL_KEY);
}

export function saveRecoveryCode(code: string): void {
	try {
		sessionStorage.setItem(RECOVERY_CODE_KEY, code);
	} catch {
		throw new AuthServiceError('No se pudo guardar temporalmente el código de recuperación.');
	}
}

export function getRecoveryDetails(): { email: string; code: string } | null {
	const email = sessionStorage.getItem(RECOVERY_EMAIL_KEY);
	const code = sessionStorage.getItem(RECOVERY_CODE_KEY);
	return email && code ? { email, code } : null;
}

export function clearRecoveryDetails(): void {
	sessionStorage.removeItem(RECOVERY_EMAIL_KEY);
	sessionStorage.removeItem(RECOVERY_CODE_KEY);
	sessionStorage.removeItem(RECOVERY_CODE_SENT_AT_KEY);
}

export function getAccessToken(): string | null {
	return localStorage.getItem(ACCESS_TOKEN_KEY);
}

export function logout(): void {
	localStorage.removeItem(ACCESS_TOKEN_KEY);
}
