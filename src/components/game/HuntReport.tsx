import type { HuntReport as Report } from "./huntReportData";

/** The end-of-hunt report: a notice, verse or bit of gossip, pinned to a plank wall. */
export default function HuntReport({ report }: { report: Report }) {
  const isNotice = report.kind === "incident" || report.kind === "missing";
  return (
    <figure className="report-wall" aria-label={`${report.heading}: ${report.title}`}>
      <div className="report-shadow">
        <article className={`report-paper report-paper--${report.kind}`}>
          <span className="report-nail report-nail--left" aria-hidden />
          {isNotice && <span className="report-nail report-nail--right" aria-hidden />}

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
              <footer>— statement of {report.quote.by}</footer>
            </blockquote>
          )}

          <div className={report.kind === "verse" ? "report-verse" : "report-body"}>
            {report.body.map((p, i) => <p key={i}>{p}</p>)}
          </div>

          {report.signoff && (
            <div className="report-signoff">
              <span>{report.signoff}</span>
              {isNotice && <span className="report-seal" aria-hidden>G</span>}
            </div>
          )}

          {report.stamp && <span className="report-stamp">{report.stamp}</span>}
        </article>
      </div>
      <figcaption className="report-caption">{report.postedAt}</figcaption>
    </figure>
  );
}
