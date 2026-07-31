import { HttpException, HttpStatus } from "@nestjs/common";

export class DomainError extends HttpException {
  constructor(
    public readonly code: string,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details: Record<string, unknown> = {}
  ) {
    super({ code, message, details }, status);
  }

  static notFound(code: string, message: string): DomainError {
    return new DomainError(code, message, HttpStatus.NOT_FOUND);
  }

  static forbidden(code: string, message: string): DomainError {
    return new DomainError(code, message, HttpStatus.FORBIDDEN);
  }
}
