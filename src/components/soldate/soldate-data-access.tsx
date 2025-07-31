'use client'

import { getSoldateProgram, getSoldateProgramId } from '@project/anchor'
import { useConnection } from '@solana/wallet-adapter-react'
import { Cluster, PublicKey, SystemProgram } from '@solana/web3.js'
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
  name?: string | null, 
  age?: number | null, 
  bio?: string | null, 
  interests?: string[] | null, 
  location?: string | null, 
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

// Helper function to convert number to little-endian bytes
function numberToLittleEndianBytes(num: number): Uint8Array {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setBigUint64(0, BigInt(num), true); // true for little-endian
  return new Uint8Array(buffer);
}


export function useSoldateProgram() {
  const { connection } = useConnection()
  const { cluster } = useCluster()
  const transactionToast = useTransactionToast()
  const provider = useAnchorProvider()
  const programId = useMemo(() => getSoldateProgramId(cluster.network as Cluster), [cluster])
  const program = useMemo(() => getSoldateProgram(provider, programId), [provider, programId])

  // Remove matchAccounts query as Match struct doesn't exist in contract
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
  const { program, userProfileAccounts, likeAccounts, blockUserAccounts, messageAccounts } = useSoldateProgram()

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
      // Check if user has already liked this person
      const [likePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("like"), userPubkey.toBuffer(), likedUserPubkey.toBuffer()],
        program.programId
      );

      try {
        // Check if like already exists
        await program.account.like.fetch(likePda);
        throw new Error('You have already liked this user');
      } catch (error: any) { // eslint-disable-line @typescript-eslint/no-explicit-any
        // If fetch fails, like doesn't exist - continue with creation
        if (error.message === 'You have already liked this user') {
          throw error;
        }
      }

      // Get both profile PDAs - match the test structure
      const [senderProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("profile"), userPubkey.toBuffer()],
        program.programId
      );

      const [targetProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("profile"), likedUserPubkey.toBuffer()],
        program.programId
      );

      // Check if reverse like exists (target likes sender)
      const [reverseLikePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("like"), likedUserPubkey.toBuffer(), userPubkey.toBuffer()],
        program.programId
      );

      // Check if reverse like account exists
      const remainingAccounts = [];
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
        console.log(error);
      }

      // Use the correct account names from the test
      const signature = await program.methods
        .sendLike(likedUserPubkey)
        .accountsStrict({ 
          sender: userPubkey,
          senderProfile: senderProfilePda,
          targetProfile: targetProfilePda,
          like: likePda,
          systemProgram: SystemProgram.programId
        })
        .remainingAccounts(remainingAccounts)
        .rpc();

      return signature;
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
      await likeAccounts.refetch()
      await userProfileAccounts.refetch()
    },
    onError: (error) => {
      console.error('Like error:', error)
      if (error.message === 'You have already liked this user') {
        toast.error('You have already liked this user')
      } else {
        toast.error('Failed to like user profile')
      }
    },
  })

  const sendMessages = useMutation<string, Error, SendMessagesArgs>({
    mutationKey: ['message', 'send', { cluster }],
    mutationFn: async({ content, userPubkey, toUserPubkey }) => {
      // Get profile PDAs
      const [senderProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("profile"), userPubkey.toBuffer()],
        program.programId
      );

      const [receiverProfilePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("profile"), toUserPubkey.toBuffer()],
        program.programId
      );

      // Generate message ID (timestamp based like in test)
      const messageId = Math.floor(Date.now() / 1000);
      
      // Create message PDA using the same structure as test
      // const messageIdBuffer = Buffer.allocUnsafe(8);
      // messageIdBuffer.writeBigUInt64LE(BigInt(messageId), 0);
      const messageIdBuffer = Buffer.from(numberToLittleEndianBytes(messageId));


      /**
       * TODO: Solve above 
       */

      const [messagePda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("message"),
          userPubkey.toBuffer(),
          toUserPubkey.toBuffer(),
          messageIdBuffer
        ],
        program.programId
      );

      // Get like PDAs for remaining accounts (required by contract)
      const [senderLikePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("like"), userPubkey.toBuffer(), toUserPubkey.toBuffer()],
        program.programId
      );

      const [receiverLikePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("like"), toUserPubkey.toBuffer(), userPubkey.toBuffer()],
        program.programId
      );

      return await program.methods
        .sendMessage(new BN(messageId), content)
        .accountsStrict({ 
          sender: userPubkey,
          senderProfile: senderProfilePda,
          receiverProfile: receiverProfilePda,
          message: messagePda,
          systemProgram: SystemProgram.programId
        })
        .remainingAccounts([
          {
            pubkey: senderLikePda,
            isWritable: false,
            isSigner: false,
          },
          {
            pubkey: receiverLikePda,
            isWritable: false,
            isSigner: false,
          }
        ])
        .rpc()
    },
    onSuccess: async (signature) => {
      transactionToast(signature)
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
    sendMessages
  }
}