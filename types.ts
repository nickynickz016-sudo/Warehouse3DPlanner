export type StorageType = 'Pallet Racking' | 'Fine Arts Racking' | 'Bulk Storage' | 'Mezzanine';
export type ForkliftType = 'Counterbalance' | 'Reach Truck' | 'VNA';

export interface WarehouseDimensions {
  length: number; // cm
  width: number; // cm
  height: number; // cm
  totalArea: number; // m2
}

export interface ZoneSizes {
  office: number; // m2
  receiving: number; // m2
  dispatch: number; // m2
}

export interface JobEntry {
  id: string;
  jobNumber: string;
  shipperName: string;
  inDate: string;
  outDate: string;
  pricePerMonth: number;
  paymentCycle: 'Monthly' | 'Quarterly' | 'Yearly';
  status: 'active' | 'completed' | 'pending';
  notes?: string;
}

export interface RackDetails {
  status: 'available' | 'occupied' | 'reserved';
  jobs: JobEntry[];
  volumeOccupied: number; // m3
  enclosureType: 'Open Space' | 'Shuttered Warehouse' | 'Close Cabin';
  // Legacy fields for compatibility during transition
  shipperName?: string;
  jobNumber?: string;
  inDate?: string;
  outDate?: string;
  price?: number;
  billingPeriod?: 'monthly' | 'yearly';
}

export interface LayoutItem {
  id: string;
  type: 'rack' | 'office' | 'zone' | 'wall' | 'obstacle' | 'passageway' | 'fire_exit' | 'washroom' | 'entrance' | 'camera' | 'ac' | 'stairs' | 'store' | 'open_cabin' | 'open_space_storage' | 'warehouse';
  x: number;
  y: number;
  width: number; // cm
  height: number; // cm (Length on 2D plane)
  depth?: number; // cm (Height in 3D space)
  rotation: number; // degrees
  label?: string;
  color?: string;
  rackDetails?: RackDetails; // Specific data for racks
}

export interface Level {
  id: string;
  name: string;
  elevation: number; // Height from ground (cm)
  height: number; // Ceiling height of this level (cm)
  totalVolumeCapacity: number; // Total m3 available for this floor
  items: LayoutItem[];
}

export interface WarehouseConfig {
  id: string;
  name: string;
  dimensions: WarehouseDimensions;
  storageType: StorageType;
  aisleWidth: number; // cm
  docks: number;
  zones: ZoneSizes;
  forklift: ForkliftType;
  temperatureControlled: boolean;
  columnSpacing: number; // cm
  levels: Level[]; // Multi-level support
  activeLevelId: string;
  mode: 'auto' | 'custom'; // Auto-generated vs Manual Edit
  pricePerCbm: number; // Selling point per CBM
}

export interface StorageStats {
  palletPositions: number;
  cubicVolume: number; // cm3 -> converted to m3 for display
  usableEfficiency: number; // percentage
  rackCount: number;
}

export interface GeminiOptimizationResult {
  suggestion: string;
  score: number;
  potentialRevenue: string;
  maxCbm: string;
  generatedLayout?: LayoutItem[]; // The AI generated design
}