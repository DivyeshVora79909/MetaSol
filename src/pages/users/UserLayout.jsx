import { UserTableProvider } from "./UserTableState";
export default function UserLayout(props) {
  return <UserTableProvider>{props.children}</UserTableProvider>;
}
