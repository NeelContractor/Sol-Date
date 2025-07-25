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
      toast.error('Failed to creating user profile')
    },
  })

  return {
    program,
    programId,
    matchAccounts,
    likeAccounts,
    blockUserAccounts,
    userProfileAccounts,
    getProgramAccount,
    createUserProfile,
    // blockUserProfile
  }
}

export function useSoldateProgramAccount({ account }: { account: PublicKey }) {
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const { program, userProfileAccounts, likeAccounts, matchAccounts, blockUserAccounts } = useSoldateProgram()

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
        .updateProfile(name, age, bio, interests, location)
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
      toast.error('Failed to updating user profile')
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
      const timestamp = new BN(Date.now());
    const [likePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("like"), userPubkey.toBuffer(), timestamp.toArrayLike(Buffer, 'le', 8)],
      program.programId
    );

      return await program.methods
        .sendLike(timestamp, likedUserPubkey)
        .accountsStrict({ 
          sender: userPubkey,
          like: likePda,
          systemProgram: SystemProgram.programId
        })
        .rpc()
      },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await likeAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to like user profile')
    },
  })

  const sendMessages = useMutation<string, Error, SendMessagesArgs>({
    mutationKey: ['message', 'send', { cluster }],
    mutationFn: async({ content, userPubkey, toUserPubkey }) => {
      const [matchPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("match"), userPubkey.toBuffer(), toUserPubkey.toBuffer()],
        program.programId
      );

      return await program.methods
        .sendMessage(content)
        .accountsStrict({ 
          sender: userPubkey,
          matchAccount: matchPda,
        })
        .rpc()
      },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await likeAccounts.refetch()
    },
    onError: () => {
      toast.error('Failed to sending message')
    },
  })

  return {
    accountQuery,
    blockUserProfile,
    updateUserProfile,
    likeUserProfile,
    sendMessages
  }
}
