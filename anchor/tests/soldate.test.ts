import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from '@solana/web3.js'
import { Soldate } from '../target/types/soldate'

describe('Soldate', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)

  const program = anchor.workspace.Soldate as Program<Soldate>

  const user1 = Keypair.generate();
  const user2 = Keypair.generate();
  const user3 = Keypair.generate();

  beforeAll(async() => {
    const tx1 = await provider.connection.requestAirdrop(user1.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(tx1, "confirmed");

    const tx2 = await provider.connection.requestAirdrop(user2.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(tx2, "confirmed");

    const tx3 = await provider.connection.requestAirdrop(user3.publicKey, 2 * LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(tx3, "confirmed");
  })

  it('Initialize user1 profile', async () => {
    const NAME = "FIRST_USER";
    const AGE = 21;
    const BIO = "FIRST_USER_BIO";
    const INTERESTS = ["Good", "Kind"];
    const LOCATION = "Gotham";

    const [profilePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), user1.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .createProfile(NAME, AGE, BIO, INTERESTS, LOCATION)
      .accountsStrict({
        user: user1.publicKey,
        profile: profilePDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc()

    const profile = await program.account.userProfile.fetch(profilePDA);
    console.log("user1 profile: ", profile);
  })

  it('Initialize user2 profile', async () => {
    const NAME = "SECOND_USER";
    const AGE = 19;
    const BIO = "SECOND_USER_BIO";
    const INTERESTS = ["Good", "Kind"];
    const LOCATION = "Gotham";

    const [profilePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), user2.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .createProfile(NAME, AGE, BIO, INTERESTS, LOCATION)
      .accountsStrict({
        user: user2.publicKey,
        profile: profilePDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([user2])
      .rpc()

    const profile = await program.account.userProfile.fetch(profilePDA);
    console.log("user2 profile: ", profile);
  })

  it('Initialize user3 profile', async () => {
    const NAME = "THIRD_USER";
    const AGE = 19;
    const BIO = "THIRD_USER_BIO";
    const INTERESTS = ["Good", "Kind"];
    const LOCATION = "Gotham";

    const [profilePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), user3.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .createProfile(NAME, AGE, BIO, INTERESTS, LOCATION)
      .accountsStrict({
        user: user3.publicKey,
        profile: profilePDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([user3])
      .rpc()

    const profile = await program.account.userProfile.fetch(profilePDA);
    console.log("user3 profile: ", profile);
  })

  it('update user1 profile', async () => {
    const [profilePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), user1.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .updateProfile(
        "FIRST_USER_GOAT",
        22,
        "FIRST_USER_BIO_GOAT",
        ["Good", "Kind"],
        "Gotham"
      )
      .accountsStrict({
        user: user1.publicKey,
        profile: profilePDA,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc()

    const profile = await program.account.userProfile.fetch(profilePDA);
    console.log("user1 profile updated: ", profile);
  })

  it('send like from user1 to user2', async () => {
    const [user1ProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), user1.publicKey.toBuffer()],
      program.programId
    );

    const [user2ProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), user2.publicKey.toBuffer()],
      program.programId
    );

    const [likePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("like"), user1.publicKey.toBuffer(), user2.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .sendLike(user2.publicKey)
        .accountsStrict({
          sender: user1.publicKey,
          senderProfile: user1ProfilePda,
          targetProfile: user2ProfilePda,
          like: likePda,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc()

      const like = await program.account.like.fetch(likePda);
      console.log("user1 like: ", like);

      const user1Profile = await program.account.userProfile.fetch(user1ProfilePda);
      console.log("user1 matches after first like: ", user1Profile.matches);
    } catch (error) {
      console.log("Send like error:", error);
      throw error;
    }
  })

  it('send like from user2 to user1 (creates mutual match)', async () => {
    const [user1ProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), user1.publicKey.toBuffer()],
      program.programId
    );

    const [user2ProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), user2.publicKey.toBuffer()],
      program.programId
    );

    const [likePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("like"), user2.publicKey.toBuffer(), user1.publicKey.toBuffer()],
      program.programId
    );

    const [reverseLikePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("like"), user1.publicKey.toBuffer(), user2.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .sendLike(user1.publicKey)
        .accountsStrict({
          sender: user2.publicKey,
          senderProfile: user2ProfilePda,
          targetProfile: user1ProfilePda,
          like: likePda,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts([
          {
            pubkey: reverseLikePda,
            isWritable: false,
            isSigner: false,
          }
        ])
        .signers([user2])
        .rpc()

      const like = await program.account.like.fetch(likePda);
      console.log("user2 like (mutual): ", like);

      const user1Profile = await program.account.userProfile.fetch(user1ProfilePda);
      const user2Profile = await program.account.userProfile.fetch(user2ProfilePda);
      console.log("user1 profile matches: ", user1Profile.matches);
      console.log("user2 profile matches: ", user2Profile.matches);
    } catch (error) {
      console.log("Send mutual like error:", error);
      throw error;
    }
  })

  it('send message from user1 to user2', async () => {
    // Use a much shorter message to avoid memory issues
    const content = "Hey there! Nice to meet you."
    const messageId = Math.floor(Date.now() / 1000);

    const [user1ProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), user1.publicKey.toBuffer()],
      program.programId
    );

    const [user2ProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), user2.publicKey.toBuffer()],
      program.programId
    );

    const [user1LikePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("like"), user1.publicKey.toBuffer(), user2.publicKey.toBuffer()],
      program.programId
    );

    const [user2LikePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("like"), user2.publicKey.toBuffer(), user1.publicKey.toBuffer()],
      program.programId
    );

    const messageIdBuffer = Buffer.allocUnsafe(8);
    messageIdBuffer.writeBigUInt64LE(BigInt(messageId), 0);

    const [messagePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("message"),
        user1.publicKey.toBuffer(),
        user2.publicKey.toBuffer(),
        messageIdBuffer
      ],
      program.programId
    );

    try {
      await program.methods
        .sendMessage(new anchor.BN(messageId), content)
        .accountsStrict({
          sender: user1.publicKey,
          senderProfile: user1ProfilePda,
          receiverProfile: user2ProfilePda,
          message: messagePda,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts([
          {
            pubkey: user1LikePda,
            isWritable: false,
            isSigner: false,
          },
          {
            pubkey: user2LikePda,
            isWritable: false,
            isSigner: false,
          }
        ])
        .signers([user1])
        .rpc()

      const messageData = await program.account.messageAccount.fetch(messagePda);
      console.log("message data from user1: ", messageData);
    } catch (error) {
      console.log("Send message error:", error);
      throw error;
    }
  })

  it('send message from user2 to user1', async () => {
    const content = "Great to meet you too!"
    const messageId = Math.floor(Date.now() / 1000) + 1;

    const [user1ProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), user1.publicKey.toBuffer()],
      program.programId
    );

    const [user2ProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), user2.publicKey.toBuffer()],
      program.programId
    );

    const [user1LikePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("like"), user1.publicKey.toBuffer(), user2.publicKey.toBuffer()],
      program.programId
    );

    const [user2LikePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("like"), user2.publicKey.toBuffer(), user1.publicKey.toBuffer()],
      program.programId
    );

    const messageIdBuffer = Buffer.allocUnsafe(8);
    messageIdBuffer.writeBigUInt64LE(BigInt(messageId), 0);

    const [messagePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("message"),
        user2.publicKey.toBuffer(),
        user1.publicKey.toBuffer(),
        messageIdBuffer
      ],
      program.programId
    );

    try {
      await program.methods
        .sendMessage(new anchor.BN(messageId), content)
        .accountsStrict({
          sender: user2.publicKey,
          senderProfile: user2ProfilePda,
          receiverProfile: user1ProfilePda,
          message: messagePda,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts([
          {
            pubkey: user1LikePda,
            isWritable: false,
            isSigner: false,
          },
          {
            pubkey: user2LikePda,
            isWritable: false,
            isSigner: false,
          }
        ])
        .signers([user2])
        .rpc()

      const messageData = await program.account.messageAccount.fetch(messagePda);
      console.log("message data from user2: ", messageData);
    } catch (error) {
      console.log("Send message from user2 error:", error);
      throw error;
    }
  })

  it('test messaging with only one-way like', async () => {
    const content = "Hello from user3!"

    const [user1ProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), user1.publicKey.toBuffer()],
      program.programId
    );

    const [user3ProfilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), user3.publicKey.toBuffer()],
      program.programId
    );

    const [user3LikesPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("like"), user3.publicKey.toBuffer(), user1.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .sendLike(user1.publicKey)
      .accountsStrict({
        sender: user3.publicKey,
        senderProfile: user3ProfilePda,
        targetProfile: user1ProfilePda,
        like: user3LikesPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([user3])
      .rpc()

    console.log("user3 liked user1");

    const messageId = Math.floor(Date.now() / 1000) + 2;
    
    const messageIdBuffer = Buffer.allocUnsafe(8);
    messageIdBuffer.writeBigUInt64LE(BigInt(messageId), 0);
    
    const [messagePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("message"),
        user3.publicKey.toBuffer(),
        user1.publicKey.toBuffer(),
        messageIdBuffer
      ],
      program.programId
    );

    try {
      await program.methods
        .sendMessage(new anchor.BN(messageId), content)
        .accountsStrict({
          sender: user3.publicKey,
          senderProfile: user3ProfilePda,
          receiverProfile: user1ProfilePda,
          message: messagePda,
          systemProgram: SystemProgram.programId,
        })
        .remainingAccounts([
          {
            pubkey: user3LikesPda,
            isWritable: false,
            isSigner: false,
          }
        ])
        .signers([user3])
        .rpc()

      const messageData = await program.account.messageAccount.fetch(messagePda);
      console.log("message from user3 with one-way like: ", messageData);
    } catch (error) {
      console.log("One-way like message error:", error);
      throw error;
    }
  })

  it('block user', async () => {
    const [blockPDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("block"), user1.publicKey.toBuffer(), user3.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .blockUser(user3.publicKey)
      .accountsStrict({
        blocker: user1.publicKey,
        block: blockPDA,
        systemProgram: SystemProgram.programId
      })
      .signers([user1])
      .rpc()

    const block = await program.account.blockedUser.fetch(blockPDA);
    console.log("block: ", block);
  })
})