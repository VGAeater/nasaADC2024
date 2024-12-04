precision mediump float;
        
uniform sampler2D dayTexture;
uniform sampler2D nightTexture;
uniform sampler2D cloudTexture;
uniform vec3 lightDirection;
uniform float time;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

void main() {
	float dotData = dot(vNormal, lightDirection);
	//takes info abt the light and the normal of the vertex to calculate the brightness of the vertex
	float blendFactor = smoothstep(-0.35, 0.35, dotData); 

	//gets brightness of the current vertex
	vec4 dayColor = texture2D(dayTexture, vUv);
	vec4 nightColor = texture2D(nightTexture, vUv);
	vec4 cloudColor = texture2D(cloudTexture, mod(vUv + vec2(time * 0.0002, 0), vec2(1.)));

	//blends the textures, so it looks muy bueno
	gl_FragColor = mix(mix(nightColor, dayColor, blendFactor), cloudColor, 0.1 + blendFactor / 2.);
}
