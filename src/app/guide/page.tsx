'use client';

import {
    BookOpenIcon, // Workflow Guide
    SparklesIcon, // Auto-Optimize / Automatic Composer
    BeakerIcon, // Sandbox
    CpuChipIcon, // Benchmark
    RectangleGroupIcon, // Manual Composer
    ArchiveBoxIcon, // Template Library
    ClipboardDocumentListIcon, // AI Template Search
    ChartPieIcon, // Prompt Clinic (Matches Navbar)
    KeyIcon, // API Key Management
    CircleStackIcon, // Visual Agent Optimizer
} from '@heroicons/react/24/outline';

const GuidePage = () => {
    return (
        <div className="min-h-screen bg-gray-900 text-white p-4 sm:p-8">
            <div className="max-w-4xl mx-auto">
                <h1 className="text-3xl font-bold mb-4">
                    PromptForge Workflow Guide
                </h1>
                <p className="text-lg text-gray-300 mb-8">
                    Prompt engineering is a process. This guide shows how to use
                    PromptForge to master the three phases of that process:
                    <strong className="text-white"> Composition</strong>,
                    <strong className="text-white"> Optimization</strong>, and
                    <strong className="text-white"> Evaluation</strong>.
                </p>

                {/* --- 1. COMPOSITION --- */}
                <h2 className="text-2xl font-bold mb-4 text-indigo-300">
                    1. Composition: Building Your Prompt
                </h2>
                <p className="text-gray-300 mb-6">
                    The Dashboard gives you <strong className="text-white">two ways</strong> to build a complete prompt:
                </p>

                <div className="space-y-6">
                    {/* --- 1. AI-Assisted Template Creation (The "Easy Mode") --- */}
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                            {/* SparklesIcon for AI/Automatic functionality */}
                            <SparklesIcon className="h-6 w-6" />
                            AI-Assisted Template Creation (The "Easy Mode")
                        </h3>
                        <p className="text-gray-300">
                            <strong>What it is:</strong> This tool uses AI to
                            help you create new, high-quality templates *for* your
                            library. You just give it a simple goal.
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                            <strong>How it Works:</strong> You type a simple
                            description (e.g., "A persona for a skeptical
                            pirate") and add tags. The AI will then{' '}
                            <strong>generate and save</strong> a new, detailed
                            template for you, which you can immediately use in
                            the Manual Composer.
                        </p>
                        <a
                            href="/dashboard" // Assumes AI Composer is also on the dashboard
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium mt-4 inline-block"
                        >
                            Go to the Composer &rarr;
                        </a>
                    </div>
                    
                    {/* --- 2. Prompt Composer (Manual - The "Pro Mode") - Original item 3, now item 2 --- */}
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                            {/* RectangleGroupIcon for manual, structured composition */}
                            <RectangleGroupIcon className="h-6 w-6" />
                            Prompt Composer (Manual - The "Pro Mode")
                        </h3>
                        <p className="text-gray-300 mb-4">
                            <strong>What it is:</strong> This tool gives you
                            full, step-by-step control. You build a prompt by
                            "stacking" your saved templates and adding custom
                            instructions.
                        </p>
                        <div className="text-sm text-gray-400">
                            <strong>How to Use it (Step-by-Step):</strong>
                            <ol className="list-decimal list-outside space-y-2 pl-5 mt-2 text-gray-300">
                                <li>
                                    <strong>Select Templates:</strong> Use the
                                    dropdowns to select your saved{' '}
                                    <strong>`Persona`</strong>,{' '}
                                    <strong>`Task`</strong>, and{' '}
                                    <strong>`Style`</strong> templates.
                                </li>
                                <li>
                                    <strong>Add Instructions:</strong> Type any
                                    extra details, input text, or specific rules
                                    into the "Additional Instructions" text box.
                                </li>
                                <li>
                                    <strong>Run & Test:</strong> The tool combines
                                    all these text blocks into one large prompt
                                    and sends it to the AI for you to see the
                                    result.
                                </li>
                            </ol>
                        </div>
                        <a
                            href="/dashboard" // Assumes Manual Composer is on the main dashboard
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium mt-4 inline-block"
                        >
                            Go to the Composer &rarr;
                        </a>
                    </div>
                    
                    {/* --- Added transitional text here to follow the manual composer --- */}
                    <p className="text-gray-300 mb-6">
                        A great prompt is built from clear elements. These tools help you compose them.
                    </p>

                    {/* --- 3. Template Library: Your Reusable Prompt Pieces - Original item 1, now item 3 --- */}
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                            {/* ArchiveBoxIcon for storing pieces (Templates) */}
                            <ArchiveBoxIcon className="h-6 w-6" />
                            Template Library: Your Reusable Prompt Pieces
                        </h3>
                        <p className="text-gray-300">
                            <strong>What it is:</strong> This is your personal
                            toolbox for prompt "pieces." Instead of re-typing the
                            same persona, task, or style rules every time, you
                            save them here.
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                            <strong>How it Works:</strong> When you create a
                            template, you save a block of text and give it a
                            type: <strong>`Persona`</strong> (e.g., "You are a
                            senior copywriter"), <strong>`Task`</strong> (e.g.,
                            "Write a blog post intro"), or{' '}
                            <strong>`Style`</strong> (e.g., "Format the output as
                            a JSON object"). These are the building blocks for
                            the Manual Composer.
                        </p>
                        <a
                            href="/dashboard#template-library"
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium mt-4 inline-block"
                        >
                            Go to your Templates &rarr;
                        </a>
                    </div>
                </div>

                {/* --- 2. OPTIMIZATION --- */}
                <h2 className="text-2xl font-bold mb-4 mt-12 text-indigo-300">
                    2. Optimization: Improving Your Prompt
                </h2>
                <p className="text-gray-300 mb-6">
                    A good first draft is rarely perfect. These tools automate
                    expert "best practices" to make your prompt more robust.
                </p>

                <div className="space-y-6">
                    {/* --- FIX: Merged "Auto-Optimize" into "Diagnose" --- */}
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                            {/* CHANGED: Using ChartPieIcon to match Navbar's Prompt Clinic icon */}
                            <ChartPieIcon className="h-6 w-6" />
                            Prompt Clinic (Diagnose & Auto-Optimize)
                        </h3>
                        <p className="text-gray-300 mb-4">
                            <strong>What it is:</strong> Think of this as a
                            "spell-check" for your prompt's quality. It reads
                            your prompt, gives you a score, and provides an
                            AI-generated improvement.
                        </p>
                        <div className="text-sm text-gray-400">
                            <strong>How it Works:</strong> It grades your prompt
                            on a few key areas:
                            <ul className="list-disc list-outside space-y-2 pl-5 mt-2 text-gray-300">
                                <li>
                                    <strong>Clarity:</strong> Is your request
                                    easy to understand, or is it vague?
                                </li>
                                <li>
                                    <strong>Specificity:</strong> Did you give
                                    enough detail? (e.g., "Write 3 paragraphs"
                                    is better than "Write about this.")
                                </li>
                                <li>
                                    <strong>Constraints:</strong> Did you set
                                    clear rules? (e.g., "Do not use technical
                                    jargon.")
                                </li>
                            </ul>
                            <p className="text-gray-300 mt-3 font-semibold">
                                The "Auto-Optimize" Feature:
                            </p>
                            <p className="text-gray-300 mt-1">
                                The clinic doesn't just give you a report. It
                                also provides a <strong>"Suggested
                                Improvement"</strong>—an "easy button" rewrite
                                of your prompt. You can then save this new
                                version or send it directly to the Sandbox to
                                A/B test it against your original.
                            </p>
                        </div>
                        <a
                            href="/clinic"
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium mt-4 inline-block"
                        >
                            Go to the Prompt Clinic &rarr;
                        </a>
                    </div>
                </div>

                {/* --- 3. EVALUATION --- */}
                <h2 className="text-2xl font-bold mb-4 mt-12 text-indigo-300">
                    3. Evaluation: Proving It Works
                </h2>
                <p className="text-gray-300 mb-6">
                    Don't guess. Test your prompts to prove they are accurate,
                    robust, and efficient.
                </p>

                <div className="space-y-6">
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                            {/* BeakerIcon for Sandbox (A/B Testing) */}
                            <BeakerIcon className="h-6 w-6" />
                            Sandbox (A/B Testing)
                        </h3>
                        <p className="text-gray-300">
                            <strong>Use this to answer:</strong> "Is my new
                            prompt <em>really</em> better than my old one?"
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                            <strong>How it Works:</strong> It lets you load two
                            (or more) prompts side-by-side with the{' '}
                            <em>same</em> input. You can directly compare the
                            AI's answers to see which prompt performed better.
                        </p>
                        <a
                            href="/sandbox"
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium mt-4 inline-block"
                        >
                            Go to the Sandbox &rarr;
                        </a>
                    </div>

                    {/* --- FIX: Removed "cost-effective" and "cheapest" --- */}
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                            {/* CpuChipIcon for Benchmark (Model Testing) */}
                            <CpuChipIcon className="h-6 w-6" />
                            Benchmark (Model Testing)
                        </h3>
                        <p className="text-gray-300">
                            <strong>Use this to answer:</strong> "Which model is
                            the most <strong>performant</strong> for my prompt?"
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                            <strong>How it Works:</strong> You write{' '}
                            <em>one</em> prompt and run it against multiple
                            different models (like Gemini, GPT-4o Mini, etc.)
                            all at the same time. This is the perfect way to
                            find the <strong>fastest</strong> model that gives
                            you the high-quality result you need by comparing
                            their latency and output.
                        </p>
                        <a
                            href="/benchmark"
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium mt-4 inline-block"
                        >
                            Go to Benchmark &rarr;
                        </a>
                    </div>
                </div>

                {/* --- 4. FUTURE FEATURES --- */}
                <h2 className="text-2xl font-bold mb-4 mt-12 text-indigo-300">
                    Future Features (Coming Soon)
                </h2>
                <p className="text-gray-300 mb-6">
                    We are actively working on expanding our toolkit to support
                    the full agentic workflow.
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                            {/* ClipboardDocumentListIcon for search/list function */}
                            <ClipboardDocumentListIcon className="h-6 w-6" />
                            AI Template Search
                            <span className="bg-yellow-600 text-yellow-50 text-xs font-bold px-2 py-0.5 rounded-full">
                                SOON
                            </span>
                        </h3>
                        <p className="text-gray-400">
                            An AI-powered search to help you find the perfect
                            `Context` or `Persona` template for your task.
                        </p>
                    </div>

                    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700">
                        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                            {/* KeyIcon for API Key Management */}
                            <KeyIcon className="h-6 w-6" />
                            User API Key Management
                            <span className="bg-yellow-600 text-yellow-50 text-xs font-bold px-2 py-0.5 rounded-full">
                                SOON
                            </span>
                        </h3>
                        <p className="text-gray-400">
                            A secure vault for you to run tests and executions
                            using your own personal API keys.
                        </p>
                    </div>

                    <div className="bg-gray-800/50 p-6 rounded-lg border border-gray-700 md:col-span-2">
                        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                            {/* CircleStackIcon for complex, visual optimization */}
                            <CircleStackIcon className="h-6 w-6" />
                            Visual Agent Optimizer
                            <span className="bg-yellow-600 text-yellow-50 text-xs font-bold px-2 py-0.5 rounded-full">
                                SOON
                            </span>
                        </h3>
                        <p className="text-gray-400">
                            The ultimate power-user tool. A graph-based UI to
                            build, debug, and optimize multi-step AI agents.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default GuidePage;