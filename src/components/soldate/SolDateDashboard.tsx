"use client"
import React, { useState, useMemo } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { useSoldateProgram, useSoldateProgramAccount } from './soldate-data-access';
import { Heart, MessageCircle, X, Settings, User, MapPin, Calendar, Edit, Send } from 'lucide-react';
import { WalletButton } from '../solana/solana-provider';
import BN from 'bn.js';

// Type definitions
interface UserProfileData {
  owner: PublicKey;
  name: string;
  age: number;
  bio: string;
  interests: string[];
  location: string;
  isActive: boolean;
  createdAt: BN;
  matches: PublicKey[];
  bump: number;
}

interface UserProfileAccount {
  publicKey: PublicKey;
  account: UserProfileData;
}

interface MessageData {
  sender: PublicKey;
  content: string;
  timestamp: BN
  bump: number;
}

interface MessageAccount {
  publicKey: PublicKey;
  account: MessageData;
}

interface MessageRef {
  messagePda: PublicKey;
  sender: PublicKey;
  timestamp: BN
}

interface MatchData {
  user1: PublicKey;
  user2: PublicKey;
  createdAt: BN;
  isActive: boolean;
  messageCount: number;
  messages: MessageRef[];
  bump: number;
}

interface MatchAccount {
  publicKey: PublicKey;
  account: MatchData;
}

interface UserMatch {
  matchAccount: MatchAccount;
  otherUser: UserProfileData;
  otherUserId: PublicKey;
}

interface CreateProfileFormData {
  name: string;
  age: number;
  bio: string;
  interests: string;
  location: string;
}

type ActiveTab = 'discover' | 'matches' | 'profile';

export default function SolDateDashboard() {
  const { publicKey, connected } = useWallet();
  const [activeTab, setActiveTab] = useState<ActiveTab>('discover');
  const [selectedProfile, setSelectedProfile] = useState<UserProfileData | null>(null);
  const [showCreateProfile, setShowCreateProfile] = useState(false);
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [chatUser, setChatUser] = useState<UserMatch | null>(null);
  const [messageContent, setMessageContent] = useState('');

  const {
    userProfileAccounts,
    likeAccounts,
    matchAccounts,
    messageAccounts,
    createUserProfile
  } = useSoldateProgram();

  const programAccount = useSoldateProgramAccount({ 
    account: publicKey || new PublicKey('11111111111111111111111111111111') 
  });

  // Find current user's profile
  const currentUserProfile = useMemo((): UserProfileAccount | null => {
    if (!publicKey || !userProfileAccounts.data) return null;
    return userProfileAccounts.data.find((profile: UserProfileAccount) => 
      profile.account.owner.equals(publicKey)
    ) || null;
  }, [publicKey, userProfileAccounts.data]);

  // Get other user profiles for discovery (excluding users we've already liked)
  const otherProfiles = useMemo((): UserProfileAccount[] => {
    if (!publicKey || !userProfileAccounts.data) return [];
    
    // Get list of users we've already liked
    const likedUsers = likeAccounts.data?.filter((like: any) => 
      like.account.sender.equals(publicKey)
    ).map((like: any) => like.account.receiver.toString()) || [];

    // Get list of users we're already matched with
    const matchedUsers = matchAccounts.data?.filter((match: MatchAccount) => 
      match.account.user1.equals(publicKey) || match.account.user2.equals(publicKey)
    ).map((match: MatchAccount) => {
      const otherUserId = match.account.user1.equals(publicKey) 
        ? match.account.user2 
        : match.account.user1;
      return otherUserId.toString();
    }) || [];

    return userProfileAccounts.data.filter((profile: UserProfileAccount) => 
      !profile.account.owner.equals(publicKey) && 
      profile.account.isActive &&
      !likedUsers.includes(profile.account.owner.toString()) &&
      !matchedUsers.includes(profile.account.owner.toString())
    );
  }, [publicKey, userProfileAccounts.data, likeAccounts.data, matchAccounts.data]);

  // Get user's matches - fixed logic
  const userMatches = useMemo((): UserMatch[] => {
    if (!publicKey || !matchAccounts.data || !userProfileAccounts.data) return [];
    
    const matches = matchAccounts.data.filter((match: MatchAccount) => 
      match.account.user1.equals(publicKey) || match.account.user2.equals(publicKey)
    );

    return matches.map((match: MatchAccount) => {
      const otherUserId = match.account.user1.equals(publicKey) 
        ? match.account.user2 
        : match.account.user1;
      
      const otherUserProfile = userProfileAccounts.data.find((profile: UserProfileAccount) => 
        profile.account.owner.equals(otherUserId)
      );

      return {
        matchAccount: match,
        otherUser: otherUserProfile?.account,
        otherUserId
      };
    }).filter((match): match is UserMatch => Boolean(match.otherUser));
  }, [publicKey, matchAccounts.data, userProfileAccounts.data]);

  // Get messages for a specific match
  const getMessagesForMatch = (matchPubkey: PublicKey): MessageAccount[] => {
    if (!messageAccounts.data) return [];
    return messageAccounts.data
      .filter((msg: MessageAccount) => {
        // Check if message belongs to this match by looking at message references in match
        const match = matchAccounts.data?.find((m: MatchAccount) => m.publicKey.equals(matchPubkey));
        return match?.account.messages.some((ref: MessageRef) => ref.messagePda.equals(msg.publicKey));
      })
      .sort((a: MessageAccount, b: MessageAccount) => 
        a.account.timestamp.toNumber() - b.account.timestamp.toNumber()
      );
  };

  const CreateProfileModal = () => {
    const [formData, setFormData] = useState<CreateProfileFormData>({
      name: '',
      age: 18,
      bio: '',
      interests: '',
      location: ''
    });

    const handleSubmit = async () => {
      if (!publicKey) return;

      const interests = formData.interests.split(',').map(i => i.trim()).filter(i => i);
      
      if (!formData.name.trim()) {
        alert('Name is required and cannot be empty');
        return;
      }

      try {
        await createUserProfile.mutateAsync({
          name: formData.name.trim(),
          age: formData.age,
          bio: formData.bio,
          interests,
          location: formData.location,
          userPubkey: publicKey
        });
        setShowCreateProfile(false);
        setFormData({ name: '', age: 18, bio: '', interests: '', location: '' });
      } catch (error) {
        console.error('Failed to create profile:', error);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-pink-400">Create Your Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-pink-400">Name</label>
              <input
                type="text"
                maxLength={32}
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-2 border rounded-lg text-pink-400 outline-0 border-pink-300"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-pink-400">Age</label>
              <input
                type="number"
                min={18}
                required
                value={formData.age}
                onChange={(e) => setFormData({...formData, age: parseInt(e.target.value)})}
                className="w-full p-2 border rounded-lg text-pink-400 outline-0 border-pink-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-pink-400">Bio</label>
              <textarea
                maxLength={100}
                required
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                className="w-full p-2 border rounded-lg h-24 text-pink-400 outline-0 border-pink-300"
                placeholder="Tell us about yourself..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-pink-400">Interests (comma separated)</label>
              <input
                type="text"
                value={formData.interests}
                onChange={(e) => setFormData({...formData, interests: e.target.value})}
                className="w-full p-2 border rounded-lg text-pink-400 outline-0 border-pink-300" 
                placeholder="Gaming, Music, Travel"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-pink-400">Location</label>
              <input
                type="text"
                maxLength={32}
                required
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="w-full p-2 border rounded-lg text-pink-400 outline-0 border-pink-300"
                placeholder="Country"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowCreateProfile(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={createUserProfile.isPending}
                className="flex-1 bg-pink-500 text-white py-2 rounded-lg hover:bg-pink-600 disabled:opacity-50"
              >
                {createUserProfile.isPending ? 'Creating...' : 'Create Profile'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const UpdateProfileModal = () => {
    const [formData, setFormData] = useState<CreateProfileFormData>(() => {
      if (currentUserProfile) {
        return {
          name: currentUserProfile.account.name,
          age: currentUserProfile.account.age,
          bio: currentUserProfile.account.bio,
          interests: currentUserProfile.account.interests.join(', '),
          location: currentUserProfile.account.location
        };
      }
      return {
        name: '',
        age: 18,
        bio: '',
        interests: '',
        location: ''
      };
    });

    interface UpdateUserProfileArgs {
      name?: string | null, 
      age?: number | null, 
      bio?: string | null, 
      interests?: string[] | null, 
      location?: string | null, 
      userPubkey: PublicKey
    }

    const handleSubmit = async () => {
      if (!publicKey || !currentUserProfile) return;

      const updateData: UpdateUserProfileArgs = {
        userPubkey: publicKey,
        name: formData.name.trim() !== currentUserProfile.account.name ? formData.name.trim() || null : null,
        age: formData.age !== currentUserProfile.account.age ? formData.age : null,
        bio: formData.bio !== currentUserProfile.account.bio ? formData.bio || null : null,
        interests: (() => {
          const newInterests = formData.interests.split(',').map(i => i.trim()).filter(i => i);
          const currentInterests = currentUserProfile.account.interests;
          if (JSON.stringify(newInterests) !== JSON.stringify(currentInterests)) {
            return newInterests.length > 0 ? newInterests : null;
          }
          return null;
        })(),
        location: formData.location !== currentUserProfile.account.location ? formData.location || null : null
      };

      try {
        await programAccount.updateUserProfile.mutateAsync(updateData);
        setShowEditProfile(false);
      } catch (error) {
        console.error('Failed to update profile:', error);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <h2 className="text-2xl font-bold mb-4 text-pink-400">Update Your Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1 text-pink-400">Name</label>
              <input
                type="text"
                maxLength={32}
                required
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full p-2 border rounded-lg text-pink-400 outline-0 border-pink-300"
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-pink-400">Age</label>
              <input
                type="number"
                min={18}
                required
                value={formData.age}
                onChange={(e) => setFormData({...formData, age: parseInt(e.target.value)})}
                className="w-full p-2 border rounded-lg text-pink-400 outline-0 border-pink-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-pink-400">Bio</label>
              <textarea
                maxLength={100}
                required
                value={formData.bio}
                onChange={(e) => setFormData({...formData, bio: e.target.value})}
                className="w-full p-2 border rounded-lg h-24 text-pink-400 outline-0 border-pink-300"
                placeholder="Tell us about yourself..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-pink-400">Interests (comma separated)</label>
              <input
                type="text"
                value={formData.interests}
                onChange={(e) => setFormData({...formData, interests: e.target.value})}
                className="w-full p-2 border rounded-lg text-pink-400 outline-0 border-pink-300" 
                placeholder="Gaming, Music, Travel"
              />  
            </div>
            <div>
              <label className="block text-sm font-medium mb-1 text-pink-400">Location</label>
              <input
                type="text"
                maxLength={32}
                required
                value={formData.location}
                onChange={(e) => setFormData({...formData, location: e.target.value})}
                className="w-full p-2 border rounded-lg text-pink-400 outline-0 border-pink-300"
                placeholder="Country"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowEditProfile(false)}
                className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={programAccount.updateUserProfile.isPending}
                className="flex-1 bg-pink-500 text-white py-2 rounded-lg hover:bg-pink-600 disabled:opacity-50"
              >
                {programAccount.updateUserProfile.isPending ? 'Updating...' : 'Update Profile'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  interface ProfileCardProps {
    profile: UserProfileData;
    onLike?: (profile: UserProfileData) => void;
    onPass?: (profile: UserProfileData) => void;
    showActions?: boolean;
  }

  const ProfileCard = ({ profile, onLike, onPass, showActions = true }: ProfileCardProps) => (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-sm mx-auto">
      <div className="h-64 bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
        <User size={80} className="text-white" />
      </div>
      <div className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-2xl text-pink-500 font-bold">{profile.name}</h3>
          <span className="text-gray-600">{profile.age}</span>
        </div>
        <div className="flex items-center text-gray-600 mb-3">
          <MapPin size={16} className="mr-1" />
          <span className="text-sm">{profile.location}</span>
        </div>
        <p className="text-gray-700 mb-4">{profile.bio}</p>
        {profile.interests.length > 0 && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-2">
              {profile.interests.map((interest, index) => (
                <span
                  key={index}
                  className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full text-xs"
                >
                  {interest}
                </span>
              ))}
            </div>
          </div>
        )}
        {showActions && (
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => onPass?.(profile)}
              className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
              disabled={programAccount.likeUserProfile.isPending}
            >
              <X size={24} className="text-gray-600" />
            </button>
            <button
              onClick={() => onLike?.(profile)}
              disabled={programAccount.likeUserProfile.isPending}
              className="p-3 bg-pink-100 rounded-full hover:bg-pink-200 transition-colors disabled:opacity-50"
            >
              {programAccount.likeUserProfile.isPending ? (
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-pink-500"></div>
              ) : (
                <Heart size={24} className="text-pink-500" />
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );

  interface ChatWindowProps {
    match: UserMatch;
  }

  const ChatWindow = ({ match }: ChatWindowProps) => {
    const messages = getMessagesForMatch(match.matchAccount.publicKey);

    const handleSendMessage = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!messageContent.trim() || !publicKey) return;

      try {
        await programAccount.sendMessages.mutateAsync({
          content: messageContent,
          userPubkey: publicKey,
          toUserPubkey: match.otherUserId
        });
        setMessageContent('');
      } catch (error) {
        console.error('Failed to send message:', error);
      }
    };

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center p-4 bg-white border-b">
          <button
            onClick={() => setChatUser(null)}
            className="mr-3 p-1 hover:bg-gray-100 rounded"
          >
            ←
          </button>
          <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center mr-3">
            <User size={20} className="text-white" />
          </div>
          <div>
            <h3 className="font-semibold">{match.otherUser.name}</h3>
            <p className="text-sm text-gray-600">{match.otherUser.location}</p>
          </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((message) => {
            const isOwn = message.account.sender.equals(publicKey!);
            return (
              <div
                key={message.publicKey.toString()}
                className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-xs px-4 py-2 rounded-lg ${
                    isOwn
                      ? 'bg-pink-500 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  <p>{message.account.content}</p>
                  <p className="text-xs opacity-70 mt-1">
                    {new Date(message.account.timestamp.toNumber() * 1000).toLocaleTimeString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 bg-white border-t">
          <form onSubmit={handleSendMessage} className="flex gap-2">
            <input
              type="text"
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Type a message..."
              maxLength={200}
              className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
            />
            <button
              type="submit"
              disabled={!messageContent.trim() || programAccount.sendMessages.isPending}
              className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50"
            >
              <Send size={20} />
            </button>
          </form>
        </div>
      </div>
    );
  };

  if (!connected) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
        <div className="text-center">
          <Heart size={64} className="text-pink-500 mx-auto mb-4" />
          <h1 className="text-4xl font-bold text-pink-500 mb-2">SolDate</h1>
          <p className="text-gray-600">Please connect your wallet to continue</p>
          <div className='flex justify-center'>
            <WalletButton />
          </div>
        </div>
      </div>
    );
  }

  if (!currentUserProfile && !showCreateProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
          <Heart size={64} className="text-pink-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-4 text-pink-500">Welcome to SolDate!</h2>
          <p className="text-gray-600 mb-6">Create your profile to start meeting amazing people on Solana</p>
          <button
            onClick={() => setShowCreateProfile(true)}
            className="w-full bg-pink-500 text-white py-3 rounded-lg hover:bg-pink-600 transition-colors"
          >
            Create Profile
          </button>
        </div>
        {showCreateProfile && <CreateProfileModal />}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100">
      {showCreateProfile && <CreateProfileModal />}
      {showEditProfile && <UpdateProfileModal />}
      
      {chatUser ? (
        <div className="h-screen">
          <ChatWindow match={chatUser} />
        </div>
      ) : (
        <>
          {/* Header */}
          <div className="bg-white shadow-sm">
            <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
              <div className="flex items-center">
                <Heart size={32} className="text-pink-500 mr-2" />
                <h1 className="text-2xl font-bold text-pink-500">SolDate</h1>
              </div>
              {currentUserProfile && (
                <div className="flex items-center gap-4">
                  <span className="text-pink-500">Welcome, {currentUserProfile.account.name}!</span>
                  <button
                    onClick={() => setShowEditProfile(true)}
                    className="p-2 text-pink-500 hover:bg-gray-100 rounded-full"
                  >
                    <Settings size={20} />
                  </button>
                  <WalletButton />
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <div className="bg-white border-b">
            <div className="max-w-6xl mx-auto px-4">
              <div className="flex space-x-8">
                {(['discover', 'matches', 'profile'] as const).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`py-4 px-2 border-b-2 font-medium capitalize ${
                      activeTab === tab
                        ? 'border-pink-500 text-pink-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="max-w-6xl mx-auto px-4 py-8">
            {activeTab === 'discover' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-center text-gray-800">Discover People</h2>
                {userProfileAccounts.isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading profiles...</p>
                  </div>
                ) : otherProfiles.length === 0 ? (
                  <div className="text-center py-12">
                    <User size={64} className="text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No new profiles to show right now. Check back later!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {otherProfiles.map((profile) => (
                      <ProfileCard
                        key={profile.publicKey.toString()}
                        profile={profile.account}
                        onLike={() => programAccount.likeUserProfile.mutate({
                          likedUserPubkey: profile.account.owner,
                          userPubkey: publicKey!
                        })}
                        onPass={() => {}}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'matches' && (
              <div className="space-y-8">
                <h2 className="text-2xl font-bold text-center text-gray-800">Your Matches</h2>
                {matchAccounts.isLoading ? (
                  <div className="text-center py-8">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading matches...</p>
                  </div>
                ) : userMatches.length === 0 ? (
                  <div className="text-center py-12">
                    <Heart size={64} className="text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">No matches yet. Keep swiping!</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {userMatches.map((match) => (
                      <div
                        key={match.matchAccount.publicKey.toString()}
                        className="bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
                        onClick={() => setChatUser(match)}
                      >
                        <div className="h-48 bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
                          <User size={60} className="text-white" />
                        </div>
                        <div className="p-4">
                          <h3 className="text-xl font-bold mb-2">{match.otherUser.name}</h3>
                          <p className="text-gray-600 text-sm mb-2">{match.otherUser.location}</p>
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500">
                              {match.matchAccount.account.messageCount} messages
                            </span>
                            <MessageCircle size={20} className="text-pink-500" />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'profile' && currentUserProfile && (
              <div className="max-w-2xl mx-auto">
                <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">Your Profile</h2>
                <div className="bg-white rounded-xl shadow-lg p-8">
                  <div className="text-center mb-6">
                    <div className="w-24 h-24 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                      <User size={40} className="text-white" />
                    </div>
                    <h3 className="text-2xl text-pink-500 font-bold">{currentUserProfile.account.name}, {currentUserProfile.account.age}</h3>
                    <p className="text-gray-600 flex items-center justify-center mt-1">
                      <MapPin size={16} className="mr-1" />
                      {currentUserProfile.account.location}
                    </p>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-800 mb-2">Bio</h4>
                      <p className="text-gray-600">{currentUserProfile.account.bio}</p>
                    </div>
                    
                    {currentUserProfile.account.interests.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-800 mb-2">Interests</h4>
                        <div className="flex flex-wrap gap-2">
                          {currentUserProfile.account.interests.map((interest, index) => (
                            <span
                              key={index}
                              className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm"
                            >
                              {interest}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="pt-4 border-t">
                      <div className="flex justify-between text-sm text-gray-600">
                        <span>Member since: {new Date(currentUserProfile.account.createdAt.toNumber() * 1000).toLocaleDateString()}</span>
                        <span>{userMatches.length} matches</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 text-center">
                    <button
                      onClick={() => setShowEditProfile(true)}
                      className="bg-pink-500 text-white px-6 py-2 rounded-lg hover:bg-pink-600 transition-colors"
                    >
                      <Edit size={16} className="inline mr-2" />
                      Edit Profile
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// "use client"
// import React, { useState, useMemo } from 'react';
// import { useWallet } from '@solana/wallet-adapter-react';
// import { PublicKey } from '@solana/web3.js';
// import { useSoldateProgram, useSoldateProgramAccount } from './soldate-data-access';
// import { Heart, MessageCircle, X, Settings, User, MapPin, Calendar, Edit, Send } from 'lucide-react';
// import { WalletButton } from '../solana/solana-provider';
// import BN from 'bn.js';

// // Type definitions
// interface UserProfileData {
//   owner: PublicKey;
//   name: string;
//   age: number;
//   bio: string;
//   interests: string[];
//   location: string;
//   isActive: boolean;
//   createdAt: BN;
//   matches: PublicKey[];
//   bump: number;
// }

// interface UserProfileAccount {
//   publicKey: PublicKey;
//   account: UserProfileData;
// }

// interface MessageData {
//   sender: PublicKey;
//   content: string;
//   timestamp: BN
//   bump: number;
// }

// interface MessageAccount {
//   publicKey: PublicKey;
//   account: MessageData;
// }

// interface MessageRef {
//   messagePda: PublicKey;
//   sender: PublicKey;
//   timestamp: BN
// }

// interface MatchData {
//   user1: PublicKey;
//   user2: PublicKey;
//   createdAt: BN;
//   isActive: boolean;
//   messageCount: number;
//   messages: MessageRef[];
//   bump: number;
// }

// interface MatchAccount {
//   publicKey: PublicKey;
//   account: MatchData;
// }

// interface UserMatch {
//   matchAccount: MatchAccount;
//   otherUser: UserProfileData;
//   otherUserId: PublicKey;
// }

// interface CreateProfileFormData {
//   name: string;
//   age: number;
//   bio: string;
//   interests: string;
//   location: string;
// }

// type ActiveTab = 'discover' | 'matches' | 'profile';

// interface UserMatchType {
//     publicKey: PublicKey,
//     account: {
//         user1: PublicKey;
//         user2: PublicKey;
//         createdAt: number;
//         isActive: boolean;
//         messageCount: number;
//         messages: {
//             messagePda: PublicKey;
//             sender: PublicKey;
//             timestamp: BN;
//         };
//         bump: number;
//     }
// }

// export default function SolDateDashboard() {
//   const { publicKey, connected } = useWallet();
//   const [activeTab, setActiveTab] = useState<ActiveTab>('discover');
//   const [selectedProfile, setSelectedProfile] = useState<UserProfileData | null>(null);
//   const [showCreateProfile, setShowCreateProfile] = useState(false);
//   const [showEditProfile, setShowEditProfile] = useState(false);
// //   const [chatUser, setChatUser] = useState<UserMatch | null>(null);
//   const [chatUser, setChatUser] = useState<UserMatchType | null>(null);
//   const [messageContent, setMessageContent] = useState('');

//   const {
//     userProfileAccounts,
//     likeAccounts,
//     matchAccounts,
//     messageAccounts,
//     createUserProfile
//   } = useSoldateProgram();

//   const programAccount = useSoldateProgramAccount({ 
//     account: publicKey || new PublicKey('11111111111111111111111111111111') 
//   });

//   // Find current user's profile
//   const currentUserProfile = useMemo((): UserProfileAccount | null => {
//     if (!publicKey || !userProfileAccounts.data) return null;
//     return userProfileAccounts.data.find((profile: UserProfileAccount) => 
//       profile.account.owner.equals(publicKey)
//     ) || null;
//   }, [publicKey, userProfileAccounts.data]);

//   // Get other user profiles for discovery
//   const otherProfiles = useMemo((): UserProfileAccount[] => {
//     if (!publicKey || !userProfileAccounts.data) return [];
//     return userProfileAccounts.data.filter((profile: UserProfileAccount) => 
//       !profile.account.owner.equals(publicKey) && profile.account.isActive
//     );
//   }, [publicKey, userProfileAccounts.data]);

//   // Get user's matches
//   const userMatches = useMemo((): UserMatch[] => {
//     if (!publicKey || !matchAccounts.data || !userProfileAccounts.data) return [];
    
//     const matches = matchAccounts.data.filter((match: MatchAccount) => 
//       match.account.user1.equals(publicKey) || match.account.user2.equals(publicKey)
//     );

//     return matches.map((match: MatchAccount) => {
//       const otherUserId = match.account.user1.equals(publicKey) 
//         ? match.account.user2 
//         : match.account.user1;
      
//       const otherUserProfile = userProfileAccounts.data.find((profile: UserProfileAccount) => 
//         profile.account.owner.equals(otherUserId)
//       );

//       return {
//         matchAccount: match,
//         otherUser: otherUserProfile?.account,
//         otherUserId
//       };
//     }).filter((match): match is UserMatch => Boolean(match.otherUser));
//   }, [publicKey, matchAccounts.data, userProfileAccounts.data]);

//   // Get messages for a specific match
//   const getMessagesForMatch = (matchPubkey: PublicKey): MessageAccount[] => {
//     if (!messageAccounts.data) return [];
//     return messageAccounts.data
//       .filter((msg: MessageAccount) => {
//         // Check if message belongs to this match by looking at message references in match
//         const match = matchAccounts.data?.find((m: MatchAccount) => m.publicKey.equals(matchPubkey));
//         return match?.account.messages.some((ref: MessageRef) => ref.messagePda.equals(msg.publicKey));
//       })
//       .sort((a: MessageAccount, b: MessageAccount) => 
//         a.account.timestamp.toNumber() - b.account.timestamp.toNumber()
//       );
//   };

//   const CreateProfileModal = () => {
//     const [formData, setFormData] = useState<CreateProfileFormData>({
//       name: '',
//       age: 18,
//       bio: '',
//       interests: '',
//       location: ''
//     });

//     const handleSubmit = async () => {
//       if (!publicKey) return;

//       const interests = formData.interests.split(',').map(i => i.trim()).filter(i => i);
      
//       if (!formData.name.trim()) {
//         alert('Name is required and cannot be empty');
//         return;
//       }

//       try {
//         await createUserProfile.mutateAsync({
//           name: formData.name.trim(),
//           age: formData.age,
//           bio: formData.bio,
//           interests,
//           location: formData.location,
//           userPubkey: publicKey
//         });
//         setShowCreateProfile(false);
//         setFormData({ name: '', age: 18, bio: '', interests: '', location: '' });
//       } catch (error) {
//         console.error('Failed to create profile:', error);
//       }
//     };

//     return (
//       <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//         <div className="bg-white rounded-lg p-6 w-full max-w-md">
//           <h2 className="text-2xl font-bold mb-4 text-pink-400">Create Your Profile</h2>
//           <div className="space-y-4">
//             <div>
//               <label className="block text-sm font-medium mb-1 text-pink-400">Name</label>
//               <input
//                 type="text"
//                 maxLength={32}
//                 required
//                 value={formData.name}
//                 onChange={(e) => setFormData({...formData, name: e.target.value})}
//                 className="w-full p-2 border rounded-lg text-pink-400 outline-0 border-pink-300"
//                 placeholder="Your name"
//               />
//             </div>
//             <div>
//               <label className="block text-sm font-medium mb-1 text-pink-400">Age</label>
//               <input
//                 type="number"
//                 min={18}
//                 required
//                 value={formData.age}
//                 onChange={(e) => setFormData({...formData, age: parseInt(e.target.value)})}
//                 className="w-full p-2 border rounded-lg text-pink-400 outline-0 border-pink-300"
//               />
//             </div>
//             <div>
//               <label className="block text-sm font-medium mb-1 text-pink-400">Bio</label>
//               <textarea
//                 maxLength={100}
//                 required
//                 value={formData.bio}
//                 onChange={(e) => setFormData({...formData, bio: e.target.value})}
//                 className="w-full p-2 border rounded-lg h-24 text-pink-400 outline-0 border-pink-300"
//                 placeholder="Tell us about yourself..."
//               />
//             </div>
//             <div>
//               <label className="block text-sm font-medium mb-1 text-pink-400">Interests (comma separated)</label>
//               <input
//                 type="text"
//                 value={formData.interests}
//                 onChange={(e) => setFormData({...formData, interests: e.target.value})}
//                 className="w-full p-2 border rounded-lg text-pink-400 outline-0 border-pink-300" 
//                 placeholder="Gaming, Music, Travel"
//               />
//             </div>
//             <div>
//               <label className="block text-sm font-medium mb-1 text-pink-400">Location</label>
//               <input
//                 type="text"
//                 maxLength={32}
//                 required
//                 value={formData.location}
//                 onChange={(e) => setFormData({...formData, location: e.target.value})}
//                 className="w-full p-2 border rounded-lg text-pink-400 outline-0 border-pink-300"
//                 placeholder="Country"
//               />
//             </div>
//             <div className="flex gap-2">
//               <button
//                 type="button"
//                 onClick={() => setShowCreateProfile(false)}
//                 className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
//               >
//                 Cancel
//               </button>
//               <button
//                 type="button"
//                 onClick={handleSubmit}
//                 disabled={createUserProfile.isPending}
//                 className="flex-1 bg-pink-500 text-white py-2 rounded-lg hover:bg-pink-600 disabled:opacity-50"
//               >
//                 {createUserProfile.isPending ? 'Creating...' : 'Create Profile'}
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
//   };

//     const UpdateProfileModal = () => {
//         const [formData, setFormData] = useState<CreateProfileFormData>(() => {
//             // Initialize form with current profile data
//             if (currentUserProfile) {
//                 return {
//                     name: currentUserProfile.account.name,
//                     age: currentUserProfile.account.age,
//                     bio: currentUserProfile.account.bio,
//                     interests: currentUserProfile.account.interests.join(', '),
//                     location: currentUserProfile.account.location
//                 };
//             }
//             return {
//                 name: '',
//                 age: 18,
//                 bio: '',
//                 interests: '',
//                 location: ''
//             };
//         });

//         interface UpdateUserProfileArgs {
//             name?: string | null, 
//             age?: number | null, 
//             bio?: string | null, 
//             interests?: string[] | null, 
//             location?: string | null, 
//             userPubkey: PublicKey
//         }

//         const handleSubmit = async () => {
//             if (!publicKey || !currentUserProfile) return;
    
//             // Prepare update data - only include fields that have changed or are not empty
//             const updateData: UpdateUserProfileArgs = {
//                 userPubkey: publicKey,
//                 name: formData.name.trim() !== currentUserProfile.account.name ? formData.name.trim() || null : null,
//                 age: formData.age !== currentUserProfile.account.age ? formData.age : null,
//                 bio: formData.bio !== currentUserProfile.account.bio ? formData.bio || null : null,
//                 interests: (() => {
//                     const newInterests = formData.interests.split(',').map(i => i.trim()).filter(i => i);
//                     const currentInterests = currentUserProfile.account.interests;
//                     // Compare arrays
//                     if (JSON.stringify(newInterests) !== JSON.stringify(currentInterests)) {
//                         return newInterests.length > 0 ? newInterests : null;
//                     }
//                     return null;
//                 })(),
//                 location: formData.location !== currentUserProfile.account.location ? formData.location || null : null
//             };
    
//             try {
//                 await programAccount.updateUserProfile.mutateAsync(updateData);
//                 setShowEditProfile(false);
//             } catch (error) {
//                 console.error('Failed to update profile:', error);
//             }
//         };

//         return (
//             <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
//                 <div className="bg-white rounded-lg p-6 w-full max-w-md">
//                     <h2 className="text-2xl font-bold mb-4 text-pink-400">Update Your Profile</h2>
//                     <div className="space-y-4">
//                         <div>
//                             <label className="block text-sm font-medium mb-1 text-pink-400">Name</label>
//                             <input
//                                 type="text"
//                                 maxLength={32}
//                                 required
//                                 value={formData.name}
//                                 onChange={(e) => setFormData({...formData, name: e.target.value})}
//                                 className="w-full p-2 border rounded-lg text-pink-400 outline-0 border-pink-300"
//                                 placeholder="Your name"
//                             />
//                         </div>
//                         <div>
//                             <label className="block text-sm font-medium mb-1 text-pink-400">Age</label>
//                             <input
//                                 type="number"
//                                 min={18}
//                                 required
//                                 value={formData.age}
//                                 onChange={(e) => setFormData({...formData, age: parseInt(e.target.value)})}
//                                 className="w-full p-2 border rounded-lg text-pink-400 outline-0 border-pink-300"
//                             />
//                         </div>
//                         <div>
//                             <label className="block text-sm font-medium mb-1 text-pink-400">Bio</label>
//                             <textarea
//                                 maxLength={100}
//                                 required
//                                 value={formData.bio}
//                                 onChange={(e) => setFormData({...formData, bio: e.target.value})}
//                                 className="w-full p-2 border rounded-lg h-24 text-pink-400 outline-0 border-pink-300"
//                                 placeholder="Tell us about yourself..."
//                             />
//                         </div>
//                         <div>
//                             <label className="block text-sm font-medium mb-1 text-pink-400">Interests (comma separated)</label>
//                             <input
//                                 type="text"
//                                 value={formData.interests}
//                                 onChange={(e) => setFormData({...formData, interests: e.target.value})}
//                                 className="w-full p-2 border rounded-lg text-pink-400 outline-0 border-pink-300" 
//                                 placeholder="Gaming, Music, Travel"
//                             />  
//                         </div>
//                         <div>
//                             <label className="block text-sm font-medium mb-1 text-pink-400">Location</label>
//                             <input
//                                 type="text"
//                                 maxLength={32}
//                                 required
//                                 value={formData.location}
//                                 onChange={(e) => setFormData({...formData, location: e.target.value})}
//                                 className="w-full p-2 border rounded-lg text-pink-400 outline-0 border-pink-300"
//                                 placeholder="Country"
//                             />
//                         </div>
//                         <div className="flex gap-2">
//                             <button
//                                 type="button"
//                                 onClick={() => setShowEditProfile(false)} // Fixed: was using setShowCreateProfile
//                                 className="flex-1 bg-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-400"
//                             >
//                                 Cancel
//                             </button>
//                             <button
//                                 type="button"
//                                 onClick={handleSubmit}
//                                 disabled={programAccount.updateUserProfile.isPending} // Fixed: was using createUserProfile
//                                 className="flex-1 bg-pink-500 text-white py-2 rounded-lg hover:bg-pink-600 disabled:opacity-50"
//                             >
//                                 {programAccount.updateUserProfile.isPending ? 'Updating...' : 'Update Profile'} {/* Fixed: was using createUserProfile */}
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//             </div>
//         );
//     };

//   interface ProfileCardProps {
//     profile: UserProfileData;
//     onLike?: (profile: UserProfileData) => void;
//     onPass?: (profile: UserProfileData) => void;
//     showActions?: boolean;
//   }

//   const ProfileCard = ({ profile, onLike, onPass, showActions = true }: ProfileCardProps) => (
//     <div className="bg-white rounded-xl shadow-lg overflow-hidden max-w-sm mx-auto">
//       <div className="h-64 bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
//         <User size={80} className="text-white" />
//       </div>
//       <div className="p-6">
//         <div className="flex items-center justify-between mb-2">
//           <h3 className="text-2xl text-pink-500 font-bold">{profile.name}</h3>
//           <span className="text-gray-600">{profile.age}</span>
//         </div>
//         <div className="flex items-center text-gray-600 mb-3">
//           <MapPin size={16} className="mr-1" />
//           <span className="text-sm">{profile.location}</span>
//         </div>
//         <p className="text-gray-700 mb-4">{profile.bio}</p>
//         {profile.interests.length > 0 && (
//           <div className="mb-4">
//             <div className="flex flex-wrap gap-2">
//               {profile.interests.map((interest, index) => (
//                 <span
//                   key={index}
//                   className="px-2 py-1 bg-pink-100 text-pink-700 rounded-full text-xs"
//                 >
//                   {interest}
//                 </span>
//               ))}
//             </div>
//           </div>
//         )}
//         {showActions && (
//           <div className="flex gap-4 justify-center">
//             <button
//               onClick={() => onPass?.(profile)}
//               className="p-3 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
//             >
//               <X size={24} className="text-gray-600" />
//             </button>
//             <button
//               onClick={() => onLike?.(profile)}
//               className="p-3 bg-pink-100 rounded-full hover:bg-pink-200 transition-colors"
//             >
//               <Heart size={24} className="text-pink-500" />
//             </button>
//           </div>
//         )}
//       </div>
//     </div>
//   );

//   interface ChatWindowProps {
//     // match: UserMatch;
//     match: UserMatchType;
//   }

//   const ChatWindow = ({ match }: ChatWindowProps) => {
//     const messages = getMessagesForMatch(match.publicKey);

//     const handleSendMessage = async (e: React.FormEvent) => {
//       e.preventDefault();
//       if (!messageContent.trim() || !publicKey) return;

//       try {
//         await programAccount.sendMessages.mutateAsync({
//           content: messageContent,
//           userPubkey: publicKey,
//           toUserPubkey: match.account.user2
//         });
//         setMessageContent('');
//       } catch (error) {
//         console.error('Failed to send message:', error);
//       }
//     };

//     return (
//       <div className="flex flex-col h-full">
//         <div className="flex items-center p-4 bg-white border-b">
//           <button
//             onClick={() => setChatUser(null)}
//             className="mr-3 p-1 hover:bg-gray-100 rounded"
//           >
//             ←
//           </button>
//           <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center mr-3">
//             <User size={20} className="text-white" />
//           </div>
//           <div>
//             <h3 className="font-semibold">{match.account.user2.toBase58()}</h3>
//             {/* <p className="text-sm text-gray-600">{match.otherUser.location}</p> */}
//           </div>
//         </div>
        
//         <div className="flex-1 overflow-y-auto p-4 space-y-3">
//           {messages.map((message) => {
//             const isOwn = message.account.sender.equals(publicKey!);
//             return (
//               <div
//                 key={message.publicKey.toString()}
//                 className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
//               >
//                 <div
//                   className={`max-w-xs px-4 py-2 rounded-lg ${
//                     isOwn
//                       ? 'bg-pink-500 text-white'
//                       : 'bg-gray-200 text-gray-800'
//                   }`}
//                 >
//                   <p>{message.account.content}</p>
//                   <p className="text-xs opacity-70 mt-1">
//                     {new Date(message.account.timestamp.toNumber() * 1000).toLocaleTimeString()}
//                   </p>
//                 </div>
//               </div>
//             );
//           })}
//         </div>

//         <div className="p-4 bg-white border-t">
//           <form onSubmit={handleSendMessage} className="flex gap-2">
//             <input
//               type="text"
//               value={messageContent}
//               onChange={(e) => setMessageContent(e.target.value)}
//               placeholder="Type a message..."
//               maxLength={200}
//               className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500"
//             />
//             <button
//               type="submit"
//               disabled={!messageContent.trim() || programAccount.sendMessages.isPending}
//               className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600 disabled:opacity-50"
//             >
//               <Send size={20} />
//             </button>
//           </form>
//         </div>
//       </div>
//     );
//   };

//   if (!connected) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
//         <div className="text-center">
//           <Heart size={64} className="text-pink-500 mx-auto mb-4" />
//           <h1 className="text-4xl font-bold text-pink-500 mb-2">SolDate</h1>
//           <p className="text-gray-600">Please connect your wallet to continue</p>
//           <div className='flex justify-center'>
//             <WalletButton />
//           </div>
//         </div>
//       </div>
//     );
//   }

//   if (!currentUserProfile && !showCreateProfile) {
//     return (
//       <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100 flex items-center justify-center">
//         <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
//           <Heart size={64} className="text-pink-500 mx-auto mb-4" />
//           <h2 className="text-2xl font-bold mb-4 text-pink-500">Welcome to SolDate!</h2>
//           <p className="text-gray-600 mb-6">Create your profile to start meeting amazing people on Solana</p>
//           <button
//             onClick={() => setShowCreateProfile(true)}
//             className="w-full bg-pink-500 text-white py-3 rounded-lg hover:bg-pink-600 transition-colors"
//           >
//             Create Profile
//           </button>
//         </div>
//         {showCreateProfile && <CreateProfileModal />}
//       </div>
//     );
//   }

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-pink-100 to-purple-100">
//       {showCreateProfile && <CreateProfileModal />}
//       {showEditProfile && <UpdateProfileModal />}
      
//       {chatUser ? (
//         <div className="h-screen">
//           <ChatWindow match={chatUser} />
//         </div>
//       ) : (
//         <>
//           {/* Header */}
//           <div className="bg-white shadow-sm">
//             <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
//               <div className="flex items-center">
//                 <Heart size={32} className="text-pink-500 mr-2" />
//                 <h1 className="text-2xl font-bold text-pink-500">SolDate</h1>
//               </div>
//               {currentUserProfile && (
//                 <div className="flex items-center gap-4">
//                   <span className="text-pink-500">Welcome, {currentUserProfile.account.name}!</span>
//                   <button
//                     onClick={() => setShowEditProfile(true)}
//                     className="p-2 text-pink-500 hover:bg-gray-100 rounded-full"
//                   >
//                     <Settings size={20} />
//                   </button>
//                   <WalletButton />
//                 </div>
//               )}
//             </div>
//           </div>

//           {/* Navigation */}
//           <div className="bg-white border-b">
//             <div className="max-w-6xl mx-auto px-4">
//               <div className="flex space-x-8">
//                 {(['discover', 'matches', 'profile'] as const).map((tab) => (
//                   <button
//                     key={tab}
//                     onClick={() => setActiveTab(tab)}
//                     className={`py-4 px-2 border-b-2 font-medium capitalize ${
//                       activeTab === tab
//                         ? 'border-pink-500 text-pink-600'
//                         : 'border-transparent text-gray-500 hover:text-gray-700'
//                     }`}
//                   >
//                     {tab}
//                   </button>
//                 ))}
//               </div>
//             </div>
//           </div>

//           {/* Content */}
//           <div className="max-w-6xl mx-auto px-4 py-8">
//             {activeTab === 'discover' && (
//               <div className="space-y-8">
//                 <h2 className="text-2xl font-bold text-center text-gray-800">Discover People</h2>
//                 {userProfileAccounts.isLoading ? (
//                   <div className="text-center py-8">
//                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
//                     <p className="mt-4 text-gray-600">Loading profiles...</p>
//                   </div>
//                 ) : otherProfiles.length === 0 ? (
//                   <div className="text-center py-12">
//                     <User size={64} className="text-gray-400 mx-auto mb-4" />
//                     <p className="text-gray-600">No profiles to show right now. Check back later!</p>
//                   </div>
//                 ) : (
//                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                     {otherProfiles.map((profile) => (
//                       <ProfileCard
//                         key={profile.publicKey.toString()}
//                         profile={profile.account}
//                         onLike={() => programAccount.likeUserProfile.mutate({
//                           likedUserPubkey: profile.account.owner,
//                           userPubkey: publicKey!
//                         })}
//                         onPass={() => {}}
//                       />
//                     ))}
//                   </div>
//                 )}
//               </div>
//             )}

//             {activeTab === 'matches' && (
//               <div className="space-y-8">
//                 <h2 className="text-2xl font-bold text-center text-gray-800">Your Matches</h2>
//                 {matchAccounts.isLoading ? (
//                   <div className="text-center py-8">
//                     <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-500 mx-auto"></div>
//                     <p className="mt-4 text-gray-600">Loading matches...</p>
//                   </div>
//                 ) : userMatches.length === 0 ? (
//                   <div className="text-center py-12">
//                     {/* {JSON.stringify(matchAccounts)} */}
//                     {/* {JSON.stringify(userMatches)} */}
//                     <Heart size={64} className="text-gray-400 mx-auto mb-4" />
//                     <p className="text-gray-600">No matches yet. Keep swiping!</p>
//                   </div>
//                 ) : (
//                   <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
//                     {/* {userMatches.map((match) => (
//                       <div
//                         key={match.matchAccount.publicKey.toString()}
//                         className="bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
//                         onClick={() => setChatUser(match)}
//                       >
//                         <div className="h-48 bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
//                           <User size={60} className="text-white" />
//                         </div>
//                         <div className="p-4">
//                           <h3 className="text-xl font-bold mb-2">{match.otherUser.name}</h3>
//                           <p className="text-gray-600 text-sm mb-2">{match.otherUser.location}</p>
//                           <div className="flex items-center justify-between">
//                             <span className="text-sm text-gray-500">
//                               {match.matchAccount.account.messageCount} messages
//                             </span>
//                             <MessageCircle size={20} className="text-pink-500" />
//                           </div>
//                         </div>
//                       </div>
//                     ))} */}
//                     {matchAccounts?.data?.map((match) => (
//                       <div
//                         key={match.publicKey.toString()}
//                         className="bg-white rounded-xl shadow-lg overflow-hidden cursor-pointer hover:shadow-xl transition-shadow"
//                         onClick={() => setChatUser(match)}
//                       >
//                         <div className="h-48 bg-gradient-to-br from-pink-400 to-purple-500 flex items-center justify-center">
//                           <User size={60} className="text-white" />
//                         </div>
//                         <div className="p-4">
//                             <h3 className="text-xl font-bold mb-2">{match.account.user2.toBase58()}</h3>
//                           {/* <h3 className="text-xl font-bold mb-2">{match.otherUser.name}</h3>
//                           <p className="text-gray-600 text-sm mb-2">{match.otherUser.location}</p> */}
//                           <div className="flex items-center justify-between">
//                             <span className="text-sm text-gray-500">
//                               {match.account.messageCount} messages
//                             </span>
//                             <MessageCircle size={20} className="text-pink-500" />
//                           </div>
//                         </div>
//                       </div>
//                     ))}
//                   </div>
//                 )}
//               </div>
//             )}

//             {activeTab === 'profile' && currentUserProfile && (
//               <div className="max-w-2xl mx-auto">
//                 <h2 className="text-2xl font-bold text-center text-gray-800 mb-8">Your Profile</h2>
//                 <div className="bg-white rounded-xl shadow-lg p-8">
//                   <div className="text-center mb-6">
//                     <div className="w-24 h-24 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
//                       <User size={40} className="text-white" />
//                     </div>
//                     <h3 className="text-2xl text-pink-500 font-bold">{currentUserProfile.account.name}, {currentUserProfile.account.age}</h3>
//                     {/* {JSON.stringify(currentUserProfile)} */}
//                     <p className="text-gray-600 flex items-center justify-center mt-1">
//                       <MapPin size={16} className="mr-1" />
//                       {currentUserProfile.account.location}
//                     </p>
//                   </div>
                  
//                   <div className="space-y-4">
//                     <div>
//                       <h4 className="font-semibold text-gray-800 mb-2">Bio</h4>
//                       <p className="text-gray-600">{currentUserProfile.account.bio}</p>
//                     </div>
                    
//                     {currentUserProfile.account.interests.length > 0 && (
//                       <div>
//                         <h4 className="font-semibold text-gray-800 mb-2">Interests</h4>
//                         <div className="flex flex-wrap gap-2">
//                           {currentUserProfile.account.interests.map((interest, index) => (
//                             <span
//                               key={index}
//                               className="px-3 py-1 bg-pink-100 text-pink-700 rounded-full text-sm"
//                             >
//                               {interest}
//                             </span>
//                           ))}
//                         </div>
//                       </div>
//                     )}

//                     <div className="pt-4 border-t">
//                       <div className="flex justify-between text-sm text-gray-600">
//                         <span>Member since: {new Date(currentUserProfile.account.createdAt.toNumber() * 1000).toLocaleDateString()}</span>
//                         <span>{currentUserProfile.account.matches.length} matches</span>
//                       </div>
//                     </div>
//                   </div>
                  
//                   <div className="mt-6 text-center">
//                     <button
//                       onClick={() => setShowEditProfile(true)}
//                       className="bg-pink-500 text-white px-6 py-2 rounded-lg hover:bg-pink-600 transition-colors"
//                     >
//                       <Edit size={16} className="inline mr-2" />
//                       Edit Profile
//                     </button>
//                   </div>
//                 </div>
//               </div>
//             )}
//           </div>
//         </>
//       )}
//     </div>
//   );
// }