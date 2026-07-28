import { createContext, createMemo, createSignal, useContext } from "solid-js";
import { createStore, unwrap } from "solid-js/store";
import { useQueryClient } from "@tanstack/solid-query";
import { compileQuery } from "../../lib/queryEngine/index.js";
import { fetchQuery } from "../../lib/surreal";
import { USER_CONFIG as CONFIG } from "./config";
import { useUI } from "../../store/ui";
import { userKeys } from "./user.keys";
import toast from "solid-toast";

const TableStateContext = createContext();

const clone = (value) => structuredClone(value);
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const queryShape = ({ page: _page, ...state }) => state;

export function UserTableProvider(props) {
  const queryClient = useQueryClient();
  const { openModal } = useUI();

  const [draftQuery, setDraftQuery] = createStore(clone(CONFIG.defaultState));
  const [appliedQuery, setAppliedQuery] = createSignal(
    clone(CONFIG.defaultState),
  );
  const [selectedRecords, setSelectedRecords] = createSignal([]);
  const [compileError, setCompileError] = createSignal("");

  const compiledQuery = createMemo(() => {
    try {
      setCompileError("");
      return compileQuery(CONFIG, appliedQuery());
    } catch (error) {
      setCompileError(error.message || "The query is invalid.");
      return null;
    }
  });

  const hasPendingChanges = createMemo(
    () => !same(unwrap(draftQuery), appliedQuery()),
  );

  const commitQuery = () => {
    const next = clone(unwrap(draftQuery));
    const previous = appliedQuery();
    if (!same(queryShape(next), queryShape(previous))) {
      next.page = 1;
      setDraftQuery("page", 1);
    }
    try {
      compileQuery(CONFIG, next);
      setCompileError("");
      setAppliedQuery(next);
      return true;
    } catch (error) {
      setCompileError(error.message || "The query is invalid.");
      return false;
    }
  };

  const toggleSelection = (id) => {
    setSelectedRecords((prev) =>
      prev.includes(id)
        ? prev.filter((recordId) => recordId !== id)
        : [...prev, id],
    );
  };

  const clearSelection = () => setSelectedRecords([]);
  const isSelected = (id) => selectedRecords().includes(id);

  const resetDraft = () => {
    setCompileError("");
    setDraftQuery(clone(CONFIG.defaultState));
  };

  const setPage = (page) => {
    setDraftQuery("page", page);
    setAppliedQuery((current) => ({ ...current, page }));
  };

  const promptDelete = (ids, onSuccess) => {
    if (!ids || ids.length === 0) return;
    const isSingle = ids.length === 1;
    const label = isSingle
      ? CONFIG.ui.entityLabel
      : CONFIG.ui.entityLabelPlural;
    const capitalLabel = label.charAt(0).toUpperCase() + label.slice(1);

    const message = isSingle
      ? `Are you sure you want to permanently delete this ${label} [${ids[0]}]? This action cannot be reversed.`
      : `Are you sure you want to permanently delete ${ids.length} selected ${label}? This action cannot be reversed.`;

    openModal(`Delete ${capitalLabel}?`, message, "error", async () => {
      try {
        await fetchQuery(`DELETE ${CONFIG.table} WHERE id IN $ids;`, { ids });
        toast.success(
          isSingle
            ? `${capitalLabel} ${ids[0]} eliminated successfully.`
            : `${ids.length} ${label} eliminated successfully.`,
        );
        clearSelection();

        queryClient.invalidateQueries({ queryKey: userKeys.lists() });

        if (onSuccess) onSuccess();
      } catch (err) {
        toast.error(`Deletion failed: ${err.message}`);
      }
    });
  };

  return (
    <TableStateContext.Provider
      value={{
        config: CONFIG,
        draftQuery,
        setDraftQuery,
        appliedQuery,
        compiledQuery,
        commitQuery,
        resetDraft,
        setPage,
        hasPendingChanges,
        compileError,
        selectedRecords,
        toggleSelection,
        clearSelection,
        isSelected,
        promptDelete,
      }}
    >
      {props.children}
    </TableStateContext.Provider>
  );
}

export const useUserTableState = () => useContext(TableStateContext);
