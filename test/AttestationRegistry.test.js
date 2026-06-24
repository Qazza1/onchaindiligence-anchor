const { expect } = require('chai')
const { ethers } = require('hardhat')
const { anyUint } = require('@nomicfoundation/hardhat-chai-matchers/withArgs')

describe('AttestationRegistry', function () {
  let registry, issuer, other
  const h = (s) => ethers.keccak256(ethers.toUtf8Bytes(s))

  beforeEach(async function () {
    ;[issuer, other] = await ethers.getSigners()
    const Factory = await ethers.getContractFactory('AttestationRegistry')
    registry = await Factory.deploy(issuer.address)
    await registry.waitForDeployment()
  })

  it('sets the issuer to the constructor argument', async function () {
    expect(await registry.issuer()).to.equal(issuer.address)
  })

  it('anchors a hash and reports it as anchored', async function () {
    const hash = h('attestation-1')
    expect(await registry.isAnchored(hash)).to.equal(false)
    await registry.anchor(hash)
    expect(await registry.isAnchored(hash)).to.equal(true)
    expect(await registry.count()).to.equal(1n)
    expect(await registry.anchoredAt(hash)).to.be.greaterThan(0n)
  })

  it('emits Anchored with the hash and index', async function () {
    const hash = h('attestation-emit')
    await expect(registry.anchor(hash))
      .to.emit(registry, 'Anchored')
      .withArgs(hash, anyUint, 0n)
  })

  it('reverts when anchoring the same hash twice (immutability)', async function () {
    const hash = h('dup')
    await registry.anchor(hash)
    await expect(registry.anchor(hash)).to.be.revertedWithCustomError(
      registry,
      'AlreadyAnchored'
    )
  })

  it('rejects the zero hash', async function () {
    await expect(registry.anchor(ethers.ZeroHash)).to.be.revertedWithCustomError(
      registry,
      'ZeroHash'
    )
  })

  it('only the issuer can anchor', async function () {
    await expect(
      registry.connect(other).anchor(h('x'))
    ).to.be.revertedWithCustomError(registry, 'NotIssuer')
  })

  it('anchorBatch adds new hashes and skips already-anchored ones (idempotent)', async function () {
    const a = h('a'), b = h('b'), c = h('c')
    await registry.anchor(a) // pre-anchor one
    await registry.anchorBatch([a, b, c]) // a should be skipped
    expect(await registry.count()).to.equal(3n)
    expect(await registry.isAnchored(b)).to.equal(true)
    expect(await registry.isAnchored(c)).to.equal(true)
  })

  it('transferIssuer rotates the issuer and blocks the old key', async function () {
    await registry.transferIssuer(other.address)
    expect(await registry.issuer()).to.equal(other.address)
    // old issuer can no longer anchor
    await expect(registry.anchor(h('after-rotate'))).to.be.revertedWithCustomError(
      registry,
      'NotIssuer'
    )
    // new issuer can
    await registry.connect(other).anchor(h('by-new-issuer'))
    expect(await registry.count()).to.equal(1n)
  })

  it('rejects transferring issuer to the zero address', async function () {
    await expect(
      registry.transferIssuer(ethers.ZeroAddress)
    ).to.be.revertedWithCustomError(registry, 'ZeroAddress')
  })
})
