'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { 
  ArrowLeftIcon, 
  MagnifyingGlassIcon,
  ArchiveBoxIcon,
  ArrowUturnLeftIcon,
  TrashIcon
} from '@heroicons/react/24/solid';
import { usePromptTemplates } from '@/hooks/usePromptTemplates';
import { PromptTemplate } from '@/types/template';
import { useAuth } from '@/context/AuthContext';

type TabState = 'active' | 'archived';

export default function AllTemplatesPage() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<TabState>('active');
  const [searchTerm, setSearchTerm] = useState('');
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);

  // Fetch active templates and mutation functions
  const { 
    templates: activeTemplates, 
    isLoading: isLoadingActive,
    deleteTemplate,
    archiveTemplate
  } = usePromptTemplates(false);
  
  // Fetch all templates
  const { 
    templates: allTemplates, 
    isLoading: isLoadingAll 
  } = usePromptTemplates(true);

  // Derive archived templates and counts
  const { archivedTemplates, activeCount, archivedCount } = useMemo(() => {
    const all = allTemplates || [];
    const active = activeTemplates || [];
    
    const activeIdSet = new Set(active.map((t: PromptTemplate) => t.id));
    const archived = all.filter((t: PromptTemplate) => !activeIdSet.has(t.id));
    
    return {
      archivedTemplates: archived,
      activeCount: active.length,
      archivedCount: archived.length,
    };
  }, [activeTemplates, allTemplates]);

  // Determine which list to display
  const templatesToDisplay = useMemo(() => {
    return currentTab === 'active' ? activeTemplates : archivedTemplates;
  }, [currentTab, activeTemplates, archivedTemplates]);

  // Filter the displayed list
  const filteredTemplates = useMemo(() => {
    if (!templatesToDisplay) return [];
    if (!searchTerm) return templatesToDisplay;

    return templatesToDisplay.filter((template: PromptTemplate) =>
      template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (template.description && 
       template.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [templatesToDisplay, searchTerm]);

  const isLoading = isLoadingActive || isLoadingAll;

  // --- Action Handlers ---

  const handleArchiveTemplate = (templateId: string, isArchived: boolean) =>
    archiveTemplate(templateId, isArchived);

  const handleDeleteTemplate = (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      deleteTemplate(templateId);
    }
  };

  const handleCopyTemplate = async (template: PromptTemplate) => {
    setCopiedTemplateId(template.id); 
    const toastId = toast.loading('Copying template content...');
    try {
      await navigator.clipboard.writeText(template.content);
      toast.success('Template copied to clipboard!', { id: toastId });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to copy.';
      toast.error(message, { id: toastId });
    } finally {
      setTimeout(() => setCopiedTemplateId(null), 2000);
    }
  };

  const handleSendTemplateToLlm = async (
    content: string,
    service: 'ChatGPT' | 'Gemini' | 'Grok'
  ) => {
    const LLM_URLS = {
      ChatGPT: 'https://chat.openai.com',
      Gemini: 'https://gemini.google.com/app',
      Grok: 'https://grok.x.ai/',
    };
    const toastId = toast.loading('Copying template...');
    try {
      await navigator.clipboard.writeText(content);
      toast.success('Template copied! Opening new tab...', { id: toastId });
      setTimeout(() => {
        window.open(LLM_URLS[service], '_blank');
      }, 1500);
    } catch (err) {
      toast.error('Failed to copy template content.', { id: toastId });
    }
  };

  // Helper to render the list
  const renderTemplateList = () => {
    if (isLoading) {
      return <div className="text-center text-gray-400 mt-8">Loading templates...</div>;
    }

    if (filteredTemplates.length === 0) {
      return (
        <div className="text-center text-gray-400 mt-8">
          {searchTerm
            ? 'No templates match your search.'
            : `You have no ${currentTab} templates.`}
        </div>
      );
    }

    return (
      <div className="space-y-4 mt-6">
        {filteredTemplates.map((template: PromptTemplate) => (
          <div
            key={template.id}
            className={`p-4 bg-gray-700/50 rounded-lg`}
          >
            <Link
              href={`/templates/${template.id}`}
              className={`font-semibold mb-1 block hover:underline ${
                template.is_archived
                  ? 'text-gray-500 line-through'
                  : 'text-blue-400'
              }`}
            >
              {template.name}
            </Link>
            <p className="text-sm text-gray-400 line-clamp-2 mb-3">
              {template.description}
            </p>
            <div className="flex items-center justify-between pt-3 border-t border-gray-700/50">
              <div className="flex items-center gap-x-2">
                <Link
                  href={`/templates/${template.id}`}
                  className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  View
                </Link>
                <button
                  onClick={() => handleCopyTemplate(template)}
                  className={`px-3 py-1 text-xs text-white rounded transition-colors w-20 ${
                    copiedTemplateId === template.id
                      ? 'bg-green-600'
                      : 'bg-gray-600 hover:bg-gray-500'
                  }`}
                >
                  {copiedTemplateId === template.id
                    ? 'Copied!'
                    : 'Copy'}
                </button>
                <button
                  onClick={() =>
                    handleArchiveTemplate(
                      template.id,
                      !template.is_archived
                    )
                  }
                  className="p-1.5 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700"
                  title={
                    template.is_archived ? 'Unarchive' : 'Archive'
                  }
                >
                  {template.is_archived ? (
                    <ArrowUturnLeftIcon className="h-4 w-4" />
                  ) : (
                    <ArchiveBoxIcon className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={() =>
                    handleDeleteTemplate(template.id)
                  }
                  className="p-1.5 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                  title="Delete"
                >
                  <TrashIcon className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">
                  Send to:
                </span>
                <button
                  onClick={() =>
                    handleSendTemplateToLlm(
                      template.content,
                      'ChatGPT'
                    )
                  }
                  className="px-2 py-1 text-xs bg-[#10a37f] text-white rounded hover:bg-[#0daaa5]"
                >
                  ChatGPT
                </button>
                <button
                  onClick={() =>
                    handleSendTemplateToLlm(
                      template.content,
                      'Gemini'
                    )
                  }
                  className="px-2 py-1 text-xs bg-[#4e85ff] text-white rounded hover:bg-[#588dff]"
                >
                  Gemini
                </button>
                <button
                  onClick={() =>
                    handleSendTemplateToLlm(
                      template.content,
                      'Grok'
                    )
                  }
                  className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-500"
                >
                  Grok
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-8">
      {/* 1. Return to Dashboard Link */}
      <div className="mb-6">
        <Link href="/dashboard" className="inline-flex items-center text-sm font-medium text-gray-400 hover:text-white transition-colors">
          <ArrowLeftIcon className="h-4 w-4 mr-2" />
          Return to Dashboard
        </Link>
      </div>

      <div className="max-w-6xl mx-auto">
        {/* 2. Header */}
        <h1 className="text-3xl font-bold text-white mb-6">Template Library</h1>

        {/* 3. Tab and Search UI */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          {/* Tabs */}
          <div className="flex-shrink-0">
            <nav className="flex space-x-2" aria-label="Tabs">
              <button
                onClick={() => setCurrentTab('active')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  currentTab === 'active'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                Active ({activeCount})
              </button>
              <button
                onClick={() => setCurrentTab('archived')}
                className={`px-4 py-2 text-sm font-medium rounded-md ${
                  currentTab === 'archived'
                    ? 'bg-indigo-600 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                Archived ({archivedCount})
              </button>
            </nav>
          </div>

          {/* Search Bar */}
          <div className="w-full md:max-w-md">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
              </div>
              <input
                type="text"
                name="search"
                id="search"
                className="block w-full bg-gray-800 border border-gray-700 rounded-md py-2 pl-10 pr-3 text-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                placeholder="Search your templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* 4. Filtered List */}
        <div className="bg-gray-800 rounded-lg shadow p-4 md:p-6">
          <h2 className="text-xl font-semibold mb-4 capitalize">{currentTab} Templates</h2>
          {renderTemplateList()}
        </div>
      </div>
    </div>
  );
}