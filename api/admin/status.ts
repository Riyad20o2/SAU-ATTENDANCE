import admin from "firebase-admin";
import type { VercelRequest, VercelResponse } from '@vercel/node';

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (saEnv) {
      const serviceAccount = JSON.parse(saEnv);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } else {
      admin.initializeApp({
        projectId: "dsfs-dbce1"
      });
    }
  } catch (e) {
    console.error("Firebase Admin initialization error:", e);
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const hasKey = !!process.env.FIREBASE_SERVICE_ACCOUNT;
  res.status(200).json({ 
    initialized: !!admin.apps.length,
    hasServiceAccount: hasKey,
    projectId: admin.app().options.projectId || "dsfs-dbce1"
  });
}
