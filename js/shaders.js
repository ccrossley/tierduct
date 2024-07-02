export const jellyVertexShader = `
attribute float _ao;
varying float vAO;
varying vec2 vUv;

void main() {
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);

    vUv = uv;
    vAO = _ao;
}
`;

export const jellyFragmentShader = `
varying float vAO;
varying vec2 vUv;

struct ColorStop {
    vec3 color;
    float position;
};

vec3 ColorRamp(ColorStop[4] colors, float factor) {
    int index = 0;
    for(int i = 0; i < colors.length() - 1; i++) {
        ColorStop currentColor = colors[i];
        ColorStop nextColor = colors[i + 1];
        
        bool isInBetween = currentColor.position <= factor;
        index = isInBetween ? i : index;
    }
    
    ColorStop currentColor = colors[index];
    ColorStop nextColor = colors[index + 1];
    
    float range = nextColor.position - currentColor.position;
    float lerpFactor = (factor - currentColor.position) / range;
    
    return mix(currentColor.color, nextColor.color, lerpFactor);
}

void main() {

    ColorStop[4] colors = ColorStop[4](
        ColorStop(vec3(0.0, 1.0, 1.0), 0.0),
        ColorStop(vec3(0.0, 0.0, 0.0), 0.3),
        ColorStop(vec3(1, 0, 0), 0.6),
        ColorStop(vec3(1.0, 1.0, 0.0), 1.0)
    );
    
    vec3 finalColor = ColorRamp(colors, vAO);

    gl_FragColor = vec4(finalColor, 1.0);
}
`;