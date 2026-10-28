/**
 * A turn the model turned away for load (a 429, from any backend). The panel
 * counts down and sends it again (Spec 08's AI-03) rather than showing an
 * error.
 */
export class ModelBusyError extends Error {
  /**
   * @param waitSeconds what the server asked to wait, if it said
   * @param options the provider's failure, kept as `cause`
   */
  constructor(
    readonly waitSeconds: number | undefined,
    options?: ErrorOptions
  ) {
    super("The model is busy.", options);
    this.name = "ModelBusyError";
  }
}
