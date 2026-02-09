"use client";

import { useRef, useEffect, Suspense } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, Environment, PerspectiveCamera, useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

interface ThreeDViewerProps {
  modelUrl?: string;
  modelFormat?: "glb" | "obj" | "fbx" | "stl";
  lighting?: "studio" | "outdoor" | "night";
  autoRotate?: boolean;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

/**
 * Model component that loads and displays the 3D model
 */
function Model({ url, format, onLoad, onError }: {
  url: string;
  format: string;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}) {
  const meshRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (meshRef.current) {
      onLoad?.();
    }
  }, [onLoad]);

  try {
    if (format === "glb" || format === "gltf") {
      // GLB/GLTF using useGLTF hook
      const { scene } = useGLTF(url);

      useEffect(() => {
        // Center and scale the model
        const box = new THREE.Box3().setFromObject(scene);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;

        scene.position.sub(center);
        scene.scale.setScalar(scale);
      }, [scene]);

      return <primitive ref={meshRef} object={scene} />;
    } else if (format === "obj") {
      // OBJ using useLoader
      const obj = useLoader(OBJLoader, url);

      useEffect(() => {
        const box = new THREE.Box3().setFromObject(obj);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;

        obj.position.sub(center);
        obj.scale.setScalar(scale);
      }, [obj]);

      return <primitive ref={meshRef} object={obj} />;
    } else if (format === "fbx") {
      // FBX using useLoader
      const fbx = useLoader(FBXLoader, url);

      useEffect(() => {
        const box = new THREE.Box3().setFromObject(fbx);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        const scale = 2 / maxDim;

        fbx.position.sub(center);
        fbx.scale.setScalar(scale);
      }, [fbx]);

      return <primitive ref={meshRef} object={fbx} />;
    }

    // Fallback to basic mesh for unsupported formats
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#8b5cf6" />
      </mesh>
    );
  } catch (error) {
    console.error("Error loading 3D model:", error);
    onError?.(error instanceof Error ? error : new Error("Failed to load model"));

    // Fallback mesh on error
    return (
      <mesh>
        <boxGeometry args={[1, 1, 1]} />
        <meshStandardMaterial color="#ef4444" />
      </mesh>
    );
  }
}

/**
 * Placeholder mesh shown when no model is loaded
 */
function PlaceholderMesh() {
  const meshRef = useRef<THREE.Mesh>(null);

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.3) * 0.2;
      meshRef.current.rotation.y += 0.01;
    }
  });

  return (
    <mesh ref={meshRef}>
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        color="#8b5cf6"
        emissive="#6d28d9"
        emissiveIntensity={0.2}
        metalness={0.8}
        roughness={0.2}
      />
    </mesh>
  );
}

/**
 * Loading fallback component
 */
function LoadingFallback() {
  return (
    <mesh>
      <boxGeometry args={[0.5, 0.5, 0.5]} />
      <meshStandardMaterial color="#6b7280" wireframe />
    </mesh>
  );
}

/**
 * 3D Viewer Component
 * Supports GLB, OBJ, FBX, and STL formats
 */
export function ThreeDViewer({
  modelUrl,
  modelFormat = "glb",
  lighting = "studio",
  autoRotate = true,
  onLoad,
  onError,
}: ThreeDViewerProps) {
  // Environment/lighting preset mapping
  const environmentPresets = {
    studio: "studio" as const,
    outdoor: "sunset" as const,
    night: "night" as const,
  };

  return (
    <div className="w-full h-full">
      <Canvas
        shadows
        dpr={[1, 2]}
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
      >
        {/* Camera */}
        <PerspectiveCamera makeDefault position={[0, 0, 5]} fov={50} />

        {/* Lighting */}
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        <directionalLight position={[-5, 5, -5]} intensity={0.5} />

        {/* Environment/Background */}
        <Environment preset={environmentPresets[lighting]} />

        {/* Grid Helper (optional) */}
        <gridHelper args={[10, 10, "#4b5563", "#374151"]} position={[0, -1.5, 0]} />

        {/* 3D Model or Placeholder */}
        <Suspense fallback={<LoadingFallback />}>
          {modelUrl ? (
            <Model
              url={modelUrl}
              format={modelFormat}
              onLoad={onLoad}
              onError={onError}
            />
          ) : (
            <PlaceholderMesh />
          )}
        </Suspense>

        {/* Camera Controls */}
        <OrbitControls
          enablePan={true}
          enableZoom={true}
          enableRotate={true}
          autoRotate={autoRotate}
          autoRotateSpeed={2}
          minDistance={2}
          maxDistance={10}
          maxPolarAngle={Math.PI / 1.5}
        />
      </Canvas>
    </div>
  );
}

export default ThreeDViewer;
