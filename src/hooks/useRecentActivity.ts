// src/hooks/useRecentActivity.ts
'use client';

import { useEffect, useState } from 'react';
import { collectionGroup, query, onSnapshot, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

export interface RecentVersion {
  id: string; 
  promptId: string;
  version: number;
  commit_message: string;
  prompt_text: string;
  created_at: {
    seconds: number;
    nanoseconds: number;
  } | null;
}

export const useRecentActivity = () => {
  const { user } = useAuth();
  const [recentVersions, setRecentVersions] = useState<RecentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const q = query(
      collectionGroup(db, 'versions'),
      orderBy('created_at', 'desc'),
      limit(5)
    );

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      try {
        const versionsData: RecentVersion[] = querySnapshot.docs.map(doc => {
          const data = doc.data();
          const parentPath = doc.ref.parent.parent;
          if (!parentPath) return null;
          
          return {
            id: doc.id,
            promptId: parentPath.id,
            version: data.version,
            commit_message: data.commit_message || 'No commit message.',
            prompt_text: data.prompt_text || '',
            created_at: data.created_at,
          };
        }).filter((v): v is RecentVersion => v !== null);

        setRecentVersions(versionsData);
        setError(null);
      } catch (err) {
        console.error("Failed to process recent activity:", err);
        setError('Failed to process recent activity.');
      } finally {
        setLoading(false);
      }
    }, (err) => {
      console.error("Failed to fetch recent activity:", err);
      setError('Failed to fetch recent activity. Check Firestore index and rules.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  return { recentVersions, loading, error };
};