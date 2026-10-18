import assert from "node:assert/strict";
import { countCsvRecords } from "../src/components/filePreview.ts";
import { mock, servicesFor } from "../src/data/mock.ts";
assert.equal(countCsvRecords("service,fields\nGoogle,8\nSocial,6\n"), 2);
assert.equal(countCsvRecords('service,note\r\nGoogle,"two\nlines"\r\n'), 1);
assert.equal(countCsvRecords('service,note\nSocial,"a ""quoted"" value"'), 1);
assert.throws(() => countCsvRecords('service,note\nSocial,"unclosed'));
assert.throws(() => countCsvRecords("service,fields\nSocial,6,extra"));
assert.throws(() => countCsvRecords("not a CSV"));
assert.equal(
  servicesFor({ phone: "done" }).find((s) => s.id === "social").score,
  79,
);
assert.equal(
  servicesFor({ phone: "open" }).find((s) => s.id === "social").score,
  86,
);
assert.equal(
  mock.services.find((s) => s.id === "social").score,
  86,
  "Sample actions must not mutate the baseline",
);
console.log(
  "Passed: CSV preview record counts, quoted line breaks, escaped quotes and malformed-file errors.",
);
