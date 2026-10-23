// Saves one of the user's Lichess preferences, as its menus do (lila's
// ui/dasher): a form posted to /pref/<field>, which answers before the next
// page reads it.

export async function savePref(field: string, value: string): Promise<void> {
  try {
    const response = await fetch(`/pref/${field}`, {
      method: 'POST',
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
      body: new URLSearchParams({ [field]: value }),
    });
    if (!response.ok) console.warn(`[LichessNeo] ${field} unsaved`, response.status);
  } catch (error) {
    console.warn(`[LichessNeo] ${field} unsaved`, error);
  }
}
