import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { env } from '$env/dynamic/private';

function key() {
	if (!env.API_KEY_ENCRYPTION_SECRET) throw new Error('API_KEY_ENCRYPTION_SECRET is not set');
	return createHash('sha256').update(env.API_KEY_ENCRYPTION_SECRET).digest();
}

export function encryptSecret(value: string) {
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', key(), iv);
	const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return `${iv.toString('base64')}.${tag.toString('base64')}.${encrypted.toString('base64')}`;
}

export function decryptSecret(value: string) {
	const [iv, tag, encrypted] = value.split('.');
	if (!iv || !tag || !encrypted) throw new Error('Encrypted secret is invalid');
	const decipher = createDecipheriv('aes-256-gcm', key(), Buffer.from(iv, 'base64'));
	decipher.setAuthTag(Buffer.from(tag, 'base64'));
	return Buffer.concat([
		decipher.update(Buffer.from(encrypted, 'base64')),
		decipher.final()
	]).toString('utf8');
}
