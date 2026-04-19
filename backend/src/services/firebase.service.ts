import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin with default credentials
const configPath = path.resolve(__dirname, '../../../firebase-applet-config.json');
const firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));

console.log('Loaded Firebase Config:', !!firebaseConfig, firebaseConfig?.projectId);

let adminApp: admin.app.App;

if (!admin.apps.length) {
  console.log('Initializing Firebase Admin with Project ID:', firebaseConfig.projectId);
  try {
    // If FIREBASE_SERVICE_ACCOUNT is available in the environment, use it
    const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT;
    
    if (serviceAccount) {
      console.log('Using service account from environment.');
      adminApp = admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(serviceAccount)),
        projectId: firebaseConfig.projectId,
      });
    } else {
      console.log('No service account found, using default credentials.');
      adminApp = admin.initializeApp({
        projectId: firebaseConfig.projectId,
      });
    }
    console.log('Firebase Admin initialized successfully.');
  } catch (error) {
    console.error('Firebase Admin initialization failed:', error);
    adminApp = admin.initializeApp();
  }
} else {
  adminApp = admin.app();
}

const effectiveProjectId = adminApp.options.projectId || firebaseConfig.projectId;
console.log('Effective Project ID:', effectiveProjectId);

const databaseId = (firebaseConfig as any).firestoreDatabaseId || '(default)';
console.log('Using Firestore Database ID:', databaseId);

export const db = getFirestore(adminApp, databaseId);
export const auth = getAuth(adminApp);

export default admin;
