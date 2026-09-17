varying vec2 vLocalPos;

void main() {
  vLocalPos = position.xy;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
