import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from '@solana/web3.js'
import { Soldate } from '../target/types/soldate'
import { match } from 'assert'

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
    const NAME = "FIRST_USER_GOAT";
    const AGE = 22;
    const BIO = "FIRST_USER_BIO_GOAT";
    const INTERESTS = ["Good", "Kind"];
    const LOCATION = "Gotham";

    const [profilePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), user1.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .updateProfile(NAME, AGE, BIO, INTERESTS, LOCATION)
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
    } catch (error) {
      console.log("Send like error:", error);
      throw error;
    }
  })

  it('send like from user2 to user1 (creates mutual like)', async () => {
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

    // This is the reverse like (user1 -> user2) that already exists
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

      // Check user2's profile to see if user1 was added to matches
      const user2Profile = await program.account.userProfile.fetch(user2ProfilePda);
      console.log("user2 profile matches: ", user2Profile.matches);
    } catch (error) {
      console.log("Send mutual like error:", error);
      throw error;
    }
  })

  it('create match from mutual likes', async () => {
    // Get the like PDAs
    const [like1Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("like"), user1.publicKey.toBuffer(), user2.publicKey.toBuffer()],
      program.programId
    );

    const [like2Pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("like"), user2.publicKey.toBuffer(), user1.publicKey.toBuffer()],
      program.programId
    );

    // Create match PDA with min/max ordering
    const user1Key = user1.publicKey;
    const user2Key = user2.publicKey;
    const minKey = user1Key.toBase58() < user2Key.toBase58() ? user1Key : user2Key;
    const maxKey = user1Key.toBase58() < user2Key.toBase58() ? user2Key : user1Key;

    const [matchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("match"), minKey.toBuffer(), maxKey.toBuffer()],
      program.programId
    );

    console.log("Match PDA:", matchPda.toString());
    console.log("Like1 PDA:", like1Pda.toString());
    console.log("Like2 PDA:", like2Pda.toString());

    try {
      await program.methods
        .createMatch()
        .accountsStrict({
          authority: user1.publicKey,
          like1: like1Pda,
          like2: like2Pda,
          matchAccount: matchPda,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc()

      const match = await program.account.match.fetch(matchPda);
      console.log("created match: ", match);
    } catch (error) {
      console.log("Create match error:", error);
      throw error;
    }
  })

  it('send message', async () => {
    const content = "Hey, there. I am new here. This is a good platform. Isn't it?"
  
    // Use min/max ordering for match PDA - SAME as create_match
    const user1Key = user1.publicKey;
    const user2Key = user2.publicKey;
    const minKey = user1Key.toBase58() < user2Key.toBase58() ? user1Key : user2Key;
    const maxKey = user1Key.toBase58() < user2Key.toBase58() ? user2Key : user1Key;
  
    const [matchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("match"), minKey.toBuffer(), maxKey.toBuffer()],
      program.programId
    );
  
    // Verify match exists before sending message
    let matchData;
    try {
      matchData = await program.account.match.fetch(matchPda);
      console.log("Match exists:", matchData);
    } catch (error) {
      console.log("Match does not exist, this test will fail");
      throw error;
    }
  
    let messageCount = matchData.messageCount;
    
    // FIXED: Use the correct seeds that match your program
    const [messagePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("message"), 
        matchPda.toBuffer(), 
        user2.publicKey.toBuffer(), // match_account.user2
        Buffer.from(new Uint8Array(new Uint32Array([messageCount]).buffer)) // message_count as little-endian bytes
      ],
      program.programId
    )
  
    try {
      await program.methods
        .sendMessage(content)
        .accountsStrict({
          sender: user1.publicKey,
          matchAccount: matchPda,
          message: messagePda,
          systemProgram: SystemProgram.programId
        })
        .signers([user1])
        .rpc()
  
        const updatedMatchData = await program.account.match.fetch(matchPda);
        console.log("match after message: ", updatedMatchData);
        console.log("message count: ", updatedMatchData.messageCount);
        console.log("message references: ", updatedMatchData.messages);
  
        // Fetch the actual message
        const messageData = await program.account.messageAccount.fetch(messagePda);
        console.log("message data: ", messageData);
    } catch (error) {
      console.log("Send message error:", error);
      throw error;
    }
  })

  it('send message from user2', async () => {
    const content = "Yes, it's amazing! I love the concept."
  
    // Use min/max ordering for match PDA - SAME as create_match
    const user1Key = user1.publicKey;
    const user2Key = user2.publicKey;
    const minKey = user1Key.toBase58() < user2Key.toBase58() ? user1Key : user2Key;
    const maxKey = user1Key.toBase58() < user2Key.toBase58() ? user2Key : user1Key;
  
    const [matchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("match"), minKey.toBuffer(), maxKey.toBuffer()],
      program.programId
    );
  
    const matchData = await program.account.match.fetch(matchPda);
    
    // Create message PDA for the second message
    let messageCount = matchData.messageCount;
    
    // FIXED: Use the correct seeds that match your program
    const [messagePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("message"), 
        matchPda.toBuffer(), 
        user2.publicKey.toBuffer(), // match_account.user2
        Buffer.from(new Uint8Array(new Uint32Array([messageCount]).buffer)) // message_count as little-endian bytes
      ],
      program.programId
    );
  
    try {
      await program.methods
        .sendMessage(content)
        .accountsStrict({
          sender: user2.publicKey,
          matchAccount: matchPda,
          message: messagePda,
          systemProgram: SystemProgram.programId
        })
        .signers([user2])
        .rpc()
  
        const updatedMatchData = await program.account.match.fetch(matchPda);
        console.log("match after both messages: ", updatedMatchData);
        console.log("total message count: ", updatedMatchData.messageCount);
        console.log("all message references: ", updatedMatchData.messages);
  
        // Fetch the second message
        const messageData = await program.account.messageAccount.fetch(messagePda);
        console.log("second message data: ", messageData);
  
    } catch (error) {
      console.log("Send message from user2 error:", error);
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