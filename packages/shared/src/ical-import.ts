export interface IcalImportCandidate {
  title: string;
  date: string; // YYYY.MM.DD
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  url: string | null;
  description: string | null;
}

function unfoldIcalLines(raw: string): string[] {
  const normalized = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const lines = normalized.split("\n");
  const out: string[] = [];
  for (const line of lines) {
    if ((line.startsWith(" ") || line.startsWith("\t")) && out.length > 0) {
      out[out.length - 1] += line.slice(1);
    } else {
      out.push(line);
    }
  }
  return out;
}

function unescapeIcal(value: string): string {
  return value
    .replace(/\\n/gi, "\n")
    .replace(/\\,/g, ",")
    .replace(/\\;/g, ";")
    .replace(/\\\\/g, "\\");
}

function parseProp(line: string): { name: string; value: string } | null {
  const idx = line.indexOf(":");
  if (idx < 0) return null;
  const left = line.slice(0, idx);
  const value = line.slice(idx + 1);
  const name = left.split(";")[0]?.toUpperCase() ?? "";
  return { name, value };
}

/** YYYYMMDD or YYYYMMDDTHHMMSS(Z) → local-ish date + optional time */
function parseIcalDateValue(value: string): { date: string; time: string | null } | null {
  const clean = value.trim();
  const dateMatch = /^(\d{4})(\d{2})(\d{2})/.exec(clean);
  if (!dateMatch) return null;
  const date = `${dateMatch[1]}.${dateMatch[2]}.${dateMatch[3]}`;

  const timeMatch = /T(\d{2})(\d{2})(\d{2})?/.exec(clean);
  if (!timeMatch) return { date, time: null };
  return { date, time: `${timeMatch[1]}:${timeMatch[2]}` };
}

/**
 * Minimal VEVENT parser → program candidates. No external dependency.
 */
export function parseIcalToProgramCandidates(raw: string): IcalImportCandidate[] {
  const lines = unfoldIcalLines(raw);
  const candidates: IcalImportCandidate[] = [];
  let inEvent = false;
  let summary = "";
  let location: string | null = null;
  let url: string | null = null;
  let description: string | null = null;
  let dtStart: { date: string; time: string | null } | null = null;
  let dtEnd: { date: string; time: string | null } | null = null;

  const flush = () => {
    if (dtStart && summary.trim()) {
      candidates.push({
        title: unescapeIcal(summary).trim().slice(0, 200),
        date: dtStart.date,
        startTime: dtStart.time,
        endTime: dtEnd && dtEnd.date === dtStart.date ? dtEnd.time : null,
        location: location ? unescapeIcal(location).trim().slice(0, 300) || null : null,
        url: url ? unescapeIcal(url).trim() || null : null,
        description: description ? unescapeIcal(description).trim().slice(0, 2000) || null : null,
      });
    }
    summary = "";
    location = null;
    url = null;
    description = null;
    dtStart = null;
    dtEnd = null;
  };

  for (const line of lines) {
    const upper = line.toUpperCase();
    if (upper === "BEGIN:VEVENT") {
      inEvent = true;
      continue;
    }
    if (upper === "END:VEVENT") {
      if (inEvent) flush();
      inEvent = false;
      continue;
    }
    if (!inEvent) continue;

    const prop = parseProp(line);
    if (!prop) continue;

    switch (prop.name) {
      case "SUMMARY":
        summary = prop.value;
        break;
      case "LOCATION":
        location = prop.value;
        break;
      case "URL":
        url = prop.value;
        break;
      case "DESCRIPTION":
        description = prop.value;
        break;
      case "DTSTART":
        dtStart = parseIcalDateValue(prop.value);
        break;
      case "DTEND":
        dtEnd = parseIcalDateValue(prop.value);
        break;
      default:
        break;
    }
  }

  return candidates;
}
