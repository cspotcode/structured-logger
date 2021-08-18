type DefaultTemplateFieldType = string | number | boolean;

/** Like Record<> but the keys are parsed from a literal string, delimited by {} */
export type TemplateFields<T extends string> = Record<TemplateFieldNamesInternal<T, never>, DefaultTemplateFieldType>;
/** Extract a union of {}-delimited field names from a string*/
export type TemplateFieldNames<T extends string> = TemplateFieldNamesInternal<T, never>;
type TemplateFieldNamesInternal<T extends string, Names> =
  T extends `${string}{${infer Field}}${infer After}`
    ? TemplateFieldNamesInternal<After, Names | Field>
    : Names;

// Offer tab-completion suggestions for a string literal.
// Proposes what goes between {} interpolation delimiters.
export type ProposeTemplateFields<T extends string, SuggestedPropertyName extends string> =
  // Trigger TS to bind the string literal to T
  // The `false` branch of this conditional is always used.
  [T] extends [never] ? T : 
  // Check if we can split `T` into: `Before` { `After`
  // This means we can see the start of an interpolation
  T extends `${infer Before}{${infer After}`
    // Check if we can split `Suffix` into: `PropertyName` } `Rest`
    // This means the interpolation is already closed.
    ? After extends `${infer PropertyName}}${infer Rest}`
      // Recursively parse `Rest`, omitting `PropertyName` from completion suggestions.
      ? `${Before}{${PropertyName}}${ProposeTemplateFields<Rest, Exclude<SuggestedPropertyName, PropertyName>>}`
      // Propose for every `SuggestedPropertyName`: `Prefix` { `SuggestedPropertyName` }
      : `${Before}{${SuggestedPropertyName}}`
    : T;

export type ProposeObjectProperties<PassedObject extends object, DeclaredFields, TemplateFields extends string> =
  [PassedObject] extends [never] ? PassedObject :
    Partial<DeclaredFields> & Partial<Record<TemplateFields, DefaultTemplateFieldType>> & {[K: string]: unknown}
export type ProposeObjectProperties2<PassedObject extends object, DeclaredFields> =
  [PassedObject] extends [never] ? PassedObject :
    Partial<DeclaredFields> & {[K: string]: unknown}

interface EventEnricher {
  (event: any, messageTemplate: string, logger: LoggerSpan<any>): void;
}

interface SpanEnricher {
  (logger: LoggerSpan<any>): void;
}

export function createLogger() {
  return new LoggerSpan<{}>();
}
/**
 * A structured logger, or a tracing span, depending how you want to think about it.
 *
 * Do not subclass; not intended for subclassing.
 */
export class LoggerSpan<Fields> {
    constructor(parent?: LoggerSpan<any>) {
      this._parent = parent;
    }

    private __fields: Record<string, any>;
    private get _fields() {
      if(!this.__fields) {
        this.__fields = Object.create(null);
      }
      return this.__fields;
    }

    private _parent: LoggerSpan<any>;
    private _prefix = '';
    private _message = '';
    private _finished = false;

    private _eventEnrichers: Array<EventEnricher> | undefined;
    private _spanEnrichers: Array<SpanEnricher> | undefined;

    /**
     * Declare but do not set values for span tags / event fields.
     * Can be used to declare semantic conventions on the root logger.
     */
    declare<AdditionalFields>(): LoggerSpan<Fields & AdditionalFields> {
      return this as LoggerSpan<Fields & AdditionalFields>;
    }

    // /**
    //  * Set values of known fields, useful when you want to follow semantic conventions for your logging fields.
    //  * Will be emitted with every log event from this logger and its children.
    //  */
    // set(fields: Partial<Fields>) {
    //   Object.assign(this._fields, fields);
    //   return this;
    // }

    /**
     * Add key-value pairs which will be emitted with every log event from this logger and its children.
     */
    tag<AdditionalFields extends object>(additionalFields: ProposeObjectProperties2<AdditionalFields, Fields>) {
      Object.assign(this._fields, additionalFields);
      return this as LoggerSpan<Fields & AdditionalFields>;
    }
    
    // /**
    //  * Alias to `tag`
    //  */
    // add<AdditionalFields extends object>(additionalFields: AdditionalFields) {
    //   return this.tag(additionalFields);
    // }

    /**
     * Adds a message prefix to this logger.  All log events will have this prefix on their log messages.
     */
    prefix<M extends string>(prefix: ProposeTemplateFields<M, keyof Fields & string>) {
      this._prefix += prefix;
      return this as LoggerSpan<Fields & Omit<TemplateFields<M>, keyof Fields>>
    }

    /**
     * Set message to be used for the next log event.  Unlike prefix, it is only emitted for a single log event.
     * Generally should be used in a chain with .log() to immediately emit the event.
     * Usage:
     *     logger.message('update {job_id}').log({id: 123});
     *     logger.message('finish processing {account_id}').log({account_id});
     */
    message<M extends string>(message: ProposeTemplateFields<M, keyof Fields & string>) {
      this._message = message;
      return this as LoggerSpan<Fields & Omit<TemplateFields<M>, keyof Fields>>;
    }

    /**
     * Create child logger, optionally adding fields to it right away.
     */
    child<ChildFieldName extends string, Fields>(childFieldName: ChildFieldName, fields?: Fields): LoggerSpan<Fields>;
    child<AdditionalFields>(additionalFields?: AdditionalFields): LoggerSpan<Fields & AdditionalFields>;
    child(argA?: string | object, argB?: object) {
      const child = new LoggerSpan(this);
      this.enrichSpan(child);
      if(typeof argA === 'string') throw new Error('placing child logger fields on a sub-object is not implemented yet');
      return child.tag(argB as any);
    }

    /**
     * Create and emit a log event.
     */
    log(): void;
    log(
        fields: Partial<Fields> & {[key: string]: unknown}
    ): void;
    log<M extends string, PassedFields extends object>(
        message: ProposeTemplateFields<M, (keyof Fields | keyof PassedFields) & string>,
        fields: ProposeObjectProperties<PassedFields, Fields, TemplateFieldNames<M>>
    ): void;
    log(messageOrFieldsOrNothing?: string | object, fieldsOrNothing?: object) {
      const message = typeof messageOrFieldsOrNothing === 'string' ? messageOrFieldsOrNothing : this._message;
      const fields = typeof messageOrFieldsOrNothing === 'string' ? fieldsOrNothing : messageOrFieldsOrNothing;
      const event = this.getMergedFields(fields);
      const fullMessage = this.getFullMessage(message);
      event.message = renderMessage(fullMessage, event);
      this.emit(event);
      this._message = '';
    }

    private getFullMessage(message: string = '') {
      return (this._parent ? this._parent.getFullMessage() : '') + this._prefix + message;
    }
    private getMergedFields(fields?: object) {
      return Object.assign(this._parent ? this._parent.getMergedFields() : {}, this.__fields, fields);
    }

    private emit(event: any) {
      console.log(JSON.stringify(event));
    }

    private enrichEvent(event: any, messageTemplate: string, logger: LoggerSpan<any> = this) {
      if(this._parent) this._parent.enrichEvent(event, messageTemplate, logger);
      if(this._eventEnrichers) for(const enricher of this._eventEnrichers) {
        enricher(event, messageTemplate, logger);
      }
    }

    private enrichSpan(logger: LoggerSpan<any>) {
      if(this._parent) this._parent.enrichSpan(logger);
      if(this._spanEnrichers) for(const enricher of this._spanEnrichers) {
        enricher(logger);
      }
    }

    addSpanEnricher(enricher: SpanEnricher) {
      if(!this._spanEnrichers) this._spanEnrichers = [];
      this._spanEnrichers.push(enricher);
    }

    addEventEnricher(enricher: EventEnricher) {
      if(!this._eventEnrichers) this._eventEnrichers = [];
      this._eventEnrichers.push(enricher);
    }

    isFinished() {
      return this._finished;
    }

    finish() {
      if(this._finished) throw new Error('cannot finish a span that already finished');
      this._finished = true;
      // Cannot call `.tag()` here, because when we're inside the class, the typechecker doesn't know how narrow `Fields`
      // might be, so it rejects any possible `tags`
      this._fields.endTimestamp = timestamp();
    }
}

function timestamp() {
  return new Date().toISOString();
}

/**
 * Declare a reusable event with a message.
 * In future, may support other metadata such as an event id
 */
export function createEvent<T extends string>(str: T) {
  return str;
}
/**
 * Declare a reusable event with a message.
 * In future, may support other metadata such as an event id
 */
export function create<T extends string>(str: T) {
  return str;
}

export const timestampEnricher: EventEnricher = function(event, messageTemplate, logger) {
  event.timestamp = timestamp();
}
export const spanEnricher: SpanEnricher = function(logger) {
  logger.tag({startTimestamp: timestamp()});
}

const re = /\{([^}]+)}/g;
function renderMessage(message: string, fields: object) {
  return message.replace(re, (_$0, $1) => fields[$1]);
}
