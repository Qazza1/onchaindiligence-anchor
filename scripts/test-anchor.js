/**
 * Live anchoring proof (testnet).
 * Picks a test "signature", computes its anchor hash exactly as the API does,
 * anchors it on the deployed contract, then reads it back on-chain.
 *
 * Run from the anchor repo with the same .env used for deployment:
 *   node scripts/test-anchor.js
 */
const { ethers } = require('ethers')
require('dotenv').config()

const RPC = process.env.TEMPO_TESTNET_RPC || 'https://rpc.moderato.tempo.xyz'
const CONTRACT = process.env.ANCHOR_CONTRACT_ADDRESS // set this in .env for the test
const PK = process.env.DEPLOYER_PRIVATE_KEY

const ABI = [
  'function anchor(bytes32 attestationHash) external',
  'function isAnchored(bytes32) view returns (bool)',
  'function anchoredAt(bytes32) view returns (uint64)',
  'function count() view returns (uint256)',
]

// The API computes: keccak256(bytes of the base64url-decoded signature)
function anchorHashForSignature(sigB64url) {
  const sigHex = '0x' + Buffer.from(sigB64url, 'base64url').toString('hex')
  return ethers.keccak256(sigHex)
}

async function main() {
  if (!CONTRACT) throw new Error('Set ANCHOR_CONTRACT_ADDRESS in .env for this test')
  if (!PK) throw new Error('Set DEPLOYER_PRIVATE_KEY in .env')

  const provider = new ethers.JsonRpcProvider(RPC)
  const wallet = new ethers.Wallet(PK, provider)
  const c = new ethers.Contract(CONTRACT, ABI, wallet)

  // A stable test "signature" so the result is reproducible.
  const testSignature = Buffer.from('onchaindiligence-live-anchor-test-001').toString('base64url')
  const hash = anchorHashForSignature(testSignature)

  console.log('Test signature (base64url):', testSignature)
  console.log('Anchor hash:', hash)
  console.log('Contract:', CONTRACT)
  console.log('Issuer wallet:', wallet.address)
  console.log('')

  const already = await c.isAnchored(hash)
  if (already) {
    const ts = await c.anchoredAt(hash)
    console.log('Already anchored at unix', ts.toString(), '->', new Date(Number(ts) * 1000).toISOString())
  } else {
    console.log('Anchoring now (sending tx)...')
    const tx = await c.anchor(hash)
    console.log('  tx hash:', tx.hash)
    const receipt = await tx.wait()
    console.log('  confirmed in block', receipt.blockNumber)
    const ts = await c.anchoredAt(hash)
    console.log('  anchoredAt:', new Date(Number(ts) * 1000).toISOString())
  }

  const total = await c.count()
  console.log('\nTotal anchors in contract now:', total.toString())
  console.log('\n--- Now verify through your API (free): ---')
  console.log(`curl "https://api.onchaindiligence.com/anchored?signature=${testSignature}"`)
  console.log('\nExpect: {"anchored":true, "anchored_at":"...", ...}')
}

main().catch((e) => { console.error('FAIL:', e.message); process.exit(1) })
