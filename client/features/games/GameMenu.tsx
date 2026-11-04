import { Button, Menu } from "../../components";

import type { GameSort } from "./collection";

export interface GameMenuProps {
  field?: "all" | "name" | "status" | "moves";
  filter: string;
  sort: string;
  onFilter: (value: string) => void;
  onSort: (value: GameSort) => void;
}
const sortOptions: { value: GameSort; label: string; field: string }[] = [
  { value: "newest", label: "Newest first", field: "all" },
  { value: "name_asc", label: "Game: A–Z", field: "name" },
  { value: "name_desc", label: "Game: Z–A", field: "name" },
  { value: "status_asc", label: "Status: in progress first", field: "status" },
  { value: "status_desc", label: "Status: completed first", field: "status" },
  { value: "moves_asc", label: "Moves: fewest first", field: "moves" },
  { value: "moves_desc", label: "Moves: most first", field: "moves" },
];

export function GameMenu({
  field = "all",
  filter,
  sort,
  onFilter,
  onSort,
}: GameMenuProps) {
  const label =
    field === "all"
      ? "Sort & filter"
      : field === "name"
        ? "Game"
        : field === "moves"
          ? "Moves"
          : "Status";
  const direction = sort.startsWith(`${field}_`)
    ? sort.endsWith("asc")
      ? " ↑"
      : " ↓"
    : "";
  return (
    <Menu
      trigger={
        <Button variant="ghost" size="sm" aria-label={`${label} options`}>
          {label}
          {direction} ▾
        </Button>
      }
    >
      {field === "all" || field === "status" ? (
        <>
          {[
            ["all", "Show all games"],
            ["in_progress", "Show in progress"],
            ["completed", "Show completed"],
            ["game_won", "Show wins"],
            ["draw", "Show draws"],
          ].map(([value, label]) => (
            <Menu.Item key={value} onClick={() => onFilter(value)}>
              {label}
              {filter === value ? " ✓" : ""}
            </Menu.Item>
          ))}
          <Menu.Separator />
        </>
      ) : null}
      {sortOptions
        .filter(
          (option) =>
            field === "all" ||
            option.field === field ||
            option.value === "newest",
        )
        .map((option) => (
          <Menu.Item key={option.value} onClick={() => onSort(option.value)}>
            {option.label}
            {sort === option.value ? " ✓" : ""}
          </Menu.Item>
        ))}
    </Menu>
  );
}
