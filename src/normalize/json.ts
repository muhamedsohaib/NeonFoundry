import { parseCanonicalInfographic, type CanonicalInfographic } from '../schema/canonical.js';
import { adaptLegacyQa } from './legacy-qa.js';

export function normalizeJsonInput(value: unknown): CanonicalInfographic {
  try {
    return parseCanonicalInfographic(value);
  } catch (canonicalError) {
    try {
      return adaptLegacyQa(value);
    } catch {
      throw new Error(
        'Input JSON is neither canonical infographic data nor the supported legacy QA schema',
        { cause: canonicalError },
      );
    }
  }
}
