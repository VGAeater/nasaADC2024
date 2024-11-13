precision mediump float;

varying vec3 vNormal;
varying vec3 vPosition;
varying vec2 vUv;

attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uNormalMatrix;

void main() {
	//basically prevents the model from being distorted, when orbitControls are used
	vNormal = /*normalize(uNormalMatrix */ aNormal/*)*/;

	//position of the vertex in the world space (where the earth is)
	vPosition = vec3(uModelViewMatrix * vec4(aPosition.xyz, 1.0));
	vUv = aTexCoord;
	//gets the final position for the rendering
	gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition.xyz, 1.0);

	//gl_Position = vec4(aPosition, 1.);
}
