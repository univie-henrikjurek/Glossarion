import { useState, useEffect } from 'react';
import { useDictionaryStore } from '../../stores/dictionaryStore';
import { apiService, DictionaryMember, Invitation } from '../../services/api';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ShareModal({ isOpen, onClose }: ShareModalProps) {
  const { currentDictionary } = useDictionaryStore();
  const [members, setMembers] = useState<DictionaryMember[]>([]);
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [inviteRole, setInviteRole] = useState<'editor' | 'viewer'>('editor');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'members' | 'invite'>('members');

  useEffect(() => {
    if (isOpen && currentDictionary) {
      loadMembers();
    }
  }, [isOpen, currentDictionary]);

  const loadMembers = async () => {
    if (!currentDictionary) return;
    setIsLoading(true);
    try {
      const data = await apiService.dictionaries.members(currentDictionary.id);
      setMembers(data);
    } catch {
      console.error('Failed to load members');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateInvite = async () => {
    if (!currentDictionary) return;
    setIsLoading(true);
    try {
      const invitation: Invitation = await apiService.invitations.create(
        currentDictionary.id,
        inviteRole,
        7
      );
      const link = `${window.location.origin}/invite/${invitation.token}`;
      setInvitationLink(link);
    } catch {
      console.error('Failed to create invitation');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (invitationLink) {
      navigator.clipboard.writeText(invitationLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!currentDictionary) return;
    try {
      await apiService.dictionaries.removeMember(currentDictionary.id, userId);
      setMembers(members.filter(m => m.user_id !== userId));
    } catch {
      console.error('Failed to remove member');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-lg w-full max-w-lg border border-slate-600">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
          <h2 className="text-lg font-semibold">
            Share: {currentDictionary?.name}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setActiveTab('members')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'members'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Members ({members.length})
          </button>
          <button
            onClick={() => setActiveTab('invite')}
            className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
              activeTab === 'invite'
                ? 'text-primary-400 border-b-2 border-primary-400'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Invite
          </button>
        </div>

        <div className="p-6 max-h-96 overflow-y-auto">
          {activeTab === 'members' ? (
            <div className="space-y-3">
              {members.map(member => (
                <div
                  key={member.user_id}
                  className="flex items-center justify-between p-3 bg-slate-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-sm font-medium">
                      {member.username.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-sm font-medium">{member.username}</div>
                      <div className="text-xs text-slate-400">{member.email}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded ${
                      member.role === 'owner' 
                        ? 'bg-amber-600/30 text-amber-400'
                        : member.role === 'editor'
                        ? 'bg-blue-600/30 text-blue-400'
                        : 'bg-slate-600 text-slate-300'
                    }`}>
                      {member.role}
                    </span>
                    {member.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(member.user_id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
                        title="Remove member"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Role for invited user
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="inviteRole"
                      value="editor"
                      checked={inviteRole === 'editor'}
                      onChange={() => setInviteRole('editor')}
                      className="text-primary-500"
                    />
                    <span className="text-sm">Editor</span>
                    <span className="text-xs text-slate-400">(can add/edit entries)</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="inviteRole"
                      value="viewer"
                      checked={inviteRole === 'viewer'}
                      onChange={() => setInviteRole('viewer')}
                      className="text-primary-500"
                    />
                    <span className="text-sm">Viewer</span>
                    <span className="text-xs text-slate-400">(read-only)</span>
                  </label>
                </div>
              </div>

              {!invitationLink ? (
                <button
                  onClick={handleCreateInvite}
                  disabled={isLoading}
                  className="w-full py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-slate-600 rounded-lg font-medium transition-colors"
                >
                  {isLoading ? 'Creating link...' : 'Generate Invitation Link'}
                </button>
              ) : (
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-slate-300">
                    Share this link
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={invitationLink}
                      readOnly
                      className="flex-1 px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm"
                    />
                    <button
                      onClick={handleCopyLink}
                      className="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg font-medium transition-colors"
                    >
                      {isCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-400">
                    This link expires in 7 days. Anyone with this link can join as {inviteRole}.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
