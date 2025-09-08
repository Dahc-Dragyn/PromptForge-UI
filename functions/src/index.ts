// functions/src/index.ts

import { onDocumentWritten } from "firebase-functions/v2/firestore";
import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";

admin.initializeApp();
const db = admin.firestore();

export const aggregateRatings = onDocumentWritten("prompt_metrics/{metricId}", async (_event) => {
  const beforeData = _event.data?.before.data();
  const afterData = _event.data?.after.data();

  const isNewRating = afterData && !beforeData;
  const isDeletedRating = beforeData && !afterData;
  const isUpdatedRating = beforeData && afterData;

  let promptId: string;
  let ratingChange: number;
  let countChange: number;

  if (isNewRating) {
    logger.log("New rating added", _event.params.metricId, afterData);
    promptId = afterData.promptId;
    ratingChange = afterData.rating;
    countChange = 1;
  } else if (isDeletedRating) {
    logger.log("Rating deleted", _event.params.metricId, beforeData);
    promptId = beforeData.promptId;
    ratingChange = -beforeData.rating;
    countChange = -1;
  } else if (isUpdatedRating && beforeData?.rating !== afterData?.rating) {
    logger.log("Rating updated", _event.params.metricId, afterData);
    promptId = afterData.promptId;
    ratingChange = afterData.rating - beforeData.rating;
    countChange = 0;
  } else {
    logger.log("No rating change detected. Exiting function.");
    return;
  }

  const promptRef = db.collection("prompts").doc(promptId);

  return db.runTransaction(async (transaction) => {
    const promptDoc = await transaction.get(promptRef);

    if (!promptDoc.exists) {
      logger.error(`Prompt document ${promptId} not found!`);
      return;
    }

    const oldRatingCount = promptDoc.data()?.ratingCount || 0;
    const oldAverageRating = promptDoc.data()?.averageRating || 0;
    
    const newRatingCount = oldRatingCount + countChange;
    const newTotalScore = (oldAverageRating * oldRatingCount) + ratingChange;
    const newAverageRating = newRatingCount > 0 ? newTotalScore / newRatingCount : 0;

    logger.log(
      `Updating prompt ${promptId}:`,
      { ratingCount: newRatingCount, averageRating: newAverageRating }
    );

    transaction.update(promptRef, {
      ratingCount: newRatingCount,
      averageRating: newAverageRating,
    });
  });
});

// --- FINAL PRODUCTION "Cleanup Crew" Function ---
export const cleanupOldMetrics = onSchedule("0 3 1 * *", async (_event) => {
  logger.log("Running scheduled prompt_metrics cleanup.");

  // --- Logic reverted to 6 months for production ---
  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - 6);
  const cutoff = admin.firestore.Timestamp.fromDate(cutoffDate);

  const oldMetricsQuery = db.collection("prompt_metrics").where("createdAt", "<", cutoff);

  try {
    const snapshot = await oldMetricsQuery.get();

    if (snapshot.empty) {
      logger.log("No old prompt_metrics to delete.");
      return;
    }

    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    logger.log(`Successfully deleted ${snapshot.size} old prompt_metrics documents.`);

  } catch (error) {
    logger.error("Error during scheduled cleanup:", error);
  }
});