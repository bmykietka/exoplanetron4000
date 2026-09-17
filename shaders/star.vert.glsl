varying vec3 vNormal;
varying vec3 vViewDir;
varying vec3 vObjectPosition;

void main() {
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPosition = modelMatrix * vec4(position, 1.0);
  vec4 viewPosition = viewMatrix * worldPosition;
  vViewDir = normalize(-viewPosition.xyz);
  vObjectPosition = position;
  gl_Position = projectionMatrix * viewPosition;
}
