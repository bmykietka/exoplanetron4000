uniform float uTime;
uniform float uConservativeInner;
uniform float uConservativeOuter;
uniform float uOptimisticInner;
uniform float uOptimisticOuter;
uniform vec3 uColor;

varying vec2 vLocalPos;

// Soft edge in [0,1]: 0 outside the band, 1 inside, smoothed across `feather`.
float band(float r, float innerEdge, float outerEdge, float feather) {
  float rising = smoothstep(innerEdge - feather, innerEdge + feather, r);
  float falling = 1.0 - smoothstep(outerEdge - feather, outerEdge + feather, r);
  return clamp(rising * falling, 0.0, 1.0);
}

void main() {
  float r = length(vLocalPos);
  float feather = max((uOptimisticOuter - uOptimisticInner) * 0.03, 0.01);

  float conservative = band(r, uConservativeInner, uConservativeOuter, feather);
  float optimistic = band(r, uOptimisticInner, uOptimisticOuter, feather);

  float shimmer = 0.94 + 0.06 * sin(uTime * 0.6 + r * 6.0);

  float alpha = mix(optimistic * 0.16, conservative * 0.34, conservative) * shimmer;
  vec3 color = mix(uColor * 0.75, uColor, conservative);

  if (alpha < 0.003) discard;
  gl_FragColor = vec4(color, alpha);
}
