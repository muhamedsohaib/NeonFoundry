import type { CanonicalInfographic } from '../schema/canonical.js';

export type CompositionFamily = NonNullable<CanonicalInfographic['sourceHints']['compositionPattern']> | 'safe-fallback';
export type CompositionAxis = 'horizontal' | 'vertical';
export type CompositionDensity = 'sparse' | 'balanced' | 'dense';
export type CompositionProvenance = 'explicit-geometry' | 'explicit-groups' | 'structural-inference' | 'safe-fallback';
export type RegionEmphasis = 'dominant' | 'primary' | 'secondary' | 'supporting';

export interface CompositionRegion {
  id: string;
  sectionIds: string[];
  row: number;
  column: number;
  rowSpan: number;
  columnSpan: number;
  direction: CompositionAxis;
  emphasis: RegionEmphasis;
  importance: number;
}

export interface CompositionBlueprint {
  family: CompositionFamily;
  columns: number;
  columnRatios: number[];
  primaryAxis: CompositionAxis;
  density: CompositionDensity;
  sourceOrder: string[];
  regions: CompositionRegion[];
  footer: { id: 'footer'; row: number };
  provenance: CompositionProvenance;
}

export interface CompositionMeasuredRegion {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export type CompositionFidelityIssueCode =
  | 'missing-section'
  | 'duplicate-section'
  | 'order-drift'
  | 'broken-group'
  | 'wrong-section-grammar'
  | 'lost-dominant-emphasis'
  | 'process-direction'
  | 'source-columns'
  | 'footer-order';

export interface CompositionFidelityIssue {
  code: CompositionFidelityIssueCode;
  message: string;
  sectionId?: string;
}

export interface CompositionFidelityReport {
  passed: boolean;
  score: number;
  issues: CompositionFidelityIssue[];
}
