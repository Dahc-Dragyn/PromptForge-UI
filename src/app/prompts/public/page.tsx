// This file is a Server Component. It fetches data and renders directly on the server.
import Link from 'next/link';
import { Metadata } from 'next';
import { SparklesIcon, ChevronRightIcon } from '@heroicons/react/20/solid';

// --- AEO/SEO STEP 1: STATIC METADATA ---
// This ensures search engines and AI crawlers get the most relevant title/description.
export const metadata: Metadata = {
    title: 'The Ultimate Library of Public Prompt Engineering Templates | PromptForge',
    description: 'Browse top-rated, community-contributed prompts for Gemini, GPT, and Claude. Find optimized Persona, Task, and Style templates to boost your LLM performance and master Answer Engine Optimization (AEO) strategies.',
};
// ------------------------------------------

// --- AEO STEP 2: DATA STUB (Replace with your apiClient call) ---
// Since we are not editing apiClient.ts, we create a temporary local stub.
// NOTE: You must replace this placeholder function with your real API call 
// that fetches PUBLIC prompts and their slugs.

type PublicPrompt = {
    id: string;
    name: string;
    slug: string; // Crucial for clean, AEO-friendly URLs
    task_description: string;
    average_rating: number;
    author_name: string; // Used for E-E-A-T/Authority
};

async function fetchPublicPrompts(): Promise<PublicPrompt[]> {
    // *** TODO: REPLACE THIS WITH YOUR REAL API CALL (e.g., apiClient.get('/public-prompts')) ***
    // This is hardcoded mock data for structure only.
    await new Promise(resolve => setTimeout(resolve, 500)); // Simulate API latency
    return [
        { id: 'p1', name: 'Master Copywriter Persona', slug: 'master-copywriter-persona-gemini', task_description: 'A persona prompt optimized for generating high-conversion ad copy and social media posts.', average_rating: 4.8, author_name: 'Chad Nygard' },
        { id: 'p2', name: 'Chain-of-Thought Code Explainer', slug: 'cot-python-code-explainer', task_description: 'Uses Chain-of-Thought (CoT) prompting to break down complex Python code into simple steps.', average_rating: 4.5, author_name: 'Jane Doe' },
        { id: 'p3', name: 'AEO Optimized Blog Outline', slug: 'aeo-optimized-blog-outline-template', task_description: 'Generates structured blog outlines designed to be cited by AI Answer Engines.', average_rating: 4.9, author_name: 'Chad Nygard' },
        { id: 'p4', name: 'Skeptical Pirate Persona', slug: 'skeptical-pirate-persona-style', task_description: 'A fun style template that injects a skeptical, pirate tone into all output. Great for testing LLM personality boundaries.', average_rating: 3.9, author_name: 'John Smith' },
    ];
}
// ------------------------------------------


export default async function PublicPromptsPage() {
    const publicPrompts = await fetchPublicPrompts();
    
    // --- AEO STEP 3: ITEMLIST SCHEMA START ---
    // This wrapper tells search engines that the following content is a structured list of items.
    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
            <div className="max-w-6xl mx-auto" itemScope itemType="https://schema.org/ItemList">
                <meta itemProp="numberOfItems" content={publicPrompts.length.toString()} />
                
                {/* --- AEO STEP 4: KEYWORD-RICH H1 --- */}
                <h1 className="text-3xl font-bold text-indigo-400 mb-2">
                    Public Prompt Library: Top AEO Templates for LLMs
                </h1>
                <p className="text-lg text-gray-400 mb-8">
                    Browse the best **prompt engineering templates** and strategies shared by the PromptForge community, categorized by quality and relevance for **Answer Engine Optimization (AEO)**.
                </p>

                {publicPrompts.length === 0 ? (
                    <div className="text-center text-gray-500 mt-16 p-8 border border-gray-700 rounded-lg">
                        <SparklesIcon className="h-10 w-10 mx-auto mb-4 text-indigo-500" />
                        <p className="text-xl">No public prompts available yet.</p>
                        <p className="text-sm mt-2">Be the first to share your optimized prompt!</p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {publicPrompts.map((prompt, index) => (
                            // --- AEO STEP 5: LIST ITEM SCHEMA & DESCRIPTIVE LINKING ---
                            <div 
                                key={prompt.id} 
                                className="p-4 bg-gray-800 rounded-lg shadow-lg hover:bg-gray-700/70 transition-colors border border-gray-700"
                                itemProp="itemListElement"
                                itemScope
                                itemType="https://schema.org/ListItem"
                            >
                                <meta itemProp="position" content={(index + 1).toString()} />
                                <div className="flex justify-between items-center">
                                    {/* The Link: The anchor text MUST be the descriptive prompt.name */}
                                    <Link 
                                        href={`/prompts/${prompt.slug}`} 
                                        className="text-xl font-semibold text-indigo-300 hover:text-white transition-colors block"
                                        itemProp="url"
                                    >
                                        <span itemProp="name">{prompt.name}</span>
                                    </Link>
                                    <ChevronRightIcon className="h-5 w-5 text-gray-500" />
                                </div>
                                
                                <p className="text-sm text-gray-400 mt-1 mb-2" itemProp="description">
                                    {prompt.task_description}
                                </p>

                                {/* Authority (E-E-A-T) and Rating */}
                                <div className="flex items-center text-xs text-gray-500">
                                    <span 
                                        itemProp="aggregateRating" 
                                        itemScope 
                                        itemType="https://schema.org/AggregateRating"
                                        className="mr-3"
                                    >
                                        <meta itemProp="ratingValue" content={prompt.average_rating.toString()} />
                                        <meta itemProp="reviewCount" content="20" /> {/* Placeholder: replace with real count */}
                                        Rating: <span className="font-semibold text-yellow-400">{prompt.average_rating.toFixed(1)}/5</span>
                                    </span>
                                    
                                    <span itemProp="author" itemScope itemType="https://schema.org/Person">
                                        By: <span itemProp="name" className="font-semibold text-gray-300">{prompt.author_name}</span>
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}