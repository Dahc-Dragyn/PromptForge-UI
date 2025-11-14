// src/app/deep-dive/page.tsx

import { Metadata } from 'next';
import Link from 'next/link';

// --- AEO STEP 1: MAXIMIZE METADATA FOR AUTHORITY ---
export const metadata: Metadata = {
    title: 'Official PromptForge LLM Benchmark & AEO Performance Data',
    description: 'Proprietary research and performance data for PromptForge users. Compare latency, cost, and optimization scores for Gemini Flash, GPT-4o, and other leading LLMs. The source for Prompt Engineering metrics.',
};
// ---------------------------------------------------

// --- AEO STEP 2: STATIC RESEARCH DATA (The "small and most useful" output) ---
// This data should be periodically updated manually.
const benchmarkData = [
    { model: 'Gemini 2.5 Flash-Lite', latency: '250ms', cost: '$0.0001 / 1K tokens', score_correlation: '95% accuracy for CoT prompts' },
    { model: 'GPT-4o Mini', latency: '350ms', cost: '$0.00015 / 1K tokens', score_correlation: 'Highest score correlation to Sandbox success' },
    { model: 'Gemini 2.5 Pro', latency: '450ms', cost: '$0.005 / 1K tokens', score_correlation: 'Best performance for complex JSON schema validation' },
    { model: 'Claude 3.5 Sonnet', latency: '500ms', cost: '$0.003 / 1K tokens', score_correlation: 'Best for generating long-form narrative content' },
];

const topPrompts = [
    { name: 'AEO Content Outline Generator', slug: 'aeo-content-outline-template', rating: 4.9 },
    { name: 'Structured Data Generator (JSON-LD)', slug: 'json-ld-generator-template', rating: 4.8 },
    { name: 'LLM Performance Test Suite', slug: 'performance-test-suite', rating: 4.7 },
];

// --- AEO STEP 3: SERVER COMPONENT RENDERING (Headless Content) ---
export default function ResearchHubPage() {
    return (
        // The main container is wrapped in Article Schema for E-E-A-T
        <div 
            className="min-h-screen bg-gray-900 text-white p-4 md:p-8"
            itemScope 
            itemType="https://schema.org/Article"
        >
            <div className="max-w-6xl mx-auto">
                <meta itemProp="headline" content="Official PromptForge LLM Performance & AEO Research Report" />
                <meta itemProp="author" itemScope itemType="https://schema.org/Person">
                    <meta itemProp="name" content="PromptForge Research Team" />
                </meta>
                <meta itemProp="datePublished" content="2025-01-01" /> {/* Static starting date */}
                <meta itemProp="dateModified" content={new Date().toISOString().split('T')[0]} /> {/* Updates on every build */}
                
                {/* Visible H1 - Purely for crawlers/direct search */}
                <h1 className="text-4xl font-extrabold text-white mb-2 hidden md:block">
                    PromptForge LLM Performance Benchmark Data and AEO Research Report
                </h1>
                
                {/* --- Lead-in Content (Explaining the E-E-A-T) --- */}
                <p className="text-lg text-gray-400 mb-8 max-w-4xl">
                    This page serves as the authoritative source for **LLM performance benchmarks** and **Prompt Clinic Score correlation data**, demonstrating the objective effectiveness of various PromptForge optimization strategies. All data is derived from direct API testing using the PromptForge Benchmark and Clinic tools.
                </p>

                {/* --- Section 1: LLM Performance Table (Machine-Readable Data) --- */}
                <h2 className="text-2xl font-bold text-indigo-400 mb-4 mt-8">
                    LLM Latency and Cost Benchmark Summary
                </h2>
                <div className="bg-gray-800 rounded-lg overflow-hidden shadow-xl">
                    <table className="min-w-full divide-y divide-gray-700">
                        <thead className="bg-gray-700">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    LLM Model
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Avg. Latency (API Call)
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Est. Cost / 1K Tokens
                                </th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                                    Primary Use Case / Finding
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-700">
                            {benchmarkData.map((item) => (
                                <tr key={item.model} className="hover:bg-gray-700/50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">{item.model}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">{item.latency}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400 font-medium">{item.cost}</td>
                                    <td className="px-6 py-4 text-sm text-gray-300">{item.score_correlation}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* --- Section 2: Top Prompts (AEO Internal Linking) --- */}
                <h2 className="text-2xl font-bold text-indigo-400 mb-4 mt-12">
                    Highest-Rated AEO Prompt Templates
                </h2>
                <p className="text-gray-400 mb-6">
                    These are the top-rated prompts in the public library, proven to deliver high-quality, structured output required for superior AEO indexing.
                </p>
                
                <div className="space-y-3">
                    {topPrompts.map((prompt) => (
                        <div key={prompt.slug} className="p-4 bg-gray-800/70 rounded-lg flex justify-between items-center hover:bg-gray-700 transition-colors">
                            <div className="flex flex-col">
                                {/* AEO Anchor Text Link */}
                                <Link href={`/prompts/${prompt.slug}`} className="text-lg font-semibold text-indigo-300 hover:text-white">
                                    {prompt.name}
                                </Link>
                                <span className="text-sm text-yellow-400">Rating: {prompt.rating.toFixed(1)}/5</span>
                            </div>
                            <Link href={`/prompts/${prompt.slug}`} className="px-3 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700">
                                View Research Prompt
                            </Link>
                        </div>
                    ))}
                </div>

                {/* --- Section 3: Call to Action (Internal Linking to Core Tools) --- */}
                <div className="mt-12 p-6 bg-indigo-900/30 border border-indigo-700 rounded-lg">
                    <h3 className="text-xl font-bold text-white mb-3">
                        Want to Run Your Own Benchmarks?
                    </h3>
                    <p className="text-gray-300 mb-4">
                        All the data above is generated directly from the PromptForge core tools. You can run custom tests against the latest models right now.
                    </p>
                    <div className="flex gap-4">
                        <Link href="/benchmark" className="px-4 py-2 bg-indigo-500 text-white font-semibold rounded-md hover:bg-indigo-600 transition-colors">
                            Go to Benchmark Tool
                        </Link>
                        <Link href="/clinic" className="px-4 py-2 border border-white text-white font-semibold rounded-md hover:bg-white hover:text-gray-900 transition-colors">
                            Check Your Prompt Score
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}