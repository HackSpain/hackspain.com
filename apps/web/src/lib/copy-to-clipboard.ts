/**
 * Copies text and says whether it worked.
 *
 * The async clipboard API is absent outside a secure context and can be refused
 * even inside one, so a button leaning on it alone just does nothing at all. The
 * selection trick below still works in those cases, and a false return lets the
 * caller offer the text to copy by hand rather than fail silently.
 */
export async function copyToClipboard(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch {
    // Unavailable or refused; the selection fallback below may still manage it.
  }

  const field = document.createElement("textarea");
  field.value = value;
  field.setAttribute("readonly", "");
  field.style.position = "fixed";
  field.style.top = "0";
  field.style.opacity = "0";
  document.body.append(field);

  try {
    field.select();
    return document.execCommand("copy");
  } catch {
    return false;
  } finally {
    field.remove();
  }
}
