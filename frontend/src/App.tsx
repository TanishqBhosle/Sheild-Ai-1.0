import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./auth";
import { AdminPanelPage, LoginPage, SignupPage, ModeratorPanelPage, NotFoundPage, UnauthorizedPage, UserPanelPage } from "./pages";
import { AuthGate, RedirectByRole, RequireLogin, RequireRole } from "./routes";

export function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route element={<AuthGate />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route path="/unauthorized" element={<UnauthorizedPage />} />
          <Route element={<RequireLogin />}>
            <Route path="/" element={<RedirectByRole />} />

            <Route path="/user/*" element={<RequireRole role="user" />}>
              <Route index element={<UserPanelPage />} />
              <Route path="history" element={<UserPanelPage />} />
            </Route>

            <Route path="/moderator/*" element={<RequireRole role="moderator" />}>
              <Route index element={<ModeratorPanelPage />} />
              <Route path="history" element={<ModeratorPanelPage />} />
            </Route>

            <Route path="/admin/*" element={<RequireRole role="admin" />}>
              <Route index element={<AdminPanelPage />} />
              <Route path="policies" element={<AdminPanelPage />} />
              <Route path="api-keys" element={<AdminPanelPage />} />
              <Route path="analytics" element={<AdminPanelPage />} />
            </Route>
          </Route>
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}
