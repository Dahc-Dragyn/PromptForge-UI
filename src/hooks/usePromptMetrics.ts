// src/hooks/usePromptMetrics.ts
'use client';

import { useEffect, useState } from 'react';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

// The hook now returns the promptId, not the text
export interface TopPromptMetric {
  promptId: string;
  averageRating: number;
  ratingCount: number;
}

export const usePromptMetrics = () => {
  const { user } = useAuth();
  const [topPrompts, setTopPrompts] = useState<TopPromptMetric[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return; // Don't fetch if user is not logged in
    }

    // Query metrics created by the current user
    const q = query(
      collection(db, 'prompt_metrics'), 
      where('userId', '==', user.uid),
      orderBy('createdAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      try {
        const metrics = querySnapshot.docs.map(doc => doc.data());
        
        // Aggregate ratings by promptId
        const promptStats: { [key: string]: { totalRating: number; count: number } } = {};

        metrics.forEach(metric => {
          // Ensure the metric is valid and has a promptId
          if (metric.promptId && typeof metric.rating === 'number') {
            if (!promptStats[metric.promptId]) {
              promptStats[metric.promptId] = { totalRating: 0, count: 0 };
            }
            promptStats[metric.promptId].totalRating += metric.rating;
            promptStats[metric.promptId].count++;
          }
        });

        // Calculate averages and format the data
        const calculatedPrompts = Object.entries(promptStats).map(([promptId, stats]) => ({
          promptId,
          averageRating: stats.totalRating / stats.count,
          ratingCount: stats.count,
        }));
        
        // Sort by average rating and then by rating count
        calculatedPrompts.sort((a, b) => {
          if (b.averageRating !== a.averageRating) {
            return b.averageRating - a.averageRating;
          }
          return b.ratingCount - a.ratingCount;
        });

        setTopPrompts(calculatedPrompts.slice(0, 5));
        setLoading(false);
        setError(null);

      } catch (err) {
        console.error("Failed to process metrics:", err);
        setError('Failed to process prompt metrics.');
        setLoading(false);
      }
    }, (err) => {
      console.error("Failed to fetch metrics:", err);
      setError('Failed to fetch prompt metrics in real-time.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]); // Rerun when user logs in

  return { topPrompts, loading, error };
};