import { createRouter, createWebHistory } from "vue-router";
import HomePage from "./pages/HomePage.vue";
import LoginPage from "./pages/LoginPage.vue";
import RegisterPage from "./pages/RegisterPage.vue";
import VerifyEmailPage from "./pages/VerifyEmailPage.vue";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.vue";
import ResetPasswordPage from "./pages/ResetPasswordPage.vue";
import ProfilePage from "./pages/ProfilePage.vue";
import ContentPage from "./pages/ContentPage.vue";
import { useAppStore } from "./store/appStore";
import type { RoleName } from "./store/appStore";

const routes = [
  { path: "/", name: "home", component: HomePage },
  { path: "/login", name: "login", component: LoginPage },
  { path: "/register", name: "register", component: RegisterPage },
  { path: "/verify-email", name: "verify-email", component: VerifyEmailPage },
  { path: "/forgot-password", name: "forgot-password", component: ForgotPasswordPage },
  { path: "/reset-password", name: "reset-password", component: ResetPasswordPage },
  { path: "/profile", name: "profile", component: ProfilePage, meta: { requiresAuth: true } },
  {
    path: "/content",
    name: "content",
    component: ContentPage,
    meta: { requiresAuth: true, roles: ["SUPER_ADMIN", "ADMIN", "EDITOR"] }
  }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach(async (to) => {
  const store = useAppStore();
  await store.ensureProfileLoaded();
  if (to.meta?.requiresAuth && !store.user.value) {
    return { path: "/login", query: { redirect: to.fullPath } };
  }
  const requiredRoles = to.meta?.roles as RoleName[] | undefined;
  if (requiredRoles && store.user.value) {
    const hasRole = requiredRoles.some((role) => store.user.value?.roles.includes(role));
    if (!hasRole) {
      return { path: "/" };
    }
  }
  return true;
});

export default router;
