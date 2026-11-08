import { Fragment, type ReactNode } from "react";
import { useI18n } from "../lib/i18n.js";
// Deliberately small Markdown renderer for the supplied governance notice. React
// escapes all text; raw HTML is never interpreted. Translation stays in plain JSON.
function inline(value: string): ReactNode[] {
  return value
    .split(/(\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g)
    .map((part, i) => {
      if (part.startsWith("**") && part.endsWith("**"))
        return <strong key={i}>{part.slice(2, -2)}</strong>;
      if (part.startsWith("*") && part.endsWith("*"))
        return <em key={i}>{inline(part.slice(1, -1))}</em>;
      const link = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) {
        const destination = link[2]!;
        const href =
          destination === "data-stewardship.md"
            ? "https://github.com/Afribit-Kibera/afribit-ai-chatbot/blob/master/docs/governance/data-stewardship.md"
            : /^(https:\/\/|mailto:|\/)/.test(destination)
              ? destination
              : undefined;
        return href ? (
          <a key={i} href={href}>
            {link[1]}
          </a>
        ) : (
          <Fragment key={i}>{link[1]}</Fragment>
        );
      }
      return part;
    });
}
export function PrivacyContent() {
  const { t } = useI18n();
  const lines = t("privacy.notice").split("\n");
  const blocks: ReactNode[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!.trim();
    if (!line) continue;
    if (line.startsWith("# ")) {
      blocks.push(<h1 key={i}>{inline(line.slice(2))}</h1>);
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(<h2 key={i}>{inline(line.slice(3))}</h2>);
      continue;
    }
    if (line.startsWith("> ")) {
      blocks.push(<p key={i}>{inline(line.slice(2))}</p>);
      continue;
    }
    if (line === "---") {
      blocks.push(<hr key={i} />);
      continue;
    }
    if (line.startsWith("- ")) {
      const start = i;
      const items = [];
      while (i < lines.length && lines[i]!.startsWith("- ")) {
        items.push(<li key={i}>{inline(lines[i]!.slice(2))}</li>);
        i++;
      }
      i--;
      blocks.push(<ul key={start}>{items}</ul>);
      continue;
    }
    if (line.startsWith("|")) {
      const start = i;
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.startsWith("|")) {
        const cells = lines[i]!.split("|")
          .slice(1, -1)
          .map((c) => c.trim());
        if (!cells.every((c) => /^[-:]+$/.test(c))) rows.push(cells);
        i++;
      }
      i--;
      blocks.push(
        <div className="privacy-table" key={start}>
          <table>
            <thead>
              <tr>
                {rows[0]?.map((cell, n) => (
                  <th key={n} scope="col">
                    {inline(cell)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.slice(1).map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => (
                    <td key={c}>{inline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>,
      );
      continue;
    }
    const start = i;
    let paragraph = line;
    while (
      i + 1 < lines.length &&
      lines[i + 1]!.trim() &&
      !/^(#|>|-|\|)/.test(lines[i + 1]!)
    ) {
      paragraph += ` ${lines[++i]}`;
    }
    blocks.push(<p key={start}>{inline(paragraph)}</p>);
  }
  return <>{blocks}</>;
}
