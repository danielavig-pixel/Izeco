import { ApiServiceError, getMyProfile, type UserProfile } from './api.service.js';

type SessionStatus = 'idle' | 'loading' | 'ready' | 'error';

export const session = $state({
	user: null as UserProfile | null,
	status: 'idle' as SessionStatus,
	error: '',
	expired: false
});

// Promesa de la carga en curso. Sin esto, varios componentes que montan a la
// vez (layout + página) pedirían el perfil por separado y los que esperan
// "loadSession()" podrían resolver antes de tener el usuario, redirigiendo
// de más (p. ej. el guard de /admin).
let inflight: Promise<void> | null = null;

export async function loadSession(force = false): Promise<void> {
	if (!force && session.status === 'ready') return;
	if (!force && inflight) return inflight;

	inflight = (async () => {
		session.status = 'loading';
		session.error = '';
		session.expired = false;

		try {
			session.user = await getMyProfile();
			session.status = 'ready';
		} catch (error) {
			session.error = error instanceof Error ? error.message : 'No se pudo cargar tu perfil.';
			session.status = 'error';
			session.expired = error instanceof ApiServiceError && error.status === 401;
		} finally {
			inflight = null;
		}
	})();

	return inflight;
}

export function clearSession(): void {
	session.user = null;
	session.status = 'idle';
	session.error = '';
	session.expired = false;
}
