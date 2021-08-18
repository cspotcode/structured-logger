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