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
import { addDoc, collection, serverTimestamp, query, where, orderBy, limit, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

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

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [currentTemplate, setCurrentTemplate] = useState<any | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);
  const [copiedTemplateId, setCopiedTemplateId] = useState<string | null>(null);
  const { templates, loading: templatesLoading } = usePromptTemplates();
  const { prompts, loading: promptsLoading, error: promptsError, refetch: refetchPrompts } = usePrompts();
  const { recentVersions, loading: activityLoading, error: activityError } = useRecentActivity();
  const { topPrompts: allPromptMetrics, loading: metricsLoading, error: metricsError } = usePromptMetrics();
  
  const initialPrompt = searchParams.get('prompt') || '';
  const [copiedPromptId, setCopiedPromptId] = useState<string | null>(null);
  const [isRatingSubmitting, setIsRatingSubmitting] = useState(false);

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

  const hydratedAndFilteredVersions = useMemo(() => {
    if (!recentVersions || !prompts) return [];
    const promptNameMap = new Map(prompts.map(p => [p.id, p.name]));
    const availablePromptIds = new Set(prompts.map(p => p.id));

    return recentVersions
      .filter(version => availablePromptIds.has(version.promptId))
      .map(version => ({
        ...version,
        promptName: promptNameMap.get(version.promptId) || 'Unknown Prompt',
      }));
  }, [recentVersions, prompts]);

  useEffect(() => {
    if (!authLoading && !user) router.push('/login');
  }, [user, authLoading, router]);
  
  const handlePromptRating = async (promptId: string, newRating: number) => {
    if (!user) { alert('You must be logged in to rate a prompt.'); return; }
    setIsRatingSubmitting(true);
    try {
      const versionsUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts/${promptId}/versions`;
      const response = await fetch(versionsUrl, { headers: { 'ngrok-skip-browser-warning': 'true' } });
      if (!response.ok) throw new Error('Failed to fetch prompt versions.');
      const versions = await response.json();
      const latestVersion = versions.length > 0 ? versions.sort((a: any, b: any) => b.version - a.version)[0] : { version: 0, prompt_text: 'N/A' };
      const newMetric = { source: 'dashboard_rating', promptId: promptId, promptVersion: latestVersion.version ?? 0, promptText: latestVersion.prompt_text, rating: newRating, createdAt: serverTimestamp(), userId: user.uid };
      await addDoc(collection(db, 'prompt_metrics'), newMetric);
    } catch (err) { console.error("Rating submission failed:", err); alert("Failed to save rating. Please try again."); } 
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
    } catch (err) { console.error("Failed to remove rating:", err); alert("Failed to remove rating. You may need to create a Firestore index."); } 
    finally { setIsRatingSubmitting(false); }
  };

  const handleOpenEditModal = (template: any) => { setCurrentTemplate(template); setIsEditModalOpen(true); };
  const handleCloseEditModal = () => { setIsEditModalOpen(false); setCurrentTemplate(null); };

  const handleCopyTemplate = (content: string, templateId: string) => {
    navigator.clipboard.writeText(content).then(() => {
      setCopiedTemplateId(templateId);
      setTimeout(() => setCopiedTemplateId(null), 2000);
    });
  };

  const handleCopyPrompt = async (promptId: string) => {
    setActiveItemId(promptId);
    try {
      const versionsUrl = `${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts/${promptId}/versions`;
      const response = await fetch(versionsUrl, { headers: { 'ngrok-skip-browser-warning': 'true' } });
      if (!response.ok) throw new Error('Failed to fetch prompt versions.');
      const versions = await response.json();
      if (versions.length > 0) {
        const latestVersion = versions.sort((a: any, b: any) => b.version - a.version)[0];
        await navigator.clipboard.writeText(latestVersion.prompt_text);
        setCopiedPromptId(promptId);
        setTimeout(() => setCopiedPromptId(null), 2000);
      } else { alert('This prompt has no versions to copy.'); }
    } catch (err) { alert('Error copying prompt.'); console.error(err); } 
    finally { setActiveItemId(null); }
  };

  const handleDeletePrompt = async (promptId: string) => {
    if (window.confirm('Are you sure you want to delete this prompt and all its versions?')) {
      setActiveItemId(promptId);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/prompts/${promptId}`, { method: 'DELETE', headers: { 'ngrok-skip-browser-warning': 'true' }});
        if (!response.ok) throw new Error('Failed to delete prompt.');
        await refetchPrompts();
      } catch (err) { alert('Error deleting prompt.'); console.error(err); } 
      finally { setActiveItemId(null); }
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    if (window.confirm('Are you sure you want to delete this template?')) {
      setActiveItemId(templateId);
      try {
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/templates/${templateId}`, { method: 'DELETE', headers: { 'ngrok-skip-browser-warning': 'true' } });
        if (!response.ok) throw new Error('Failed to delete template.');
      } catch (err) { alert('Error deleting template.'); console.error(err); } 
      finally { setActiveItemId(null); }
    }
  };

  if (authLoading || templatesLoading || promptsLoading) {
    return <div className="text-center p-8">Loading Dashboard...</div>;
  }

  return (
    <>
      <div className="p-4 sm:p-8 bg-gray-900 min-h-screen text-white">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
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
                        recentVersions={hydratedAndFilteredVersions}
                        loading={activityLoading || promptsLoading}
                        error={activityError || promptsError}
                        handleDeletePrompt={handleDeletePrompt} 
                    />
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold">Template Library</h2>
              <button onClick={() => setIsCreateModalOpen(true)} className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700">+ New</button>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg flex-grow overflow-y-auto h-[75vh]">
              <div className="space-y-4">
                {templates.map((template: any) => (
                  <div key={template.id} className="p-3 rounded-lg bg-gray-700">
                    <div className="flex items-center">
                      <h3 className="font-semibold text-white">{template.name}</h3>
                      <TemplateTypeBadge tags={template.tags} templateId={template.id} />
                    </div>
                    <p className="text-sm text-gray-400 mt-1 line-clamp-2">{template.description}</p>
                    {template.tags?.filter((t:string) => t !== 'persona' && t !== 'task').length > 0 && (
                      <p className="text-xs text-gray-500 mt-2">Tags: {template.tags.filter((t:string) => t !== 'persona' && t !== 'task').join(', ')}</p>
                    )}
                    <div className="mt-3 flex items-center gap-2">
                      <button onClick={() => handleOpenEditModal(template)} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700">Edit</button>
                      <button onClick={() => handleCopyTemplate(template.content, template.id)} className={`px-3 py-1 text-xs rounded transition-colors ${copiedTemplateId === template.id ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'}`}>{copiedTemplateId === template.id ? 'Copied!' : 'Copy'}</button>
                      <button onClick={() => handleDeleteTemplate(template.id)} disabled={activeItemId === template.id} className="px-3 py-1 text-xs bg-red-600/60 text-white rounded hover:bg-red-700/80">{activeItemId === template.id ? '...' : 'Delete'}</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          
          <div className="flex flex-col">
            <h2 className="text-2xl font-bold mb-4">Your Prompts</h2>
            <div className="bg-gray-800 p-4 rounded-lg flex-grow overflow-y-auto h-[75vh]">
              {promptsError ? (<p className="text-red-400">Error: {promptsError}</p>) : (
                <div className="space-y-4">
                  {prompts.map((prompt: any) => (
                    <div key={prompt.id} className="p-4 rounded-lg bg-gray-700 shadow-lg">
                      <h3 className="text-lg font-bold text-white">{prompt.name}</h3>
                      <p className="text-sm text-gray-300 mt-1 line-clamp-3">{prompt.task_description}</p>
                      <InteractiveRating 
                        promptId={prompt.id}
                        currentRating={promptRatings[prompt.id]?.averageRating || 0}
                        ratingCount={promptRatings[prompt.id]?.ratingCount || 0}
                        onRate={handlePromptRating}
                        onRemoveRating={handleRemoveRating}
                        isSubmitting={isRatingSubmitting}
                      />
                      <div className="mt-4 flex gap-2">
                        <Link href={`/prompts/${prompt.id}`} className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors">View Versions</Link>
                        <button 
                          onClick={() => handleCopyPrompt(prompt.id)} 
                          disabled={activeItemId === prompt.id}
                          className={`px-3 py-1 text-xs rounded transition-colors ${copiedPromptId === prompt.id ? 'bg-green-600 text-white' : 'bg-gray-600 text-gray-200 hover:bg-gray-500'}`}
                        >
                          {activeItemId === prompt.id ? '...' : copiedPromptId === prompt.id ? 'Copied!' : 'Copy'}
                        </button>
                        <button onClick={() => handleDeletePrompt(prompt.id)} disabled={activeItemId === prompt.id} className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors">{activeItemId === prompt.id ? 'Deleting...' : 'Delete'}</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col">
            <h2 className="text-2xl font-bold mb-4">Compose a Prompt</h2>
            <div className="flex-grow">
              <PromptComposer 
                templates={templates} 
                onPromptSaved={refetchPrompts} 
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
    </>
  );
};

const DashboardPage = () => (
  <Suspense fallback={<div className="text-center p-8">Loading Dashboard...</div>}>
    <DashboardContent />
  </Suspense>
);

export default DashboardPage;