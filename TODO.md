## Question / Tasks

Will a span ever want to overwrite/shadow fields of the parent span?

How to log child span?

How to query for child span by operation name, when parent span has its own operation name, too?

How to combine span with parent span and log all in an event?

- only needed for traditional logging, because full span hierarchy should be included in single log line for easy
queries.

{
    "operation": "get-job-state",
    "operationStack": ["get-job-state", "refresh-job", "refresh-jobs"] // How to query?
    "operationStack": "refresh-jobs.refresh-job.get-job-state"
}

Add `.tagNonInherited` to set tags that are *not* inherited by child spans?

Add `.fail()` to mark a span failed with an error

Emit to stdout using configurable schema:

OpenTelemetry log message standard:
https://github.com/open-telemetry/opentelemetry-specification/blob/2e7d017f26ab06b576229b1f1471063837b39fe8/specification/logs/data-model.md#field-body

Or consider this simpler one:
```
{
  "caller":"foo-service/index.ts:10",
  "level":"info",
  "msg":"Human readable message",
  "service":"foo-service",
  "ts":"2021-08-18T18:47:11.15534892Z"
}
```
