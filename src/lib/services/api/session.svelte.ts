import { ApiServiceError, getMyProfile, type UserProfile } from './api.service.js';

type SessionStatus = 'idle' | 'loading' | 'ready' | 'error';

export const session = $state({
	user: null as UserProfile | null,
	status: 'idle' as SessionStatus,
	error: '',
	expired: false
});

export async function loadSession(force = false): Promise<void> {
	if (!force && (session.status === 'loading' || session.status === 'ready')) return;

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
	}
}

export function clearSession(): void {
	session.user = null;
	session.status = 'idle';
	session.error = '';
	session.expired = false;
}
