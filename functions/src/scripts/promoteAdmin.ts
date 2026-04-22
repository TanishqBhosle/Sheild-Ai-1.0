import * as admin from "firebase-admin";
import dotenv from "dotenv";

dotenv.config();

// Initialize with emulator environment if needed
if (!process.env.FIREBASE_AUTH_EMULATOR_HOST) {
  process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
}

admin.initializeApp({
  projectId: "aegis-ai-d9204",
});

async function promoteToAdmin(email: string) {
  try {
    const auth = admin.auth();
    const user = await auth.getUserByEmail(email);

    console.log(`Found user: ${user.uid} (${user.email})`);

    // Set custom claims
    await auth.setCustomUserClaims(user.uid, {
      role: "platform_admin",
      plan: "pro"
    });

    console.log(`Successfully promoted ${email} to platform_admin.`);
    console.log("IMPORTANT: The user must log out and log back in for changes to take effect.");
    process.exit(0);
  } catch (error: any) {
    console.error("Error promoting user:", error.message);
    process.exit(1);
  }
}

const email = process.argv[2];
if (!email) {
  console.log("Usage: npx ts-node src/scripts/promoteAdmin.ts <email>");
  process.exit(1);
}

promoteToAdmin(email);
