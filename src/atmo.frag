uniform vec3 rimColor;
uniform vec3 faceColor;

varying float vReflectivity;

void main(){
	float f = clamp(vReflectivity, 0.0, 1.0);
	gl_FragColor = vec4(mix(faceColor, rimColor, f), 1.0);
}
