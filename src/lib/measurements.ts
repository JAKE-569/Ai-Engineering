// A bare "distance" in OCR cannot identify a sprinkler measurement.
export function sprinklerMeasurements(text: string) {
  const pattern = /(?:스프링클러\s*)?헤드\s*(간격|수평거리|살수반경)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(mm|cm|m)(?![a-z])/gi;
  return Array.from(text.matchAll(pattern), match => ({ target: match[1], metres: Number(match[2]) * ({ mm: 0.001, cm: 0.01, m: 1 }[match[3].toLowerCase()]!), evidence: match[0] }));
}
