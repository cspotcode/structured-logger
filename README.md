Ideas for a TypeScript structured logger, focused on the structured bit and not so much on all the other stuff like transports and formatting and whatnot.  Has the tools you need to log JSON messages about things happening in parallel bound to specific context, such as request and account IDs.

### API thoughts
```typescript
logger.set({
  fields
});

logger.log('Message goes here with {id} values interpolated', {
  id: 123
});
logger.log({
  fields
});
logger.log(); // if everything has already been bound, log a message
logger.message('').log();
logger.prefix(''); // like message but bind a message prefix, so .message() will be appended

// TODO how to allow both mutating a logger instance you already have, and creating child instances?
.set() mutates
.child() creates a sub-logger
.child({jobId}) to create a sub-logger bound to a job ID so you can log a bunch of stuff happening in parallel

logger.declare<>(); // Declare fields in the type system to be bound later, without any runtime behavior.
// Can be useful to create suggested naming conventions at the root of a project, which will tab-complete when using the logger elsewhere

logger.settings(); // setup stuff like auto stack trace capturing

// At the root of your project, you can create a single "root" logger like this:

const rootLogger = createBlankLogger().settings({
  captureSourcePosition: true
}).set({
  app: 'app-name',
  env: 'prod'
}).declare<{
  requestId: string;
  accountId?: string;
  userId?: string;
}>();

// Within a request handler, you can create a sub-logger:

const logger = rootLogger.child({
  requestId: request.id
});

// .log(), .info(), .error() imply setting a severity field and writing to stdout
// If you want the JSON object without sending it anywhere
logger.build()
logger.buildInfo()
logger.buildError()

// enrich() or postprocess() accept callbacks which augment the structured log message before logging
// Can be used to set timestamps, capture stack traces
// Can return false; filter out log messages.  Could be useful for tracing?
logger.enrich(log => {
  log.timestamp = +new Date,
});
```

### Questions

tracing: how to group trace events, how to determine if tracing is enabled for a given log message / trace?

can tracing be as simple as calling `.trace()` on a logger; `.trace()` calls are filtered / grouped based on set logger values: `userId`, `accountId`, `requestId`, etc.

wrap fields in context object?  Or use flat JSON object?  How does Sumo / DD do it?

Worth it to allow pairing a message with field types?  something like `const message = logMessage<{duration: number}>(\`Took too long, took {duration} seconds\`);`

### Next steps

Define MVP: enable logging of today, ready for tracing of tomorrow

---

Playground where I was experimenting with getting the types right.
https://www.typescriptlang.org/play?ssl=26&ssc=4&pln=1&pc=1#code/C4TwDgpgBAKhC2YA2BDYEBiBLCSAmAzgDwxQQAe6AdoVAcAE5ZUDmAfFALywLJqY58BAJJV0DKiiQkANFADeAXzYBuALAAoUJB6JU6bLkKjxk6aQrVa9JqzkB5AEYArOYfwxw0bjeYsoAD5QVACu8I4QDIFQjgD2sUgQKFQc3BaUEDQEUAAGACTyzABmkVAAQhBFsQwQivIFxaXueIqKDVQlUQCCReKKOVAA-Lp8BoLGYpFmRD3icvIA2gDSUMxQANYQILFFUE7O0c0AugBcUM2ekMpQZ-vqGpra0F1cI-oCRsQA5AASuEixBRFLAMeiKBSoMEAQigUAA6rgAMaxeDQYCA+R8RG1KFfVSaTTMcRFFDYqAAGViLBYkSIzQIHHkmlhsIA9Ky6BBgEQAMpc+lkDJZKAABRQDGAWCkdPGDLYAApgZ8znzgPSAJRnSnU2mLFZrACi5ERSBCeAgRE22129LkVp2UFV9LYp3OsuWR3BADIFMtVlQoEbGKTufbdk7ZXatg7nUdBmd6R7lPcWZzgIrZWcxRKpdJnZqKVSaQwZZ98Q8NKnUQQCCgaUQALKCqzZXysBXV2s0s4Ngva4uloRQH32eBYblwPT8emNthR61usvl1Pmk3ii1dPB4cdYWJmZ3yvtF2kCn2b7eSvdSZ33RQEjSr1A1KBFEJURGXgOdusWpuWTLWIwfgdhANY-j2R46iWk6jB8QizuWmjfjS8q-P8GLAqCwDgvIkLYTCUAACJ7sAL7VDSpHogoIa7lQihfOqAB0BBcvKTKViymH0GcXxdDQNQAO5fDIzIsnhPFlAwKB4IkIBfJoihMY+65EOxqasgAVBpRGgYiTARFAwAABbQESAEQHgUAhCxUAOsZWDZAC1J+C+4xQBprKibC1mRMIeBnKE4SRCmLKadphG6fpaImf6VgWVZNl2UZDlQE5LAuUq+DuZ5HGwqSyJvsAflnG2LC3gqTHIRAqHni58hcdh8g+Qwfl1PlsSFa1DHMaxaksgp6oqEAA

Linking to other libs I'm looking at:
https://www.npmjs.com/package/tslog
https://github.com/gajus/roarr
