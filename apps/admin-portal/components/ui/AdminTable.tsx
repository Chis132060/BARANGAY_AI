import type { ComponentProps } from "react";

type AdminTableProps = ComponentProps<"table">;

/** Scrollable admin table with a header row that stays visible while browsing rows. */
export function AdminTable({ className, ...tableProps }: AdminTableProps) {
  return (
    <div className="admin-table-frame">
      <table {...tableProps} className={className} />
    </div>
  );
}
