import { vi, type Mock } from "vitest";

export type QueryResult = readonly [unknown, unknown];
export type QueryMethod = (
  query: string,
  parameters?: readonly unknown[],
) => Promise<QueryResult>;

export type TransactionMethod = () => Promise<void>;

export type DatabaseConnectionMock = {
  execute: Mock<QueryMethod>;
  query: Mock<QueryMethod>;
  beginTransaction: Mock<TransactionMethod>;
  commit: Mock<TransactionMethod>;
  rollback: Mock<TransactionMethod>;
  release: Mock<() => void>;
};

export type DatabaseMock = {
  pool: {
    execute: Mock<QueryMethod>;
    query: Mock<QueryMethod>;
    getConnection: Mock<() => Promise<DatabaseConnectionMock>>;
  };
  connection: DatabaseConnectionMock;
  setExecuteResult: (result: QueryResult) => void;
  setQueryResult: (result: QueryResult) => void;
  setExecuteError: (error: unknown) => void;
  setQueryError: (error: unknown) => void;
};

const emptyResult: QueryResult = [[], []];

export function createDatabaseMock(): DatabaseMock {
  const execute = vi.fn<QueryMethod>().mockResolvedValue(emptyResult);
  const query = vi.fn<QueryMethod>().mockResolvedValue(emptyResult);
  const connectionExecute = vi.fn<QueryMethod>().mockResolvedValue(emptyResult);
  const connectionQuery = vi.fn<QueryMethod>().mockResolvedValue(emptyResult);
  const beginTransaction = vi.fn<TransactionMethod>().mockResolvedValue();
  const commit = vi.fn<TransactionMethod>().mockResolvedValue();
  const rollback = vi.fn<TransactionMethod>().mockResolvedValue();
  const release = vi.fn<() => void>();

  const connection: DatabaseConnectionMock = {
    execute: connectionExecute,
    query: connectionQuery,
    beginTransaction,
    commit,
    rollback,
    release,
  };

  const database: DatabaseMock = {
    pool: {
      execute,
      query,
      getConnection: vi.fn<() => Promise<DatabaseConnectionMock>>().mockResolvedValue(
        connection,
      ),
    },
    connection,
    setExecuteResult(result) {
      execute.mockResolvedValue(result);
    },
    setQueryResult(result) {
      query.mockResolvedValue(result);
    },
    setExecuteError(error) {
      execute.mockRejectedValue(error);
    },
    setQueryError(error) {
      query.mockRejectedValue(error);
    },
  };

  return database;
}
