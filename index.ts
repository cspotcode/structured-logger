/** Like Record<> but the keys are parsed from a literal string, delimited by {} */
export type TemplateFields<T extends string> = Record<TemplateFieldNamesInternal<T, never>, string | number | boolean>;
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
    Partial<Record<keyof DeclaredFields | TemplateFields, unknown>> & {[K: string]: unknown}

/** A structured logger, or a tracing span, depending how you want to think about it. */
interface Logger<Fields> {
    /**
     * Declare but do not set values for logging fields.
     * Can be used to declare semantic conventions on the root logger.
     */
    declare<AdditionalFields>(): Logger<Fields & AdditionalFields>;

    /**
     * Set values of known fields, useful when you want to follow semantic conventions for your logging fields.
     * Will be emitted with every log event from this logger and its children.
     */
    set(fields: Partial<Fields>): Logger<Fields>;

    /**
     * Add key-value pairs which do not need to match known keys.
     * Will be emitted with every log event from this logger and its children.
     */
    add<AdditionalFields>(additionalFields: AdditionalFields): Logger<Fields & AdditionalFields>;

    /**
     * Adds a message prefix to this logger.  All log events will have this prefix on their log messages.
     */
    prefix<M extends string>(prefix: ProposeTemplateFields<M, keyof Fields & string>): Logger<Fields & Omit<TemplateFields<M>, keyof Fields>>;
    /**
     * Set message to be used for the next log event.  Unlike prefix, it is only emitted for a single log event.
     * Usage:
     *     logger.message('update {job_id}').log({id: 123});
     *     logger.message('finish processing {account_id}').log({account_id});
     */
    message<M extends string>(message: ProposeTemplateFields<M, keyof Fields & string>): Logger<Fields & Omit<TemplateFields<M>, keyof Fields>>;

    /**
     * Create child logger, optionally adding fields to it right away.
     */
    child<ChildFieldName extends string, Fields>(childFieldName: ChildFieldName, fields: Fields): Logger<Fields>;
    child<AdditionalFields>(additionalFields: AdditionalFields): Logger<Fields & AdditionalFields>;

    /**
     * Create and emit a log event.
     */
    log(): void;
    log<M extends string, PassedFields extends object>(
        message: ProposeTemplateFields<M, (keyof Fields | keyof PassedFields) & string>,
        fields: ProposeObjectProperties<PassedFields, Fields, TemplateFieldNames<M>>
    ): void;
}

interface EventEnricher {
  (event: any, messageTemplate: string, logger: LoggerImpl<any>): void;
}

interface LoggerEnricher {
  (logger: LoggerImpl<any>): void;
}

export function createLogger() {
  return new LoggerImpl<{}>();
}
/**
 * A structured logger, or a tracing span, depending how you want to think about it.
 *
 * Do not subclass; not intended for subclassing.
 */
export class LoggerImpl<Fields> {
    constructor(parent?: LoggerImpl<any>) {
      this._parent = parent;
    }

    private __fields: Record<string, any>;
    private get _fields() {
      if(!this.__fields) {
        this.__fields = Object.create(null);
      }
      return this.__fields;
    }

    private _parent: LoggerImpl<any>;
    private _prefix = '';
    private _message = '';

    /**
     * Declare but do not set values for logging fields.
     * Can be used to declare semantic conventions on the root logger.
     */
    declare<AdditionalFields>(): LoggerImpl<Fields & AdditionalFields> {
      return this as LoggerImpl<Fields & AdditionalFields>;
    }

    /**
     * Set values of known fields, useful when you want to follow semantic conventions for your logging fields.
     * Will be emitted with every log event from this logger and its children.
     */
    set(fields: Partial<Fields>) {
      Object.assign(this._fields, fields);
      return this;
    }

    /**
     * Add key-value pairs which do not need to match known keys.
     * Will be emitted with every log event from this logger and its children.
     */
    add<AdditionalFields>(additionalFields: AdditionalFields) {
      Object.assign(this._fields, additionalFields);
      return this as LoggerImpl<Fields & AdditionalFields>;
    }

    /**
     * Adds a message prefix to this logger.  All log events will have this prefix on their log messages.
     */
    prefix<M extends string>(prefix: ProposeTemplateFields<M, keyof Fields & string>) {
      this._prefix += prefix;
      return this as LoggerImpl<Fields & Omit<TemplateFields<M>, keyof Fields>>
    }

    /**
     * Set message to be used for the next log event.  Unlike prefix, it is only emitted for a single log event.
     * Usage:
     *     logger.message('update {job_id}').log({id: 123});
     *     logger.message('finish processing {account_id}').log({account_id});
     */
    message<M extends string>(message: ProposeTemplateFields<M, keyof Fields & string>) {
      this._message = message;
      return this as LoggerImpl<Fields & Omit<TemplateFields<M>, keyof Fields>>;
    }

    /**
     * Create child logger, optionally adding fields to it right away.
     */
    child<ChildFieldName extends string, Fields>(childFieldName: ChildFieldName, fields?: Fields): LoggerImpl<Fields>;
    child<AdditionalFields>(additionalFields?: AdditionalFields): LoggerImpl<Fields & AdditionalFields>;
    child(argA?: string | object, argB?: object) {
      const child = new LoggerImpl(this);
      if(typeof argA === 'string') throw new Error('placing child logger fields on a sub-object is not implemented yet');
      return child.add(argB);
    }

    /**
     * Create and emit a log event.
     */
    log(): void;
    log<M extends string, PassedFields extends object>(
        message: ProposeTemplateFields<M, (keyof Fields | keyof PassedFields) & string>,
        fields: ProposeObjectProperties<PassedFields, Fields, TemplateFieldNames<M>>
    ): void;
    log(message: string = this._message, fields?: object) {
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

    addChildEnricher(enricher: LoggerEnricher) {
      // TODO
    }

    addEventEnricher(enricher: EventEnricher) {
      // TODO
    }
}

const re = /\{([^}]+)}/g;
function renderMessage(message: string, fields: object) {
  return message.replace(re, (_$0, $1) => fields[$1]);
}

const logger = createLogger();
