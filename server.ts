import express from "express";
import admin from "firebase-admin";

// Initialize Firebase Admin
if (!admin.apps.length) {
  try {
    const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (saEnv) {
      const serviceAccount = JSON.parse(saEnv);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
      console.log("Firebase Admin initialized with Service Account.");
    } else {
      admin.initializeApp({
        projectId: "dsfs-dbce1"
      });
      console.log("Firebase Admin initialized with Project ID (Local Fallback).");
    }
  } catch (e) {
    console.error("Firebase Admin initialization error:", e);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Check if Admin SDK is fully functional
  app.get("/api/admin/status", async (req, res) => {
    const hasKey = !!process.env.FIREBASE_SERVICE_ACCOUNT;
    res.json({ 
      initialized: !!admin.apps.length,
      hasServiceAccount: hasKey,
      projectId: admin.app().options.projectId || "dsfs-dbce1"
    });
  });

  // API Route to delete a user from BOTH Firestore and Authentication
  app.post("/api/admin/delete-user", async (req, res) => {
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

      console.log(`Successfully deleted ${role} with UID: ${uid}`);
      res.json({ success: true, message: `User ${uid} deleted from Auth and Firestore.` });
    } catch (error: any) {
      console.error("Error in delete-user API:", error);
      res.status(500).json({ error: error.message || "Internal server error during deletion." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile("dist/index.html", { root: "." });
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
