'use client';

import Link from 'next/link';
import {
    BookOpenIcon,
    SparklesIcon,
    BeakerIcon,
    CpuChipIcon,
    RectangleGroupIcon,
    ArchiveBoxIcon,
    ClipboardDocumentListIcon,
    VariableIcon,
    WrenchScrewdriverIcon,
    CheckBadgeIcon,
    KeyIcon,
    CircleStackIcon,
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
                    A great prompt is built from clear elements. These tools
                    help you compose them.
                </p>

                <div className="space-y-6">
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                            <ArchiveBoxIcon className="h-6 w-6" />
                            Template Library
                        </h3>
                        <p className="text-gray-300">
                            This is your library of reusable prompt components.
                            Instead of re-typing your persona or rules every
                            time, save it here.
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                            <strong>How it maps:</strong> Use templates to define
                            reusable{' '}
                            <strong>`Context`</strong>,{' '}
                            <strong>`Persona`</strong>, or{' '}
                            <strong>`Style/Tone`</strong>.
                        </p>
                        {/* --- V-- FIX 1: Link now points to the dashboard anchor --V --- */}
                        <Link
                            href="/dashboard#template-library"
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium mt-4 inline-block"
                        >
                            Go to your Templates &rarr;
                        </Link>
                        {/* --- ^-- END OF FIX --^ --- */}
                    </div>

                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                            <RectangleGroupIcon className="h-6 w-6" />
                            Prompt Composer
                        </h3>
                        <p className="text-gray-300">
                            Found on the Dashboard, this tool lets you mix
                            templates, instructions, and variables to build a
                            complete prompt.
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                            <strong>How it maps:</strong> This is where you combine
                            your <strong>`Context`</strong> (from a template)
                            with your <strong>`Task/Instruction`</strong> and
                            test <strong>`Input`</strong> variables.
                        </p>
                        <Link
                            href="/dashboard#prompt-composer"
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium mt-4 inline-block"
                        >
                            Go to the Composer &rarr;
                        </Link>
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
                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                            <WrenchScrewdriverIcon className="h-6 w-6" />
                            Prompt Clinic: Diagnose & Refine
                        </h3>
                        <p className="text-gray-300">
                            This tool acts like a "linter" for your prompt,
                            checking it against known best practices.
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                            <strong>How it maps:</strong> Enforces the "Be
                            Explicit and Detailed" principle by scoring your
                            prompt on <strong>Clarity</strong>,{' '}
                            <strong>Specificity</strong>, and{' '}
                            <strong>Constraints</strong>.
                        </p>
                        <Link
                            href="/analyze"
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium mt-4 inline-block"
                        >
                            Go to the Prompt Clinic &rarr;
                        </Link>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                            <SparklesIcon className="h-6 w-6" />
                            Prompt Clinic: Auto-Optimize (APE)
                        </h3>
                        <p className="text-gray-300">
                            This is your automated prompt engineer. It uses an
                            LLM to rewrite your simple idea into a
                            high-performance prompt.
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                            <strong>How it maps:</strong> Automates "Provide
                            Examples (Few-Shot)" and "Specify Output Format" by
                            generating them for you.
                        </p>
                        {/* --- V-- FIX 2: Link now passes query param to select the tab --V --- */}
                        <Link
                            href="/analyze?tool=optimize"
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium mt-4 inline-block"
                        >
                            Go to the Prompt Clinic &rarr;
                        </Link>
                        {/* --- ^-- END OF FIX --^ --- */}
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
                            <BeakerIcon className="h-6 w-6" />
                            Sandbox
                        </h3>
                        <p className="text-gray-300">
                            A side-by-side A/B testing tool. Compare two or more
                            prompt variations against the same model and input.
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                            <strong>How it maps:</strong> Allows you to test for
                            **Accuracy**. Is your new prompt *better* than your
                            old one?
                        </p>
                        <Link
                            href="/sandbox"
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium mt-4 inline-block"
                        >
                            Go to the Sandbox &rarr;
                        </Link>
                    </div>

                    <div className="bg-gray-800 p-6 rounded-lg">
                        <h3 className="text-xl font-semibold mb-2 flex items-center gap-2">
                            <CpuChipIcon className="h-6 w-6" />
                            Benchmark
                        </h3>
                        <p className="text-gray-300">
                            Test one prompt against multiple LLM models at the
                            same time.
                        </p>
                        <p className="text-sm text-gray-400 mt-2">
                            <strong>How it maps:</strong> Allows you to test for
                            **Robustness**. Does your prompt work well on both
                            Gemini and GPT, or is it overfitted to one?
                        </p>
                        <Link
                            href="/benchmark"
                            className="text-blue-400 hover:text-blue-300 text-sm font-medium mt-4 inline-block"
                        >
                            Go to Benchmark &rarr;
                        </Link>
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