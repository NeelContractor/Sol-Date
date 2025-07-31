// Here we export some useful types and functions for interacting with the Anchor program.
import { AnchorProvider, Program } from '@coral-xyz/anchor'
import { Cluster, PublicKey } from '@solana/web3.js'
import SoldateIDL from '../target/idl/soldate.json'
import type { Soldate } from '../target/types/soldate'

// Re-export the generated IDL and type
export { Soldate, SoldateIDL }

// The programId is imported from the program IDL.
export const SOLDATE_PROGRAM_ID = new PublicKey(SoldateIDL.address)

// This is a helper function to get the Counter Anchor program.
export function getSoldateProgram(provider: AnchorProvider, address?: PublicKey): Program<Soldate> {
  return new Program({ ...SoldateIDL, address: address ? address.toBase58() : SoldateIDL.address } as Soldate, provider)
}

// This is a helper function to get the program ID for the Counter program depending on the cluster.
export function getSoldateProgramId(cluster: Cluster) {
  switch (cluster) {
    case 'devnet':
    case 'testnet':
      // This is the program ID for the Counter program on devnet and testnet.
      return new PublicKey('GYR5dzGaxxccGV9Nd6RZy3jb8CktP9LC1fpWgwFUWhPR')
    case 'mainnet-beta':
    default:
      return SOLDATE_PROGRAM_ID
  }
}
