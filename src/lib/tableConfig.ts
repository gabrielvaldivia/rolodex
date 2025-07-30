import { SortField } from "@/types";

export interface TableColumn {
  key: string;
  label: string;
  sortable: boolean;
  width: string;
  align?: "left" | "center" | "right";
}

export const getTableConfig = (viewType: "contacts" | "companies") => {
  const contactColumns: TableColumn[] = [
    { key: "avatar", label: "", sortable: false, width: "w-12", align: "center" },
    { key: "name", label: "Name", sortable: true, width: "max-w-32" },
    { key: "email", label: "Email", sortable: true, width: "max-w-48" },
    { key: "company", label: "Company", sortable: true, width: "max-w-32" },
    { key: "tags", label: "Tags", sortable: true, width: "max-w-32" },
    { key: "source", label: "Source", sortable: false, width: "w-12", align: "center" },
    { key: "lastContact", label: "Last Contact", sortable: true, width: "min-w-8", align: "right" },
  ];

  const companyColumns: TableColumn[] = [
    { key: "name", label: "Company", sortable: true, width: "min-w-48" },
    { key: "contacts", label: "Contact", sortable: true, width: "min-w-24" },
    { key: "tags", label: "Tags", sortable: true, width: "min-w-40" },
    { key: "lastContact", label: "Last Contact", sortable: true, width: "min-w-32", align: "right" },
  ];

  return viewType === "contacts" ? contactColumns : companyColumns;
};

export const getSortableFields = (viewType: "contacts" | "companies"): SortField[] => {
  const contactFields: SortField[] = ["name", "email", "company", "lastContact", "tags"];
  const companyFields: SortField[] = ["name", "company", "lastContact", "tags"];
  
  return viewType === "contacts" ? contactFields : companyFields;
}; 