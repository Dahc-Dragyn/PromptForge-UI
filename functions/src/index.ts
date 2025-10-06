// functions/src/index.ts

import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

// NOTE: The 'aggregateRatings' function has been removed as this logic is now handled
// directly by the FastAPI backend in the /metrics/rate endpoint.

// NOTE: The 'cleanupOldMetrics' function has been removed as the 'prompt_metrics' 
// collection it was cleaning is now deprecated and has been deleted from Firestore.

// This file is kept for potential future Cloud Functions.