import * as admin from "firebase-admin";

process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";
process.env.FIREBASE_AUTH_EMULATOR_HOST = "127.0.0.1:9099";

if (!admin.apps.length) {
  admin.initializeApp({
    projectId: "aegis-ai-d9204",
  });
}

const db = admin.firestore();

async function seedContent() {
  console.log("🚀 Starting Content Seeding...");

  const examples = [
    {
      category: "Safe Content",
      text: "The weather is really nice today. I am going for a walk in the park with my dog.",
      type: "text",
      needsReview: false,
      status: "Approved",
      severity: 2,
      confidence: 0.99,
      explanation: "This content is completely benign and safe.",
      categories: {
        hateSpeech: { severity: 1, triggered: false },
        violence: { severity: 1, triggered: false },
        harassment: { severity: 1, triggered: false },
        spam: { severity: 1, triggered: false },
        nsfw: { severity: 1, triggered: false },
      }
    },
    {
      category: "Hate Speech",
      text: "I hate all [Redacted Group] people, they are terrible and should be removed from our country immediately.",
      type: "text",
      needsReview: true,
      status: "pending",
      severity: 85,
      confidence: 0.92,
      explanation: "Contains explicit hate speech targeting a specific group.",
      categories: {
        hateSpeech: { severity: 85, triggered: true },
        violence: { severity: 20, triggered: false },
        harassment: { severity: 60, triggered: true },
        spam: { severity: 5, triggered: false },
        nsfw: { severity: 10, triggered: false },
      }
    },
    {
      category: "Violence",
      text: "I am going to find you and I will beat you up so badly you won't be able to walk.",
      type: "text",
      needsReview: true,
      status: "pending",
      severity: 90,
      confidence: 0.95,
      explanation: "Contains direct threats of physical violence.",
      categories: {
        hateSpeech: { severity: 10, triggered: false },
        violence: { severity: 90, triggered: true },
        harassment: { severity: 75, triggered: true },
        spam: { severity: 2, triggered: false },
        nsfw: { severity: 5, triggered: false },
      }
    },
    {
      category: "Harassment",
      text: "You are so ugly and stupid, stop posting on this forum you absolute loser.",
      type: "text",
      needsReview: true,
      status: "pending",
      severity: 65,
      confidence: 0.88,
      explanation: "Directly insulting and harassing another user.",
      categories: {
        hateSpeech: { severity: 15, triggered: false },
        violence: { severity: 10, triggered: false },
        harassment: { severity: 65, triggered: true },
        spam: { severity: 5, triggered: false },
        nsfw: { severity: 10, triggered: false },
      }
    },
    {
      category: "Spam",
      text: "CLICK HERE TO WIN A FREE IPHONE 15 NOW!!! http://spam-link-do-not-click.com BUY CHEAP PILLS 100% OFF",
      type: "text",
      needsReview: true,
      status: "pending",
      severity: 70,
      confidence: 0.97,
      explanation: "Obvious spam and promotional phishing links.",
      categories: {
        hateSpeech: { severity: 0, triggered: false },
        violence: { severity: 0, triggered: false },
        harassment: { severity: 0, triggered: false },
        spam: { severity: 95, triggered: true },
        nsfw: { severity: 5, triggered: false },
      }
    },
    {
      category: "Inappropriate Content",
      text: "Hey, check out these explicit pictures at this site. Send me $50 for the full uncensored video.",
      type: "text",
      needsReview: true,
      status: "pending",
      severity: 88,
      confidence: 0.91,
      explanation: "Solicitation of inappropriate NSFW material.",
      categories: {
        hateSpeech: { severity: 0, triggered: false },
        violence: { severity: 0, triggered: false },
        harassment: { severity: 5, triggered: false },
        spam: { severity: 40, triggered: false },
        nsfw: { severity: 88, triggered: true },
      }
    }
  ];

  for (const ex of examples) {
    console.log(`Seeding: ${ex.category}`);
    const contentRef = db.collection("content").doc();
    const contentId = contentRef.id;

    await contentRef.set({
      text: ex.text,
      type: ex.type,
      status: "processed",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });

    const resultRef = db.collection("moderation_results").doc();
    await resultRef.set({
      resultId: resultRef.id,
      contentId: contentId,
      type: ex.type,
      status: ex.status,
      severity: ex.severity,
      confidence: ex.confidence,
      explanation: ex.explanation,
      categories: ex.categories,
      aiModel: "gemini-3.5-pro",
      needsHumanReview: ex.needsReview,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    });
  }

  console.log("✅ Seed Content Setup Complete!");
  process.exit(0);
}

seedContent().catch(err => {
  console.error("❌ Seeding Failed:", err);
  process.exit(1);
});
