uniform vec3 uColor;
uniform float uTime;

varying vec3 vNormal;
varying vec3 vViewDir;

/**
 * Classic "atmosphere glow" trick: render the back faces of a sphere a bit
 * larger than the star itself, with a fresnel term that's brightest at the
 * silhouette and fades toward the (unseen, back-facing) center, additively
 * blended on top of the scene. Because it's recomputed per-fragment from
 * the current view direction, it reads as a soft halo around the star from
 * any camera angle without needing to billboard anything.
 */
void main() {
  float shimmer = 0.92 + 0.08 * sin(uTime * 0.6);
  float rim = pow(clamp(0.8 - dot(vNormal, vViewDir), 0.0, 1.0), 2.6);
  gl_FragColor = vec4(uColor, rim * shimmer);
}
