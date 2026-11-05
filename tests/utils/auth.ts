import { vi, type Mock } from "vitest";

export type TestRole = "Client" | "Freelancer";

export type TestUser = {
  user_id: number;
  name: string;
  email: string;
  user_type: TestRole;
};

export const clientUser: TestUser = {
  user_id: 1,
  name: "Test Client",
  email: "client@example.test",
  user_type: "Client",
};

export const freelancerUser: TestUser = {
  user_id: 2,
  name: "Test Freelancer",
  email: "freelancer@example.test",
  user_type: "Freelancer",
};

export type CurrentUserMock = Mock<() => Promise<TestUser | null>>;

export type AuthMock = {
  getCurrentUser: CurrentUserMock;
  setCurrentUser: (user: TestUser | null) => void;
};

export function createAuthMock(initialUser: TestUser | null = null): AuthMock {
  let currentUser = initialUser;
  const getCurrentUser = vi.fn<() => Promise<TestUser | null>>(
    async () => currentUser,
  );

  return {
    getCurrentUser,
    setCurrentUser(user) {
      currentUser = user;
    },
  };
}
