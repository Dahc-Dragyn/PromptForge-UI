PromptForge UI (Frontend)
This is the Next.js frontend for the PromptForge platform, a powerful, developer-centric API designed to automate and optimize the entire prompt engineering lifecycle. This user interface provides an intuitive experience for developers and content creators to manage, test, and analyze prompts for Large Language Models (LLMs).



⚠️ Current Status: In Development & Blocked
This frontend application is in the initial setup phase. The foundational components for Firebase authentication and core pages have been built, but there is a persistent 


FirebaseError: Firebase: Error (auth/unauthorized-domain) that prevents Google Sign-In from completing. The immediate next step is to resolve this authentication issue.



Technology Stack

Framework: Next.js (with App Router) 


Language: TypeScript 


Styling: Tailwind CSS 


Backend Services: Firebase (for Authentication & Firestore) 


Linting: ESLint 

Getting Started
Follow these steps to set up and run the frontend for local development.

Prerequisites
Node.js and npm (or a compatible package manager)

A Firebase project with Authentication and Firestore enabled

Installation & Setup
Navigate to the frontend directory:

Bash

cd frontend


Install dependencies:

Bash

npm install


Configure Environment Variables:
Create a file named 

.env.local in the frontend root directory. This file will store your client-side Firebase keys. Add your Firebase project configuration to this file:

# frontend/.env.local
NEXT_PUBLIC_FIREBASE_API_KEY="your-firebase-api-key"
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="your-project-id.firebaseapp.com"
NEXT_PUBLIC_FIREBASE_PROJECT_ID="your-project-id"
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="your-project-id.appspot.com"
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="your-sender-id"
NEXT_PUBLIC_FIREBASE_APP_ID="your-app-id"


Run the development server:

Bash

npm run dev


The application will be available at 

http://localhost:3000.

Features Implemented

Project Scaffolding: A clean Next.js project using the modern App Router, TypeScript, and Tailwind CSS.


Firebase SDK Integration: A dedicated utility at src/lib/firebase.ts correctly initializes the client-side Firebase connection.


Global Authentication Context: An AuthProvider component (src/context/AuthContext.tsx) manages and provides user state throughout the application using React Context.

Authentication Pages: Fully functional /login and /signup pages with support for email/password and Google Sign-In (currently blocked).


Core UI Components: A root layout and a Navbar component with conditional sign-in/sign-out buttons have been created.

Dashboard: A protected /dashboard page that displays a real-time list of prompt templates from Firestore and allows users to create and delete them.

API Interaction Pages:


/benchmark: A page to test a single prompt against multiple LLMs via the /prompts/benchmark API endpoint.


/analyze: A suite of tools to interact with the /prompts/optimize, /prompts/diagnose, and /prompts/breakdown API endpoints.


Known Issues & Blockers

Blocker: Firebase Google Sign-In Fails 


Symptom: When clicking the "Sign in with Google" button, the authentication pop-up appears briefly and then immediately closes.


Error: The browser console shows a persistent FirebaseError: Firebase: Error (auth/unauthorized-domain).


Troubleshooting So Far: The development URL has been added to the allowlists in both Firebase Authentication settings and Google Cloud Console OAuth 2.0 Client ID settings, but the error persists.

Next Steps
The sole focus is to resolve the 

auth/unauthorized-domain error. Once authentication is working, we will proceed with the planned UI development:

Build the main three-pane layout for the application.

Connect to the live PromptForge API to fetch and display the list of prompts (not just templates).

Implement full CRUD (Create, Read, Update, Delete) functionality for prompts and their versions.

Build out UI components for the remaining advanced API features like the prompt composer and A/B testing sandbox.