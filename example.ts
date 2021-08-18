import {createLogger} from './index';

const rootLogger = createLogger().declare<{
    user_id: string;
    account_id: string;
    application: string;
    requestId: string;
}>();

function handleRequest(requestId: string, apiBody: {jobIds: string[]}) {
    const logger = rootLogger.child({requestId});
    const operations = Promise.allSettled(logger.mapWithChild(apiBody.jobIds, async (logger, jobId) => {
        logger.set({jobId}).prefix('Processing job {jobId}');
    }));

    // or
    const operations2 = Promise.allSettled(apiBody.jobIds.map(logger.withChild(async (logger, jobId) => {
        logger.set({jobId}).prefix('Processing job {jobId}');
        logger.log('Starting to update job');
        const job_state = getJobStateFromApiService();
        logger.log('Finished updating job to state {job_state}', {job_state});
    })));
    
    // or
    const span = logger.span;
    for(const jobId of apiBody.jobIds) {
        const logger = span();
    }

    // Wrap a function in another that passes a child logger
    logger.withSpan
    // invoke a function, passing a child logger
    logger.doWithSpan
    // Array .map but pass a child logger for each item
    logger.mapWithSpan

    // To mimic opentracing.  These create child loggers.  Not sure what finish() should do.  Log the prefix with `Finished in {time}`

    logger.startSpan
    logger.finish
    
    // What about the difference between
    .child('sub-object')
    // and
    .startSpan('operation-name')
}

const logger = rootLogger.child();
const a = logger.message('Hello {first} {last}!  Dont forget to {action}').set({
    first: 'Andrew',
    last: 'Bradley'
});
const b = a.declare<{
    /** Describe the intended use of this logging field */
    userId: number;
    /** Describe the intended use of this logging field */
    accountId: string;
}>();
b.message('Adding {first} {last} to the {accountId} for {action}').set({
    action: 'foobar'
});

logger.add({added: true}).log('{inmessage}', {
  other: true,
  other2: true,
  added: true,
  inmessage: 'foo'
});
