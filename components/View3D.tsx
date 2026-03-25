import React, { useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, Environment, PerspectiveCamera, Text } from '@react-three/drei';
import * as THREE from 'three';
import { WarehouseConfig, LayoutItem } from '../types';
import { PALLET_WIDTH, RACK_HEIGHT_PER_LEVEL } from '../constants';

interface Props {
  config: WarehouseConfig;
}

interface RackRowProps {
  position: [number, number, number];
  length: number;
  height: number; // Vertical height
  depth: number; // Depth (Y in layout)
  type: string;
  status?: string;
  rotation: number; 
}

const RackRow: React.FC<RackRowProps> = ({ position, length, height, depth, type, status, rotation }) => {
    const levels = Math.max(1, Math.floor(height / RACK_HEIGHT_PER_LEVEL));
    const shelves = [];
    
    // Default Yellow shelf, Red if occupied
    let shelfColor = "#FFCC00"; 
    if (status === 'occupied') shelfColor = "#ef4444"; 
    if (status === 'reserved') shelfColor = "#f97316"; 

    for(let i=1; i <= levels; i++) {
        shelves.push(
            <mesh key={`shelf-${i}`} position={[0, i * RACK_HEIGHT_PER_LEVEL - (RACK_HEIGHT_PER_LEVEL/2), 0]}>
                <boxGeometry args={[length, 5, depth]} />
                <meshStandardMaterial color={shelfColor} />
            </mesh>
        );
    }
    
    const uprightCount = Math.max(2, Math.floor(length / PALLET_WIDTH) + 1);
    const uprights = [];
    for(let i=0; i < uprightCount; i++) {
         const xPos = -(length/2) + (i * (length / (uprightCount-1)));
         uprights.push(
            <mesh key={`u-l-${i}`} position={[xPos, height/2, -depth/2 + 3]}>
                <boxGeometry args={[5, height, 5]} />
                <meshStandardMaterial color="#111111" /> {/* Black Uprights */}
            </mesh>
         );
         uprights.push(
            <mesh key={`u-r-${i}`} position={[xPos, height/2, depth/2 - 3]}>
                <boxGeometry args={[5, height, 5]} />
                <meshStandardMaterial color="#111111" />
            </mesh>
         );
    }
    
    return (
        <group position={position} rotation={[0, -rotation * Math.PI / 180, 0]}>
            {shelves}
            {uprights}
            {status === 'occupied' && (
                 <mesh position={[0, height/2, 0]}>
                     <boxGeometry args={[length*0.9, height*0.7, depth*0.9]} />
                     <meshStandardMaterial color="#b45309" opacity={0.5} transparent />
                 </mesh>
            )}
        </group>
    )
}

const Stairs: React.FC<{ position: [number, number, number], length: number, height: number, depth: number, rotation: number }> = ({ position, length, height, depth, rotation }) => {
    const steps = 10;
    const stepHeight = height / steps;
    const stepDepth = depth / steps; // depth is the Y axis in 2D, which maps to Z in 3D local
    
    // In local coords, length is X width, depth is Z length
    const meshes = [];
    for(let i=0; i<steps; i++) {
        meshes.push(
            <mesh key={i} position={[0, (i * stepHeight) + (stepHeight/2), -(depth/2) + (i * stepDepth) + (stepDepth/2)]}>
                <boxGeometry args={[length, stepHeight, stepDepth]} />
                <meshStandardMaterial color="#cbd5e1" />
            </mesh>
        );
    }

    return (
        <group position={position} rotation={[0, -rotation * Math.PI / 180, 0]}>
            {meshes}
            {/* Railings */}
             <mesh position={[length/2 - 2, height/2 + 20, 0]}>
                <boxGeometry args={[2, height + 40, depth]} />
                <meshStandardMaterial color="#333" wireframe />
            </mesh>
             <mesh position={[-length/2 + 2, height/2 + 20, 0]}>
                <boxGeometry args={[2, height + 40, depth]} />
                <meshStandardMaterial color="#333" wireframe />
            </mesh>
        </group>
    )
}

const View3D: React.FC<Props> = ({ config }) => {
  const { dimensions, storageType, levels } = config;
  const floorL = dimensions.length;
  const floorW = dimensions.width;

  const renderedLevels = useMemo(() => {
    return levels.map((level, levelIndex) => {
        const elevationY = level.elevation;
        
        return (
            <group key={level.id} position={[0, elevationY, 0]}>
                {/* Floor */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]} receiveShadow>
                    <planeGeometry args={[dimensions.length, dimensions.width]} />
                    <meshStandardMaterial color={levelIndex === 0 ? "#f1f5f9" : "#e2e8f0"} transparent opacity={levelIndex === 0 ? 1 : 0.8} />
                </mesh>
                
                {level.items.map(item => {
                    // Position conversion
                    // Item x/y are top-left in 2D. We need center.
                    const centerX = item.x + item.width/2;
                    const centerY = item.y + item.height/2;

                    // Convert to 3D coords centered at (0,0) of the floor
                    const posX = centerX - floorL/2;
                    const posZ = centerY - floorW/2;
                    
                    const h = item.depth || (level.height - 20); 
                    const rotation = item.rotation || 0;

                    switch (item.type) {
                        case 'rack':
                             return <RackRow 
                                        key={item.id}
                                        position={[posX, 0, posZ]} 
                                        length={item.width} 
                                        height={h}
                                        depth={item.height} // 2D height -> 3D Depth
                                        type={storageType}
                                        status={item.rackDetails?.status}
                                        rotation={rotation}
                                    />;
                        case 'stairs':
                            return <Stairs 
                                        key={item.id}
                                        position={[posX, 0, posZ]}
                                        length={item.width}
                                        height={h}
                                        depth={item.height}
                                        rotation={rotation}
                                   />
                        case 'office':
                        case 'store':
                        case 'warehouse':
                        case 'washroom':
                            return (
                                 <group key={item.id} position={[posX, h/2, posZ]} rotation={[0, -rotation * Math.PI / 180, 0]}>
                                    <mesh>
                                        <boxGeometry args={[item.width, h, item.height]} />
                                        <meshStandardMaterial color={item.color || "#93c5fd"} transparent opacity={0.6} />
                                    </mesh>
                                    <mesh position={[0, h/2 + 10, 0]} rotation={[-Math.PI/2, 0, 0]}>
                                         <planeGeometry args={[item.width * 0.8, item.height * 0.8]} />
                                         <meshStandardMaterial color="#fff" />
                                    </mesh>
                                    <Text position={[0, h/2 + 20, 0]} fontSize={40} color="#111111" rotation={[-Math.PI/2, 0, 0]}>
                                        {item.label}
                                    </Text>
                                 </group>
                            );
                        case 'open_cabin':
                             return (
                                 <group key={item.id} position={[posX, h/2, posZ]} rotation={[0, -rotation * Math.PI / 180, 0]}>
                                    <mesh>
                                        <boxGeometry args={[item.width, h, item.height]} />
                                        <meshStandardMaterial color={item.color || "#ccfbf1"} transparent opacity={0.7} />
                                    </mesh>
                                    <Text position={[0, h/2 + 20, 0]} fontSize={30} color="#111111" rotation={[-Math.PI/2, 0, 0]}>
                                        {item.label}
                                    </Text>
                                 </group>
                            );
                        case 'open_space_storage':
                             return (
                                 <group key={item.id} position={[posX, 3, posZ]} rotation={[0, -rotation * Math.PI / 180, 0]}>
                                    {/* Floor Marking */}
                                    <mesh rotation={[-Math.PI/2, 0, 0]}>
                                        <planeGeometry args={[item.width, item.height]} />
                                        <meshStandardMaterial color={item.color || "#fed7aa"} transparent opacity={0.6} />
                                    </mesh>
                                    {/* Vertical space wireframe indicating volume */}
                                    <mesh position={[0, h/2, 0]}>
                                        <boxGeometry args={[item.width, h, item.height]} />
                                        <meshStandardMaterial color={item.color || "#fed7aa"} wireframe />
                                    </mesh>
                                    <Text position={[0, 5, 0]} fontSize={40} color="#c2410c" rotation={[-Math.PI/2, 0, 0]}>
                                        {item.label}
                                    </Text>
                                 </group>
                            );
                        case 'passageway':
                            return (
                                <mesh key={item.id} position={[posX, 6, posZ]} rotation={[-Math.PI/2, 0, -rotation * Math.PI / 180]}>
                                     <planeGeometry args={[item.width, item.height]} />
                                     <meshStandardMaterial color="#FFCC00" opacity={0.3} transparent depthWrite={false} />
                                </mesh>
                            );
                        case 'fire_exit':
                        case 'entrance':
                             return (
                                 <group key={item.id} position={[posX, 100, posZ]} rotation={[0, -rotation * Math.PI / 180, 0]}>
                                     <mesh>
                                        <boxGeometry args={[item.width, 200, 10]} />
                                        <meshStandardMaterial color={item.type === 'fire_exit' ? 'red' : 'gray'} />
                                     </mesh>
                                     <Text position={[0, 120, 0]} fontSize={40} color="white">{item.label}</Text>
                                 </group>
                             );
                        case 'camera':
                             return (
                                 <group key={item.id} position={[posX, level.height - 50, posZ]} rotation={[0, -rotation * Math.PI / 180, 0]}>
                                    <mesh rotation={[Math.PI/4, 0, 0]}>
                                        <coneGeometry args={[10, 20]} />
                                        <meshStandardMaterial color="black" />
                                    </mesh>
                                 </group>
                             );
                        case 'ac':
                             return (
                                 <mesh key={item.id} position={[posX, level.height - 50, posZ]} rotation={[0, -rotation * Math.PI / 180, 0]}>
                                     <boxGeometry args={[40, 40, 40]} />
                                     <meshStandardMaterial color="white" />
                                 </mesh>
                             );
                        default:
                            return (
                                 <mesh key={item.id} position={[posX, 50, posZ]} rotation={[0, -rotation * Math.PI / 180, 0]}>
                                     <boxGeometry args={[item.width, 100, item.height]} />
                                     <meshStandardMaterial color={item.color || "gray"} />
                                 </mesh>
                            );
                    }
                })}
                 <Text position={[-floorL/2 - 100, 50, 0]} rotation={[0, Math.PI/2, 0]} fontSize={100} color="#111111">
                    {level.name}
                </Text>
            </group>
        );
    });
  }, [levels, dimensions, storageType]);

  return (
    <div className="flex-1 bg-gray-900 relative">
        <div className="absolute top-4 left-4 bg-white/10 text-white p-2 rounded text-sm font-bold z-10 backdrop-blur-md">
            Interactive 3D View (Metric)
        </div>
      <Canvas shadows camera={{ position: [config.dimensions.length, config.dimensions.height * 2, config.dimensions.width], fov: 45, far: 20000 }}>
        <OrbitControls maxPolarAngle={Math.PI / 2.1} minDistance={100} maxDistance={10000} />
        <ambientLight intensity={0.6} />
        <pointLight position={[0, 2000, 0]} intensity={1} castShadow />
        <directionalLight position={[1000, 2000, 1000]} intensity={0.5} />
        {renderedLevels}
        <Environment preset="city" />
      </Canvas>
    </div>
  );
};

export default View3D;