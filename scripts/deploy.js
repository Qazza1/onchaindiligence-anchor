const { ethers, network } = require('hardhat')

/**
 * Deploys AttestationRegistry to the selected Tempo network.
 *
 * The issuer is, by default, the deployer wallet (the same key that will sign
 * anchor transactions from the API). Override with ISSUER_ADDRESS if the
 * anchoring key differs from the deployer.
 *
 * Tempo reminders:
 *  - The deployer wallet must hold pathUSD for gas (no native gas token).
 *  - On testnet, fund it via:  cast rpc tempo_fundAddress <ADDR> --rpc-url https://rpc.moderato.tempo.xyz
 *  - Contract deploys cost 5-10x Ethereum gas; make sure the wallet has enough pathUSD.
 */
async function main() {
  const [deployer] = await ethers.getSigners()
  const issuer = process.env.ISSUER_ADDRESS || deployer.address

  console.log(`Network:  ${network.name}`)
  console.log(`Deployer: ${deployer.address}`)
  console.log(`Issuer:   ${issuer}`)

  const Factory = await ethers.getContractFactory('AttestationRegistry')
  const registry = await Factory.deploy(issuer)
  await registry.waitForDeployment()

  const address = await registry.getAddress()
  console.log(`\n✅ AttestationRegistry deployed to: ${address}`)
  console.log(`\nNext steps:`)
  console.log(`  1. Add to your API .env:  ANCHOR_CONTRACT_ADDRESS=${address}`)
  console.log(`  2. Verify on the explorer (Tempo testnet): https://explore.moderato.tempo.xyz/address/${address}`)
}

main().catch((err) => {
  console.error(err)
  process.exitCode = 1
})
