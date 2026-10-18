import { mock } from "../data/mock";
import { relativeTime } from "../data/state";
import type { WorkspaceData } from "../App";
import { en } from "../i18n/en";
export default function PrintSummary({ data }: { data: WorkspaceData }) {
  return (
    <article className="print-summary" style={{ display: "none" }}>
      <h1>{en.print_title}</h1>
      <p>{en.print_sample}</p>
      <p>
        {en.print_score}: {data.hasData ? data.score : en.print_empty}
      </p>
      <h2>{en.app_plan}</h2>
      <table>
        <thead>
          <tr>
            <th>{en.print_action}</th>
            <th>{en.print_status}</th>
            <th>{en.print_impact}</th>
          </tr>
        </thead>
        <tbody>
          {data.hasData &&
            mock.fixes.map((f) => (
              <tr key={f.id}>
                <td>{f.title}</td>
                <td>
                  {data.statuses[f.id] === "done"
                    ? en.print_done
                    : data.statuses[f.id] === "later"
                      ? en.print_later
                      : en.print_open}
                </td>
                <td>−{f.impact}</td>
              </tr>
            ))}
        </tbody>
      </table>
      <h2>{en.print_activity}</h2>
      {data.activity.map((a) => (
        <p key={a.id}>
          <strong>{a.title}</strong> · {relativeTime(a.at)} · {en.print_score}{" "}
          {a.score}
          <br />
          {a.detail}
        </p>
      ))}
      <p>{en.print_local}</p>
    </article>
  );
}
