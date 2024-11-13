precision mediump float;
        
uniform sampler2D dayTexture;
uniform sampler2D nightTexture;
uniform vec3 lightDirection;
uniform vec2 resolution;
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

	//blends the textures, so it looks muy bueno
	gl_FragColor = mix(nightColor, dayColor, blendFactor);

	//gl_FragColor = dayColor;
}
