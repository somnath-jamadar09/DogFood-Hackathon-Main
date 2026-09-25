import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useNotification } from '../context/NotificationContext';
import api from '../services/api';
import { Users, Copy, Check, UserPlus, ArrowRight, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

const TRACKS = ['AI/ML', 'Web3 & Blockchain', 'FinTech', 'HealthTech'];

export const TeamDashboard = () => {
  const { user, setUser } = useAuth();
  const { addNotification } = useNotification();

  const [teamData, setTeamData] = useState(null);
  const [submissionData, setSubmissionData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form states
  const [createName, setCreateName] = useState('');
  const [createTrack, setCreateTrack] = useState('AI/ML');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [copied, setCopied] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const fetchTeam = async () => {
    setLoading(true);
    try {
      const res = await api.get('/teams/my-team');
      if (res.success && res.data) {
        setTeamData(res.data.team);
        setSubmissionData(res.data.submission);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeam();
  }, []);

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/teams', {
        name: createName,
        track: createTrack,
      });
      if (res.success) {
        addNotification('Team created successfully!', 'success');
        setTeamData(res.data.team);
        setUser((prev) => ({ ...prev, teamId: res.data.team._id }));
        fetchTeam();
      }
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleJoinTeam = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/teams/join', {
        joinCode: joinCodeInput.toUpperCase().trim(),
      });
      if (res.success) {
        addNotification(`Joined team ${res.data.team.name}!`, 'success');
        setTeamData(res.data.team);
        setUser((prev) => ({ ...prev, teamId: res.data.team._id }));
        fetchTeam();
      }
    } catch (err) {
      addNotification(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const copyJoinCode = () => {
    if (teamData?.joinCode) {
      navigator.clipboard.writeText(teamData.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      addNotification('Join code copied to clipboard!', 'info');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-6">
      <div>
        <h1 className="text-3xl font-extrabold text-white">Team Management</h1>
        <p className="text-sm text-gray-400 mt-1">
          Form or join a team (max 4 members per team). Each team collaborates on one project.
        </p>
      </div>

      {teamData ? (
        /* Team Overview Card */
        <div className="bg-surface border border-border-subtle rounded-2xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-border-subtle gap-4">
            <div>
              <span className="text-xs font-mono font-semibold text-blue-400 uppercase tracking-wider">
                Active Hackathon Team
              </span>
              <h2 className="text-2xl font-bold text-white mt-1">{teamData.name}</h2>
              <div className="flex items-center space-x-2 mt-2">
                <span className="px-2.5 py-0.5 rounded text-xs font-medium bg-blue-950 text-blue-300 border border-blue-800">
                  Track: {teamData.track}
                </span>
                <span className="text-xs text-gray-400">
                  {teamData.members.length} / 4 Members
                </span>
              </div>
            </div>

            {/* Join Code Box */}
            <div className="bg-canvas border border-border-subtle p-4 rounded-xl flex items-center space-x-4">
              <div>
                <div className="text-[10px] font-mono uppercase text-gray-400">Invite Code</div>
                <div className="text-2xl font-mono font-extrabold tracking-widest text-emerald-400">
                  {teamData.joinCode}
                </div>
              </div>
              <button
                onClick={copyJoinCode}
                className="p-2.5 rounded-lg bg-surface hover:bg-surface-raised border border-border-subtle text-gray-300 hover:text-white transition-colors"
                title="Copy Code"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Members List */}
          <div>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 font-mono mb-4">
              Team Roster
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {teamData.members.map((member) => (
                <div
                  key={member._id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-surface-raised border border-border-subtle"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-blue-600/20 border border-blue-500/40 text-blue-300 font-bold text-xs flex items-center justify-center">
                      {member.fullName.charAt(0)}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-white">{member.fullName}</div>
                      <div className="text-xs text-gray-400">{member.email}</div>
                    </div>
                  </div>
                  {member._id === teamData.captainId && (
                    <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/60 text-amber-300 border border-amber-800">
                      Captain
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Action to Submission */}
          <div className="pt-6 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-white">Project Submission Status</h4>
              <p className="text-xs text-gray-400">
                {submissionData?.status === 'submitted'
                  ? 'Project submitted and locked for judging evaluation.'
                  : submissionData
                  ? 'Draft in progress. Finalize before deadline.'
                  : 'No project submitted yet.'}
              </p>
            </div>
            <Link
              to="/submit"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-glow flex items-center justify-center space-x-2 transition-all"
            >
              <span>{submissionData ? 'Edit Submission' : 'Create Submission'}</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      ) : (
        /* Team Creation / Join Dual Forms */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Create Team */}
          <div className="bg-surface border border-border-subtle rounded-2xl p-6 space-y-6">
            <div className="flex items-center space-x-3 text-blue-400">
              <UserPlus className="w-6 h-6" />
              <h2 className="text-xl font-bold text-white">Create a Team</h2>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Start a new team as Team Captain. You will get a 6-character code to invite up to 3 teammates.
            </p>

            <form onSubmit={handleCreateTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Team Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. CyberDinos"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-border-subtle text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Competition Track
                </label>
                <select
                  value={createTrack}
                  onChange={(e) => setCreateTrack(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-border-subtle text-sm text-white focus:outline-none focus:border-blue-500"
                >
                  {TRACKS.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-sm shadow-glow transition-all disabled:opacity-50"
              >
                {submitting ? 'Creating Team...' : 'Create Team'}
              </button>
            </form>
          </div>

          {/* Join Team */}
          <div className="bg-surface border border-border-subtle rounded-2xl p-6 space-y-6">
            <div className="flex items-center space-x-3 text-emerald-400">
              <Users className="w-6 h-6" />
              <h2 className="text-xl font-bold text-white">Join Existing Team</h2>
            </div>
            <p className="text-xs text-gray-400 leading-relaxed">
              Have an invitation code from your teammate? Enter the 6-character code below to join their roster.
            </p>

            <form onSubmit={handleJoinTeam} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  6-Character Join Code
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  placeholder="e.g. RAPTOR"
                  value={joinCodeInput}
                  onChange={(e) => setJoinCodeInput(e.target.value.toUpperCase())}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-canvas border border-border-subtle text-lg font-mono tracking-widest text-center text-white placeholder-gray-500 focus:outline-none focus:border-blue-500 uppercase"
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-2.5 rounded-xl bg-surface-raised hover:bg-surface border border-border-subtle text-white font-semibold text-sm transition-all disabled:opacity-50"
              >
                {submitting ? 'Joining...' : 'Join Team'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
