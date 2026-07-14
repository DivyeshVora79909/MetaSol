import { UserProvider } from "./UserContext";
export default function UserLayout(props) {
  return <UserProvider>{props.children}</UserProvider>;
}
