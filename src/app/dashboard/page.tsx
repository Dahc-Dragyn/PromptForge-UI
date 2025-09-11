// src/app/dashboard/page.tsx
'use client';

import { useEffect, useState, Suspense, useMemo } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { usePromptTemplates } from '@/hooks/usePromptTemplates';
import { usePrompts } from '@/hooks/usePrompts';
import Link from 'next/link';
import Modal from '@/components/Modal';
import EditTemplateForm from '@/components/EditTemplateForm';
import PromptComposer from '@/components/PromptComposer';
import TemplateForm from '@/components/TemplateForm';
import { usePromptMetrics } from '@/hooks/usePromptMetrics';
import TopPromptsWidget, { HydratedTopPrompt } from '@/components/TopPromptsWidget';
import InteractiveRating from '@/components/InteractiveRating';
import { useRecentActivity } from '@/hooks/useRecentActivity';
import RecentActivityWidget from '@/components/RecentActivityWidget';
import { doc, updateDoc, addDoc, collection, serverTimestamp, query, where, orderBy, limit, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { ArchiveBoxIcon, ArrowUturnLeftIcon, PlayIcon } from '@heroicons/react/24/solid';
import SendToLlm from '@/components/SendToLlm';
import toast from 'react-hot-toast';
import QuickExecuteModal from '@/components/QuickExecuteModal';

const TemplateTypeBadge = ({ tags, templateId }: { tags: string[], templateId: string }) => {
  if (tags?.includes('persona')) {
    return <span key={`${templateId}-persona-badge`} className="ml-2 px-2 py-0.5 text-xs font-semibold bg-blue-500 text-white rounded-full">Persona</span>;
  }
  if (tags?.includes('task')) {
    return <span key={`${templateId}-task-badge`} className="ml-2 px-2 py-0.5 text-xs font-semibold bg-green-500 text-white rounded-full">Task</span>;
  }
  return null;
};

const DashboardContent = () => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [showArchived, setShowArchived] = useState(false);
  const [templateSort, setTemplateSort] = useState('newest');
  const [templateFilterTag, setTemplateFilterTag] = useState('all');
  const [promptSort, setPromptSort] = useState('newest');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<any | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // --- FIX: Use a more specific state to track which action is active ---
  const [activeAction, setActiveAction] = useState<{ type: string; id: string | null }>({ type: '', id: null });
  
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);
  
  const { templates, loading: templatesLoading } = usePromptTemplates(showArchived);
  const { prompts, loading: promptsLoading, error: promptsError } = usePrompts(showArchived);
  const { recentVersions, loading: activityLoading, error: activityError } = useRecentActivity();
  const { topPrompts: allPromptMetrics, loading: metricsLoading, error: metricsError } = usePromptMetrics();
  
  const initialPrompt = searchParams.get('prompt') || '';
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);

  const [isExecuteModalOpen, setIsExecuteModalOpen] = useState(false);
  const [promptForExecution, setPromptForExecution] = useState('');
  const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);
  const [promptToSave, setPromptToSave] = useState('');
  const [newPromptName, setNewPromptName] = useState('');
  const [newPromptDescription, setNewPromptDescription] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingDetails, setIsGeneratingDetails] = useState(false);


  const handleTemplateArchiveToggle = async (id: string, currentStatus: boolean) => {
    const templateRef = doc(db, 'prompt_templates', id);
    try {
      await updateDoc(templateRef, { isArchived: !currentStatus });
    } catch (err) {
      console.error("Failed to update template archive status:", err);
    }
  };

  const handlePromptArchiveToggle = async (id: string, currentStatus: boolean) => {
    const promptRef = doc(db, 'prompts', id);
    try {
        await updateDoc(promptRef, { isArchived: !currentStatus });
    } catch (err) {
        console.error("Failed to update prompt archive status:", err);
    }
  };
  
  const uniqueTemplateTags = useMemo(() => {
    const allTags = templates.flatMap(t => t.tags || []);
    return ['all', ...Array.from(new Set(allTags))];
  }, [templates]);

  const sortedAndFilteredTemplates = useMemo(() => {
    let processedTemplates = [...templates];
    if (templateFilterTag !== 'all') {
      processedTemplates = processedTemplates.filter(t => t.tags?.includes(templateFilterTag));
    }
    processedTemplates.sort((a, b) => {
      const timeA = a.created_at?.seconds || 0;
      const timeB = b.created_at?.seconds || 0;
      switch (templateSort) {
        case 'a-z': return a.name.localeCompare(b.name);
        case 'z-a': return b.name.localeCompare(a.name);
        case 'oldest': return timeA - timeB;
        default: return timeB - timeA;
      }
    });
    return processedTemplates;
  }, [templates, templateSort, templateFilterTag]);

  const sortedPrompts = useMemo(() => {
    const processedPrompts = [...prompts];
    processedPrompts.sort((a, b) => {
      const timeA = a.created_at?.seconds ? a.created_at.seconds * 1000 : new Date(a.created_at).getTime();
      const timeB = b.created_at?.seconds ? b.created_at.seconds * 1000 : new Date(b.created_at).getTime();
      switch (promptSort) {
        case 'a-z': return a.name.localeCompare(b.name);
        case 'z-a': return b.name.localeCompare(a.name);
        case 'oldest': return timeA - timeB;
        default: return timeB - timeA;
      }
    });
    return processedPrompts;
  }, [prompts, promptSort]);
  
  const promptRatings = useMemo(() => {
    if (!allPromptMetrics) return {};
    const ratings: { [key: string]: { averageRating: number; ratingCount: number } } = {};
    allPromptMetrics.forEach(metric => {
      ratings[metric.promptId] = { averageRating: metric.averageRating, ratingCount: metric.ratingCount };
    });
    return ratings;
  }, [allPromptMetrics]);
  
  const hydratedTopPrompts: HydratedTopPrompt[] = useMemo(() => {
    if (!allPromptMetrics || !prompts) return [];
    return allPromptMetrics.map(metric => {
      const promptDetails = prompts.find(p => p.id === metric.promptId);
      return { id: metric.promptId, name: promptDetails?.name || 'Unknown Prompt', averageRating: metric.averageRating, ratingCount: metric.ratingCount };
    }).filter(p => p.name !== 'Unknown Prompt');
  }, [allPromptMetrics, prompts]);

  const finalRecentVersions = useMemo(() => {
    if (!recentVersions || !prompts) return [];
    
    const promptNameMap = new Map(prompts.map(p => [p.id, p.name]));
    const availablePromptIds = new Set(prompts.map(p => p.id));
    const processedPromptIds = new Set();
    const finalVersions = [];

    for (const version of recentVersions) {
      if (finalVersions.length >= 5) break;
      if (availablePromptIds.has(version.promptId) && !processedPromptIds.has(version.promptId)) {
        finalVersions.push({
          ...version,
          promptName: promptNameMap.get(version.promptId) || "Processing...",
        });
        processedPromptIds.add(version.promptId);
      }
    }
    return finalVersions;
  }, [recentVersions, prompts]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);

  const handlePromptRating = async (promptId: string, newRating: number) => {
    if (!user) { return; }
    setIsRatingSubmitting(true);
    try {
      const versionsUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts/${promptId}/versions`;
      const response = await fetch(versionsUrl, { headers: { 'ngrok-skip-browser-warning': 'true' } });
      if (!response.ok) throw new Error('Failed to fetch prompt versions.');
      const versions = await response.json();
      const latestVersion = versions.length > 0 ? versions.sort((a: any, b: any) => b.version - a.version)[0] : { version: 0, prompt_text: 'N/A' };
      const newMetric = { source: 'dashboard_rating', promptId: promptId, promptVersion: latestVersion.version ?? 0, promptText: latestVersion.prompt_text, rating: newRating, createdAt: serverTimestamp(), userId: user.uid };
      await addDoc(collection(db, 'prompt_metrics'), newMetric);
    } catch (err) { console.error("Rating submission failed:", err); } 
    finally { setIsRatingSubmitting(false); }
  };

  const handleRemoveRating = async (promptId: string) => {
    if (!user) return;
    setIsRatingSubmitting(true);
    try {
      const q = query(collection(db, 'prompt_metrics'), where('userId', '==', user.uid), where('promptId', '==', promptId), orderBy('createdAt', 'desc'), limit(1));
      const querySnapshot = await getDocs(q);
      if (!querySnapshot.empty) {
        const docToDelete = querySnapshot.docs[0];
        await deleteDoc(docToDelete.ref);
      } else { console.log("No previous rating found for this user to remove."); }
    } catch (err) { console.error("Failed to remove rating:", err); } 
    finally { setIsRatingSubmitting(false); }
  };

  const handleOpenEditModal = (template: any) => { setCurrentTemplate(template); setIsEditModalOpen(true); };
  const handleCloseEditModal = () => { setIsEditModalOpen(false); setCurrentTemplate(null); };

  const handleCopyTemplate = (content: string, templateId: string) => {
    navigator.clipboard.writeText(content).then(() => {
      toast.success('Template content copied to clipboard!');
      setCopiedTemplateId(templateId);
      setTimeout(() => setCopiedTemplateId(null), 2000);
    });
  };

  const handleCopyPrompt = async (promptId: string) => {
    setActiveAction({ type: 'copy', id: promptId });
    try {
      const versionsUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts/${promptId}/versions`;
      const response = await fetch(versionsUrl, { headers: { 'ngrok-skip-browser-warning': 'true' } });
      if (!response.ok) throw new Error('Failed to fetch prompt versions.');
      const versions = await response.json();
      if (versions.length > 0) {
        const latestVersion = versions.sort((a: any, b: any) => b.version - a.version)[0];
        await navigator.clipboard.writeText(latestVersion.prompt_text);
        toast.success('Latest prompt version copied to clipboard!');
        setCopiedPromptId(promptId);
        setTimeout(() => setCopiedPromptId(null), 2000);
      }
    } catch (err) { 
        toast.error('Error copying prompt.');
        console.error(err); 
    } 
    finally { setActiveAction({ type: '', id: null }); }
  };

  const handleDeletePrompt = async (promptId: string) => {
    if (window.confirm('Are you sure you want to delete this prompt and all its versions?')) {
      setActiveAction({ type: 'delete', id: promptId });
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts/${promptId}`, { method: 'DELETE', headers: { 'ngrok-skip-browser-warning': 'true' }});
        if (!response.ok) throw new Error('Failed to delete prompt.');
        toast.success('Prompt deleted.');
      } catch (err: any) { 
          toast.error(err.message || 'Error deleting prompt.');
          console.error(err); 
      } 
      finally { setActiveAction({ type: '', id: null }); }
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      setActiveAction({ type: 'delete', id: templateId });
      try {
        await deleteDoc(doc(db, 'prompt_templates', templateId));
        toast.success('Template deleted.');
      } catch (err) { 
          toast.error('Error deleting template.');
          console.error(err); 
      } 
      finally { setActiveAction({ type: '', id: null }); }
    }
  };

  const handleQuickExecute = async (promptId: string) => {
    setActiveAction({ type: 'execute', id: promptId });
    try {
      const versionsUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts/${promptId}/versions`;
      const response = await fetch(versionsUrl, { headers: { 'ngrok-skip-browser-warning': 'true' } });
      if (!response.ok) throw new Error('Failed to fetch prompt to execute.');
      const versions = await response.json();
      if (versions.length > 0) {
        const latestVersion = versions.sort((a: any, b: any) => b.version - a.version)[0];
        setPromptForExecution(latestVersion.prompt_text);
        setIsExecuteModalOpen(true);
      } else {
        toast.error('This prompt has no versions to execute.');
      }
    } catch (err: any) {
      toast.error(err.message || 'An error occurred.');
      console.error(err);
    } finally {
      setActiveAction({ type: '', id: null });
    }
  };
  
  const handleOpenSaveModal = async (promptContent: string) => {
    setPromptToSave(promptContent);
    setIsSaveModalOpen(true);
    setIsExecuteModalOpen(false);
    setNewPromptName('');
    setNewPromptDescription('');
    setIsGeneratingDetails(true);
    try {
        const nameMetaPrompt = `Based on the following prompt, generate a short, descriptive, 3-5 word title. Do not use quotes. The prompt is: "${promptContent}"`;
        const descMetaPrompt = `Based on the following prompt, generate a one-sentence description of the task it performs. The prompt is: "${promptContent}"`;
        const [nameRes, descRes] = await Promise.all([
            fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts/execute`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }, body: JSON.stringify({ prompt_text: nameMetaPrompt }) }),
            fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts/execute`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'ngrok-skip-browser-warning': 'true' }, body: JSON.stringify({ prompt_text: descMetaPrompt }) })
        ]);
        if (!nameRes.ok || !descRes.ok) throw new Error('Failed to generate prompt details.');
        const nameData = await nameRes.json();
        const descData = await descRes.json();
        setNewPromptName(nameData.generated_text.trim().replace(/"/g, ''));
        setNewPromptDescription(descData.generated_text.trim());
    } catch (err) {
        console.error("Failed to generate details:", err);
    } finally {
        setIsGeneratingDetails(false);
    }
  };
  
  const handleSavePrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
        const docRef = await addDoc(collection(db, 'prompts'), {
            name: newPromptName,
            task_description: newPromptDescription,
            userId: user.uid,
            isArchived: false,
            created_at: serverTimestamp(),
        });
        const versionsUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts/${docRef.id}/versions`;
        await fetch(versionsUrl, {
            method: 'POST',
            headers: { 'ngrok-skip-browser-warning': 'true', 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt_text: promptToSave,
                commit_message: "Initial version from Quick Execute.",
            }),
        });
        toast.success(`Prompt "${newPromptName}" saved successfully!`);
        setIsSaveModalOpen(false);
    } catch (err: any) {
        toast.error(`Save failed: ${err.message}`);
    } finally {
        setIsSaving(false);
    }
  };

  if (authLoading || templatesLoading || promptsLoading) {
    return <div className="text-center p-8">Loading Dashboard...</div>;
  }

  return (
    <>
      <div className="p-4 sm:p-8 bg-gray-900 min-h-screen text-white">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <div className="flex items-center space-x-2">
            <input 
              type="checkbox" 
              id="show-archived"
              checked={showArchived}
              onChange={(e) => setShowArchived(e.target.checked)}
              className="h-4 w-4 rounded border-gray-600 bg-gray-700 text-blue-500 focus:ring-blue-500"
            />
            <label htmlFor="show-archived" className="text-sm text-gray-300">Show Archived</label>
          </div>
        </div>
        <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 text-indigo-300">Prompt Hub</h2>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <TopPromptsWidget 
                    topPrompts={hydratedTopPrompts}
                    loading={metricsLoading || promptsLoading}
                    error={metricsError || promptsError}
                    handleCopyPrompt={handleCopyPrompt}
                    handleDeletePrompt={handleDeletePrompt}
                />
                <div className="lg:col-span-2">
                    <RecentActivityWidget 
                        recentVersions={finalRecentVersions}
                        loading={activityLoading || promptsLoading}
                        error={activityError || promptsError}
                        handleDeletePrompt={handleDeletePrompt} 
                    />
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-8">
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Template Library</h2>
              <button onClick={() => setIsCreateModalOpen(true)} className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">+ New</button>
            </div>
            <div className="flex gap-4 mb-4">
                <div className="flex-1">
                    <label htmlFor="template-sort" className="block text-xs font-medium text-gray-400 mb-1">Sort by</label>
                    <select id="template-sort" value={templateSort} onChange={e => setTemplateSort(e.target.value)} className="w-full border rounded p-2 text-sm text-black bg-gray-200">
                        <option value="newest">Newest</option>
                        <option value="oldest">Oldest</option>
                        <option value="a-z">Name (A-Z)</option>
                        <option value="z-a">Name (Z-A)</option>
                    </select>
                </div>
                <div className="flex-1">
                    <label htmlFor="template-filter" className="block text-xs font-medium text-gray-400 mb-1">Filter by Tag</label>
                    <select id="template-filter" value={templateFilterTag} onChange={e => setTemplateFilterTag(e.target.value)} className="w-full border rounded p-2 text-sm text-black bg-gray-200 capitalize">
                        {uniqueTemplateTags.map(tag => <option key={tag} value={tag}>{tag}</option>)}
                    </select>
                </div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg flex-grow overflow-y-auto h-[65vh]">
              <div className="space-y-4">
                {sortedAndFilteredTemplates.map((template: any) => (
                  <div key={template.id} className={`p-3 rounded-lg bg-gray-700 transition-opacity ${template.isArchived ? 'opacity-50' : 'opacity-100'}`}>
                    <div className="flex items-center">
                      <h3 className="font-semibold text-white">{template.name}</h3>
                      <TemplateTypeBadge tags={template.tags} templateId={template.id} />
                      {template.isArchived && <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-gray-500 text-white rounded-full">Archived</span>}
                    </div>
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">{template.description}</p>
                    {template.tags?.filter((t:string) => t !== 'persona' && t !== 'task').length > 0 && (
                      <p className="text-xs text-gray-500 mt-2">Tags: {template.tags.filter((t:string) => t !== 'persona' && t !== 'task').join(', ')}</p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <button onClick={() => handleOpenEditModal(template)} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Edit</button>
                      <button onClick={() => handleCopyTemplate(template.content, template.id)} className={`px-3 py-1 text-xs rounded transition-colors ${copiedTemplateId === template.id ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'}`}>{copiedTemplateId === template.id ? 'Copied!' : 'Copy'}</button>
                      <button onClick={() => handleTemplateArchiveToggle(template.id, !!template.isArchived)} className="p-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700" title={template.isArchived ? 'Unarchive' : 'Archive'}>
                        {template.isArchived ? <ArrowUturnLeftIcon className="h-4 w-4" /> : <ArchiveBoxIcon className="h-4 w-4" />}
                      </button>
                      <button onClick={() => handleDeleteTemplate(template.id)} disabled={activeAction.id === template.id} className="px-3 py-1 text-xs bg-red-600/60 text-white rounded hover:bg-red-700/80">{activeAction.id === template.id ? '...' : 'Delete'}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold mb-4">Your Prompts</h2>
            <div className="mb-4">
                <label htmlFor="prompt-sort" className="block text-xs font-medium text-gray-400 mb-1">Sort by</label>
                <select id="prompt-sort" value={promptSort} onChange={e => setPromptSort(e.target.value)} className="w-full border rounded p-2 text-sm text-black bg-gray-200">
                    <option value="newest">Newest</option>
                    <option value="oldest">Oldest</option>
                    <option value="a-z">Name (A-Z)</option>
                    <option value="z-a">Name (Z-A)</option>
                </select>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg flex-grow overflow-y-auto h-[65vh]">
              {promptsError ? (<p className="text-red-400">Error: {promptsError}</p>) : (
                <div className="space-y-4">
                  {sortedPrompts.map((prompt: any) => {
                    const isDeleting = activeAction.type === 'delete' && activeAction.id === prompt.id;
                    const isCopying = activeAction.type === 'copy' && activeAction.id === prompt.id;
                    const isExecuting = activeAction.type === 'execute' && activeAction.id === prompt.id;
                    const isBusy = isDeleting || isCopying || isExecuting;

                    return (
                      <div key={prompt.id} className={`p-4 rounded-lg bg-gray-700 shadow-lg transition-opacity ${prompt.isArchived ? 'opacity-50' : 'opacity-100'}`}>
                        <div className="flex items-center justify-between">
                          <h3 className="text-lg font-bold text-white">{prompt.name}</h3>
                          {prompt.isArchived && <span className="px-2 py-0.5 text-xs font-semibold bg-gray-500 text-white rounded-full">Archived</span>}
                        </div>
                        <p className="text-sm text-gray-300 mt-1 line-clamp-3">{prompt.task_description}</p>
                        <InteractiveRating
                          promptId={prompt.id}
                          currentRating={promptRatings[prompt.id]?.averageRating || 0}
                          ratingCount={promptRatings[prompt.id]?.ratingCount || 0}
                          onRate={handlePromptRating}
                          onRemoveRating={handleRemoveRating}
                          isSubmitting={isRatingSubmitting}
                        />
                        <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-2">
                          <Link href={`/prompts/${prompt.id}`} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">View Versions</Link>
                          <button
                            onClick={() => handleQuickExecute(prompt.id)}
                            disabled={isBusy}
                            className="flex items-center gap-1 px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            <PlayIcon className="h-3 w-3" />
                            <span>{isExecuting ? '...' : 'Test'}</span>
                          </button>
                          <button
                            onClick={() => handleCopyPrompt(prompt.id)}
                            disabled={isBusy}
                            className={`px-3 py-1 text-xs rounded transition-colors ${copiedPromptId === prompt.id ? 'bg-emerald-600 text-white' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'}`}
                          >
                            {isCopying ? '...' : copiedPromptId === prompt.id ? 'Copied!' : 'Copy'}
                          </button>
                          <button onClick={() => handlePromptArchiveToggle(prompt.id, !!prompt.isArchived)} disabled={isBusy} className="p-1 text-xs bg-yellow-600 text-white rounded hover:bg-yellow-700 disabled:opacity-50" title={prompt.isArchived ? 'Unarchive' : 'Archive'}>
                            {prompt.isArchived ? <ArrowUturnLeftIcon className="h-4 w-4" /> : <ArchiveBoxIcon className="h-4 w-4" />}
                          </button>
                          <button onClick={() => handleDeletePrompt(prompt.id)} disabled={isBusy} className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors">{isDeleting ? '...' : 'Delete'}</button>
                          <div className="flex-grow"></div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">Send to:</span>
                            <SendToLlm promptId={prompt.id} />
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col lg:col-span-2 2xl:col-span-1">
            <h2 className="text-2xl font-bold mb-4">Compose a Prompt</h2>
            <div className="flex-grow">
              <PromptComposer 
                templates={templates} 
                onPromptSaved={() => {}} 
                initialPrompt={initialPrompt} 
              />
            </div>
          </div>
        </div>
      </div>

      <Modal isOpen={isEditModalOpen} onClose={handleCloseEditModal} title="Edit Template">
        {currentTemplate && (<EditTemplateForm template={currentTemplate} onClose={handleCloseEditModal} />)}
      </Modal>

      <Modal isOpen={isCreateModalOpen} onClose={() => setIsCreateModalOpen(false)} title="Create New Template">
        <TemplateForm onSuccess={() => setIsCreateModalOpen(false)} />
      </Modal>

      <QuickExecuteModal
        isOpen={isExecuteModalOpen}
        onClose={() => setIsExecuteModalOpen(false)}
        promptText={promptForExecution}
        onSaveAsPrompt={handleOpenSaveModal}
      />
      
      <Modal isOpen={isSaveModalOpen} onClose={() => setIsSaveModalOpen(false)} title="Save New Prompt">
        <form onSubmit={handleSavePrompt}>
            <div className="space-y-4">
                <div>
                    <label htmlFor="new-prompt-name" className="block text-sm font-medium text-gray-300 mb-1">Prompt Name</label>
                    <input id="new-prompt-name" type="text" value={isGeneratingDetails ? "Generating..." : newPromptName} onChange={(e) => setNewPromptName(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" required disabled={isGeneratingDetails} />
                </div>
                <div>
                    <label htmlFor="new-prompt-desc" className="block text-sm font-medium text-gray-300 mb-1">Task Description</label>
                    <textarea id="new-prompt-desc" value={isGeneratingDetails ? "Generating..." : newPromptDescription} onChange={(e) => setNewPromptDescription(e.target.value)} className="w-full border rounded p-2 text-black bg-gray-200" rows={3} required disabled={isGeneratingDetails} />
                </div>
            </div>
            <div className="mt-6 flex justify-end gap-4">
                <button type="button" onClick={() => setIsSaveModalOpen(false)} className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-500">Cancel</button>
                <button type="submit" disabled={isSaving || isGeneratingDetails} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50 hover:bg-blue-700">{isSaving ? 'Saving...' : 'Save Prompt'}</button>
            </div>
        </form>
      </Modal>
    </>
  );
};

const DashboardPage = () => (
  <Suspense fallback={<div className="text-center p-8">Loading Dashboard...</div>}>
    <DashboardContent />
  </Suspense>
);

export default DashboardPage;