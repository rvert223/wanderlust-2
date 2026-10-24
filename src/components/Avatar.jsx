// Round avatar: the person's photo if they set one, otherwise their initials; verified users get a check.
const initials = (name = '') => name.split(/\s+/).filter(Boolean).slice(0, 2).map((word) => word[0].toUpperCase()).join('');

export default function Avatar({ name, photo, verified = false, size = 44 }) {
  return (
    <span className="avatar" style={{ '--size': `${size}px` }}>
      {photo ? <img src={photo} alt="" /> : initials(name)}
      {verified && <i className="avatar-check" title="Community verified">✓</i>}
    </span>
  );
}
