precision mediump float;

uniform vec4 rimColor;
uniform vec4 faceColor;

varying float vReflectivity;

void main() {
	float f = clamp(vReflectivity, 0.0, 1.0);
	gl_FragColor = vec4(0.9, 0.6, 0., 1.);
	gl_FragColor = mix(faceColor, rimColor, f);
}
