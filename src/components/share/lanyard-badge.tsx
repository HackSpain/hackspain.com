import { Environment, Lightformer } from "@react-three/drei";
import {
  Canvas,
  extend,
  type ThreeElement,
  useFrame,
  useThree,
} from "@react-three/fiber";
import {
  BallCollider,
  CuboidCollider,
  Physics,
  type RapierRigidBody,
  RigidBody,
  useRapier,
  useRopeJoint,
  useSphericalJoint,
} from "@react-three/rapier";
import { MeshLineGeometry, MeshLineMaterial } from "meshline";
import { type RefObject, useEffect, useMemo, useRef, useState } from "react";
import {
  type BufferGeometry,
  CanvasTexture,
  CatmullRomCurve3,
  DoubleSide,
  type Mesh,
  MeshPhysicalMaterial,
  Quaternion,
  RepeatWrapping,
  SRGBColorSpace,
  Vector3,
} from "three";
import { BADGE_PALETTE } from "./badge-roles";
import {
  CARD_BACK_MATERIAL,
  CARD_EDGE_MATERIAL,
  CARD_FRONT_MATERIAL,
  createCardGeometry,
} from "./card-geometry";
import {
  BADGE_BACK_TEXTURE_HEIGHT,
  BADGE_BACK_TEXTURE_WIDTH,
  BADGE_PORTRAIT_LEFT,
  BADGE_PORTRAIT_SIZE,
  BADGE_PORTRAIT_TOP,
  BADGE_TEXTURE_HEIGHT,
  BADGE_TEXTURE_WIDTH,
  drawBadgeBackTexture,
  drawBadgeTexture,
  drawLanyardTexture,
} from "./draw-badge-texture";
import { loadAvatarImage } from "./load-avatar-image";
import { loadLogoImage } from "./load-logo-image";

extend({ MeshLineGeometry, MeshLineMaterial });

declare module "@react-three/fiber" {
  interface ThreeElements {
    meshLineGeometry: ThreeElement<typeof MeshLineGeometry>;
    meshLineMaterial: ThreeElement<typeof MeshLineMaterial>;
  }
}

const CARD_WIDTH = 1.6;
const CARD_HEIGHT = 2.25;
const CARD_DEPTH = 0.045;
const CARD_RADIUS = 0.09;
const PHOTO_TARGET_WIDTH =
  (BADGE_PORTRAIT_SIZE / BADGE_TEXTURE_WIDTH) * CARD_WIDTH;
const PHOTO_TARGET_HEIGHT =
  (BADGE_PORTRAIT_SIZE / BADGE_TEXTURE_HEIGHT) * CARD_HEIGHT;
const PHOTO_TARGET_X =
  ((BADGE_PORTRAIT_LEFT + BADGE_PORTRAIT_SIZE / 2) / BADGE_TEXTURE_WIDTH -
    0.5) *
  CARD_WIDTH;
const PHOTO_TARGET_Y =
  (0.5 -
    (BADGE_PORTRAIT_TOP + BADGE_PORTRAIT_SIZE / 2) / BADGE_TEXTURE_HEIGHT) *
  CARD_HEIGHT;
const PHOTO_TARGET_Z = CARD_DEPTH / 2 + 0.002;
/** Sits just inside the printed slot, so the band ends where it is punched. */
const JOINT_ANCHOR_Y = 1.02;
const BAND_WIDTH = 0.36;
const CURVE_SEGMENTS = 32;
const MIN_LERP_SPEED = 10;
const MAX_LERP_SPEED = 50;
const MAX_FRAME_DELTA = 1 / 30;
/**
 * The rope lets the card travel four units from its anchor, which is further
 * than the camera sees. Releasing a fast drag handed it enough speed to reach
 * that, so it left the frame for a second and read as having vanished. Natural
 * swinging never gets near this, so only the violent throws are tamed.
 */
const MAX_CARD_SPEED = 10;
/** Per second, not per frame: pull toward the resting facing, and its brake. */
const FACING_GAIN = 6;
const FACING_DAMPING = 5;
const ROPE_SEGMENT_LENGTH = 1;
const GRAVITY = 40;
/**
 * The badge is a pendulum four units long, so a tilt of x degrees parks it at
 * 4·sin(x) sideways. A phone screen only shows about 2.4 units either side of
 * centre, so anything past ~28° swings it out of frame.
 */
const MAX_TILT_DEGREES = 28;
const TILT_SMOOTHING = 6;
const DEGREES_TO_RADIANS = Math.PI / 180;
const LANYARD_TEXTURE_WIDTH = 512;
const LANYARD_TEXTURE_HEIGHT = 64;

interface BadgeContent {
  /**
   * The photo printed in the portrait frame, whether just dropped onto the page
   * or saved on an earlier visit. Wins over the GitHub avatar.
   */
  droppedPhoto: HTMLImageElement | null;
  firstName: string;
  /** GitHub handle, when they gave one — their avatar goes on the badge. */
  githubHandle: string | null;
  lastName: string;
}

interface BadgeProps {
  content: BadgeContent;
  /** Left out when the badge is only on display, as on a shared link. */
  onPhotoClick?: () => void;
  wind: RefObject<number>;
}

interface LanyardBadgeProps extends BadgeProps {
  tilt: RefObject<number | null>;
}

function createTextureCanvas(width: number, height: number) {
  const element = document.createElement("canvas");
  element.width = width;
  element.height = height;
  return element;
}

function createPrintTexture(canvas: HTMLCanvasElement) {
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  texture.anisotropy = 8;
  return texture;
}

function useBadgeTexture(
  { githubHandle, droppedPhoto, firstName, lastName }: BadgeContent,
  photoInvite: boolean
) {
  const [assets, setAssets] = useState<{
    avatar: HTMLImageElement | null;
    logo: HTMLImageElement | null;
    fontsReady: boolean;
  }>({ avatar: null, logo: null, fontsReady: false });

  const canvas = useMemo(
    () => createTextureCanvas(BADGE_TEXTURE_WIDTH, BADGE_TEXTURE_HEIGHT),
    []
  );
  const backCanvas = useMemo(
    () =>
      createTextureCanvas(BADGE_BACK_TEXTURE_WIDTH, BADGE_BACK_TEXTURE_HEIGHT),
    []
  );

  const texture = useMemo(() => createPrintTexture(canvas), [canvas]);
  const backTexture = useMemo(
    () => createPrintTexture(backCanvas),
    [backCanvas]
  );

  useEffect(() => {
    let cancelled = false;
    loadLogoImage().then((image) => {
      if (!cancelled) {
        setAssets((current) => ({ ...current, logo: image }));
      }
    });
    document.fonts.ready.then(() => {
      if (!cancelled) {
        setAssets((current) => ({ ...current, fontsReady: true }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!githubHandle) {
      setAssets((current) => ({ ...current, avatar: null }));
      return;
    }
    let cancelled = false;
    loadAvatarImage(githubHandle).then((image) => {
      if (!cancelled) {
        setAssets((current) => ({ ...current, avatar: image }));
      }
    });
    return () => {
      cancelled = true;
    };
  }, [githubHandle]);

  useEffect(() => {
    drawBadgeTexture(
      canvas,
      {
        avatar: droppedPhoto ?? assets.avatar,
        firstName,
        lastName,
        photoInvite,
      },
      assets.logo
    );
    texture.needsUpdate = true;
    drawBadgeBackTexture(backCanvas, assets.logo);
    backTexture.needsUpdate = true;
  }, [
    canvas,
    texture,
    backCanvas,
    backTexture,
    firstName,
    lastName,
    droppedPhoto,
    photoInvite,
    assets,
  ]);

  useEffect(
    () => () => {
      texture.dispose();
      backTexture.dispose();
    },
    [texture, backTexture]
  );

  return { texture, backTexture };
}

function useLanyardTexture() {
  return useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = LANYARD_TEXTURE_WIDTH;
    canvas.height = LANYARD_TEXTURE_HEIGHT;
    drawLanyardTexture(canvas);
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    texture.wrapS = RepeatWrapping;
    texture.wrapT = RepeatWrapping;
    texture.repeat.set(-3, 1);
    return texture;
  }, []);
}

/**
 * The badge faces are printed artwork, so their colour must survive to the
 * screen untouched. Carrying it as diffuse albedo would multiply it by whatever
 * the lights happen to add up to; carrying it as emissive means the incoming
 * light budget cannot shift the brand colours at all. The physical layer is
 * still there — it just contributes the laminate highlight on top.
 */
function printedMaterial({
  color,
  map,
}: {
  color?: string;
  map?: CanvasTexture;
}) {
  return new MeshPhysicalMaterial({
    // Black base: no diffuse response, so lighting cannot tint the artwork.
    color: "#000000",
    // White with a map multiplies the texture through untouched.
    emissive: color ?? "#ffffff",
    emissiveMap: map,
    emissiveIntensity: 1,
    clearcoat: 1,
    clearcoatRoughness: 0.28,
    metalness: 0,
    roughness: 0.45,
  });
}

/** Wraps an angle into (-PI, PI] so the card always turns the short way round. */
function shortestAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

/**
 * Turns the phone's tilt into the direction gravity pulls, so the badge swings
 * against the real world rather than always straight down the screen. The angle
 * is eased instead of applied raw: the sensor is noisy enough that feeding it
 * straight in makes the card jitter.
 */
function TiltGravity({ tilt }: { tilt: RefObject<number | null> }) {
  const { world } = useRapier();
  const applied = useRef(0);

  useFrame((_state, delta) => {
    const gamma = tilt.current;
    if (gamma === null) {
      return;
    }
    const target =
      Math.max(-MAX_TILT_DEGREES, Math.min(MAX_TILT_DEGREES, gamma)) *
      DEGREES_TO_RADIANS;
    applied.current +=
      (target - applied.current) *
      Math.min(1, Math.min(delta, MAX_FRAME_DELTA) * TILT_SMOOTHING);
    world.gravity = {
      x: Math.sin(applied.current) * GRAVITY,
      y: -Math.cos(applied.current) * GRAVITY,
      z: 0,
    };
  });

  return null;
}

function Badge({ content, onPhotoClick, wind }: BadgeProps) {
  const band = useRef<Mesh>(null);
  const fixed = useRef<RapierRigidBody>(null);
  const j1 = useRef<RapierRigidBody>(null);
  const j2 = useRef<RapierRigidBody>(null);
  const j3 = useRef<RapierRigidBody>(null);
  const card = useRef<RapierRigidBody>(null);

  const vec = useMemo(() => new Vector3(), []);
  const dir = useMemo(() => new Vector3(), []);
  const ang = useMemo(() => new Vector3(), []);
  const axis = useMemo(() => new Vector3(), []);
  const quat = useMemo(() => new Quaternion(), []);
  const lerped1 = useMemo(() => new Vector3(), []);
  const lerped2 = useMemo(() => new Vector3(), []);
  const curve = useMemo(() => {
    const catmull = new CatmullRomCurve3([
      new Vector3(),
      new Vector3(),
      new Vector3(),
      new Vector3(),
    ]);
    // Centripetal (the default) overshoots hard when the control points bunch
    // up, which is exactly what happens as the chain swings — the band whips
    // far past the anchor for a frame. Chordal keeps the spline inside its hull.
    catmull.curveType = "chordal";
    return catmull;
  }, []);

  const [dragged, setDragged] = useState<Vector3 | null>(null);
  const [hovered, setHovered] = useState(false);

  const { size, camera } = useThree();
  const { texture: badgeTexture, backTexture } = useBadgeTexture(
    content,
    onPhotoClick !== undefined
  );
  const lanyardTexture = useLanyardTexture();

  useRopeJoint(fixed, j1, [[0, 0, 0], [0, 0, 0], ROPE_SEGMENT_LENGTH]);
  useRopeJoint(j1, j2, [[0, 0, 0], [0, 0, 0], ROPE_SEGMENT_LENGTH]);
  useRopeJoint(j2, j3, [[0, 0, 0], [0, 0, 0], ROPE_SEGMENT_LENGTH]);
  useSphericalJoint(j3, card, [
    [0, 0, 0],
    [0, JOINT_ANCHOR_Y, 0],
  ]);

  useEffect(() => {
    if (!hovered) {
      return;
    }
    document.body.style.cursor = dragged ? "grabbing" : "grab";
    return () => {
      document.body.style.cursor = "auto";
    };
  }, [hovered, dragged]);

  const geometry = useMemo(
    () => createCardGeometry(CARD_WIDTH, CARD_HEIGHT, CARD_DEPTH, CARD_RADIUS),
    []
  );

  const materials = useMemo(() => {
    const faces: MeshPhysicalMaterial[] = [];
    faces[CARD_FRONT_MATERIAL] = printedMaterial({ map: badgeTexture });
    faces[CARD_BACK_MATERIAL] = printedMaterial({ map: backTexture });
    faces[CARD_EDGE_MATERIAL] = printedMaterial({
      color: BADGE_PALETTE.stripe,
    });
    return faces;
  }, [badgeTexture, backTexture]);

  useEffect(() => () => geometry.dispose(), [geometry]);

  useEffect(
    () => () => {
      for (const material of new Set(materials)) {
        material.dispose();
      }
    },
    [materials]
  );

  useFrame((state, delta) => {
    if (
      !(fixed.current && j1.current && j2.current && j3.current && card.current)
    ) {
      return;
    }

    // A tab that was in the background hands back one huge delta; smoothing
    // against it is meaningless, so cap it at a couple of frames.
    const frameDelta = Math.min(delta, MAX_FRAME_DELTA);

    if (dragged) {
      vec.set(state.pointer.x, state.pointer.y, 0.5).unproject(camera);
      dir.copy(vec).sub(camera.position).normalize();
      vec.add(dir.multiplyScalar(camera.position.length()));
      for (const body of [card, j1, j2, j3, fixed]) {
        body.current?.wakeUp();
      }
      card.current.setNextKinematicTranslation({
        x: vec.x - dragged.x,
        y: vec.y - dragged.y,
        z: vec.z - dragged.z,
      });
    } else {
      const velocity = card.current.linvel();
      const speed = Math.hypot(velocity.x, velocity.y, velocity.z);
      wind.current = Math.min(1, speed / MAX_CARD_SPEED);
      if (speed > MAX_CARD_SPEED) {
        const scale = MAX_CARD_SPEED / speed;
        card.current.setLinvel(
          {
            x: velocity.x * scale,
            y: velocity.y * scale,
            z: velocity.z * scale,
          },
          true
        );
      }
    }

    for (const [body, lerped] of [
      [j1, lerped1],
      [j2, lerped2],
    ] as const) {
      const translation = body.current?.translation();
      if (!translation) {
        continue;
      }
      if (lerped.lengthSq() === 0) {
        lerped.set(translation.x, translation.y, translation.z);
      }
      const target = vec.set(translation.x, translation.y, translation.z);
      const clampedDistance = Math.max(
        0.1,
        Math.min(1, lerped.distanceTo(target))
      );
      // Vector3.lerp extrapolates past the target for alpha > 1, and the result
      // is fed back in on the next frame. One long frame — a background tab, a
      // resize, a GC pause — is enough to send the point off to infinity and it
      // never returns, which is what dragged the band across the screen.
      const alpha = Math.min(
        1,
        frameDelta *
          (MIN_LERP_SPEED + clampedDistance * (MAX_LERP_SPEED - MIN_LERP_SPEED))
      );
      lerped.lerp(target, alpha);
    }

    const head = j3.current.translation();
    const tail = fixed.current.translation();
    curve.points[0].set(head.x, head.y, head.z);
    curve.points[1].copy(lerped2);
    curve.points[2].copy(lerped1);
    curve.points[3].set(tail.x, tail.y, tail.z);

    const geometry = band.current?.geometry as
      | (BufferGeometry & {
          setPoints?: (points: Vector3[]) => void;
        })
      | undefined;
    geometry?.setPoints?.(curve.getPoints(CURVE_SEGMENTS));

    const angular = card.current.angvel();
    const rotation = card.current.rotation();
    ang.set(angular.x, angular.y, angular.z);
    // The card steers back to facing you. Steering on the yaw angle rather than
    // on the quaternion's y term (which is sin(yaw / 2)) keeps the pull linear
    // all the way in, instead of collapsing as it nears square-on.
    // That term is sin(yaw / 2), so its error collapses as the target nears and
    // the turn stalls short — measured at 155° of the 180° it was asked for.
    // The angle error stays linear the whole way, and the damping term stops it
    // ringing once it arrives.
    const yawError = shortestAngle(-2 * Math.atan2(rotation.y, rotation.w));

    // Spin about the card's own up axis, not the world's. The joint pins a
    // point 1.02 above the centre of mass: that point sits on the card's own
    // axis, so turning around it is free, while turning around world Y drags
    // the pin sideways whenever the card hangs at an angle — and the solver
    // cancels most of it. That is why it used to stall a third of the way.
    const spinAxis = axis
      .set(0, 1, 0)
      .applyQuaternion(
        quat.set(rotation.x, rotation.y, rotation.z, rotation.w)
      );
    // Scaled by the frame time: applied per frame instead, the card would turn
    // twice as fast on a 120Hz display as on a 60Hz one, and crawl whenever the
    // browser throttles rendering.
    const correction =
      (yawError * FACING_GAIN - ang.dot(spinAxis) * FACING_DAMPING) *
      frameDelta;
    ang.addScaledVector(spinAxis, correction);
    card.current.setAngvel({ x: ang.x, y: ang.y, z: ang.z }, true);
  });

  const segmentProps = {
    angularDamping: 2,
    canSleep: true,
    colliders: false,
    linearDamping: 2,
  } as const;

  return (
    <>
      <group position={[0, 4.6, 0]}>
        <RigidBody ref={fixed} {...segmentProps} type="fixed" />
        <RigidBody position={[0.5, 0, 0]} ref={j1} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1, 0, 0]} ref={j2} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody position={[1.5, 0, 0]} ref={j3} {...segmentProps}>
          <BallCollider args={[0.1]} />
        </RigidBody>
        <RigidBody
          position={[2, 0, 0]}
          ref={card}
          {...segmentProps}
          type={dragged ? "kinematicPosition" : "dynamic"}
        >
          <CuboidCollider
            args={[CARD_WIDTH / 2, CARD_HEIGHT / 2, CARD_DEPTH / 2]}
          />
          <group
            onPointerDown={(event) => {
              const target = event.target as Element & {
                setPointerCapture: (id: number) => void;
              };
              target.setPointerCapture(event.pointerId);
              const translation = card.current?.translation();
              if (translation) {
                setDragged(
                  new Vector3()
                    .copy(event.point)
                    .sub(vec.set(translation.x, translation.y, translation.z))
                );
              }
            }}
            onPointerOut={() => setHovered(false)}
            onPointerOver={() => setHovered(true)}
            onPointerUp={(event) => {
              const target = event.target as Element & {
                releasePointerCapture: (id: number) => void;
              };
              target.releasePointerCapture(event.pointerId);
              setDragged(null);
            }}
          >
            <mesh geometry={geometry} material={materials} />
            {onPhotoClick && (
              /* biome-ignore lint/a11y/noStaticElementInteractions: WebGL hit target over the printed photo area; the native file input owns the actual file-picker interaction. */
              <mesh
                onClick={(event) => {
                  event.stopPropagation();
                  onPhotoClick();
                }}
                onPointerDown={(event) => event.stopPropagation()}
                onPointerUp={(event) => event.stopPropagation()}
                position={[PHOTO_TARGET_X, PHOTO_TARGET_Y, PHOTO_TARGET_Z]}
              >
                <planeGeometry
                  args={[PHOTO_TARGET_WIDTH, PHOTO_TARGET_HEIGHT]}
                />
                <meshBasicMaterial depthWrite={false} opacity={0} transparent />
              </mesh>
            )}
          </group>
        </RigidBody>
      </group>
      {/*
        Two things made the band flicker. Frustum culling tested it against a
        bounding sphere built from the bare centreline — empty (so NaN) on the
        first frames, and always narrower than the ribbon the shader actually
        expands — so the band popped out of view at the edges. And `depthTest`
        off left it drawn in plain scene order, flipping in front of and behind
        the card as the sort changed. Unculled and depth-tested, it is stable
        and simply disappears behind the card where the slot is punched.
      */}
      <mesh frustumCulled={false} ref={band}>
        <meshLineGeometry />
        <meshLineMaterial
          color="#ffffff"
          lineWidth={BAND_WIDTH}
          map={lanyardTexture}
          repeat={[-4, 1]}
          resolution={[size.width, size.height]}
          side={DoubleSide}
          useMap={1}
        />
      </mesh>
    </>
  );
}

const BASE_CAMERA_DISTANCE = 13;
const MAX_CAMERA_DISTANCE = 24;

/**
 * Lighting only shapes the clip and the laminate highlights — the printed faces
 * carry their own colour (see `printedMaterial`). Kept near 1 so the clip reads
 * as the same plastic as the card.
 */
const AMBIENT_INTENSITY = 0.9;
const ENVIRONMENT_INTENSITY = 0.4;

/** Pulls the camera back on portrait screens so the badge always fits. */
function ResponsiveCamera() {
  const { camera, size } = useThree();

  useEffect(() => {
    const aspect = size.width / size.height;
    const isPortrait = aspect < 1;
    camera.position.z = isPortrait
      ? Math.min(MAX_CAMERA_DISTANCE, BASE_CAMERA_DISTANCE / aspect)
      : BASE_CAMERA_DISTANCE;
    camera.position.y = isPortrait ? 0.1 : 0.4;
    camera.updateProjectionMatrix();
  }, [camera, size]);

  return null;
}

export default function LanyardBadge({
  content,
  onPhotoClick,
  tilt,
  wind,
}: LanyardBadgeProps) {
  return (
    <Canvas
      camera={{ fov: 25, position: [0, 0, BASE_CAMERA_DISTANCE] }}
      flat
      gl={{ alpha: true, antialias: true }}
    >
      <ResponsiveCamera />
      <ambientLight intensity={AMBIENT_INTENSITY} />
      <Physics gravity={[0, -GRAVITY, 0]} interpolate timeStep={1 / 60}>
        <TiltGravity tilt={tilt} />
        <Badge content={content} onPhotoClick={onPhotoClick} wind={wind} />
      </Physics>
      <Environment blur={0.75} environmentIntensity={ENVIRONMENT_INTENSITY}>
        <Lightformer
          intensity={2}
          position={[0, -1, 5]}
          rotation={[0, 0, Math.PI / 3]}
          scale={[100, 0.1, 1]}
        />
        <Lightformer
          intensity={3}
          position={[-1, -1, 1]}
          rotation={[0, 0, Math.PI / 3]}
          scale={[100, 0.1, 1]}
        />
        <Lightformer
          intensity={3}
          position={[1, 1, 1]}
          rotation={[0, 0, Math.PI / 3]}
          scale={[100, 0.1, 1]}
        />
        <Lightformer
          intensity={10}
          position={[-10, 0, 14]}
          rotation={[0, Math.PI / 2, Math.PI / 3]}
          scale={[100, 10, 1]}
        />
      </Environment>
    </Canvas>
  );
}
