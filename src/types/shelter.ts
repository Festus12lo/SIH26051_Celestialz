export type ColorSchemeId = 'olive-warm' | 'arctic-white' | 'desert-sand' | 'treated-bamboo';

export type ShelterArchetype = 'emergency' | 'community' | 'permanent';

export type RenderMode = 'studio' | 'thermal' | 'wireframe' | 'field' | 'xray';

export interface HotspotInfo {
  id: string;
  title: string;
  category: 'Structure' | 'Envelope' | 'Foundation' | 'Fenestration' | 'Aperture';
  position: [number, number, number];
  summary: string;
  specs: { label: string; value: string }[];
}

export interface MaterialConfig {
  name: string;
  description: string;
  wallPrimary: string;
  wallSecondary: string;
  frameColor: string;
  roofColor: string;
  roughness: number;
  metalness: number;
  frameMetalness: number;
  frameRoughness: number;
}

export interface BOMItem {
  id: string;
  category: string;
  item: string;
  specification: string;
  qty: number;
  unit: string;
  unitWeightKg: number;
  totalWeightKg: number;
  fieldTool: string;
}

export interface AssemblyStep {
  step: number;
  title: string;
  durationMinutes: number;
  crewSize: number;
  description: string;
  keyVerification: string;
  toolRequired: string;
}

// Runtime object tokens to prevent bundler ESM named-export mismatch
export const AssemblyStep = {};
export const BOMItem = {};
export const HotspotInfo = {};
export const MaterialConfig = {};
export const ShelterArchetype = {};

