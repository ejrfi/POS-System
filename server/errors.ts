export class BusinessError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: any,
  ) {
    super(message);
    this.name = "BusinessError";
  }
}

