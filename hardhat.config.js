require('@nomicfoundation/hardhat-toolbox')
require('dotenv').config()

/**
 * Tempo network config.
 *
 * Tempo quirks handled here:
 *  - No native gas token: gas is paid in pathUSD (TIP-20). The deployer wallet
 *    must hold testnet pathUSD (from the faucet) or mainnet pathUSD.
 *  - Contract deployment costs 5-10x more gas than Ethereum (anti-state-growth,
 *    TIP-1000), so we don't cap gas tightly and let the network estimate.
 *  - Verified parameters (Apr 2026):
 *      Mainnet  chainId 4217   rpc https://rpc.tempo.xyz
 *      Testnet  chainId 42431  rpc https://rpc.moderato.tempo.xyz  (Moderato)
 */

const PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY || ''
const accounts = PRIVATE_KEY ? [PRIVATE_KEY] : []

module.exports = {
  solidity: {
    version: '0.8.24',
    settings: {
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: {
    tempoTestnet: {
      url: process.env.TEMPO_TESTNET_RPC || 'https://rpc.moderato.tempo.xyz',
      chainId: 42431,
      accounts,
    },
    tempoMainnet: {
      url: process.env.TEMPO_MAINNET_RPC || 'https://rpc.tempo.xyz',
      chainId: 4217,
      accounts,
    },
  },
}
