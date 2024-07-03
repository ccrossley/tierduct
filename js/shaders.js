export const jellyVertexShader = `

#include <common>
// #include <uv_pars_vertex>
// #include <uv2_pars_vertex>
// #include <displacementmap_pars_vertex>
// #include <color_pars_vertex>
// #include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
// #include <skinning_pars_vertex>
// #include <shadowmap_pars_vertex>
// #include <specularmap_pars_fragment>
// #include <logdepthbuf_pars_vertex>
// #include <clipping_planes_pars_vertex>

attribute float _ao;
varying float vAO;
varying vec2 vUv;

void main() {
    #include <beginnormal_vertex>
    #include <morphnormal_vertex>
    #include <begin_vertex>
    #include <morphtarget_vertex>

    vUv = uv;
    vAO = _ao;

    gl_Position = projectionMatrix * modelViewMatrix * vec4( transformed, 1.0 );
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
