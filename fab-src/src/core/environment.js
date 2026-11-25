import * as THREE from 'three';

/**
 * A procedural cleanroom environment, used as the scene's IBL source.
 *
 * Metals need something to reflect: without an environment map a
 * metalness-0.9 surface renders as flat black with a few specular hits.
 * This builds a small scene — cool ceiling panels, dark floor, a cyan rim
 * behind — and pre-filters it into a PMREM texture.
 */
export function createEnvironment(renderer) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  pmrem.compileEquirectangularShader();

  const envScene = new THREE.Scene();

  const geo = new THREE.SphereGeometry(60, 40, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    vertexShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */ `
      varying vec3 vPos;
      void main() {
        vec3 d = normalize(vPos);
        float h = d.y * 0.5 + 0.5;

        // dark bay floor rising into a cool ceiling
        vec3 col = mix(vec3(0.030, 0.042, 0.062), vec3(0.11, 0.155, 0.21), pow(h, 1.4));

        // ceiling light panels
        float panel = smoothstep(0.70, 0.99, h);
        col += vec3(0.55, 0.72, 0.92) * panel * 1.0;

        // a soft cyan bounce from behind the subject
        float rim = pow(max(0.0, -d.z), 4.0);
        col += vec3(0.04, 0.22, 0.34) * rim;

        // a cold key from the upper right
        float key = pow(max(0.0, dot(d, normalize(vec3(0.55, 0.6, 0.4)))), 12.0);
        col += vec3(0.38, 0.46, 0.56) * key;

        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  envScene.add(new THREE.Mesh(geo, mat));

  const target = pmrem.fromScene(envScene, 0.02);
  pmrem.dispose();
  geo.dispose();
  mat.dispose();
  return target.texture;
}
