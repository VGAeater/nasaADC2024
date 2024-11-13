uniform float fresnelBias;
uniform float fresnelScale;
uniform float fresnelPower;

varying float vReflectivity;

void main(){
	vec4 myPos = modelViewMatrix * vec4(position, 1.0);
	vec4 worldPos = modelMatrix * vec4(position, 1.0);
	vec3 normalWorld = normalize( mat3(modelMatrix[0].xyz, modelMatrix[1].xyz, modelMatrix[2].xyz) * normal);

	vec3 z = worldPos.xyz - cameraPosition;

	vReflectivity = fresnelBias + fresnelScale * pow(1.0 + dot(normalize(z), normalWorld), fresnelPower);

	gl_Position = projectionMatrix * myPos;
}
