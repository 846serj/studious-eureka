// src/app/editor/page.tsx
'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '../../lib/supabase';
import WordPressIntegration from '../../components/WordPressIntegration';
import BlockEditor, { BlockEditorRef } from '../../components/BlockEditor';
import '../../styles/blockEditor.css';

export default function EditorPage() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  // ─── THEME TOGGLE SETUP ─────────────────────────────────────────────────────
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    const saved = localStorage.getItem('theme') as 'light' | 'dark' | null;
    const defaultTheme = saved || 'light';
    setTheme(defaultTheme);
    document.documentElement.classList.toggle('dark', defaultTheme === 'dark');
  }, []);
  const toggleTheme = () => {
    const next = theme === 'light' ? 'dark' : 'light';
    setTheme(next);
    document.documentElement.classList.toggle('dark', next === 'dark');
    localStorage.setItem('theme', next);
  };

  const [user, setUser]           = useState<any>(null);
  const [content, setContent]     = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [editableTitle, setEditableTitle] = useState(searchParams.get('title') || '');
  const [sources, setSources] = useState<string[]>([]);
  const blockEditorRef = useRef<BlockEditorRef>(null);
  const contentLoadedRef = useRef(false);

  const [originalPrompt, setOriginalPrompt] = useState<any>(null);
  const [regenerating, setRegenerating] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem('lastPrompt');
    if (stored) {
      try {
        setOriginalPrompt(JSON.parse(stored));
      } catch {}
    }
  }, []);

  // Load initial content & sources from localStorage, sessionStorage, or URL params
  useEffect(() => {
    if (contentLoadedRef.current) {
      console.log('Content already loaded, skipping');
      return;
    }
    
    // Check for content in sessionStorage first (for recipe articles)
    const sessionContent = sessionStorage.getItem('generatedContent');
    const sessionTitle = sessionStorage.getItem('generatedTitle');
    
    console.log('Editor loading - sessionContent:', sessionContent ? 'Found' : 'Not found');
    console.log('Editor loading - sessionTitle:', sessionTitle);
    
    if (sessionContent) {
      console.log('Loading content from sessionStorage');
      contentLoadedRef.current = true;
      setContent(sessionContent);
      setWordCount(
        sessionContent
          .replace(/<[^>]+>/g, ' ')
          .split(/\s+/)
          .filter(Boolean).length
      );
      if (sessionTitle) {
        setEditableTitle(sessionTitle);
      }
      setSources([]); // Recipe articles don't have sources
      // Clear sessionStorage after loading
      sessionStorage.removeItem('generatedContent');
      sessionStorage.removeItem('generatedTitle');
      return;
    }
    
    // Check for content in URL parameters (fallback for other articles)
    const urlContent = searchParams.get('content');
    const urlTitle = searchParams.get('title');
    
    if (urlContent) {
      contentLoadedRef.current = true;
      const decodedContent = decodeURIComponent(urlContent);
      setContent(decodedContent);
      setWordCount(
        decodedContent
          .replace(/<[^>]+>/g, ' ')
          .split(/\s+/)
          .filter(Boolean).length
      );
      if (urlTitle) {
        setEditableTitle(decodeURIComponent(urlTitle));
      }
      setSources([]); // Recipe articles don't have sources
      return;
    }

    // Fallback to localStorage for regular articles
    const savedContent = localStorage.getItem('lastArticleContent');
    if (!savedContent) {
      alert('No article data found. Please generate an article first.');
      router.push('/generate');
      return;
    }
    contentLoadedRef.current = true;
    setContent(savedContent);
    setWordCount(
      savedContent
        .replace(/<[^>]+>/g, ' ')
        .split(/\s+/)
        .filter(Boolean).length
    );
    try {
      const s = localStorage.getItem('lastArticleSources');
      setSources(s ? JSON.parse(s) : []);
    } catch {
      setSources([]);
    }
  }, [router, searchParams]);

  // Auth guard
  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      if (error || !data.user) router.push('/auth');
      else setUser(data.user);
    });
  }, [router]);

  const handleBlockEditorChange = useCallback((newContent: string) => {
    setContent(newContent);
    const text = newContent.replace(/<[^>]+>/g, ' ');
    setWordCount(text.split(/\s+/).filter(Boolean).length);
  }, []);

  const handleRegenerate = async () => {
    if (!originalPrompt) {
      alert('No previous prompt found');
      return;
    }
    const payload = { ...originalPrompt, title: editableTitle };
    setRegenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.content) {
        setContent(data.content);
        const text = data.content.replace(/<[^>]+>/g, ' ');
        setWordCount(text.split(/\s+/).filter(Boolean).length);
        setSources(Array.isArray(data.sources) ? data.sources : []);

        // Persist regeneration payload and results
        try {
          localStorage.setItem('lastPrompt', JSON.stringify(payload));
          localStorage.setItem('lastArticleContent', data.content);
          localStorage.setItem(
            'lastArticleSources',
            JSON.stringify(data.sources || [])
          );
        } catch {}
        setOriginalPrompt(payload);
      } else {
        alert('Regeneration failed');
      }
    } catch (err) {
      console.error(err);
      alert('Regeneration failed');
    } finally {
      setRegenerating(false);
    }
  };

  const handleNewArticle = () => router.push('/generate');
  const handleSignOut    = async () => {
    await supabase.auth.signOut();
    router.push('/auth');
  };

  if (!user) return <p className="p-4">Redirecting…</p>;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900 text-black dark:text-white">
      <div className="p-4 max-w-6xl mx-auto space-y-6">
        <div className="flex justify-end space-x-2">
          <button
            onClick={toggleTheme}
            className="text-sm border border-gray-400 dark:border-gray-600 px-3 py-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            Switch to {theme === 'light' ? 'Dark' : 'Light'} Mode
          </button>
          <button
            onClick={handleSignOut}
            className="bg-red-500 text-white px-4 py-2 rounded"
          >
            Sign Out
          </button>
        </div>

        <input
          className="text-3xl font-bold w-full mb-2 bg-white dark:bg-gray-800 text-black dark:text-white border-b border-gray-300 dark:border-gray-600 p-2 rounded"
          value={editableTitle}
          onChange={e => setEditableTitle(e.target.value)}
          placeholder="Untitled Article"
        />
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {wordCount.toLocaleString()} words
        </p>
        {sources.length > 0 && (
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <h3 className="font-semibold mb-1">Sources</h3>
            <ul className="list-disc list-inside space-y-1">
              {sources.map((s, i) => (
                <li key={i}>
                  <a href={s} className="text-blue-600 underline" target="_blank" rel="noopener noreferrer">
                    {s}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div>
          {/* Block Editor */}
          <h2 className="text-xl mb-2">Edit Article</h2>
          
          <BlockEditor
            ref={blockEditorRef}
            content={content}
            onContentChange={handleBlockEditorChange}
            onSave={() => {
              // Save functionality can be added here
              console.log('Article saved');
            }}
          />
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleRegenerate}
            disabled={regenerating}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded disabled:opacity-50"
          >
            {regenerating ? 'Regenerating…' : 'Regenerate Article'}
          </button>
          <button
            onClick={handleNewArticle}
            className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded"
          >
            Generate New Article
          </button>
        </div>

        <WordPressIntegration title={editableTitle} content={content} />
      </div>
    </div>
  );
}
