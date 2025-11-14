'use client';

import {
    BookOpenIcon,
    SparklesIcon,
    BeakerIcon,
    CpuChipIcon,
    RectangleGroupIcon,
    ArchiveBoxIcon,
    ClipboardDocumentListIcon,
    ChartPieIcon,
    KeyIcon,
    CircleStackIcon,
} from '@heroicons/react/24/outline';

const GuidePage = () => {
    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">

                {/* --- Article Schema --- */}
                <div itemScope itemType="https://schema.org/Article">
                    <meta
                        itemProp="headline"
                        content="PromptForge Guide – Prompt Engineering Workflows"
                    />
                    <meta itemProp="author" content="PromptForge Team" />
                    <meta itemProp="datePublished" content="2024-10-01" />
                    <meta itemProp="dateModified" content="2025-11-14" />
                </div>

                <h1 className="text-3xl font-bold mb-4">PromptForge Workflow Guide</h1>

                {/* --- Intro Paragraph --- */}
                <p className="text-lg text-gray-300 mb-8">
                    This PromptForge guide walks you step-by-step through the{' '}
                    <strong className="text-white">prompt engineering workflow</strong>,
                    showing you how to compose, optimize, and evaluate prompts in a way
                    that improves{' '}
                    <strong className="text-white">AEO (Answer Engine Optimization)</strong>
                    and overall{' '}
                    <strong className="text-white">LLM prompt performance</strong>.
                </p>

                {/* --- Table of Contents (cleaned) --- */}
                <nav className="mb-10 border-l-4 border-indigo-400 pl-4 text-gray-300">
                    <h3 className="text-xl font-semibold mb-3 text-white">On This Page</h3>
                    <ol className="space-y-2">
                        <li>
                            <a href="#composition" className="hover:text-indigo-300">
                                How to Compose Prompts
                            </a>
                        </li>
                        <li>
                            <a href="#optimization" className="hover:text-indigo-300">
                                How to Optimize Prompts
                            </a>
                        </li>
                        <li>
                            <a href="#evaluation" className="hover:text-indigo-300">
                                How to Evaluate Prompts
                            </a>
                        </li>
                    </ol>
                </nav>

                {/* --- 1. COMPOSITION --- */}
                <h2 id="composition" className="text-2xl font-bold mb-4 text-indigo-300">
                    1. How to Compose Prompts in PromptForge
                </h2>

                <div className="bg-indigo-950/30 border border-indigo-600 rounded-md p-3 mb-6 text-sm">
                    <strong>Quick Answer:</strong> You compose prompts in PromptForge
                    using either an AI-assisted generator or the Manual Composer
                    to stack reusable Persona, Task, and Style templates.
                </div>

                <p className="text-gray-300 mb-6">
                    The Dashboard gives you <strong className="text-white">two ways</strong>{' '}
                    to build a complete prompt:
                </p>

                <div className="space-y-6">
                    {/* --- AI Assisted Creation --- */}
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                            <SparklesIcon className="h-6 w-6" aria-hidden="true" />
                            What is AI-Assisted Template Creation?
                        </h3>

                        <p className="text-gray-300">
                            <strong>What it is:</strong> A tool that uses AI to help you
                            create new, high-quality templates and prompts.
                        </p>

                        <p className="text-sm text-gray-400 mt-2">
                            <strong>How it Works:</strong> Enter a goal and the AI generates
                            a Persona, Task, and Prompt. Save the Persona and Task.
                        </p>

                        <a
                            href="/dashboard"
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium mt-4 inline-block"
                        >
                            Learn more about the AI-Assisted Composer →
                        </a>
                    </div>

                    {/* --- Manual Composer --- */}
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                            <RectangleGroupIcon className="h-6 w-6" aria-hidden="true" />
                            How does Manual Prompt Composition work?
                        </h3>

                        <p className="text-gray-300 mb-4">
                            <strong>What it is:</strong> A step-by-step builder for
                            assembling prompts using reusable components.
                        </p>

                        <div className="text-sm text-gray-400">
                            {/* --- HowTo Schema --- */}
                            <div itemScope itemType="https://schema.org/HowTo">
                                <meta
                                    itemProp="name"
                                    content="How to Compose Prompts Manually in PromptForge"
                                />

                                <div itemProp="step" itemScope itemType="https://schema.org/HowToStep">
                                    <meta itemProp="name" content="Select templates" />
                                    <meta
                                        itemProp="text"
                                        content="Choose your Persona, Task, and Style templates."
                                    />
                                </div>

                                <div itemProp="step" itemScope itemType="https://schema.org/HowToStep">
                                    <meta itemProp="name" content="Add Instructions" />
                                    <meta
                                        itemProp="text"
                                        content="Add additional instructions into the text box."
                                    />
                                </div>

                                <div itemProp="step" itemScope itemType="https://schema.org/HowToStep">
                                    <meta itemProp="name" content="Run & Test" />
                                    <meta
                                        itemProp="text"
                                        content="The system combines all text blocks into one prompt."
                                    />
                                </div>
                            </div>

                            {/* --- Step-by-Step UI --- */}
                            <strong>How to Use it:</strong>
                            <ol className="list-decimal list-outside space-y-2 pl-5 mt-2 text-gray-300">
                                <li>Select Persona, Task, and Style templates.</li>
                                <li>Add any extra instructions.</li>
                                <li>Run & Test your combined prompt.</li>
                            </ol>
                        </div>

                        <a
                            href="/dashboard"
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium mt-4 inline-block"
                        >
                            Explore the Manual Prompt Composer workflow →
                        </a>
                    </div>

                    {/* --- Template Library --- */}
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                            <ArchiveBoxIcon className="h-6 w-6" aria-hidden="true" />
                            What is the Template Library?
                        </h3>

                        <p className="text-gray-300">
                            <strong>What it is:</strong> Your toolbox for reusable templates.
                        </p>

                        <p className="text-sm text-gray-400 mt-2">
                            Store Personas, Tasks, and Styles so you don’t need to rebuild them.
                        </p>

                        <a
                            href="/dashboard#template-library"
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium mt-4 inline-block"
                        >
                            Manage your reusable prompt templates →
                        </a>
                    </div>
                </div>

                {/* --- 2. OPTIMIZATION --- */}
                <h2 id="optimization" className="text-2xl font-bold mb-4 mt-12 text-indigo-300">
                    2. How to Optimize Your Prompts
                </h2>

                <div className="bg-indigo-950/30 border border-indigo-600 rounded-md p-3 mb-6 text-sm">
                    <strong>Quick Answer:</strong> Optimize prompts using the{' '}
                    <strong>Prompt Clinic</strong>, which scores your prompt and suggests improvements.
                </div>

                <p className="text-gray-300 mb-6">
                    These tools help refine clarity, structure, and effectiveness.
                </p>

                <div className="space-y-6">
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                            <ChartPieIcon className="h-6 w-6" aria-hidden="true" />
                            What does the Prompt Clinic evaluate?
                        </h3>

                        <p className="text-gray-300 mb-4">
                            <strong>What it is:</strong> A diagnostic tool for analyzing prompts.
                        </p>

                        <div className="text-sm text-gray-400">
                            <strong>How it Works:</strong>
                            <ul className="list-disc list-outside space-y-2 pl-5 mt-2 text-gray-300">
                                <li><strong>Clarity:</strong> Is the prompt easily understood?</li>
                                <li><strong>Specificity:</strong> Is the goal well-defined?</li>
                                <li><strong>Constraints:</strong> Are rules and limits explicit?</li>
                            </ul>

                            <p className="text-gray-300 mt-3 font-semibold">Auto-Optimize:</p>
                            <p className="text-gray-300 mt-1">
                                The Clinic generates a cleaner, stronger version of your prompt.
                            </p>
                        </div>

                        <a
                            href="/clinic"
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium mt-4 inline-block"
                        >
                            View full Prompt Clinic examples →
                        </a>
                    </div>
                </div>

                {/* --- 3. EVALUATION --- */}
                <h2 id="evaluation" className="text-2xl font-bold mb-4 mt-12 text-indigo-300">
                    3. How to Evaluate Your Prompts
                </h2>

                <div className="bg-indigo-950/30 border border-indigo-600 rounded-md p-3 mb-6 text-sm">
                    <strong>Quick Answer:</strong> Evaluate prompts using A/B testing in the{' '}
                    <strong>Sandbox</strong> or by comparing outputs across LLMs with{' '}
                    <strong>Benchmark</strong>.
                </div>

                <p className="text-gray-300 mb-6">
                    Testing removes guesswork and validates prompt quality.
                </p>

                <div className="space-y-6">
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                            <BeakerIcon className="h-6 w-6" aria-hidden="true" />
                            How does A/B testing work in the Sandbox?
                        </h3>

                        <p className="text-gray-300">
                            <strong>Use this to answer:</strong> “Is my new prompt better?”
                        </p>

                        <p className="text-sm text-gray-400 mt-2">
                            Compare two prompts with identical inputs and evaluate which performs better.
                        </p>

                        <a
                            href="/sandbox"
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium mt-4 inline-block"
                        >
                            Try Sandbox A/B testing →
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GuidePage;
