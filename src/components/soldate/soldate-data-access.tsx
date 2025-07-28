'use client'

import { getSoldateProgram, getSoldateProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, Keypair, PublicKey, SystemProgram } from '@solana/web3.js'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useCluster } from '../cluster/cluster-data-access'
import { useAnchorProvider } from '../solana/solana-provider'
import { useTransactionToast } from '../use-transaction-toast'
import { toast } from 'sonner'
import { BN } from 'bn.js'

interface CreateUserProfileArgs {
  name: string, 
  age: number, 
  bio: string, 
  interests: string[], 
  location: string, 
  userPubkey: PublicKey
}

interface UpdateUserProfileArgs {
  name?: string, 
  age?: number, 
  bio?: string, 
  interests?: string[], 
  location?: string, 
  userPubkey: PublicKey
}

interface BlockUserProfileArgs {
  blockerPubkey: PublicKey, 
  toBlockPubkey: PublicKey
}

interface LikeUserProfileArgs {
  likedUserPubkey: PublicKey, 
  userPubkey: PublicKey
}

interface SendMessagesArgs {
  userPubkey: PublicKey
  content: string, 
  toUserPubkey: PublicKey
}

interface CreateMatchArgs {
  userPubkey: PublicKey,
  otherUserPubkey: PublicKey
}

export function useSoldateProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getSoldateProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getSoldateProgram(provider, programId), [provider, programId])

  const matchAccounts = useQuery({
    queryKey: ['match', 'all', { cluster }],
    queryFn: () => program.account.match.all(),
  })

  const blockUserAccounts = useQuery({
    queryKey: ['blockUser', 'all', { cluster }],
    queryFn: () => program.account.blockedUser.all(),
  })

  const likeAccounts = useQuery({
    queryKey: ['like', 'all', { cluster }],
    queryFn: () => program.account.like.all(),
  })

  const userProfileAccounts = useQuery({
    queryKey: ['userProfile', 'all', { cluster }],
    queryFn: () => program.account.userProfile.all(),
  })

  const messageAccounts = useQuery({
    queryKey: ['message', 'all', { cluster }],
    queryFn: () => program.account.messageAccount.all(),
  })

  const getProgramAccount = useQuery({
    queryKey: ['get-program-account', { cluster }],
    queryFn: () => connection.getParsedAccountInfo(programId),
  })

  const createUserProfile = useMutation<string, Error, CreateUserProfileArgs>({
    mutationKey: ['profile', 'initialize', { cluster }],
    mutationFn: async({ name, age, bio, interests, location, userPubkey }) => {
      const [profilePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("profile"), userPubkey.toBuffer()],
        program.programId
      );

      return await program.methods
        .createProfile(name, age, bio, interests, location)
        .accountsStrict({ 
          user: userPubkey,
          profile: profilePDA,
          systemProgram: SystemProgram.programId
        })
        .rpc()
      },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await userProfileAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to create user profile')
    },
  })

  return {
    program,
    programId,
    matchAccounts,
    likeAccounts,
    blockUserAccounts,
    userProfileAccounts,
    messageAccounts,
    getProgramAccount,
    createUserProfile,
  }
}

export function useSoldateProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { program, userProfileAccounts, likeAccounts, matchAccounts, blockUserAccounts, messageAccounts } = useSoldateProgram()

  const accountQuery = useQuery({
    queryKey: ['userProfile', 'fetch', { cluster, account }],
    queryFn: () => program.account.userProfile.fetch(account),
  })

  const updateUserProfile = useMutation<string, Error, UpdateUserProfileArgs>({
    mutationKey: ['profile', 'update', { cluster }],
    mutationFn: async({ name, age, bio, interests, location, userPubkey }) => {
      const [profilePDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("profile"), userPubkey.toBuffer()],
        program.programId
      );

      return await program.methods
        .updateProfile(
          name ?? null, 
          age ?? null, 
          bio ?? null, 
          interests ?? null, 
          location ?? null
        )
        .accountsStrict({ 
          user: userPubkey,
          profile: profilePDA,
          systemProgram: SystemProgram.programId
        })
        .rpc()
      },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await userProfileAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to update user profile')
    },
  })

  const blockUserProfile = useMutation<string, Error, BlockUserProfileArgs>({
    mutationKey: ['profile', 'block', { cluster }],
    mutationFn: async({ blockerPubkey, toBlockPubkey }) => {
      const [blockPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from("block"), blockerPubkey.toBuffer(), toBlockPubkey.toBuffer()],
        program.programId
      );

      return await program.methods
        .blockUser(toBlockPubkey)
        .accountsStrict({ 
          blocker: blockerPubkey,
          block: blockPDA,
          systemProgram: SystemProgram.programId
        })
        .rpc()
      },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await blockUserAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to block user profile')
    },
  })

  const likeUserProfile = useMutation<string, Error, LikeUserProfileArgs>({
    mutationKey: ['profile', 'like', { cluster }],
    mutationFn: async({ likedUserPubkey, userPubkey }) => {
      // Get both profile PDAs
      const [senderProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("profile"), userPubkey.toBuffer()],
        program.programId
      );

      const [targetProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("profile"), likedUserPubkey.toBuffer()],
        program.programId
      );

      // Create like PDA - sender likes target
      const [likePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("like"), userPubkey.toBuffer(), likedUserPubkey.toBuffer()],
        program.programId
      );

      // Check if reverse like exists (target likes sender)
      const [reverseLikePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("like"), likedUserPubkey.toBuffer(), userPubkey.toBuffer()],
        program.programId
      );

      // Check if reverse like account exists
      let remainingAccounts = [];
      try {
        await program.account.like.fetch(reverseLikePda);
        // If it exists, add it to remaining accounts
        remainingAccounts.push({
          pubkey: reverseLikePda,
          isWritable: false,
          isSigner: false,
        });
      } catch (error) {
        // Reverse like doesn't exist, that's okay
      }

      return await program.methods
        .sendLike(likedUserPubkey)
        .accountsStrict({ 
          sender: userPubkey,
          senderProfile: senderProfilePda,
          targetProfile: targetProfilePda,
          like: likePda,
          systemProgram: SystemProgram.programId
        })
        .remainingAccounts(remainingAccounts)
        .rpc()
      },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await likeAccounts.refetch()
      await userProfileAccounts.refetch() // Refetch profiles to update matches
    },
    onError: (error) => {
      console.error('Like error:', error)
      toast.error('Failed to like user profile')
    },
  })

  const createMatch = useMutation<string, Error, CreateMatchArgs>({
    mutationKey: ['match', 'create', { cluster }],
    mutationFn: async({ userPubkey, otherUserPubkey }) => {
      // Get like PDAs
      const [like1Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("like"), userPubkey.toBuffer(), otherUserPubkey.toBuffer()],
        program.programId
      );

      const [like2Pda] = PublicKey.findProgramAddressSync(
        [Buffer.from("like"), otherUserPubkey.toBuffer(), userPubkey.toBuffer()],
        program.programId
      );

      // Create match PDA with min/max ordering
      const minKey = userPubkey.toBase58() < otherUserPubkey.toBase58() ? userPubkey : otherUserPubkey;
      const maxKey = userPubkey.toBase58() < otherUserPubkey.toBase58() ? otherUserPubkey : userPubkey;

      const [matchPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("match"), minKey.toBuffer(), maxKey.toBuffer()],
        program.programId
      );

      return await program.methods
        .createMatch()
        .accountsStrict({
          authority: userPubkey,
          like1: like1Pda,
          like2: like2Pda,
          matchAccount: matchPda,
          systemProgram: SystemProgram.programId,
        })
        .rpc()
      },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await matchAccounts.refetch()
    },
    onError: (error) => {
      console.error('Create match error:', error)
      toast.error('Failed to create match')
    },
  })

  const sendMessages = useMutation<string, Error, SendMessagesArgs>({
    mutationKey: ['message', 'send', { cluster }],
    mutationFn: async({ content, userPubkey, toUserPubkey }) => {
      // Use min/max ordering for match PDA - same as create_match
      const minKey = userPubkey.toBase58() < toUserPubkey.toBase58() ? userPubkey : toUserPubkey;
      const maxKey = userPubkey.toBase58() < toUserPubkey.toBase58() ? toUserPubkey : userPubkey;

      const [matchPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("match"), minKey.toBuffer(), maxKey.toBuffer()],
        program.programId
      );

      // Get current match data to determine message count
      const matchData = await program.account.match.fetch(matchPda);
      const messageCount = matchData.messageCount;

      // Create message PDA - using the corrected seeds from your program
      const [messagePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("message"), 
          matchPda.toBuffer(), 
          toUserPubkey.toBuffer(), // match_account.user2 from your program
          Buffer.from(new Uint8Array(new Uint32Array([messageCount]).buffer)) // message_count as little-endian bytes
        ],
        program.programId
      );

      return await program.methods
        .sendMessage(content)
        .accountsStrict({ 
          sender: userPubkey,
          matchAccount: matchPda,
          message: messagePda,
          systemProgram: SystemProgram.programId
        })
        .rpc()
      },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await matchAccounts.refetch()
      await messageAccounts.refetch()
    },
    onError: (error) => {
      console.error('Send message error:', error)
      toast.error('Failed to send message')
    },
  })

  return {
    accountQuery,
    blockUserProfile,
    updateUserProfile,
    likeUserProfile,
    createMatch,
    sendMessages
  }
}