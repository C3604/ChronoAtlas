import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAppStore } from "../appStore";

const fetchMock = vi.fn();
// @ts-expect-error: test mock
global.fetch = fetchMock;

describe("appStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have initial state", () => {
    const store = useAppStore();
    expect(store.user.value).toBeNull();
    expect(store.profileLoaded.value).toBe(false);
  });

  it("should format year correctly", () => {
    const store = useAppStore();
    expect(store.formatYear(2023)).toBe("2023 年");
    expect(store.formatYear(-221)).toBe("公元前 222 年");
    expect(store.formatYear(0)).toBe("公元前 1 年");
  });

  it("should login successfully", async () => {
    const store = useAppStore();
    const mockUser = {
      id: "1",
      displayName: "Test User",
      email: "test@example.com",
      roles: ["SUPER_ADMIN"],
      isActive: true,
      emailVerified: true
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ code: "OK", message: "OK", data: { user: mockUser } })
    });

    await store.login("test@example.com", "password");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/login"),
      expect.objectContaining({
        method: "POST",
        credentials: "include"
      })
    );

    expect(store.user.value).toEqual(mockUser);
  });

  it("should logout successfully", async () => {
    const store = useAppStore();
    store.user.value = {
      id: "1",
      displayName: "Test User",
      email: "test@example.com",
      roles: ["ADMIN"],
      isActive: true,
      emailVerified: true
    };

    fetchMock.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ code: "OK", message: "OK", data: { ok: true } })
    });

    await store.logout();

    expect(store.user.value).toBeNull();
  });

  it("should check permissions correctly", () => {
    const store = useAppStore();
    store.user.value = {
      id: "1",
      displayName: "Admin",
      email: "admin@example.com",
      roles: ["SUPER_ADMIN"],
      isActive: true,
      emailVerified: true
    };
    expect(store.canManageContent.value).toBe(true);

    store.user.value = {
      id: "2",
      displayName: "Editor",
      email: "editor@example.com",
      roles: ["EDITOR"],
      isActive: true,
      emailVerified: true
    };
    expect(store.canManageContent.value).toBe(false);
    expect(store.canWriteContent.value).toBe(true);
  });
});
