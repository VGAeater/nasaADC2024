precision mediump float;

uniform sampler2D moonTexture;
uniform vec3 lightDirection;

varying vec3 vNormal;
varying vec2 vUv;
        
void main() { 
	vec4 texColor = texture2D(moonTexture, vUv);
	float lightIntensity = dot(vNormal, lightDirection);
	float ambientLight = 0.02;  
	float shadowMultiplier = 0.15;  

	float smoothTransition = smoothstep(0.0, 0.8, lightIntensity);
	float finalLight = ambientLight + smoothTransition * (1.0 - ambientLight);

	vec3 finalColor = texColor.rgb * mix(shadowMultiplier, 1.0, finalLight);

	gl_FragColor = vec4(finalColor, 1.0);
}
