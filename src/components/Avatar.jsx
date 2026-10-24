// Round avatar showing the person's initials; verified users get a check.
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0].toUpperCase()).join('');

export default function Avatar({ name, verified = false, size = 44 }) {
  return (
    <span className="avatar" style={{ '--size': `${size}px` }}>
      {initials(name)}
      {verified && <i className="avatar-check" title="Community verified">✓</i>}
    </span>
  );
}
