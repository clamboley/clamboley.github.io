import {
  BoxGeometry,
  CircleGeometry,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
} from 'three';

export interface Lamp {
  x: number;
  y: number;
  z: number;
  /** Where its beam lands. */
  target: { x: number; y: number; z: number };
}

export interface Rig {
  lamps: Lamp[];
}

const PIT_FLOOR = -0.8;

/**
 * Festival lighting: a roof truss over the stage throwing beams out over the
 * crowd, and two towers out in the field aiming back at the stage.
 */
export class LightRig {
  readonly root = new Group();
  readonly rig: Rig = { lamps: [] };

  constructor() {
    const truss = new MeshStandardMaterial({ color: 0x15161c, roughness: 0.8, metalness: 0.4 });
    const lampFace = new MeshBasicMaterial({ color: new Color(0xfff2dc).multiplyScalar(2.5) });
    const lampGeometry = new CircleGeometry(0.22, 12);

    // roof truss over the front of the stage
    const roof = new Mesh(new BoxGeometry(26, 0.6, 0.6), truss);
    roof.position.set(0, 10.5, -3.2);
    this.root.add(roof);
    for (let x = -12; x <= 12; x += 3) {
      const lamp: Lamp = {
        x,
        y: 10.1,
        z: -3.2,
        target: { x: x * 1.6, y: 0, z: -22 - Math.abs(x) * 0.8 },
      };
      this.rig.lamps.push(lamp);
      const disc = new Mesh(lampGeometry, lampFace);
      disc.position.set(lamp.x, lamp.y, lamp.z);
      disc.rotation.x = -Math.PI / 2;
      this.root.add(disc);
    }

    // two towers in the field, lamps aimed at the stage
    for (const side of [-1, 1]) {
      const x = side * 17;
      const z = -34;
      const mast = new Mesh(new CylinderGeometry(0.35, 0.45, 15, 8), truss);
      mast.position.set(x, PIT_FLOOR + 7.5, z);
      this.root.add(mast);
      const head = new Mesh(new BoxGeometry(4.5, 1.2, 1.2), truss);
      head.position.set(x, PIT_FLOOR + 15, z);
      this.root.add(head);
      for (let i = -1.5; i <= 1.5; i += 1) {
        const lamp: Lamp = {
          x: x + i,
          y: PIT_FLOOR + 14.4,
          z,
          target: { x: i * 1.5, y: 1, z: -2 + i },
        };
        this.rig.lamps.push(lamp);
        const disc = new Mesh(lampGeometry, lampFace);
        disc.position.set(lamp.x, lamp.y, lamp.z + 0.65);
        this.root.add(disc);
      }
    }
  }
}
