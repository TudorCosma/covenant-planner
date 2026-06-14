// Generic indexation helper. Given a base value, an indexation rate (decimal),
// and a number of years, returns the indexed value.
//
// `state.legislation.indexation` defines per-bucket rates (CPI, AWE, PBLCI,
// privateHealthIndexation, etc.). The Expenses tab uses bucket names that map
// to fields here.

export function indexValue(baseValue, ratePerYear, years) {
  return (baseValue || 0) * Math.pow(1 + (ratePerYear || 0), Math.max(0, years || 0));
}

// Resolve a bucket name to its indexation rate from a legislation snapshot.
export function getIndexationRate(bucketName, legislation) {
  if (!legislation || !legislation.indexation) return 0.025;
  const idx = legislation.indexation;
  const map = {
    cpi: idx.CPI,
    awe: idx.AWE,
    pblci: idx.PBLCI,
    agePension: idx.agePensionIndexation,
    taxThresholds: idx.taxThresholdIndexation,
    superCaps: idx.superCapIndexation,
    centrelinkThresholds: idx.centrelinkThresholdIndexation,
    agedCare: idx.agedCareIndexation,
    privateHealth: idx.privateHealthIndexation,
    utilities: idx.utilitiesIndexation,
    medical: idx.medicalIndexation,
    education: idx.educationIndexation,
    travel: idx.travelIndexation,
  };
  return map[bucketName] != null ? map[bucketName] : (idx.CPI || 0.025);
}

// Apply indexation to a stream of years given a base value.
export function indexedStream(baseValue, bucketName, legislation, years) {
  const rate = getIndexationRate(bucketName, legislation);
  return Array.from({ length: years }, (_, y) => indexValue(baseValue, rate, y));
}
