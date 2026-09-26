import React, { Suspense, useContext } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, ContactShadows, useGLTF } from '@react-three/drei';
import { ArrowLeft, Maximize, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { AppContext } from '../App';
import { Html } from '@react-three/drei';

// Basic component to load and display the GLB model
function Model({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  // Center the model and adjust scale
  return <primitive object={scene} position={[-2, -2, -2]} scale={0.5} />;
}

export default function ModelViewerPage() {
  const { blueprintData } = useContext(AppContext) || {};
  
  // Research mode options
  const [activeModel, setActiveModel] = React.useState<string>(blueprintData?.glb_url || '/models/emergency_shelter.glb');

  const models = [
    { id: '/models/emergency_shelter.glb', name: 'Emergency Shelter (Rapid)' },
    { id: '/models/community_shelter.glb', name: 'Community Hub (Large)' },
    { id: '/models/permanent_shelter.glb', name: 'Permanent Housing (Multi-room)' },
  ];

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-200 flex flex-col font-sans selection:bg-[var(--color-accent)]/30">

      <main className="flex-1 flex flex-col pt-24 pb-8 px-6 max-w-[1600px] w-full mx-auto relative z-10 h-[calc(100vh-80px)]">
        
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link to="/app" className="inline-flex items-center text-sm text-sky-400 hover:text-sky-300 transition-colors mb-2 cursor-pointer">
              <ArrowLeft size={16} className="mr-1" /> Back to Hub
            </Link>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              3D Architecture Viewer
              <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs border border-emerald-500/20 uppercase tracking-widest font-semibold">
                High Precision
              </span>
            </h1>
            <p className="text-slate-400 mt-1">
              Interactive structural model generated procedurally from authoritative JSON specifications.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
               onClick={() => {
                 if (!document.fullscreenElement) {
                   document.documentElement.requestFullscreen().catch(() => {});
                 } else {
                   document.exitFullscreen().catch(() => {});
                 }
               }}
               className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700 font-medium text-sm cursor-pointer"
             >
                <Maximize size={16} />
                Fullscreen
             </button>
          </div>
        </div>

        {/* 3D Canvas Container */}
        <div className="flex-1 w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden relative shadow-2xl flex flex-col">
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090b]/90 to-transparent pointer-events-none z-10" />
          
          <div className="absolute top-6 left-6 z-20 flex gap-2">
            {models.map(m => (
              <button
                key={m.id}
                onClick={() => setActiveModel(m.id)}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${
                  activeModel === m.id 
                    ? 'bg-sky-500/20 text-sky-400 border-sky-500/30' 
                    : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>

          <Canvas shadows camera={{ position: [20, 15, 20], fov: 45 }}>
            <Suspense 
              fallback={
                <Html center>
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Loader2 size={48} className="animate-spin text-sky-500 mb-4" />
                    <p className="font-mono text-sm uppercase tracking-widest whitespace-nowrap">Compiling Geometry...</p>
                  </div>
                </Html>
              }
            >
              {/* Premium Lighting Setup */}
              <ambientLight intensity={0.5} />
              <directionalLight 
                castShadow 
                position={[10, 20, 10]} 
                intensity={1.5} 
                shadow-mapSize={[2048, 2048]} 
              />
              <Environment preset="city" />
              
              {/* The Model */}
              <Model key={activeModel} url={activeModel} />
              
              {/* Ground & Shadows */}
              <ContactShadows position={[0, -2.01, 0]} opacity={0.4} scale={50} blur={2} far={10} />
            </Suspense>
            
            {/* Controls */}
            <OrbitControls 
              makeDefault 
              minPolarAngle={0} 
              maxPolarAngle={Math.PI / 2 + 0.1} 
              maxDistance={50}
              minDistance={5}
            />
          </Canvas>

          {/* Model Stats Overlay */}
          <div className="absolute bottom-6 left-6 z-20 bg-slate-900/80 backdrop-blur-md border border-slate-700 rounded-xl p-4 w-72">
            <h3 className="text-sm font-semibold text-white mb-3 flex justify-between items-center">
              Geometry Stats
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            </h3>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Dimensions</span>
                <span className="font-mono text-slate-200">7.1m × 7.1m</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Ceiling Height</span>
                <span className="font-mono text-slate-200">2.7m</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Roof Type</span>
                <span className="font-mono text-slate-200">Gable</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-400">Accuracy</span>
                <span className="font-mono text-sky-400">1mm</span>
              </div>
            </div>
            
            <div className="mt-4 pt-3 border-t border-slate-700/50">
              <p className="text-[10px] text-slate-500 leading-tight">
                Mesh generated via boolean CSG operations on backend.
              </p>
            </div>
          </div>
        </div>
        
      </main>
    </div>
  );
}
