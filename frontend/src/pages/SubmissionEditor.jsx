import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../context/NotificationContext';
import { renderMarkdownToSafeHTML } from '../utils/markdownSanitizer';
import api from '../services/api';
import { Save, Lock, Upload, Eye, FileText, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const SubmissionEditor = () => {
  const { user } = useAuth();
  const { addNotification } = useNotification();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [hasTeam, setHasTeam] = useState(true);

  // Form Fields
  const [title, setTitle] = useState('');
  const [tagline, setTagline] = useState('');
  const [repoUrl, setRepoUrl] = useState('');
  const [demoUrl, setDemoUrl] = useState('');
  const [markdown, setMarkdown] = useState('');
  const [thumbnailPath, setThumbnailPath] = useState('/uploads/default-thumbnail.webp');
  const [status, setStatus] = useState('draft');

  useEffect(() => {
    const fetchSubmission = async () => {
      try {
        const teamRes = await api.get('/teams/my-team');
        if (!teamRes.data?.team) {
          setHasTeam(false);
          setLoading(false);
          return;
        }

        const sub = teamRes.data.submission;
        if (sub) {
          setTitle(sub.title || '');
          setTagline(sub.tagline || '');
          setRepoUrl(sub.repoUrl || '');
          setDemoUrl(sub.demoUrl || '');
          setMarkdown(sub.descriptionMarkdown || '');
          setThumbnailPath(sub.thumbnailPath || '/uploads/default-thumbnail.webp');
          setStatus(sub.status || 'draft');
        } else {
          setMarkdown(
            `# Project Overview\n\n### What it does\nExplain the core value proposition of your project.\n\n### How we built it\nDescribe your technical architecture, models, and tools.\n\n### Challenges we ran into\nDetail technical bottlenecks and how you solved them.`
          );
        }
      } catch (err) {
        addNotification(err.message, 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchSubmission();
  }, [addNotification]);

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const res = await api.post('/submissions', {
        title,
        tagline,
        repoUrl,
        demoUrl,
        descriptionMarkdown: markdown,
        thumbnailPath,
      });
      if (res.success) {
        addNotification('Draft saved successfully!', 'success');
      }
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append('thumbnail', file);

    try {
      const res = await api.post('/submissions/upload-thumbnail', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      if (res.success && res.data?.filePath) {
        setThumbnailPath(res.data.filePath);
        addNotification('Thumbnail uploaded!', 'success');
      }
    } catch (err) {
      addNotification(err.message, 'error');
    }
  };

  const handleFinalize = async () => {
    if (!window.confirm('Are you sure you want to finalize? This locks your project for judging evaluation.')) {
      return;
    }

    setFinalizing(true);
    try {
      // First save current content
      await api.post('/submissions', {
        title,
        tagline,
        repoUrl,
        demoUrl,
        descriptionMarkdown: markdown,
        thumbnailPath,
      });

      const res = await api.post('/submissions/finalize');
      if (res.success) {
        setStatus('submitted');
        addNotification('Project finalized and locked for evaluation!', 'success');
      }
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setFinalizing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!hasTeam) {
    return (
      <div className="max-w-md mx-auto text-center py-16 space-y-4">
        <h2 className="text-2xl font-bold text-white">No Team Found</h2>
        <p className="text-sm text-gray-400">
          You need to create or join a team before submitting a hackathon project.
        </p>
        <Link
          to="/team"
          className="inline-block px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-glow transition-all"
        >
          Go to Team Dashboard
        </Link>
      </div>
    );
  }

  const isLocked = status === 'submitted' || status === 'locked';

  return (
    <div className="space-y-6 py-6">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-border-subtle">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-3xl font-extrabold text-white">Project Submission Editor</h1>
            <span
              className={`px-2.5 py-0.5 rounded text-xs font-mono font-bold uppercase ${
                isLocked
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                  : 'bg-amber-950 text-amber-400 border border-amber-800'
              }`}
            >
              {isLocked ? 'Locked for Evaluation' : 'Draft Mode'}
            </span>
          </div>
          <p className="text-sm text-gray-400 mt-1">
            Dual-pane live markdown editor with attachment uploads.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {!isLocked && (
            <>
              <button
                onClick={handleSaveDraft}
                disabled={saving}
                className="px-4 py-2 rounded-xl bg-surface-raised hover:bg-surface border border-border-subtle text-gray-200 hover:text-white font-semibold text-sm flex items-center space-x-2 transition-all disabled:opacity-50"
              >
                <Save className="w-4 h-4 text-blue-400" />
                <span>{saving ? 'Saving...' : 'Save Draft'}</span>
              </button>

              <button
                onClick={handleFinalize}
                disabled={finalizing}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-glow flex items-center space-x-2 transition-all disabled:opacity-50"
              >
                <Lock className="w-4 h-4" />
                <span>{finalizing ? 'Finalizing...' : 'Finalize Project'}</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Dual Pane Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
        {/* Left Pane: Form & Markdown Input */}
        <div className="bg-surface border border-border-subtle rounded-2xl p-6 space-y-5">
          <h2 className="text-base font-bold text-white flex items-center space-x-2 pb-3 border-b border-border-subtle">
            <FileText className="w-4 h-4 text-blue-400" />
            <span>Metadata & Narrative Editor</span>
          </h2>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Project Title</label>
            <input
              type="text"
              disabled={isLocked}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Neural Raptor"
              className="w-full px-3.5 py-2 rounded-xl bg-canvas border border-border-subtle text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-60"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">Tagline</label>
            <input
              type="text"
              disabled={isLocked}
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              placeholder="e.g. Autonomous air-gapped machine learning submission evaluator"
              className="w-full px-3.5 py-2 rounded-xl bg-canvas border border-border-subtle text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-60"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Repository URL
              </label>
              <input
                type="text"
                disabled={isLocked}
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                placeholder="https://github.com/..."
                className="w-full px-3.5 py-2 rounded-xl bg-canvas border border-border-subtle text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-60"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1">
                Live Demo URL (Optional)
              </label>
              <input
                type="text"
                disabled={isLocked}
                value={demoUrl}
                onChange={(e) => setDemoUrl(e.target.value)}
                placeholder="http://localhost:3000/demo"
                className="w-full px-3.5 py-2 rounded-xl bg-canvas border border-border-subtle text-sm text-white focus:outline-none focus:border-blue-500 disabled:opacity-60"
              />
            </div>
          </div>

          {/* Thumbnail Uploader */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Thumbnail Cover Image
            </label>
            <div className="flex items-center space-x-4">
              <img
                src={thumbnailPath}
                alt="Preview"
                className="w-16 h-16 rounded-xl object-cover border border-border-subtle bg-surface-raised"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src =
                    'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=60';
                }}
              />
              {!isLocked && (
                <label className="px-4 py-2 rounded-xl bg-surface-raised hover:bg-surface border border-border-subtle text-xs font-semibold text-gray-200 cursor-pointer flex items-center space-x-2 transition-colors">
                  <Upload className="w-4 h-4 text-blue-400" />
                  <span>Upload Local Image</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          </div>

          {/* Markdown Textarea */}
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1">
              Markdown Documentation
            </label>
            <textarea
              rows={14}
              disabled={isLocked}
              value={markdown}
              onChange={(e) => setMarkdown(e.target.value)}
              placeholder="Write your markdown description..."
              className="w-full p-4 rounded-xl bg-canvas border border-border-subtle text-sm text-white font-mono leading-relaxed focus:outline-none focus:border-blue-500 disabled:opacity-60 resize-y"
            />
          </div>
        </div>

        {/* Right Pane: Live Rendered Preview */}
        <div className="bg-surface border border-border-subtle rounded-2xl p-6 space-y-5 sticky top-24">
          <h2 className="text-base font-bold text-white flex items-center space-x-2 pb-3 border-b border-border-subtle">
            <Eye className="w-4 h-4 text-emerald-400" />
            <span>Live Sanitized Preview</span>
          </h2>

          <div className="space-y-4">
            <div>
              <h3 className="text-2xl font-extrabold text-white">
                {title || 'Untitled Hackathon Project'}
              </h3>
              <p className="text-sm text-gray-400 mt-1">
                {tagline || 'No tagline provided yet.'}
              </p>
            </div>

            <div className="pt-4 border-t border-border-subtle">
              <div
                className="prose prose-invert max-w-none text-sm text-gray-300 leading-relaxed space-y-3"
                dangerouslySetInnerHTML={{
                  __html: renderMarkdownToSafeHTML(markdown),
                }}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
