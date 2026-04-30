import WiiMenu from './components/WiiMenu'

function App() {
  return (
    <>
      {/* Global SVG defs — CRT clip path for channel tiles.
          objectBoundingBox coords (0–1) so it scales to any element size.
          Sides bow inward ~2px (concave pillow / CRT screen look).
          Corners approximated with cubic beziers (kappa ≈ 0.5523). */}
      <svg width="0" height="0" aria-hidden="true" style={{ position: 'absolute' }}>
        <defs>
          <clipPath id="crt-clip" clipPathUnits="objectBoundingBox">
            <path d="
              M 0.06,0
              Q 0.5,0.021 0.94,0
              C 0.9731,0 1,0.0475 1,0.106
              Q 0.9882,0.5 1,0.894
              C 1,0.9525 0.9731,1 0.94,1
              Q 0.5,0.979 0.06,1
              C 0.0269,1 0,0.9525 0,0.894
              Q 0.0118,0.5 0,0.106
              C 0,0.0474 0.0269,0 0.06,0
              Z
            " />
          </clipPath>
        </defs>
      </svg>
      <WiiMenu />
    </>
  )
}

export default App
