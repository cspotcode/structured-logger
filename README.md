TypeScript structured logger, focused on the structured bit and not so much on all the other stuff like transports and formatting and whatnot.

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


logger.declare<>(); // Declare fields in the type system to be bound later, without any runtime behavior.

logger.settings(); // setup stuff like auto stack trace capturing

At the root of your project, you can create a single "root" logger like this:

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

Within a request handler, you can create a sub-logger:

const logger = rootLogger.set({
  requestId: request.id
});
```
