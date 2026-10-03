// Opens a document that needs a signed-in API call first (like an invoice) in
// a new browser tab.
//
// The tab has to be opened right inside the click — browsers block pop-ups
// that are opened only after the network call finishes — and is then filled
// with the HTML that came back.
export async function openHtmlDocument(load: () => Promise<string>): Promise<void> {
  const tab = window.open("", "_blank");
  if (!tab) {
    throw new Error("Your browser blocked the new tab — please allow pop-ups for this site and try again.");
  }

  tab.document.write('<p style="font-family:sans-serif;padding:24px;color:#555">Preparing your invoice…</p>');

  try {
    const html = await load();
    tab.document.open();
    tab.document.write(html);
    tab.document.close();
  } catch (err) {
    tab.close();
    throw err;
  }
}
