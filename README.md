# Shield AI - Enterprise Content Moderation Platform

![Shield AI Banner](https://images.unsplash.com/photo-1550751827-4bd374c3f58b?auto=format&fit=crop&q=80&w=1200&h=400)

**A high-performance safety layer for modern applications.** Shield AI leverages multi-agent AI logic and Google's Gemini Flash models to provide real-time content assessment, human-in-the-loop moderation, and deep behavioral analytics.

## 🚀 Key Features

-   **Multi-Modal Analysis**: Real-time moderation for Text, Images, and Video.
-   **AI Intelligence**: Powered by Google Gemini (1.5 & 2.5 Flash) for high-accuracy reasoning and safety explanations.
-   **Human-in-the-Loop**: A dedicated Review Queue for human moderators to resolve flagged content.
-   **Behavioral Trust Scoring**: Automatically calculates user reliability based on historical submission patterns.
-   **Custom Rule Engine**: Keyword and Regex-based auto-rejection or auto-approval pipelines.
-   **Interactive Dashboard**: Real-time stats, system latency tracking, and AI accuracy metrics.
-   **Enterprise Security**: Role-Based Access Control (RBAC) ensuring only authorized personnel access sensitive logs.

## 🛠️ Tech Stack

### Frontend
-   **Framework**: React 19 + Vite
-   **Styling**: Tailwind CSS + Framer Motion (Aesthetics focused)
-   **State Management**: Zustand
-   **UI Components**: Lucide Icons + Custom Tailwind components
-   **Notifications**: Sonner

### Backend & Infrastructure
-   **Runtime**: Node.js + TSX
-   **Framework**: Express
-   **Database**: Google Cloud Firestore
-   **Authentication**: Firebase Auth
-   **AI Engine**: Google Generative AI (Gemini API)

## 📦 Getting Started

### 1. Prerequisites
-   Node.js (v18+)
-   A Firebase Project
-   A Google AI Studio (Gemini) API Key

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/TanishqBhosle/Sheild-Ai-1.0.git

# Install dependencies
npm install
```

### 3. Environment Configuration
Create a `.env` file in the root directory and add your credentials:
```env
GEMINI_API_KEY=your_gemini_key_here

# Firebase Client Config (from Firebase Console)
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
```

### 4. Running the Project
```bash
# Start the unified dev server (Vite + Express)
npm run dev
```
The application will be available at `http://localhost:3000`.

## 🛡️ Architecture Highlights

Shield AI follows a "Guardrail First" architecture:
1.  **Ingestion**: Content enters via API or Dashboard.
2.  **Rule Check**: Local Regex/Keyword rules are applied for instant decisions.
3.  **AI Audit**: Gemini assesses the content against safety categories (Hate, Violence, etc.).
4.  **Auto-Action**: 
    - `Severity 1-2`: Auto-Approve
    - `Severity 3`: Flag for Review (Sent to Queue)
    - `Severity 4`: Auto-Reject
5.  **Profile Update**: User's "Trust Score" is dynamically updated based on the final resolution.

## 🤝 Contributing

We welcome contributions! Please feel free to submit a Pull Request.

## 📄 License

This project is private and for internal use. All rights reserved.
