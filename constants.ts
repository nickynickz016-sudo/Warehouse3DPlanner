import { WarehouseConfig } from './types';

// Dimensions in CM
export const PALLET_WIDTH = 140; // cm (approx standard pallet + clearance)
export const PALLET_DEPTH = 120; // cm
export const RACK_HEIGHT_PER_LEVEL = 150; // cm

export const DEFAULT_CONFIG: WarehouseConfig = {
  id: 'wh-main',
  name: 'Main Warehouse',
  dimensions: {
    length: 2800, // cm (~28m)
    width: 1200,  // cm (~12m)
    height: 700,  // cm (~7m)
    totalArea: 336, // m2
  },
  storageType: 'Fine Arts Racking', 
  aisleWidth: 300, // cm (3m)
  docks: 1, 
  zones: {
    office: 48, // m2
    receiving: 20, // m2
    dispatch: 20, // m2
  },
  forklift: 'Reach Truck',
  temperatureControlled: true, 
  columnSpacing: 600, // cm (6m)
  levels: [
    {
      id: 'ground',
      name: 'Ground Floor',
      elevation: 0,
      height: 400, // cm
      totalVolumeCapacity: 1000, // Default m3
      items: [] // Will be auto-populated on init
    }
  ],
  activeLevelId: 'ground',
  mode: 'auto',
  pricePerCbm: 25 // Default $25 per CBM
};