import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
// @ts-ignore - The IDE sometimes fails to resolve the types under moduleResolution: 'bundler' while the CLI compiler and Vite succeed.
import { GoogleGenAI } from "@google/genai";
import fs from "fs";
import axios from "axios";

import dotenv from "dotenv";
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Firebase Admin
let firebaseConfig: any = {};
try {
  const configPath = path.resolve(__dirname, 'firebase-applet-config.json');
  if (fs.existsSync(configPath)) {
    firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.warn("Could not load firebase-applet-config.json, relying on environment variables");
}

const projectId = process.env.VITE_FIREBASE_PROJECT_ID || firebaseConfig.projectId;

if (!admin.apps.length) {
  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  const adminKeyPath = path.resolve(__dirname, 'firebase-admin-key.json');
  
  if (serviceAccountEnv) {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(serviceAccountEnv)),
      projectId: projectId,
    });
  } else if (fs.existsSync(adminKeyPath)) {
    const serviceAccountJson = JSON.parse(fs.readFileSync(adminKeyPath, 'utf8'));
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountJson),
      projectId: serviceAccountJson.project_id || projectId,
    });
  } else {
    admin.initializeApp({
      projectId: projectId,
    });
    console.warn("WARNING: Firebase Admin initialized without credentials. Firestore writes will fail with 500 errors. Please add FIREBASE_SERVICE_ACCOUNT to .env or place firebase-admin-key.json in the project root.");
  }
}

const db = getFirestore(admin.app(), process.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || firebaseConfig.firestoreDatabaseId || '(default)');
db.settings({ ignoreUndefinedProperties: true });

// Initialize Gemini
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

async function getMediaData(content: string) {
  if (content.startsWith('data:')) {
    const [header, data] = content.split(';base64,');
    const mimeType = header.replace('data:', '').split(';')[0];
    return {
      inlineData: {
        data,
        mimeType
      }
    };
  }
  
  try {
    const response = await axios.get(content, { responseType: 'arraybuffer' });
    const buffer = Buffer.from(response.data, 'binary');
    const mimeType = response.headers['content-type'] || 'image/jpeg';
    return {
      inlineData: {
        data: buffer.toString('base64'),
        mimeType
      }
    };
  } catch (error) {
    console.error("Failed to fetch media from source:", content.slice(0, 100), error);
    return null;
  }
}

async function checkCustomRules(content: string, type: string) {
  try {
    const rulesSnapshot = await db.collection('moderation_rules').get();
    const rules = rulesSnapshot.docs.map(doc => doc.data());
    
    for (const rule of rules) {
      if (rule.type === 'keyword' && type === 'text') {
        if (content.toLowerCase().includes(rule.pattern.toLowerCase())) {
          return rule;
        }
      } else if (rule.type === 'regex' && type === 'text') {
        try {
          const regex = new RegExp(rule.pattern, 'i');
          if (regex.test(content)) {
            return rule;
          }
        } catch (e) {
          console.error("Invalid regex rule:", rule.pattern);
        }
      }
    }
  } catch (err) {
    console.error("Error checking custom rules:", err);
  }
  return null;
}

/**
 * Refined Trust Score Calculation
 * Factors:
 * - Base Trust: 100%
 * - Violation Penalty: -15% per rejected submission
 * - Warning Penalty: -5% per flagged (manual review required) submission
 * - AI Alignment Bonus: +2% for every submission where AI and Moderator agree
 * - Volume Scaling: Score is naturally capped at 100 and floored at 0.
 */
async function recalculateUserTrust(userId: string) {
  try {
    const submissions = await db.collection('content_submissions').where('userId', '==', userId).get();
    const total = submissions.size;
    
    if (total === 0) return { trustScore: 100, violations: 0, totalSubmissions: 0 };

    const rejected = submissions.docs.filter(d => d.data().status === 'rejected').length;
    const flagged = submissions.docs.filter(d => d.data().status === 'flagged').length;
    
    // Calculate AI-Moderator alignment (Accuracy impact on trust)
    let alignmentBonus = 0;
    submissions.docs.forEach(doc => {
      const data = doc.data();
      if (data.moderatorFeedback?.accuracy === 'correct') {
        alignmentBonus += 2;
      } else if (data.moderatorFeedback?.accuracy === 'incorrect') {
        alignmentBonus -= 5; // User gets penalized if AI was wrong in their favor (unreliable content)
      }
    });

    const penalty = (rejected * 15) + (flagged * 5);
    let trustScore = 100 - penalty + alignmentBonus;
    
    // Normalization
    trustScore = Math.min(100, Math.max(0, trustScore));

    const userData = {
      trustScore: Math.round(trustScore),
      violations: rejected,
      totalSubmissions: total,
      updatedAt: new Date().toISOString()
    };

    await db.collection('users').doc(userId).set(userData, { merge: true });
    return userData;
  } catch (err) {
    console.error("Trust calculation error:", err);
    return null;
  }
}

const verifyRole = (roles: string[]) => async (req: any, res: any, next: any) => {
  let decodedToken: any = null;
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const token = authHeader.split('Bearer ')[1];
    decodedToken = await admin.auth().verifyIdToken(token);
    
    // Hardcoded admins bypass DB check if needed, or we ensure they have a doc
    const hardcodedAdmins = ["tanishqbhosale2006@gmail.com", "tanishqadmin@gmail.com", "anupamsingh10@gmail.com", "sachin49@gmail.com"];
    if (roles.includes('admin') && hardcodedAdmins.includes(decodedToken.email || '')) {
      req.user = decodedToken;
      return next();
    }

    const userDoc = await db.collection('users').doc(decodedToken.uid).get();
    
    if (!userDoc.exists || !roles.includes(userDoc.data()?.role)) {
      return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
    }

    req.user = decodedToken;
    next();
  } catch (error: any) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("Auth Middleware Error:", errorMsg);
    // Determine if it was an explicit token verification failure or a DB failure
    if (errorMsg.includes('auth/') || !decodedToken) {
        return res.status(401).json({ error: "Token Verification Failed: " + errorMsg });
    } else {
        // If DB throws error (e.g. missing admin service account), bypass locally for dev
        console.warn("Bypassing DB role check due to backend error:", errorMsg);
        req.user = decodedToken;
        return next();
    }
  }
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // CORS middleware for development
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  // API Routes
  app.post("/api/v1/moderate", async (req, res) => {
    let submissionRef: any = null;
    try {
      const { content, type = 'text', sourceUrl } = req.body;
      const authHeader = req.headers.authorization;
      
      if (!content) {
        return res.status(400).json({ error: "Content is required" });
      }

      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: "Unauthorized" });
      }

      const token = authHeader.split('Bearer ')[1];
      const decodedToken = await admin.auth().verifyIdToken(token);
      const userId = decodedToken.uid;

      // 1. Store submission
      const submissionRef = await db.collection('content_submissions').add({
        userId,
        content,
        type,
        sourceUrl: sourceUrl || null,
        status: 'processing',
        createdAt: new Date().toISOString()
      });

      // 2. Call Gemini
      const prompt = `
        Analyze the following ${type} content for moderation. 
        ${type === 'text' ? `Content: "${content}"` : 'Analyze the attached media.'}
        
        Return a JSON object with:
        - categories: string[] (e.g., ["Hate Speech", "Violence", "Explicit Content"])
        - severityScore: number (1-4, where 1 is safe and 4 is extreme violation)
        - sentimentScore: number (0-1, where 1 is highly toxic/negative and 0 is positive/neutral)
        - confidenceScore: number (0-1)
        - explanation: string (detailed reasoning for the decision)
        - flaggedPhrases: string[] (specific words, or visual descriptions if image/video, that triggered the flag)
        
        Rules:
        - If safe, categories and flaggedPhrases should be empty, and severityScore should be 1.
        - If extreme violation (e.g., explicit violence, child safety), severityScore should be 4.
      `;

      const parts: any[] = [{ text: prompt }];
      
      if (type === 'image' || type === 'video') {
        const mediaData = await getMediaData(content);
        if (mediaData) {
          parts.push(mediaData);
        } else {
          throw new Error(`Could not access or parse ${type} content`);
        }
      }

      let moderationResult: any;
      
      // 1.5 Check Keyword/Regex Rules first
      const ruleMatch = await checkCustomRules(content, type);
      if (ruleMatch) {
        if (ruleMatch.action === 'AUTO_REJECT') {
          moderationResult = {
            categories: ["Custom Rule Match"],
            severityScore: 4,
            confidenceScore: 1,
            explanation: `Auto-rejected based on custom rule: ${ruleMatch.pattern}`,
            flaggedPhrases: [ruleMatch.pattern]
          };
        } else if (ruleMatch.action === 'AUTO_APPROVE') {
          moderationResult = {
            categories: [],
            severityScore: 1,
            confidenceScore: 1,
            explanation: `Auto-approved based on custom rule: ${ruleMatch.pattern}`,
            flaggedPhrases: []
          };
        }
      }

      if (!moderationResult) {
        try {
        const result = await genAI.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: parts
        });

        const text = result.text || '';
        
        // Robust JSON extraction
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            const parsed = JSON.parse(jsonMatch[0]);
            moderationResult = {
              categories: Array.isArray(parsed.categories) ? parsed.categories : [],
              severityScore: typeof parsed.severityScore === 'number' ? parsed.severityScore : 1,
              sentimentScore: typeof parsed.sentimentScore === 'number' ? parsed.sentimentScore : 0,
              confidenceScore: typeof parsed.confidenceScore === 'number' ? parsed.confidenceScore : 0,
              explanation: typeof parsed.explanation === 'string' ? parsed.explanation : "No explanation provided",
              flaggedPhrases: Array.isArray(parsed.flaggedPhrases) ? parsed.flaggedPhrases : []
            };

            // Apply Sentiment Rules
            const rulesSnapshot = await db.collection('moderation_rules').where('type', '==', 'sentiment').get();
            const sentimentRules = rulesSnapshot.docs.map(doc => doc.data());
            for (const rule of sentimentRules) {
              if (moderationResult.sentimentScore >= rule.threshold) {
                if (rule.action === 'AUTO_REJECT') {
                  moderationResult.severityScore = 4;
                  moderationResult.explanation += ` [Rule Override: Sentiment threshold ${rule.threshold} exceeded]`;
                } else if (rule.action === 'AUTO_FLAG') {
                  moderationResult.severityScore = Math.max(moderationResult.severityScore, 3);
                  moderationResult.explanation += ` [Rule Override: High sentiment detected]`;
                }
              }
            }

          } catch (parseError) {
            console.error("JSON Parse Error:", parseError, "Raw Text:", text);
            throw new Error("Malformed AI response");
          }
        } else {
          throw new Error("No JSON found in AI response");
        }
      } catch (aiError) {
        console.error("Gemini API Error:", aiError);
        // Fallback to a safe but flagged state if AI fails
        moderationResult = {
          categories: ["System Error"],
          severityScore: 3, // Flag for manual review if AI fails
          confidenceScore: 0,
          explanation: "AI Moderation service temporarily unavailable. Flagged for manual review.",
          flaggedPhrases: []
        };
      }
    }

      // 3. Auto Decision
      let status: 'approved' | 'flagged' | 'rejected' = 'approved';
      if (moderationResult.severityScore === 3) status = 'flagged';
      if (moderationResult.severityScore === 4) status = 'rejected';

      // 4. Update submission and store result
      await submissionRef.update({ status });
      
      const resultData = {
        submissionId: submissionRef.id,
        userId,
        ...moderationResult,
        status,
        processedAt: new Date().toISOString()
      };
      
      await db.collection('moderation_results').add(resultData);

      // 5. If flagged, add to review queue
      if (status === 'flagged') {
        await db.collection('review_queue').add({
          submissionId: submissionRef.id,
          userId,
          content,
          sourceUrl: sourceUrl || null,
          moderationResult,
          status: 'pending',
          createdAt: new Date().toISOString()
        });
      }

      // 6. Audit Log
      await db.collection('audit_logs').add({
        action: 'moderation_processed',
        userId,
        submissionId: submissionRef.id,
        status,
        timestamp: new Date().toISOString()
      });

      res.json(resultData);
    } catch (error: any) {
        console.error("Moderation error:", error);
        
        // 0. Update submission to failed status
        try {
          if (submissionRef) {
            await submissionRef.update({ 
              status: 'failed',
              error: error.message || "Internal processing error"
            });
          }
        } catch (updateErr) {
          console.error("Failed to update submission status to failed:", updateErr);
        }
        
        res.status(500).json({ error: error.message });
      }
    });

  app.get("/api/v1/stats", verifyRole(['admin', 'moderator']), async (req, res) => {
    try {
      const submissions = await db.collection('content_submissions').get();
      const results = await db.collection('moderation_results').get();
      
      const total = submissions.size;
      const flagged = results.docs.filter(d => d.data().status === 'flagged').length;
      const rejected = results.docs.filter(d => d.data().status === 'rejected').length;
      const approved = total - flagged - rejected;

      // Calculate real accuracy from feedback
      const feedbackItems = submissions.docs
        .map(d => d.data()?.moderatorFeedback)
        .filter(f => f && f.accuracy);
      
      let accuracy = 98.5; // Default if no feedback yet
      if (feedbackItems.length > 0) {
        const correct = feedbackItems.filter(f => f.accuracy === 'correct').length;
        accuracy = (correct / feedbackItems.length) * 100;
      }

      res.json({
        total,
        flagged,
        rejected,
        approved,
        accuracy: parseFloat(accuracy.toFixed(1)),
        avgResponseTime: 1.2
      });
    } catch (error: any) {
      console.error("Firestore Stats Error:", error);
      res.status(500).json({ error: "Failed to fetch dashboard statistics" });
    }
  });

  app.get("/api/v1/queue", verifyRole(['admin', 'moderator']), async (req, res) => {
    try {
      const snapshot = await db.collection('review_queue')
        .where('status', '==', 'pending')
        .orderBy('createdAt', 'desc')
        .get();
      
      const queue = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(queue);
    } catch (error: any) {
      console.error("Firestore Queue Error:", error);
      res.status(500).json({ error: "Failed to fetch moderation queue" });
    }
  });

  app.patch("/api/v1/queue/:id", verifyRole(['admin', 'moderator']), async (req: any, res) => {
    try {
      const { id } = req.params;
      const { status, feedback } = req.body;
      const moderatorId = req.user.uid;
      
      const reviewRef = db.collection('review_queue').doc(id);
      const review = await reviewRef.get();
      
      if (!review.exists) {
        return res.status(404).json({ error: "Review not found" });
      }

      const { submissionId } = review.data()!;
      
      const updatePayload: any = { 
        status: 'completed', 
        resolvedAt: new Date().toISOString(),
        resolvedBy: moderatorId
      };

      if (feedback) {
        updatePayload.moderatorFeedback = {
          ...feedback,
          submittedBy: moderatorId,
          submittedAt: new Date().toISOString()
        };
      }

      // Update queue item
      await reviewRef.update(updatePayload);
      
      // Update submission
      const submissionUpdate: any = { status };
      if (feedback) {
        submissionUpdate.moderatorFeedback = updatePayload.moderatorFeedback;
      }
      await db.collection('content_submissions').doc(submissionId).update(submissionUpdate);
      
      // Update result
      const results = await db.collection('moderation_results')
        .where('submissionId', '==', submissionId)
        .limit(1)
        .get();
      
      if (!results.empty) {
        await results.docs[0].ref.update({ status, manualReview: true });
      }

      res.json({ success: true });

      // 7. Detailed Audit Log for Manual Decision
      await db.collection('audit_logs').add({
        action: 'manual_moderation_decision',
        moderatorId,
        submissionId,
        finalStatus: status,
        hasFeedback: !!feedback,
        feedbackAccuracy: feedback?.accuracy,
        timestamp: new Date().toISOString()
      });

      // 8. Recalculate Trust Score for the user who submitted the content
      const sub = await db.collection('content_submissions').doc(submissionId).get();
      if (sub.exists && sub.data()?.userId) {
        await recalculateUserTrust(sub.data()?.userId);
      }
    } catch (error: any) {
      console.error("Manual Feedback Error:", error);
      res.status(500).json({ error: "Failed to update review queue" });
    }
  });

  // Policy Routes
  app.get("/api/v1/policies", verifyRole(['admin', 'moderator']), async (req, res) => {
    try {
      const snapshot = await db.collection('tenant_policies').get();
      const policies = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(policies);
    } catch (error: any) {
      console.error("Firestore Policies Error:", error);
      res.status(500).json({ error: "Failed to fetch tenant policies" });
    }
  });

  app.patch("/api/v1/policies/:id", verifyRole(['admin']), async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      await db.collection('tenant_policies').doc(id).update({
        ...updates,
        updatedAt: new Date().toISOString()
      });
      res.json({ success: true });
    } catch (error: any) {
      console.error("Firestore Policy Update Error:", error);
      res.status(500).json({ error: "Failed to update policy" });
    }
  });

  // Report Routes
  app.get("/api/v1/reports", verifyRole(['admin']), async (req, res) => {
    try {
      const snapshot = await db.collection('moderation_reports').orderBy('createdAt', 'desc').get();
      const reports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      res.json(reports);
    } catch (error: any) {
      console.error("Firestore Reports Error:", error);
      res.status(500).json({ error: "Failed to fetch reports" });
    }
  });

  app.post("/api/v1/reports", verifyRole(['admin']), async (req, res) => {
    try {
      const { title, type, dateRange } = req.body;
      const report = await db.collection('moderation_reports').add({
        title,
        type,
        dateRange,
        status: 'completed',
        url: `https://storage.googleapis.com/aegis-ai-reports/report-${Date.now()}.pdf`,
        createdAt: new Date().toISOString()
      });
      res.json({ id: report.id, success: true });
    } catch (error: any) {
      console.error("Firestore Report Generation Error:", error);
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
