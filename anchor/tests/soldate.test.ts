import * as anchor from '@coral-xyz/anchor'
import { Program } from '@coral-xyz/anchor'
import { Keypair, LAMPORTS_PER_SOL, PublicKey, SystemProgram } from '@solana/web3.js'
import { Soldate } from '../target/types/soldate'

describe('Soldate', () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env()
  anchor.setProvider(provider)
  // const payer = provider.wallet as anchor.Wallet

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

  it('send like', async () => {
    const timestamp = Date.now();
    const [likePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("like"), user1.publicKey.toBuffer(), new anchor.BN(timestamp).toArrayLike(Buffer, 'le', 8)],
      program.programId
    );

    await program.methods
      .sendLike(new anchor.BN(timestamp), user2.publicKey)
      .accountsStrict({
        sender: user1.publicKey,
        like: likePda,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc()

    const like = await program.account.like.fetch(likePda);
    console.log("user1 like: ", like);
  })

  it('send like', async () => {

    const timestamp = Date.now();
    const [likePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("like"), user2.publicKey.toBuffer(), new anchor.BN(timestamp).toArrayLike(Buffer, 'le', 8)],
      program.programId
    );

    await program.methods
      .sendLike(new anchor.BN(timestamp), user1.publicKey)
      .accountsStrict({
        sender: user2.publicKey,
        like: likePda,
        systemProgram: SystemProgram.programId,
      })
      .signers([user2])
      .rpc()

    const like = await program.account.like.fetch(likePda);
    console.log("user2 like: ", like);
  })

  it('create match', async () => {
    const user1profile = await program.account.userProfile.fetch(user1.publicKey);
    const user2profile = await program.account.userProfile.fetch(user2.publicKey);

    const [matchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("match"), user1.publicKey.toBuffer(), user2.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .createMatch(user1profile.owner, user2profile.owner)
      .accountsStrict({
        authority: user1.publicKey,
        matchAccount: matchPda,
        systemProgram: SystemProgram.programId,
      })
      .signers([user1])
      .rpc()

    const match = await program.account.match.fetch(matchPda);
    console.log("match like: ", match);
  })

  it('send message', async () => {
    const content = "Hey, there i am new here. This is good platform. isn't it?"

    const [matchPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("match"), user1.publicKey.toBuffer(), user2.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .sendMessage(content)
      .accountsStrict({
        sender: user1.publicKey,
        matchAccount: matchPda,
      })
      .signers([user1])
      .rpc()

    const message = await program.account.match.fetch(matchPda);
    console.log("message: ", message);
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
