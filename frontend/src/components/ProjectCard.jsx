import React, { useState } from 'react';
import { ExternalLink, Github, Heart, MessageSquare } from 'lucide-react';
import { getTrackBadgeColor } from '../utils/formatters';
import api from '../services/api';
import { useNotification } from '../context/NotificationContext';

export const ProjectCard = ({ submission, onOpenModal }) => {
  const [votes, setVotes] = useState(submission.publicVoteCount || 0);
  const [isVoting, setIsVoting] = useState(false);
  const { addNotification } = useNotification();

  const handleVote = async (e) => {
    e.stopPropagation();
    if (isVoting) return;

    setIsVoting(true);
    try {
      const res = await api.post('/votes', { submissionId: submission._id });
      if (res.success) {
        setVotes(res.data.newVoteCount);
        addNotification('Vote counted successfully!', 'success');
      }
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setIsVoting(false);
    }
  };

  return (
    <div
      onClick={() => onOpenModal && onOpenModal(submission)}
      className="group relative bg-surface border border-border-subtle rounded-xl overflow-hidden hover:border-blue-500/50 hover:shadow-card transition-all duration-300 flex flex-col cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="relative h-44 w-full bg-surface-raised overflow-hidden">
        <img
          src={submission.thumbnailPath || '/uploads/default-thumbnail.webp'}
          alt={submission.title}
          onError={(e) => {
            e.target.onerror = null;
            e.target.src = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=600&auto=format&fit=crop&q=60';
          }}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute top-3 left-3">
          <span
            className={`inline-block px-2.5 py-1 rounded-md text-xs font-semibold border backdrop-blur-md ${getTrackBadgeColor(
              submission.track
            )}`}
          >
            {submission.track}
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <h3 className="font-bold text-lg text-white group-hover:text-blue-400 transition-colors line-clamp-1">
              {submission.title}
            </h3>
          </div>
          <p className="text-xs font-medium text-gray-400 mb-2">
            by <span className="text-gray-200">{submission.teamId?.name || 'CyberDinos'}</span>
          </p>
          <p className="text-sm text-gray-300 line-clamp-2 mb-4 leading-relaxed">
            {submission.tagline}
          </p>
        </div>

        {/* Card Footer */}
        <div className="pt-3 border-t border-border-subtle flex items-center justify-between text-xs text-gray-400">
          <div className="flex items-center space-x-2">
            {submission.repoUrl && (
              <a
                href={submission.repoUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-lg hover:bg-surface-raised hover:text-white transition-colors"
                title="View Code Repository"
              >
                <Github className="w-4 h-4" />
              </a>
            )}
            {submission.demoUrl && (
              <a
                href={submission.demoUrl}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="p-1.5 rounded-lg hover:bg-surface-raised hover:text-white transition-colors"
                title="Live Demo"
              >
                <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>

          {/* Upvote Button */}
          <button
            onClick={handleVote}
            disabled={isVoting}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-surface-raised border border-border-subtle text-gray-300 hover:text-rose-400 hover:border-rose-800/60 active:scale-95 transition-all"
          >
            <Heart className={`w-3.5 h-3.5 ${votes > 0 ? 'text-rose-500 fill-rose-500' : ''}`} />
            <span className="font-mono font-bold text-xs">{votes}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
