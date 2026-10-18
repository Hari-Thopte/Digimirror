/** Count CSV records without retaining any field values. Quoted line breaks are supported. */
export function countCsvRecords(text: string): number {
  let quoted = false,
    columns = 1,
    nonempty = false;
  const widths: number[] = [];
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      nonempty = true;
      if (quoted && text[i + 1] === '"') i++;
      else quoted = !quoted;
    } else if (c === "," && !quoted) {
      columns++;
      nonempty = true;
    } else if ((c === "\n" || c === "\r") && !quoted) {
      if (nonempty) widths.push(columns);
      columns = 1;
      nonempty = false;
      if (c === "\r" && text[i + 1] === "\n") i++;
    } else if (c.trim()) nonempty = true;
  }
  if (quoted) throw new Error("Unclosed quoted field");
  if (nonempty) widths.push(columns);
  if (widths.length < 2 || widths[0] < 2 || widths.some((n) => n !== widths[0]))
    throw new Error("Invalid CSV structure");
  return widths.length - 1;
}
