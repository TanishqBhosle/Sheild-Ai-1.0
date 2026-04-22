import * as admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "aegis-ai-d9204",
  });
}

const db = admin.firestore();

async function setupDemo() {
  console.log("🚀 Starting Flat Architecture Setup...");

  // 1. CLEANUP ALL
  const collections = ["organizations", "users", "moderation_results", "content", "api_keys", "audit_logs", "usage_metrics", "platform"];
  
  for (const coll of collections) {
    const snap = await db.collection(coll).get();
    console.log(`Cleaning ${coll} (${snap.size} docs)...`);
    const batch = db.batch();
    snap.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  }

  // 2. CREATE FLAT POLICIES
  console.log("Creating Default Policy...");
  await db.collection("policies").doc("default-policy").set({
    id: "default-policy",
    name: "Standard Safety Policy",
    isActive: true,
    categories: [
      { name: "hateSpeech", sensitivity: 0.7, action: "block" },
      { name: "harassment", sensitivity: 0.6, action: "flag" },
      { name: "violence", sensitivity: 0.8, action: "block" },
      { name: "nsfw", sensitivity: 0.9, action: "block" }
    ],
    createdAt: admin.firestore.Timestamp.now()
  });

  console.log("✅ Flat Demo Setup Complete! 3 Panels (User, Moderator, Admin) are now synchronized.");
  process.exit(0);
}

setupDemo().catch(err => {
  console.error("❌ Setup Failed:", err);
  process.exit(1);
});
