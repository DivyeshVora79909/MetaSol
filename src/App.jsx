import { lazy } from "solid-js";
import { Route } from "@solidjs/router";
import AuthGuard from "./components/AuthGuard";

// Domain-Co-Located Layouts
const AuthLayout = lazy(() => import("./pages/auth/AuthLayout"));
const MainLayout = lazy(() => import("./pages/MainLayout"));

// Public Nodes
const Login = lazy(() => import("./pages/auth/Login"));
const Forgot = lazy(() => import("./pages/auth/Forgot"));
const Verify = lazy(() => import("./pages/auth/Verify"));
const SignUp = lazy(() => import("./pages/auth/SignUp"));

// Private Nodes
const Dashboard = lazy(() => import("./pages/Dashboard"));

// User Domain
const UserList = lazy(() => import("./pages/users/UserList"));
const UserForm = lazy(() => import("./pages/users/UserForm"));
const UserView = lazy(() => import("./pages/users/UserView"));

export default function App() {
  return (
    <>
      <Route path="/auth" component={AuthLayout}>
        <Route path="/login" component={Login} />
        <Route path="/signup" component={SignUp} />
        <Route path="/forgot" component={Forgot} />
        <Route path="/verify" component={Verify} />
      </Route>

      <Route path="/" component={AuthGuard}>
        <Route path="/" component={MainLayout}>
          <Route path="/" component={Dashboard} />

          <Route path="/users">
            <Route path="/" component={UserList} />
            <Route path="/new" component={UserForm} />
            <Route path="/:id" component={UserView} />
            <Route path="/:id/edit" component={UserForm} />
          </Route>
        </Route>
      </Route>
    </>
  );
}
