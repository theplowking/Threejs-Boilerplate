/**
 * Full-screen textured quad shader with color quantization
 */

const PaletteShader = {

    name: 'PaletteShader',
  
    uniforms: {
      'tDiffuse': { value: null },
      'opacity': { value: 1.0 },
      'palette': { value: null }, // Pass the palette array as a uniform
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
      uniform vec3 palette[3];   // The palette of available colors
      const int paletteSize = 3; // Update this with the actual size of the palette
  
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
  