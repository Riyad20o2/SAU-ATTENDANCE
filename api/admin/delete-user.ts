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
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { uid, role, adminToken } = req.body;

  if (!uid || !role || !adminToken) {
    return res.status(400).json({ error: "Missing required parameters" });
  }

  try {
    // 1. Verify the admin token
    const decodedToken = await admin.auth().verifyIdToken(adminToken);
    if (decodedToken.email !== "admin@sau-attendance.local") {
      return res.status(403).json({ error: "Unauthorized: Only System Admin can delete users." });
    }

    // 2. Delete from Firestore
    const collectionName = role === 'student' ? 'students' : 'teachers';
    await admin.firestore().collection(collectionName).doc(uid).delete();

    // 3. Delete from Authentication
    await admin.auth().deleteUser(uid);

    return res.status(200).json({ success: true, message: `User ${uid} deleted from Auth and Firestore.` });
  } catch (error: any) {
    console.error("Error in delete-user API:", error);
    return res.status(500).json({ error: error.message || "Internal server error during deletion." });
  }
}
