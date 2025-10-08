// src/app/page.tsx (Corrected)
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ArrowPathIcon } from '@heroicons/react/24/outline';

const HomePage = () => {
  const { user, loading } = useAuth();
    const router = useRouter();

      useEffect(() => {
          // This logic is now simpler and more robust.
              // It only acts AFTER the loading is complete.
                  if (!loading) {
                        if (user) {
                                // If we have a user, go to the dashboard.
                                        router.replace('/dashboard');
                                              } else {
                                                      // If there's no user, go to login.
                                                              router.replace('/login');
                                                                    }
                                                                        }
                                                                            // The dependency array ensures this runs only when loading or user state changes.
                                                                              }, [user, loading, router]);

                                                                                // Return a full-page loading indicator. This is what users will see
                                                                                  // when they first hit the site, preventing any weird flashes or premature redirects.
                                                                                    return (
                                                                                        <div className="flex flex-col justify-center items-center h-screen bg-gray-900 text-white">
                                                                                              <ArrowPathIcon className="h-8 w-8 animate-spin text-indigo-400 mb-4" />
                                                                                                    <p>Initializing Session...</p>
                                                                                                        </div>
                                                                                                          );
                                                                                                          };

                                                                                                          export default HomePage;