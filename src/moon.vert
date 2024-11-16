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
	vNormal = aNormal;
	vPosition = vec3(uModelViewMatrix * vec4(aPosition.xyz, 1.0));
	vUv = aTexCoord;
	gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition.xyz, 1.0);
}

