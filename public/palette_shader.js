/**
 * Full-screen textured quad shader with color quantization
 */

const PaletteShader = {

    name: 'PaletteShader',
  
    uniforms: {
      'tDiffuse': { value: null },
      'opacity': { value: 1.0 },
      'palette': { value: null }, // Pass the palette array as a uniform
      'paletteSize': { value: null }
    },
  
    vertexShader: /* glsl */`
  
      varying vec2 vUv;
  
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
  
    fragmentShader: /* glsl */`
  
      uniform float opacity;
      uniform sampler2D tDiffuse;
      uniform int paletteSize; // Update this with the actual size of the palette
      uniform vec3 palette[14];   // The palette of available colors

  
      varying vec2 vUv;
  
      // Function to calculate the distance between two colors
      float colorDistance(vec3 color1, vec3 color2) {
          return distance(color1, color2);
      }
  
      void main() {
          // Read the original color from the rendered scene texture
          vec4 originalColor = texture2D(tDiffuse, vUv);
  
          // Find the closest color in the palette
          vec3 targetColor = palette[0];
          float minDistance = colorDistance(originalColor.rgb, targetColor);
          for (int i = 1; i < paletteSize; i++) {
              float distance = colorDistance(originalColor.rgb, palette[i]);
              if (distance < minDistance) {
                  minDistance = distance;
                  targetColor = palette[i];
              }
          }
  
          // Output the target color with the applied opacity
          gl_FragColor = vec4(targetColor, originalColor.a) * opacity;
      }`
  };
  
  export { PaletteShader };
  