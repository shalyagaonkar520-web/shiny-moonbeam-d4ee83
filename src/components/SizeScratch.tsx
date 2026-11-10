/**
 * The diagonal scratch drawn across a sold-out size box, as fashion apps do.
 * Place inside a `relative overflow-hidden` button.
 */
export default function SizeScratch() {
  return (
    <span
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none"
      style={{
        background:
          'linear-gradient(to top right, transparent calc(50% - 1px), #9ca3af calc(50% - 1px), #9ca3af calc(50% + 1px), transparent calc(50% + 1px))',
      }}
    />
  );
}
