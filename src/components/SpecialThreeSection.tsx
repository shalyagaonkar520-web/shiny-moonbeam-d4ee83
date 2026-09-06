import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { Float, MeshDistortMaterial, MeshWobbleMaterial, OrbitControls, PerspectiveCamera, Text, Environment, ContactShadows, PresentationControls, useTexture } from '@react-three/drei';
import { useRef, useState, useMemo } from 'react';
import * as THREE from 'three';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, Plus, Zap, ArrowRight } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useMenuStore } from '../store/menuStore';
import toast from 'react-hot-toast';

function Milkshake3D() {
  const glassRef = useRef<THREE.Mesh>(null);
  const liquidRef = useRef<THREE.Mesh>(null);
  const strawRef = useRef<THREE.Mesh>(null);
  
  useFrame((state) => {
    const t = state.clock.getElapsedTime();
    if (glassRef.current) {
      glassRef.current.rotation.y = Math.sin(t * 0.5) * 0.2;
    }
  });

  return (
    <group>
      {/* The Glass */}
      <mesh ref={glassRef}>
        <cylinderGeometry args={[0.5, 0.35, 1.5, 32]} />
        <meshPhysicalMaterial 
          transparent 
          opacity={0.3} 
          roughness={0} 
          transmission={1} 
          thickness={0.5} 
          envMapIntensity={2}
          color="#ffffff"
        />
      </mesh>

      {/* The Liquid (Mango Shake) */}
      <mesh ref={liquidRef} position={[0, -0.05, 0]} scale={[0.95, 0.9, 0.95]}>
        <cylinderGeometry args={[0.48, 0.33, 1.4, 32]} />
        <MeshWobbleMaterial 
          color="#FFD700" 
          factor={0.1} 
          speed={1} 
          roughness={0.2}
          emissive="#FF8C00"
          emissiveIntensity={0.2}
        />
      </mesh>

      {/* Creamy Top (Splash effect) */}
      <mesh position={[0, 0.65, 0]} scale={[1, 0.3, 1]}>
        <sphereGeometry args={[0.48, 32, 32]} />
        <MeshDistortMaterial 
          color="#FFF9E3" 
          distort={0.4} 
          speed={2} 
          roughness={0.1} 
        />
      </mesh>

      {/* Mango Splashes (Small spheres) */}
      {[...Array(5)].map((_, i) => (
        <Float key={i} speed={3} rotationIntensity={2} floatIntensity={2} position={[Math.sin(i * 2) * 0.6, 0.7, Math.cos(i * 2) * 0.6]}>
          <mesh scale={0.08}>
            <sphereGeometry />
            <meshStandardMaterial color="#FFD700" emissive="#FF8C00" emissiveIntensity={0.5} />
          </mesh>
        </Float>
      ))}

      {/* Straw */}
      <mesh ref={strawRef} position={[0.2, 0.5, 0]} rotation={[0, 0, -0.2]}>
        <cylinderGeometry args={[0.03, 0.03, 2, 16]} />
        <meshStandardMaterial color="#FF4D00" />
      </mesh>

      {/* Ice Cubes (Floating around) */}
      <group>
        {[1, 2, 3].map((i) => (
          <Float key={i} speed={2} rotationIntensity={2} floatIntensity={1} position={[Math.sin(i) * 0.4, 0.3, Math.cos(i) * 0.4]}>
            <mesh scale={0.1}>
              <boxGeometry />
              <meshPhysicalMaterial transparent opacity={0.6} transmission={1} color="#ffffff" />
            </mesh>
          </Float>
        ))}
      </group>
    </group>
  );
}

function SceneBackground() {
  const texture = useTexture('/mango_special.png');
  return (
    <mesh position={[0, 0, -5]} scale={[15, 10, 1]}>
      <planeGeometry />
      <meshBasicMaterial map={texture} transparent opacity={0.3} />
    </mesh>
  );
}

function Particles() {
  const count = 100;
  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 15;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 15;
    }
    return pos;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={positions}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#FFD700" transparent opacity={0.4} />
    </points>
  );
}

export default function SpecialThreeSection() {
  const { addItem } = useCartStore();
  const [isMobile] = useState(window.innerWidth < 768);
  const mangoShake = undefined;
  const { menuItems } = useMenuStore();
  const otherShakes = menuItems.filter(i => ['drink-special-2', 'drink-special-3'].includes(i.id!));

  const handleAdd = (item: any) => {
    if (item) {
      addItem(item);
      toast.success(`${item.name} Added! 🥭✨`, {
        icon: '👑',
        style: {
          background: '#161A22',
          color: '#FFD700',
          border: '2px solid #FFD700'
        }
      });
    }
  };

  return (
    <section className="relative w-full min-h-[700px] md:min-h-[850px] bg-gradient-to-b from-brand/10 via-dark-bg to-dark-bg rounded-[60px] md:rounded-[100px] overflow-hidden border border-white/5 my-20 shadow-[0_50px_100px_rgba(0,0,0,0.8)]">
      {/* 3D Background Canvas */}
      <div className="absolute inset-0 z-0">
        <Canvas 
          dpr={[1, 1.5]}
          gl={{ powerPreference: 'high-performance', antialias: true }}
          shadows 
          camera={{ position: [0, 0, 6], fov: isMobile ? 50 : 40 }}
        >
          <ambientLight intensity={0.8} />
          <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1.5} castShadow />
          <pointLight position={[-10, -10, -10]} intensity={1} color="#FF4D00" />
          
          <SceneBackground />
          
          <PresentationControls
            global
            rotation={[0, 0.3, 0]}
            polar={[-Math.PI / 3, Math.PI / 3]}
            azimuth={[-Math.PI / 1.4, Math.PI / 1.4]}
          >
            <Float speed={2.5} rotationIntensity={1.5} floatIntensity={1.5}>
              <group scale={isMobile ? 1.5 : 2.5}>
                <Milkshake3D />
              </group>
            </Float>
          </PresentationControls>

          <Particles />
          <ContactShadows position={[0, -3, 0]} opacity={0.6} scale={15} blur={2.5} far={5} />
          <Environment preset="studio" />
        </Canvas>
      </div>

      {/* Content Overlay */}
      <div className="relative z-10 w-full h-full flex flex-col items-center justify-between p-8 md:p-24 pointer-events-none">
        <div className="w-full max-w-7xl flex flex-col md:flex-row items-center justify-between gap-12">
          <div className="max-w-2xl space-y-8 pointer-events-auto">
            <motion.div 
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              className="flex items-center gap-4"
            >
              <div className="px-6 py-2 bg-brand text-white text-[12px] font-black uppercase tracking-[6px] rounded-full shadow-[0_10px_30px_rgba(255,77,0,0.4)]">
                Luxury Edition
              </div>
              <div className="h-[2px] w-16 bg-brand/30" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <h2 className="text-6xl md:text-9xl font-black italic tracking-tighter leading-[0.85] text-white uppercase">
                TASTE THE ROYAL <br />
                <span className="text-gradient-gold drop-shadow-[0_10px_30px_rgba(255,215,0,0.3)]">
                  JAIPUR MANGO
                </span>
              </h2>
              <motion.p 
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-white/60 text-xl md:text-2xl font-black italic uppercase tracking-widest mt-6 flex items-center gap-4"
              >
                Special Selection 🥭✨ <span className="h-[1px] w-20 bg-white/10" />
              </motion.p>
            </motion.div>

            <div className="flex flex-wrap items-center gap-10 pt-8">
              <div className="flex flex-col">
                <span className="text-white/30 text-xs font-black uppercase tracking-[5px] mb-2">Crown Jewel Price</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-7xl md:text-8xl font-black italic text-brand tracking-tighter drop-shadow-2xl">₹99</span>
                  <span className="text-white/20 text-2xl font-black line-through">₹199</span>
                </div>
              </div>
              
              <button 
                onClick={() => handleAdd(mangoShake)}
                className="px-14 py-7 bg-white text-black font-black text-sm uppercase tracking-[4px] rounded-[32px] shadow-[0_25px_60px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all flex items-center gap-4 group hover:bg-brand hover:text-white"
              >
                ADD TO ROYAL PLATE <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform" />
              </button>
            </div>
          </div>

          {/* Related Shakes */}
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            className="w-full md:w-auto flex flex-col gap-6 pointer-events-auto"
          >
            <p className="text-white/40 text-[10px] font-black uppercase tracking-[6px] text-center md:text-right">Also Available</p>
            {otherShakes.map((shake, i) => (
              <motion.div 
                key={shake.id}
                whileHover={{ x: -10, scale: 1.05 }}
                className="p-6 bg-white/5 backdrop-blur-3xl border border-white/10 rounded-[40px] flex items-center gap-6 min-w-[300px] group cursor-pointer hover:border-brand/40 transition-all shadow-2xl"
                onClick={() => handleAdd(shake)}
              >
                <div className="w-16 h-16 rounded-2xl overflow-hidden border border-white/10 relative">
                  <img src={shake.image} className="w-full h-full object-cover group-hover:scale-110 transition-transform" alt="" />
                  <div className="absolute inset-0 bg-brand/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="flex-1">
                  <h4 className="text-white font-black italic text-lg leading-none uppercase">{shake.name}</h4>
                  <p className="text-brand font-black text-sm mt-1">₹{shake.price}</p>
                </div>
                <div className="w-10 h-10 bg-white/5 group-hover:bg-brand rounded-xl flex items-center justify-center transition-all">
                  <Plus className="w-5 h-5 text-white" />
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Luxury Accents */}
      <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-brand/20 to-transparent opacity-30" />
      <div className="absolute bottom-0 left-0 w-full h-64 bg-gradient-to-t from-dark-bg to-transparent" />
      <div className="absolute -bottom-40 -left-40 w-[600px] h-[600px] bg-brand/10 blur-[150px] rounded-full" />
      <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-brand/10 blur-[150px] rounded-full" />
    </section>
  );
}
