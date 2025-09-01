//src/app/templates/[id]/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/context/AuthContext';

const EditTemplatePage = ({ params }: { params: { id: string } }) => {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [template, setTemplate] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');

  const templateId = params.id;

  useEffect(() => {
    // Redirect if not authenticated or not loaded
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    const fetchTemplate = async () => {
      if (!user) return;

      try {
        const docRef = doc(db, 'prompt_templates', templateId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          setTemplate(data);
          // Pre-populate form with existing data
          setName(data.name);
          setDescription(data.description);
          setContent(data.content);
          setTags(data.tags.join(', '));
        } else {
          setError('No such document found!');
        }
      } catch (err) {
        console.error('Error fetching document:', err);
        setError('Failed to load template data.');
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchTemplate();
    }
  }, [user, templateId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    const updatedData = {
      name,
      description,
      content,
      tags: tags.split(',').map(tag => tag.trim()).filter(tag => tag !== ''),
      updated_at: serverTimestamp(),
    };

    try {
      const docRef = doc(db, 'prompt_templates', templateId);
      await updateDoc(docRef, updatedData);
      router.push('/dashboard'); // Redirect to dashboard after successful update
    } catch (err) {
      console.error('Error updating document:', err);
      setError('Failed to update template. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (authLoading || loading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error}</div>;
  }
  
  // Only render the form if the user is authenticated and data is loaded
  if (user && template) {
    return (
      <div className="p-8">
        <h1>Edit Template: {template.name}</h1>
        <form onSubmit={handleSubmit} className="mt-8 p-4 border rounded-lg">
          {/* ... Form input fields would go here, similar to TemplateForm ... */}
          <button type="submit" disabled={isSubmitting} className="mt-4 px-4 py-2 bg-blue-500 text-white rounded disabled:opacity-50">
            {isSubmitting ? 'Updating...' : 'Update Template'}
          </button>
        </form>
      </div>
    );
  }

  return null;
};

export default EditTemplatePage;