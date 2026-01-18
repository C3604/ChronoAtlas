import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAppStore } from "../appStore";

// Mock fetch
const fetchMock = vi.fn();
global.fetch = fetchMock;

// Mock localStorage
const localStorageMock = (function () {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value.toString();
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(global, "localStorage", {
  value: localStorageMock,
});

describe("appStore", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    // Reset store state if possible, or just re-instantiate if it was a factory
    // Since useAppStore returns the same reactive objects, we might need to reset them manually
    // But for now let's just test the logic that is accessible
  });

  it("should have initial state", () => {
    const store = useAppStore();
    expect(store.token.value).toBe("");
    expect(store.user.value).toBeNull();
  });

  it("should format year correctly", () => {
    const store = useAppStore();
    expect(store.formatYear(2023)).toBe("2023 年");
    expect(store.formatYear(-221)).toBe("公元前 222 年"); // -221 is 222 BC ? No, -1 is 2 BC, 0 is 1 BC?
    // Let's check logic: if (year <= 0) return `公元前 ${Math.abs(year - 1)} 年`;
    // if year is 0, abs(-1) = 1 -> 1 BC. Correct.
    // if year is -1, abs(-2) = 2 -> 2 BC. Correct.
    // if year is -221, abs(-222) = 222 -> 222 BC.
    expect(store.formatYear(0)).toBe("公元前 1 年");
  });

  it("should login successfully", async () => {
    const store = useAppStore();
    const mockUser = { id: "1", name: "Test User", email: "test@example.com", role: "super_admin" };
    const mockToken = "mock-token";

    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ token: mockToken, user: mockUser }),
    });

    await store.login("test@example.com", "password");

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/auth/login"),
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ email: "test@example.com", password: "password" }),
      })
    );

    expect(store.token.value).toBe(mockToken);
    expect(store.user.value).toEqual(mockUser);
    expect(localStorageMock.setItem).toHaveBeenCalledWith("chronoatlas_token", mockToken);
  });

  it("should logout successfully", async () => {
    const store = useAppStore();
    store.token.value = "some-token";
    
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({}),
    });

    await store.logout();

    expect(store.token.value).toBe("");
    expect(store.user.value).toBeNull();
    expect(localStorageMock.removeItem).toHaveBeenCalledWith("chronoatlas_token");
  });

  it("should check permissions correctly", () => {
    const store = useAppStore();
    store.user.value = { id: "1", name: "Admin", email: "admin@example.com", role: "super_admin" };
    expect(store.canManageContent.value).toBe(true);

    store.user.value = { id: "2", name: "Editor", email: "editor@example.com", role: "content_editor" };
    expect(store.canManageContent.value).toBe(false);
    expect(store.canWriteContent.value).toBe(true);
  });
});
