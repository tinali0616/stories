import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

function normalizePrivateKey(value: string) {
  const trimmed = value.trim();
  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed;

  return unquoted.replace(/\\n/g, '\n');
}

function getServiceAccount() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY)
    : undefined;

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey,
  };
}

export function getFirebaseDb() {
  const serviceAccount = getServiceAccount();

  if (!serviceAccount) {
    return null;
  }

  if (!getApps().length) {
    try {
      initializeApp({
        credential: cert(serviceAccount),
      });
    } catch (error) {
      console.error('Failed to initialize Firebase Admin', error);
      return null;
    }
  }

  return getFirestore();
}
