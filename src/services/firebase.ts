import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';
import config from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = getApps().length > 0 ? getApp() : initializeApp(config);

// Initialize Firestore with specific database ID if configured
export const db = config.firestoreDatabaseId
  ? getFirestore(app, config.firestoreDatabaseId)
  : getFirestore(app);

export const isFirebaseConfigured = Boolean(config && config.projectId && config.apiKey);

// Non-blocking connection probe to test Firestore connectivity
if (isFirebaseConfigured) {
  getDocFromServer(doc(db, 'test', 'connection')).catch((error) => {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client appears offline; will use cached data.');
    }
  });
}
