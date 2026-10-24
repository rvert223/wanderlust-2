// Status pill for a sighting's community verification.
const LABELS = {
  verified: 'Community verified',
  pending: 'Awaiting verifiers',
  disputed: 'Disputed',
};

export default function VerificationBadge({ verification }) {
  return <span className={`verify-badge ${verification.status}`}>{LABELS[verification.status]}</span>;
}
