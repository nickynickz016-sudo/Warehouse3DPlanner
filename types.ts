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

export interface PackageHistoryEvent {
  status: 'in' | 'out';
  timestamp: string;
}

export interface PackageRecord {
  number: number;
  status: 'in' | 'out' | 'none';
  inTimestamp?: string; // Legacy
  outTimestamp?: string; // Legacy
  history: PackageHistoryEvent[];
}

export interface JobEntry {
  id: string;
  jobNumber: string;
  shipperName: string;
  inDate: string;
  outDate: string;
  pricePerMonth: number;
  cbm: number;
  storageType: 'SIT' | 'LTS';
  paymentCycle: 'Monthly' | 'Quarterly' | 'Yearly';
  status: 'active' | 'completed' | 'pending';
  notes?: string;
  packages?: PackageRecord[];
}

export interface RackDetails {
  status: 'available' | 'occupied' | 'reserved';
  jobs: JobEntry[];
  volumeOccupied: number; // m3
  enclosureType: 'Open Space' | 'Shuttered Warehouse' | 'Close Cabin';
  salesPerson?: string;
  levels?: number;
  capacityPerLevel?: number;
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
  type: 'rack' | 'office' | 'zone' | 'wall' | 'obstacle' | 'passageway' | 'fire_exit' | 'washroom' | 'entrance' | 'camera' | 'ac' | 'stairs' | 'store' | 'open_cabin' | 'open_space_storage' | 'warehouse' | 'temp_storage';
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

export type BranchCode = 'UAE' | 'QATAR' | 'KSA';

export interface BranchInfo {
  code: BranchCode;
  name: string;
  country: string;
  flag: string;
  currency: string;
  jobPrefix: string;
}

export const BRANCH_LIST: BranchInfo[] = [
  { code: 'UAE', name: 'UAE Branch', country: 'United Arab Emirates', flag: '🇦🇪', currency: 'AED', jobPrefix: 'AE' },
  { code: 'QATAR', name: 'Qatar Branch', country: 'Qatar', flag: '🇶🇦', currency: 'QAR', jobPrefix: 'QA' },
  { code: 'KSA', name: 'KSA Branch', country: 'Kingdom of Saudi Arabia', flag: '🇸🇦', currency: 'SAR', jobPrefix: 'SA' }
];

export const BRANCH_MAP: Record<BranchCode, BranchInfo> = {
  UAE: BRANCH_LIST[0],
  QATAR: BRANCH_LIST[1],
  KSA: BRANCH_LIST[2]
};

export interface WarehouseConfig {
  id: string;
  name: string;
  branch?: BranchCode; // 'UAE' | 'QATAR' | 'KSA'
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
  labelFontSize: number; // Font size for labels in 2D view (px)
}

export interface StorageStats {
  palletPositions: number;
  cubicVolume: number; // cm3 -> converted to m3 for display
  occupiedVolume: number; // m3
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