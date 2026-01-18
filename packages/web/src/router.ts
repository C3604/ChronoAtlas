import { createRouter, createWebHistory } from "vue-router";
import HomePage from "./pages/HomePage.vue";
import LoginPage from "./pages/LoginPage.vue";
import ProfilePage from "./pages/ProfilePage.vue";
import ContentPage from "./pages/ContentPage.vue";

const routes = [
  { path: "/", name: "home", component: HomePage },
  { path: "/login", name: "login", component: LoginPage },
  { path: "/profile", name: "profile", component: ProfilePage },
  { path: "/content", name: "content", component: ContentPage }
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

export default router;
