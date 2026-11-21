import type { HuntReport as Report } from "@/data/huntReportData";

/**
 * The end-of-hunt report: a notice, verse or bit of gossip, pinned to a plank wall. At the Tear in
 * Time it's carved into a cracked stone tablet propped against a cave wall instead (sooty, if the
 * volcano erupted); at the Long After it's a museum placard on a gallery wall.
 */
export default function HuntReport({ report }: { report: Report }) {
  const isNotice = report.kind === "incident" || report.kind === "missing";
  const stone = report.material === "stone";
  const placard = report.material === "placard";
  const paper = !stone && !placard;
  return (
    <figure className={`report-wall${stone ? " report-wall--cave" : placard ? " report-wall--museum" : ""}`} aria-label={`${report.heading}: ${report.title}`}>
      <div className="report-shadow">
        <article
          className={`report-paper report-paper--${report.kind}${stone ? " report-paper--stone" : placard ? " report-paper--placard" : ""}`}
          data-scorched={report.scorched || undefined}
        >
          {/* Paper is nailed up; a stone slab just leans; a placard hangs in its frame */}
          {paper && <span className="report-nail report-nail--left" aria-hidden />}
          {paper && isNotice && <span className="report-nail report-nail--right" aria-hidden />}
          {stone && <span className="report-crack" aria-hidden />}

          <p className="report-heading">{report.heading}</p>
          <h3 className="report-title">{report.title}</h3>
          {report.subtitle && <p className="report-subtitle">{report.subtitle}</p>}
          {isNotice && <div className="report-rule" aria-hidden />}

          {report.fields.length > 0 && (
            <dl className="report-fields">
              {report.fields.map(f => (
                <div key={f.label}>
                  <dt>{f.label}</dt>
                  <dd>{f.value}</dd>
                </div>
              ))}
            </dl>
          )}

          {report.quote && (
            <blockquote className="report-quote">
              “{report.quote.text}”
              <footer>— {stone ? `${report.quote.by} say` : placard ? `recorded from ${report.quote.by}` : `statement of ${report.quote.by}`}</footer>
            </blockquote>
          )}

          <div className={report.kind === "verse" ? "report-verse" : "report-body"}>
            {report.body.map((p, i) => <p key={i}>{p}</p>)}
          </div>

          {report.signoff && (
            <div className="report-signoff">
              <span>{report.signoff}</span>
              {isNotice && paper && <span className="report-seal" aria-hidden>G</span>}
            </div>
          )}

          {report.stamp && <span className="report-stamp">{report.stamp}</span>}
        </article>
      </div>
      <figcaption className="report-caption">{report.postedAt}</figcaption>
    </figure>
  );
}
