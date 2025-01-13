import { Commitment, Connection, PublicKey } from '@solana/web3.js';
import { getPdaMetadataKey } from '@raydium-io/raydium-sdk';
import { MetadataAccountData, MetadataAccountDataArgs, getMetadataAccountDataSerializer } from '@metaplex-foundation/mpl-token-metadata';

export const checkBurn = async (connection: Connection, lpMint: PublicKey, commitment: Commitment) => {
  try {
    const amount = await connection.getTokenSupply(lpMint, commitment);
    const burned = amount.value.uiAmount === 0;
    return burned
  } catch (error) {
    return false
  }
}

export const checkTokenMetadata = async (connection: Connection, baseMint: PublicKey,) => {
  try {
    const metadataPDA = getPdaMetadataKey(baseMint);
    const metadataAccount = await connection.getAccountInfo(metadataPDA.publicKey);
    if (!metadataAccount?.data)
      return

    const serializer = getMetadataAccountDataSerializer()
    const deserialize = serializer.deserialize(metadataAccount.data);
    console.log("tokenInfo: ", deserialize)

    const tokenInfo = deserialize[0]
    const { name, symbol, updateAuthority, isMutable, uri } = tokenInfo

    const response = await fetch(uri);
    const data = await response.json()

    let hasSocial = false
    if (data.extensions) {
      if('website' in data.extensions || 'telegram' in data.extensions || 'twitter' in data.extensions) {
        hasSocial = true
      }
    } else {
      if(data.website || data.telegram || data.twitter) {
        hasSocial = true
      }
    }

    return { name, symbol, updateAuthority, isMutable, hasSocial }
  } catch (e: any) {
    console.log("Check Mutable : ", e)
    return
  }
}

export const checkSocial = async (connection: Connection, baseMint: PublicKey, commitment: Commitment) => {
  try {
    const serializer = getMetadataAccountDataSerializer()
    const metadataPDA = getPdaMetadataKey(baseMint);
    const metadataAccount = await connection.getAccountInfo(metadataPDA.publicKey, commitment);
    if (!metadataAccount?.data) {
      return { ok: false, message: 'Mutable -> Failed to fetch account data' };
    }

    const deserialize = serializer.deserialize(metadataAccount.data);
    const social = await hasSocials(deserialize[0])
    return social
  } catch (error) {
    return false
  }
}

async function hasSocials(metadata: MetadataAccountData) {
  const response = await fetch(metadata.uri);

  const data = await response.json();

  return Object.values(data?.extensions ?? {}).some((value: any) => value !== null && value.length > 0);
}
