import type { CanonicalInfographic } from '../schema/canonical.js';
import { assessSemanticFidelity, type SemanticFidelityReport } from './fidelity.js';

export interface QualityWarning {
  code: 'hero-long' | 'section-dense' | 'footer-dense' | 'metric-label-long';
  message: string;
  sectionId?: string;
}

export interface QualityReport {
  warnings: QualityWarning[];
  score: number;
  densityPoints: number;
  semanticFidelity: SemanticFidelityReport;
}

export interface RenderProfile {
  density: 'comfortable' | 'compact';
  columns: 2 | 3;
  heroScale: 1 | 0.92 | 0.84;
  paddingScale: 1 | 0.9;
}

export function runQualityChecks(data: CanonicalInfographic): QualityReport {
  const warnings: QualityWarning[] = [];
  let densityPoints = Math.max(0, data.sections.length - 4);

  if (data.hero.title.length > 72) {
    warnings.push({
      code: 'hero-long',
      message: `Hero title is ${data.hero.title.length} characters; preferred maximum is 72.`,
    });
  }

  for (const metric of data.hero.metrics) {
    if (metric.label.length > 28) {
      warnings.push({
        code: 'metric-label-long',
        message: `Metric label is ${metric.label.length} characters; preferred maximum is 28.`,
      });
    }
  }

  for (const section of data.sections) {
    if (section.kind === 'checklist' && section.items.length > 8) {
      densityPoints += 3;
      warnings.push({
        code: 'section-dense',
        message: `Checklist contains ${section.items.length} items; preferred maximum is 8.`,
        sectionId: section.id,
      });
    }

    if (section.kind === 'metric-grid') {
      for (const metric of section.metrics) {
        if (metric.label.length > 28) {
          warnings.push({
            code: 'metric-label-long',
            message: `Metric label is ${metric.label.length} characters; preferred maximum is 28.`,
            sectionId: section.id,
          });
        }
      }
    }
  }

  if (data.footer.facts.length > 4) {
    warnings.push({
      code: 'footer-dense',
      message: `Footer contains ${data.footer.facts.length} facts; preferred maximum is 4.`,
    });
  }
  const semanticFidelity = assessSemanticFidelity(data);
  const layoutScore = Math.max(0, 100 - warnings.length * 8 - densityPoints * 3);

  return {
    warnings,
    score: Math.min(layoutScore, semanticFidelity.score),
    densityPoints,
    semanticFidelity,
  };
}

export function deriveRenderProfile(report: QualityReport): RenderProfile {
  const compact = report.densityPoints >= 3;
  const heroWarning = report.warnings.find((warning) => warning.code === 'hero-long');
  const heroLength = heroWarning
    ? Number.parseInt(heroWarning.message.match(/\d+/)?.[0] ?? '73', 10)
    : 0;

  return {
    density: compact ? 'compact' : 'comfortable',
    columns: compact ? 2 : 3,
    heroScale: heroLength > 100 ? 0.84 : heroWarning ? 0.92 : 1,
    paddingScale: compact ? 0.9 : 1,
  };
}
