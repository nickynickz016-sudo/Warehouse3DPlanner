import { WarehouseConfig, StorageStats, LayoutItem, Level } from '../types';
import { PALLET_DEPTH, PALLET_WIDTH, RACK_HEIGHT_PER_LEVEL } from '../constants';

// Area is in m2, returns dimensions in cm
export const calculateDimensionsFromArea = (area: number): { length: number; width: number } => {
  // area m2 * 10000 = area cm2
  const areaCm = area * 10000;
  const ratio = 1.5; 
  const width = Math.sqrt(areaCm / ratio);
  const length = areaCm / width;
  return { length: Math.round(length), width: Math.round(width) };
};

// --- Procedural Generation Logic (Moved from View2D) ---
export const generateProceduralLayout = (config: WarehouseConfig): LayoutItem[] => {
  const { dimensions, zones, aisleWidth, storageType } = config;
  const items: LayoutItem[] = [];
  
  // 1. Office (zones are in m2) -> convert to cm dimensions
  const officeAreaCm = zones.office * 10000;
  const officeL = Math.sqrt(officeAreaCm * 1.5);
  const officeW = officeAreaCm / officeL;
  
  // Decide Layout Style (Corridor if width < 1800cm / 18m)
  const isCorridor = dimensions.width < 1800;
  
  if (isCorridor) {
     // Bottom Left Office
     const bottomY = (dimensions.width / 2) + (aisleWidth / 2) + 60; // 60cm buffer
     const bottomH = dimensions.width - bottomY - 150;
     
     if (bottomH > 0) {
        items.push({
            id: 'office-main',
            type: 'office',
            x: 150,
            y: bottomY,
            width: officeL,
            height: bottomH,
            depth: 300, // 3m height
            rotation: 0,
            label: 'OFFICE',
            color: '#dbeafe'
        });
     }

     // Top Racks
     const aisleY = (dimensions.width / 2) - (aisleWidth / 2);
     const topRackY = 150;
     const topRackHeight = aisleY - 150 - 60;
     const topRackLength = dimensions.length - 300;
     const bays = Math.floor(topRackLength / PALLET_WIDTH);

     if (topRackHeight > 50) {
        for (let i = 0; i < bays; i++) {
            items.push({
                id: `rack-top-${i}`,
                type: 'rack',
                x: 150 + (i * PALLET_WIDTH),
                y: topRackY,
                width: PALLET_WIDTH - 10,
                height: topRackHeight,
                depth: config.levels[0]?.height ? config.levels[0].height - 50 : 350,
                rotation: 0,
                label: `U0${i+1}`,
                color: '#FFCC00',
                rackDetails: {
                    status: 'available',
                    jobs: [],
                    volumeOccupied: 0,
                    enclosureType: 'Open Space'
                }
            });
        }
     }

     // Bottom Racks (Right of office)
     const startRacksX = 150 + officeL + 300; // 3m buffer
     const remainingLen = dimensions.length - startRacksX - 150;
     const bottomBays = Math.floor(remainingLen / PALLET_WIDTH);

     if (remainingLen > 0 && bottomH > 50) {
        for (let i = 0; i < bottomBays; i++) {
            items.push({
                id: `rack-bot-${i}`,
                type: 'rack',
                x: startRacksX + (i * PALLET_WIDTH),
                y: bottomY,
                width: PALLET_WIDTH - 10,
                height: bottomH,
                depth: config.levels[0]?.height ? config.levels[0].height - 50 : 350,
                rotation: 0,
                label: `U1${i+3}`,
                color: '#FFCC00',
                rackDetails: {
                    status: 'available',
                    jobs: [],
                    volumeOccupied: 0,
                    enclosureType: 'Open Space'
                }
            });
        }
     }
  } else {
    // Standard Grid
    items.push({
        id: 'office-main',
        type: 'office',
        x: 150,
        y: 150,
        width: officeL,
        height: officeW,
        depth: 300,
        rotation: 0,
        label: 'OFFICE',
        color: '#dbeafe'
    });

    const startX = 150;
    const startY = 150 + officeW + 150;
    const rackDepth = PALLET_DEPTH * 2;
    const availableWidth = dimensions.width - 300;
    const availableLength = dimensions.length - 600;

    let currentY = startY;
    let rowCount = 0;
    while (currentY < availableWidth - rackDepth) {
        const itemDepth = config.levels[0]?.height ? config.levels[0].height - 50 : 350;
        items.push({
            id: `rack-row-${rowCount}-a`,
            type: 'rack',
            x: startX,
            y: currentY,
            width: availableLength,
            height: PALLET_DEPTH,
            depth: itemDepth,
            rotation: 0,
            color: '#FFCC00',
            rackDetails: {
                status: 'available',
                jobs: [],
                volumeOccupied: 0,
                enclosureType: 'Open Space'
            }
        });
        items.push({
            id: `rack-row-${rowCount}-b`,
            type: 'rack',
            x: startX,
            y: currentY + PALLET_DEPTH,
            width: availableLength,
            height: PALLET_DEPTH,
            depth: itemDepth,
            rotation: 0,
            color: '#FFCC00',
            rackDetails: {
                status: 'available',
                jobs: [],
                volumeOccupied: 0,
                enclosureType: 'Open Space'
            }
        });
        currentY += (PALLET_DEPTH * 2) + aisleWidth;
        rowCount++;
    }
  }
  
  return items;
};

// --- Statistics Calculation ---
export const calculateStats = (config: WarehouseConfig): StorageStats => {
  let totalPallets = 0;
  let rackCount = 0;
  let totalVolume = 0;

  config.levels.forEach(level => {
      if (level.items.length > 0) {
          level.items.forEach(item => {
              if (item.type === 'rack') {
                  // item.width/height is footprint in cm
                  const area = item.width * item.height;
                  const singlePalletArea = PALLET_WIDTH * PALLET_DEPTH;
                  const capacityPerLevel = Math.max(1, Math.floor(area / singlePalletArea));
                  
                  // Height levels (item.depth is height in 3D)
                  const rackHeight = item.depth || (level.height - 50);
                  const levels = Math.floor(rackHeight / RACK_HEIGHT_PER_LEVEL);
                  
                  const racksInItem = capacityPerLevel * levels;
                  totalPallets += racksInItem;
                  rackCount += 1;
                  totalVolume += (item.width * item.height * rackHeight);
              }
          });
      }
  });

  // Calculate efficiency based on volume vs total warehouse volume
  const totalWarehouseVolume = config.dimensions.length * config.dimensions.width * config.dimensions.height;
  const efficiency = totalWarehouseVolume > 0 
    ? Math.min(100, Math.round((totalVolume / totalWarehouseVolume) * 100)) 
    : 0;

  return {
    palletPositions: totalPallets,
    cubicVolume: totalVolume, // kept in cm3 for precision, component converts to m3
    usableEfficiency: efficiency,
    rackCount
  };
};