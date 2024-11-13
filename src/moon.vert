varying vec3 vNormal;
varying vec2 vUv;
varying vec3 vWorldNormal;
        
void main() {
	vUv = uv;
	vNormal = normal;
	// Transform the normal to world space
	vWorldNormal = (modelMatrix * vec4(normal.xyz, 0.0)).xyz;
	gl_Position = projectionMatrix * modelViewMatrix * vec4(position.xyz, 1.0);
}
