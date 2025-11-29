import { PelelaError } from "./PelelaError";

export type EventType = "click" | "submit" | "change" | "input" | "keypress" | (string & {});

export class InvalidHandlerError extends PelelaError {
  constructor(
    public readonly handlerName: string,
    public readonly viewModelName: string,
    public readonly eventType?: EventType,
  ) {
    const eventInfo = eventType ? `${eventType}="..."` : "un event handler";
    super(
      `[pelela] Handler "${handlerName}" definido en ${eventInfo} no es una función ` +
        `del view model "${viewModelName}".`,
    );
  }
}
