/**
 * Prisma Client Type Stubs
 * These types are used when the Prisma client has not been generated.
 * Run `prisma generate` to get the full types.
 */

declare module "@prisma/client" {
  export interface PrismaClientOptions {
    log?: Array<{ emit: "stdout" | "event"; level: Prisma.LogLevel }>;
    datasources?: Record<string, { url: string }>;
  }

  export class PrismaClient {
    constructor(options?: PrismaClientOptions);
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    $on(event: string, callback: (e: any) => void): void;
    $queryRaw<T = unknown>(query: TemplateStringsArray, ...values: unknown[]): Promise<T>;
    $executeRaw(query: TemplateStringsArray, ...values: unknown[]): Promise<number>;
    $transaction<T>(fn: (prisma: PrismaClient) => Promise<T>): Promise<T>;

    // Add model accessors as needed
    user: ModelDelegate;
    generation: ModelDelegate;
    video: ModelDelegate;
    workflow: ModelDelegate;
    trainedModel: ModelDelegate;
    project: ModelDelegate;
    usageLog: ModelDelegate;
    notification: ModelDelegate;
    apiKey: ModelDelegate;
    subscription: ModelDelegate;
    [key: string]: ModelDelegate | ((...args: any[]) => any);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  interface ModelDelegate {
    findUnique(args: any): Promise<any>;
    findFirst(args: any): Promise<any>;
    findMany(args?: any): Promise<any[]>;
    create(args: any): Promise<any>;
    createMany(args: any): Promise<{ count: number }>;
    update(args: any): Promise<any>;
    updateMany(args: any): Promise<{ count: number }>;
    delete(args: any): Promise<any>;
    deleteMany(args: any): Promise<{ count: number }>;
    count(args?: any): Promise<number>;
    aggregate(args: any): Promise<any>;
    groupBy(args: any): Promise<any[]>;
    upsert(args: any): Promise<any>;
  }

  export namespace Prisma {
    export type LogLevel = "query" | "info" | "warn" | "error";
    export type LogDefinition = {
      level: LogLevel;
      emit: "stdout" | "event";
    };

    export interface QueryEvent {
      timestamp: Date;
      query: string;
      params: string;
      duration: number;
      target: string;
    }

    export interface LogEvent {
      timestamp: Date;
      message: string;
      target: string;
    }

    export class PrismaClientKnownRequestError extends Error {
      code: string;
      meta?: Record<string, unknown>;
      clientVersion: string;
    }

    export class PrismaClientUnknownRequestError extends Error {
      clientVersion: string;
    }

    export class PrismaClientRustPanicError extends Error {
      clientVersion: string;
    }

    export class PrismaClientInitializationError extends Error {
      clientVersion: string;
    }

    export class PrismaClientValidationError extends Error {}
  }
}
