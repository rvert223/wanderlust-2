// Turns the Lens bridge's answer into what the scan pipeline uses (shared by the real call and the mock).
const TOP_MATCHES = 3;

/**
 * Consolidates the Lens answer: the top 3 visual matches with their web descriptions, plus a
 * plain-text footprint for Muse.
 * @returns {{ matches: {title, source, link, thumbnail, snippet}[], suggestedTitles: string[],
 *             textSnippets: string[], footprint: string }}
 */
export function consolidateLens(result) {
  const matches = (result.visual_matches || []).slice(0, TOP_MATCHES).map(({ title, source, link, thumbnail, snippet }) => ({ title, source, link, thumbnail, snippet }));
  const knowledge = (result.knowledge_graph || []).map((k) => [k.title, k.subtitle].filter(Boolean).join(' — '));
  const suggestedTitles = result.suggested_titles || [];
  const textSnippets = result.text_snippets || [];
  const footprint = [
    suggestedTitles.length && `Suggested titles: ${suggestedTitles.join('; ')}`,
    knowledge.length && `Knowledge graph: ${knowledge.join('; ')}`,
    ...matches.map((m, i) => `Match ${i + 1}: ${m.title}${m.source ? ` (${m.source})` : ''}${m.snippet ? ` — ${m.snippet}` : ''}`),
    textSnippets.length && `Text in photo: ${textSnippets.join(' / ')}`,
  ].filter(Boolean).join('\n');
  return { matches, suggestedTitles, textSnippets, footprint };
}
