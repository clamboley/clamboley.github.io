import {
  AdditiveBlending,
  Color,
  ConeGeometry,
  DoubleSide,
  Mesh,
  ShaderMaterial,
  Vector3,
  type ColorRepresentation,
} from 'three';

const DOWN = new Vector3(0, -1, 0);

const vertexShader = /* glsl */ `
  varying float vAlong;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    vAlong = uv.y;
    vNormal = normalize(normalMatrix * normal);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    vView = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 color;
  uniform float opacity;
  uniform float time;
  varying float vAlong;
  varying vec3 vNormal;
  varying vec3 vView;
  void main() {
    // thickest where we look through the middle of the cone, soft at the silhouette
    float facing = abs(dot(normalize(vNormal), normalize(vView)));
    // brightest near the source but never a hot spot at the apex itself
    float along = pow(vAlong, 1.6) * smoothstep(1.0, 0.82, vAlong);
    float dust = 0.85 + 0.15 * sin(time * 2.3 + vAlong * 18.0) * sin(time * 1.1 + vAlong * 7.0);
    gl_FragColor = vec4(color, opacity * along * facing * dust);
  }
`;

/** Fake volumetric light beam: an additive cone fading away from its source. */
export class Beam {
  readonly mesh: Mesh;
  private readonly material: ShaderMaterial;
  private readonly direction = new Vector3();

  constructor(color: ColorRepresentation, length: number, spread: number, opacity: number) {
    this.material = new ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        color: { value: new Color(color) },
        opacity: { value: opacity },
        time: { value: 0 },
      },
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
      side: DoubleSide,
    });
    const geometry = new ConeGeometry(spread, length, 32, 1, true);
    geometry.translate(0, -length / 2, 0); // apex at the origin, pointing down -y
    this.mesh = new Mesh(geometry, this.material);
    this.mesh.frustumCulled = false;
  }

  aim(from: Vector3, to: Vector3): void {
    this.mesh.position.copy(from);
    this.direction.subVectors(to, from).normalize();
    this.mesh.quaternion.setFromUnitVectors(DOWN, this.direction);
  }

  set opacity(value: number) {
    (this.material.uniforms.opacity as { value: number }).value = value;
  }

  set time(value: number) {
    (this.material.uniforms.time as { value: number }).value = value;
  }
}
