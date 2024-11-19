precision mediump float;

uniform float fresnelBias;
uniform float fresnelScale;
uniform float fresnelPower;
uniform vec3 cameraPosition;

attribute vec3 aPosition;
attribute vec3 aNormal;
attribute vec2 aTexCoord;

uniform mat4 uModelViewMatrix;
uniform mat4 uProjectionMatrix;
uniform mat4 uNormalMatrix;

varying float vReflectivity;

void main(){
    vec4 myPos = uModelViewMatrix * vec4(aPosition, 1.0);
    vec3 normalWorld = normalize(mat3(uNormalMatrix) * aNormal);

    vec3 worldPos = (uModelViewMatrix * vec4(aPosition, 1.0)).xyz;
    vec3 z = worldPos - cameraPosition;

    vReflectivity = fresnelBias + fresnelScale * pow(1.0 + dot(normalize(z), normalWorld), fresnelPower);

    gl_Position = uProjectionMatrix * myPos;
}