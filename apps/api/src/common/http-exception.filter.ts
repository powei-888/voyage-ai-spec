import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

type ErrorPayload = {
  code: string;
  message: string;
  details: Record<string, unknown>;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const reply = host.switchToHttp().getResponse<{
      status: (code: number) => { send: (body: unknown) => void };
    }>();
    const { status, error } = this.normalize(exception);

    reply.status(status).send({ error });
  }

  private normalize(exception: unknown): {
    status: number;
    error: ErrorPayload;
  } {
    if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      if (exception.code === "P2002") {
        return this.payload(
          HttpStatus.CONFLICT,
          "CONFLICT",
          "A record with these values already exists.",
          { target: exception.meta?.target }
        );
      }
      if (exception.code === "P2025") {
        return this.payload(HttpStatus.NOT_FOUND, "NOT_FOUND", "Record not found.");
      }
    }

    if (exception instanceof HttpException) {
      const response = exception.getResponse();
      const status = exception.getStatus();
      if (typeof response === "object" && response !== null && "code" in response) {
        const value = response as ErrorPayload;
        return { status, error: value };
      }
      const messages =
        typeof response === "object" && response !== null && "message" in response
          ? (response as { message: unknown }).message
          : exception.message;
      return this.payload(status, "VALIDATION_ERROR", "Invalid request.", {
        messages
      });
    }

    return this.payload(
      HttpStatus.INTERNAL_SERVER_ERROR,
      "INTERNAL_ERROR",
      "An unexpected error occurred."
    );
  }

  private payload(
    status: number,
    code: string,
    message: string,
    details: Record<string, unknown> = {}
  ): { status: number; error: ErrorPayload } {
    return { status, error: { code, message, details } };
  }
}
