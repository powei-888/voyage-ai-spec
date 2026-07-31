import { createHash, randomBytes } from "node:crypto";
import { HttpStatus, Injectable } from "@nestjs/common";
import { DomainError } from "../../common/domain-error";
import { PrismaService } from "../../infra/database/prisma.service";
import { LoginDto, RegisterDto } from "./auth.dto";
import { hashPassword, verifyPassword } from "./password";

const SESSION_DAYS = 30;
const publicUser = {
  id: true,
  email: true,
  displayName: true,
  avatarUrl: true
} as const;

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  async register(dto: RegisterDto) {
    const passwordHash = await hashPassword(dto.password);
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email }
    });
    if (existing?.passwordHash) {
      throw new DomainError(
        "EMAIL_ALREADY_REGISTERED",
        "This email already has a local account.",
        HttpStatus.CONFLICT
      );
    }

    const user = await this.prisma.$transaction(async (tx) => {
      const saved = existing
        ? await tx.user.update({
            where: { id: existing.id },
            data: { displayName: dto.displayName.trim(), passwordHash },
            select: publicUser
          })
        : await tx.user.create({
            data: {
              email: dto.email,
              displayName: dto.displayName.trim(),
              passwordHash
            },
            select: publicUser
          });
      await tx.tripMember.updateMany({
        where: { userId: saved.id, joinedAt: null },
        data: { joinedAt: new Date() }
      });
      return saved;
    });

    return this.createSession(user);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email }
    });
    const valid =
      user?.passwordHash && (await verifyPassword(dto.password, user.passwordHash));
    if (!user || !valid) {
      throw new DomainError(
        "INVALID_CREDENTIALS",
        "Email or password is incorrect.",
        HttpStatus.UNAUTHORIZED
      );
    }
    return this.createSession({
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl
    });
  }

  async authenticate(token: string) {
    const session = await this.prisma.session.findUnique({
      where: { tokenHash: this.hashToken(token) },
      include: { user: { select: publicUser } }
    });
    if (!session || session.expiresAt <= new Date()) {
      if (session) {
        await this.prisma.session.delete({ where: { id: session.id } });
      }
      return null;
    }
    return session.user;
  }

  async logout(token: string): Promise<void> {
    await this.prisma.session.deleteMany({
      where: { tokenHash: this.hashToken(token) }
    });
  }

  private async createSession(user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl: string | null;
  }) {
    const token = randomBytes(32).toString("base64url");
    const expiresAt = new Date();
    expiresAt.setUTCDate(expiresAt.getUTCDate() + SESSION_DAYS);
    await this.prisma.session.create({
      data: { userId: user.id, tokenHash: this.hashToken(token), expiresAt }
    });
    return { token, expiresAt, user };
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }
}
