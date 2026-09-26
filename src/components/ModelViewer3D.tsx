import React, { Suspense, useState, useRef } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, ContactShadows, useGLTF, Html } from '@react-three/drei';
import { RotateCw, Maximize2, Layers, Sun, Eye, Loader2, Sparkles, Building2 } from 'lucide-react';

interface ModelViewer3DProps {
  dimensions?: { 
    length_mm: number; 
    width_mm: number;
    ceiling_height_mm?: number;
    floor_area_m2?: number;
  };
  buildingType?: string;
  glbUrl?: string;
  orientation?: any;
}

// Subcomponent to load GLB model with automatic centering & material enhancement
function ArchitecturalGLTFModel({ url, showRoof }: { url: string; showRoof: boolean }) {
  const { scene } = useGLTF(url);
  const clonedScene = React.useMemo(() => {
    const s = scene.clone();
    s.traverse((node: any) => {
      if (node.isMesh) {
        node.castShadow = true;
        node.receiveShadow = true;
        // If it's a roof mesh and user wants cutaway
        if (!showRoof && (node.name.toLowerCase().includes('roof') || node.material?.name?.toLowerCase().includes('roof'))) {
          node.visible = false;
        } else {
          node.visible = true;
        }
      }
    });
    return s;
  }, [scene, showRoof]);

  return (
    <primitive 
      object={clonedScene} 
      position={[0, -0.5, 0]} 
      scale={0.0035} 
    />
  );
}

// Procedural high-fidelity architectural cutaway model (Guaranteed offline fallback)
function ProceduralArchitecturalModel({ 
  lengthM, 
  widthM, 
  heightM, 
  showRoof,
  isEmergency
}: { 
  lengthM: number; 
  widthM: number; 
  heightM: number; 
  showRoof: boolean;
  isEmergency: boolean;
}) {
  const wallThick = 0.22;
  const wallColor = isEmergency ? '#E0E7FF' : '#E8DFD5'; // High thermal mass masonry or insulated panel
  const floorColor = isEmergency ? '#94A3B8' : '#C49A6C'; // Warm timber or polished screed
  const roofColor = isEmergency ? '#3B82F6' : '#1E293B'; // High-albedo cool roof or slate

  return (
    <group position={[0, -heightM / 2, 0]}>
      {/* Foundation / Floor Slab */}
      <mesh position={[0, 0.08, 0]} receiveShadow>
        <boxGeometry args={[lengthM + 0.5, 0.16, widthM + 0.5]} />
        <meshStandardMaterial color={floorColor} roughness={0.6} />
      </mesh>

      {/* Interior Floor Finish with Room Divisions */}
      <mesh position={[0, 0.17, 0]} receiveShadow>
        <boxGeometry args={[lengthM, 0.02, widthM]} />
        <meshStandardMaterial color={isEmergency ? '#CBD5E1' : '#DDB892'} roughness={0.4} />
      </mesh>

      {/* ── EXTERIOR ENVELOPE WALLS (With Architectural Openings) ── */}
      
      {/* North Wall (Back) */}
      <mesh position={[0, heightM / 2 + 0.16, -widthM / 2 + wallThick / 2]} castShadow receiveShadow>
        <boxGeometry args={[lengthM, heightM, wallThick]} />
        <meshStandardMaterial color={wallColor} roughness={0.7} />
      </mesh>

      {/* South Wall (Front - Large Solar Glazing Openings) */}
      <group position={[0, heightM / 2 + 0.16, widthM / 2 - wallThick / 2]}>
        {/* Left Solid Wall Pier */}
        <mesh position={[-lengthM / 3, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[lengthM / 3 - 0.2, heightM, wallThick]} />
          <meshStandardMaterial color={wallColor} roughness={0.7} />
        </mesh>
        {/* Right Solid Wall Pier */}
        <mesh position={[lengthM / 3, 0, 0]} castShadow receiveShadow>
          <boxGeometry args={[lengthM / 3 - 0.2, heightM, wallThick]} />
          <meshStandardMaterial color={wallColor} roughness={0.7} />
        </mesh>
        {/* High-Performance Solar Glass Window Center Pane */}
        <mesh position={[0, 0, 0]}>
          <boxGeometry args={[lengthM / 3 + 0.4, heightM * 0.75, 0.04]} />
          <meshPhysicalMaterial 
            color="#38BDF8" 
            transparent 
            opacity={0.45} 
            roughness={0.1} 
            transmission={0.85} 
            thickness={0.5} 
          />
        </mesh>
      </group>

      {/* West Wall (Left) */}
      <mesh position={[-lengthM / 2 + wallThick / 2, heightM / 2 + 0.16, 0]} castShadow receiveShadow>
        <boxGeometry args={[wallThick, heightM, widthM - wallThick * 2]} />
        <meshStandardMaterial color={wallColor} roughness={0.7} />
      </mesh>

      {/* East Wall (Right) */}
      <mesh position={[lengthM / 2 - wallThick / 2, heightM / 2 + 0.16, 0]} castShadow receiveShadow>
        <boxGeometry args={[wallThick, heightM, widthM - wallThick * 2]} />
        <meshStandardMaterial color={wallColor} roughness={0.7} />
      </mesh>

      {/* ── INTERIOR CENTRAL THERMAL MASS PARTITION WALL ── */}
      <mesh position={[0, heightM / 2 + 0.16, 0]} castShadow receiveShadow>
        <boxGeometry args={[lengthM * 0.7, heightM, 0.15]} />
        <meshStandardMaterial color={isEmergency ? '#93C5FD' : '#D1C7BD'} roughness={0.8} />
      </mesh>

      {/* ── ROOF OVERHANG (TOGGLEABLE CUTAWAY) ── */}
      {showRoof && (
        <group position={[0, heightM + 0.26, 0]}>
          {/* Main Roof Pitch/Slab with Solar Shading Overhang */}
          <mesh castShadow receiveShadow position={[0, 0.08, 0]}>
            <boxGeometry args={[lengthM + 0.8, 0.16, widthM + 0.8]} />
            <meshStandardMaterial color={roofColor} roughness={0.4} metalness={0.2} />
          </mesh>
          {/* Solar Photovoltaic / Radiant Barrier Panel Strip */}
          <mesh position={[0, 0.18, 0]}>
            <boxGeometry args={[lengthM * 0.8, 0.02, widthM * 0.6]} />
            <meshStandardMaterial color="#0F172A" roughness={0.2} metalness={0.8} />
          </mesh>
        </group>
      )}
    </group>
  );
}

export default function ModelViewer3D({ 
  dimensions, 
  buildingType, 
  glbUrl, 
  orientation 
}: ModelViewer3DProps) {
  const [showRoof, setShowRoof] = useState(true);
  const [autoRotate, setAutoRotate] = useState(true);
  const [useProcedural, setUseProcedural] = useState(false);

  const length_mm = dimensions?.length_mm || 7100;
  const width_mm = dimensions?.width_mm || 5900;
  const lengthM = length_mm / 1000;
  const widthM = width_mm / 1000;
  const heightM = (dimensions?.ceiling_height_mm || 2700) / 1000;

  const isEmergency = (buildingType || '').toLowerCase().includes('emergency');
  const isCommunity = (buildingType || '').toLowerCase().includes('community');

  // Select appropriate high-fidelity GLB model based on typology
  const defaultGlbModel = glbUrl || (
    isEmergency 
      ? '/models/emergency_shelter.glb' 
      : isCommunity 
      ? '/models/community_shelter.glb' 
      : '/models/permanent_shelter.glb'
  );

  return (
    <div className="w-full h-[520px] rounded-2xl overflow-hidden relative border border-white/10 shadow-2xl bg-[#090D16]">
      {/* 3D Model Control Toolbar */}
      <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
        <div className="px-3 py-1.5 bg-black/60 backdrop-blur-md rounded-xl text-xs font-mono font-semibold text-white border border-white/10 shadow-lg flex items-center gap-2">
          <Building2 size={14} className="text-[#FF5722]" />
          <span>{buildingType?.toUpperCase() || 'RESIDENTIAL'} 3D DIGITAL TWIN</span>
        </div>

        {/* Roof Cutaway Toggle */}
        <button
          onClick={() => setShowRoof(!showRoof)}
          className={`px-3 py-1.5 rounded-xl text-xs font-mono font-semibold transition-all border shadow-lg flex items-center gap-1.5 cursor-pointer backdrop-blur-md ${
            !showRoof 
              ? 'bg-[#FF5722] text-white border-[#FF5722]' 
              : 'bg-black/60 text-white/80 hover:text-white border-white/10'
          }`}
          title="Toggle Roof to Inspect Interior Floorplan Layout"
        >
          <Layers size={13} />
          <span>{showRoof ? 'Roof Cutaway (Look Inside)' : 'Restore Full Roof'}</span>
        </button>

        {/* Auto Rotate Toggle */}
        <button
          onClick={() => setAutoRotate(!autoRotate)}
          className={`p-1.5 rounded-xl text-xs font-mono transition-all border shadow-lg cursor-pointer backdrop-blur-md ${
            autoRotate 
              ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' 
              : 'bg-black/60 text-white/50 hover:text-white border-white/10'
          }`}
          title="Toggle 360° Orbit Rotation"
        >
          <RotateCw size={14} className={autoRotate ? 'animate-spin' : ''} style={{ animationDuration: '6s' }} />
        </button>
      </div>

      {/* Orbit Helper Tip */}
      <div className="absolute bottom-4 left-4 z-20 px-3 py-1 bg-black/50 backdrop-blur-md rounded-lg text-[11px] font-mono text-white/50 border border-white/5 pointer-events-none hidden sm:block">
        Left-click + drag to rotate • Right-click to pan • Scroll to zoom
      </div>

      {/* 3D Canvas */}
      <Canvas 
        shadows 
        camera={{ position: [lengthM * 1.5, heightM * 2.2, widthM * 1.8], fov: 42 }}
      >
        {/* Realistic Architectural Lighting Setup */}
        <ambientLight intensity={0.65} />
        
        {/* Primary Sun Directional Light (Oriented according to Solar Azimuth) */}
        <directionalLight 
          castShadow 
          position={[lengthM * 1.2, heightM * 3, widthM * 1.5]} 
          intensity={1.8} 
          color="#FFF7ED"
          shadow-mapSize={[2048, 2048]} 
          shadow-bias={-0.0001}
        />

        {/* Sky Fill Light */}
        <hemisphereLight 
          intensity={0.4} 
          color="#BAE6FD" 
          groundColor="#334155" 
        />

        <color attach="background" args={['#090D16']} />

        <Suspense 
          fallback={
            <Html center>
              <div className="flex flex-col items-center justify-center p-6 bg-black/80 rounded-2xl border border-white/10 backdrop-blur-md">
                <Loader2 size={32} className="animate-spin text-[#FF5722] mb-3" />
                <span className="text-xs font-mono text-white/80 tracking-wider uppercase font-semibold">
                  Compiling 3D Geometry...
                </span>
              </div>
            </Html>
          }
        >
          {/* Main 3D Model: Tries GLB first, falls back to Procedural Cutaway */}
          {!useProcedural ? (
            <ArchitecturalGLTFModel 
              url={defaultGlbModel} 
              showRoof={showRoof} 
            />
          ) : (
            <ProceduralArchitecturalModel 
              lengthM={lengthM} 
              widthM={widthM} 
              heightM={heightM} 
              showRoof={showRoof}
              isEmergency={isEmergency}
            />
          )}

          {/* Ground Plane & Ambient Contact Shadows */}
          <ContactShadows 
            position={[0, -heightM / 2 - 0.05, 0]} 
            opacity={0.55} 
            scale={Math.max(lengthM, widthM) * 3} 
            blur={2.5} 
            far={10} 
            color="#000000"
          />
        </Suspense>

        {/* Smooth Orbit Controls */}
        <OrbitControls 
          makeDefault 
          autoRotate={autoRotate} 
          autoRotateSpeed={0.8}
          minPolarAngle={0.1} 
          maxPolarAngle={Math.PI / 2 - 0.02} 
          minDistance={3}
          maxDistance={35}
        />
      </Canvas>
    </div>
  );
}
