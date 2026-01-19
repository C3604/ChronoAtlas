import { mount } from "@vue/test-utils";
import { describe, it, expect, vi, beforeEach } from "vitest";
import LoginPage from "../LoginPage.vue";

// Mock store
const mockLogin = vi.fn();
// We need to make user reactive or ref-like if the component accesses .value,
// but in template it is unref-ed. In script it is destructured.
// The component uses: const { user, login } = useAppStore();
// And in template: v-if="user"
// So the mock should return a ref or a reactive object.
import { ref } from "vue";

const user = ref(null);

vi.mock("../../store/appStore", () => ({
  useAppStore: () => ({
    user: user,
    login: mockLogin,
  }),
}));

// Mock router
const mockPush = vi.fn();
vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
  useRoute: () => ({
    query: {}
  }),
}));

describe("LoginPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    user.value = null;
  });

  it("renders login form when not logged in", () => {
    const wrapper = mount(LoginPage, {
      global: {
        stubs: {
            "a-card": { template: "<div class='a-card'><slot /></div>" },
            "a-form": { template: "<form class='a-form'><slot /></form>" },
            "a-form-item": { template: "<div class='a-form-item'><slot /></div>" },
            "a-input": true,
            "a-input-password": true,
            "a-button": true,
            "a-divider": true,
            "a-tag": true,
            "a-alert": true,
            "a-result": true,
            "UserOutlined": true,
            "LockOutlined": true,
        }
      },
    });

    expect(wrapper.find(".text-gradient-fern").text()).toBe("欢迎回来");
    expect(wrapper.find(".a-form").exists()).toBe(true);
  });

  it("renders success state when logged in", async () => {
    user.value = { id: "1", displayName: "Admin", email: "admin@test.com" };
    
    const wrapper = mount(LoginPage, {
      global: {
        stubs: {
            "a-card": { template: "<div class='a-card'><slot /></div>" },
            "a-form": true,
            "a-result": { template: "<div class='a-result'>Logged In</div>" },
            "a-button": true,
            "UserOutlined": true,
            "LockOutlined": true,
        }
      },
    });

    expect(wrapper.find(".a-result").exists()).toBe(true);
    expect(wrapper.find(".a-form").exists()).toBe(false);
  });
});
