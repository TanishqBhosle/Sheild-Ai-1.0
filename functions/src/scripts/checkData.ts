import * as admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "aegis-ai-d9204"
  });
}

async function checkData() {
  const db = admin.firestore();
  
  console.log("--- Users ---");
  const usersSnap = await db.collection("users").get();
  usersSnap.forEach(doc => {
    console.log(`User: ${doc.id}, Email: ${doc.data().email}, OrgId: ${doc.data().orgId}`);
  });

  console.log("\n--- Moderation Results ---");
  const resultsSnap = await db.collection("moderation_results").limit(5).get();
  resultsSnap.forEach(doc => {
    console.log(`Result: ${doc.id}, ContentId: ${doc.data().contentId}, OrgId: ${doc.data().orgId}, Decision: ${doc.data().decision}`);
  });

  console.log("\n--- Organizations ---");
  const orgsSnap = await db.collection("organizations").limit(5).get();
  orgsSnap.forEach(doc => {
    console.log(`Org: ${doc.id}, Name: ${doc.data().name}`);
  });
}

checkData().catch(console.error);
