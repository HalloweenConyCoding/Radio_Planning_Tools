import BorderGlow from './BorderGlow';

<BorderGlow
  edgeSensitivity={45}
  glowColor="40 80 80"
  backgroundColor="#000000"
  borderRadius={10}
  glowRadius={45}
  glowIntensity={3}
  coneSpread={25}
  animated
  colors={['#c084fc', '#f472b6', '#38bdf8']}
>
  <div style={{ padding: '2em' }}>
    <h2>Your Content Here</h2>
    <p>Hover near the edges to see the glow.</p>
  </div>
</BorderGlow>