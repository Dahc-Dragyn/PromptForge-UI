'use client';

import { SWRConfig } from 'swr';
import { useAuth } from '@/context/AuthContext';
import Navbar from './Navbar';

export default function ClientBoundary({ children }: { children: React.ReactNode }) {
    const { user } = useAuth();
    
    // The key is tied directly to the user session. When it changes,
    // the ENTIRE SWR cache is destroyed and recreated. No data can leak.
    const cacheKey = user ? user.uid : 'logged-out';

    return (
        <SWRConfig key={cacheKey}>
            <Navbar />
            <main>{children}</main>
        </SWRConfig>
    );
}