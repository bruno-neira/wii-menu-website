/**
 * The ghosted "Wii" wordmark stamped into every empty channel slot.
 *
 * Confirmed three ways in research (context/components/empty-slot-noise.md
 * §A.4.1, empty-slot-and-sd-icon.md): averaging the four empty tiles in
 * reference_screen.png cancels their independent noise and resolves a solid
 * "Wii" at identical position in all of them, ~36% of tile width, centred,
 * rendering -7/255 below the local base — about 3% contrast.
 *
 * Drawn here as our own paths rather than traced from Nintendo's texture, per
 * docs/asset-and-code-policy.md. The real logotype has rounded W bowls and
 * oversized detached circular tittles; this approximates that silhouette. At
 * 3% contrast the difference is well below the visibility threshold, but it is
 * an approximation and should be called one.
 */
export default function WiiWordmark() {
  return (
    <svg
      className="wii-wordmark"
      viewBox="0 0 46 24"
      aria-hidden="true"
      focusable="false"
    >
      {/* W — rounded bowls, splayed outer strokes */}
      <path
        d="M2 8
           C2 8 4.2 7.4 5.2 8.6
           L8.4 17.2
           C8.9 18.5 10.6 18.6 11.2 17.3
           L14 10.6
           L16.8 17.3
           C17.4 18.6 19.1 18.5 19.6 17.2
           L22.8 8.6
           C23.8 7.4 26 8 26 8"
        fill="none"
        stroke="currentColor"
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* i stems */}
      <rect x="30.2" y="9.6" width="3.4" height="9" rx="1.7" fill="currentColor" />
      <rect x="38.4" y="9.6" width="3.4" height="9" rx="1.7" fill="currentColor" />
      {/* detached circular tittles, oversized relative to the stems */}
      <circle cx="31.9" cy="5.4" r="2.3" fill="currentColor" />
      <circle cx="40.1" cy="5.4" r="2.3" fill="currentColor" />
    </svg>
  )
}
