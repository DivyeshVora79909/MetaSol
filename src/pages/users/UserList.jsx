import PageShell from "../../components/PageShell";
import DataGrid from "../../components/DataGrid";
import { USER_CONFIG } from "./config";

export default function UserList() {
  return (
    <PageShell title="Identity Node Analytics">
      {/* 
        The DataGrid acts as a pure Black Box engine. 
        It handles all filtering, pagination, selection, and deletion internally.
      */}
      <DataGrid
        config={USER_CONFIG}
        baseRoute="/users"
        createPath="/users/new"
      />
    </PageShell>
  );
}
