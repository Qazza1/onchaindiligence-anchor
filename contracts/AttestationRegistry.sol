// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title AttestationRegistry
 * @notice An append-only, tamper-evident on-chain record of OnchainDiligence
 *         compliance attestations, deployed on Tempo.
 *
 * WHAT THIS IS FOR
 * OnchainDiligence already returns Ed25519-signed attestations over each
 * compliance check. This contract lets the issuer *anchor* the hash of an
 * attestation on-chain, so anyone can later prove that a specific attestation
 * existed at a specific time — without trusting or re-contacting the API. It
 * turns "the server says it signed this" into "here is independent, immutable,
 * timestamped proof on a public chain."
 *
 * PRIVACY BY DESIGN
 * Only the keccak256 HASH of an attestation is stored — never the wallet
 * address, name, company, or result. You cannot learn *who* was screened or
 * *what* the answer was from on-chain data. To verify, a holder presents the
 * original attestation off-chain; anyone hashes it and checks it was anchored.
 * This is the correct design for compliance: provable record-keeping without
 * publishing sensitive subject data.
 *
 * TEMPO NOTES
 * - Tempo has no native gas token; gas is paid in pathUSD (TIP-20). This
 *   contract is non-payable and never reads msg.value (which is always 0 on
 *   Tempo), so it behaves correctly there.
 * - State-creating writes are expensive on Tempo (anti-state-growth), so the
 *   contract stores one 32-byte word + a small timestamp per anchor and
 *   nothing more. Batch anchoring is supported to amortise cost.
 */
contract AttestationRegistry {
    /// @notice The address allowed to anchor attestations (the issuer).
    address public issuer;

    /// @notice anchor hash => unix timestamp it was first anchored (0 if never).
    mapping(bytes32 => uint64) public anchoredAt;

    /// @notice Total number of distinct attestations anchored.
    uint256 public count;

    event Anchored(bytes32 indexed attestationHash, uint64 timestamp, uint256 index);
    event IssuerTransferred(address indexed previousIssuer, address indexed newIssuer);

    error NotIssuer();
    error AlreadyAnchored(bytes32 attestationHash);
    error ZeroHash();
    error ZeroAddress();

    modifier onlyIssuer() {
        if (msg.sender != issuer) revert NotIssuer();
        _;
    }

    constructor(address _issuer) {
        if (_issuer == address(0)) revert ZeroAddress();
        issuer = _issuer;
        emit IssuerTransferred(address(0), _issuer);
    }

    /**
     * @notice Anchor a single attestation hash. Reverts if already anchored
     *         (anchors are immutable; re-anchoring would be meaningless).
     * @param attestationHash keccak256 of the canonical signed attestation.
     */
    function anchor(bytes32 attestationHash) external onlyIssuer {
        _anchor(attestationHash);
    }

    /**
     * @notice Anchor many attestation hashes in one transaction. On Tempo this
     *         amortises the per-write cost. Skips entries already anchored so a
     *         partial retry is safe (idempotent on the already-done ones).
     * @param hashes array of attestation hashes.
     */
    function anchorBatch(bytes32[] calldata hashes) external onlyIssuer {
        uint256 len = hashes.length;
        for (uint256 i = 0; i < len; i++) {
            bytes32 h = hashes[i];
            if (h == bytes32(0)) revert ZeroHash();
            if (anchoredAt[h] == 0) {
                anchoredAt[h] = uint64(block.timestamp);
                emit Anchored(h, uint64(block.timestamp), count);
                count++;
            }
        }
    }

    function _anchor(bytes32 attestationHash) internal {
        if (attestationHash == bytes32(0)) revert ZeroHash();
        if (anchoredAt[attestationHash] != 0) revert AlreadyAnchored(attestationHash);
        anchoredAt[attestationHash] = uint64(block.timestamp);
        emit Anchored(attestationHash, uint64(block.timestamp), count);
        count++;
    }

    /**
     * @notice True if an attestation hash has been anchored.
     */
    function isAnchored(bytes32 attestationHash) external view returns (bool) {
        return anchoredAt[attestationHash] != 0;
    }

    /**
     * @notice Hand the issuer role to a new key (e.g. on key rotation).
     */
    function transferIssuer(address newIssuer) external onlyIssuer {
        if (newIssuer == address(0)) revert ZeroAddress();
        emit IssuerTransferred(issuer, newIssuer);
        issuer = newIssuer;
    }
}
