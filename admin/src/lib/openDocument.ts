// Opens a document that needs a signed-in API call first (an invoice, a
// shipping label) in a new browser tab.
//
// The tab has to be opened right inside the click — browsers block pop-ups
// that are opened only after the network call finishes — and is then pointed at
// the result: either a link (e.g. a label PDF) or ready-made HTML (an invoice).
export async function openDocument(load: () => Promise<{ url?: string; html?: string }>): Promise<void> {
  const tab = window.open('', '_blank')
  if (!tab) {
    throw new Error('Your browser blocked the new tab — allow pop-ups for this site and try again.')
  }

  tab.document.write('<p style="font-family:sans-serif;padding:24px;color:#555">Preparing your document…</p>')

  try {
    const result = await load()

    if (result.url) {
      tab.location.href = result.url
    } else if (result.html) {
      tab.document.open()
      tab.document.write(result.html)
      tab.document.close()
    } else {
      throw new Error('Nothing to show')
    }
  } catch (err) {
    tab.close()
    throw err
  }
}
