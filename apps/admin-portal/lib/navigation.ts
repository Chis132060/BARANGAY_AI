import {
  LayoutDashboard,
  Users,
  FileText,
  Building2,
  Scale,
  Briefcase,
  Megaphone,
  Settings,
  LucideIcon,
} from "lucide-react";

export interface NavigationChild {
  title: string;
  href: string;
  /** Module key to check in the permissions map. If omitted, always visible. */
  module?: string;
  /** Specific permission action required. Defaults to "canView". */
  requiredAction?: "canView" | "canCreate" | "canEdit" | "canDelete" | "canApprove";
}

export interface NavigationModule {
  title: string;
  icon: LucideIcon;
  href?: string;
  children?: NavigationChild[];
  /** Module key to check in the permissions map. */
  module?: string;
  /** Specific permission action required. Defaults to "canView". */
  requiredAction?: "canView" | "canCreate" | "canEdit" | "canDelete" | "canApprove";
}

export const navigationConfig: NavigationModule[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
    module: "dashboard",
  },
  {
    title: "Residents Management",
    icon: Users,
    module: "residents",
    children: [
      { title: "Residents", href: "/residents", module: "residents" },
      { title: "Verification Queue", href: "/residents/verification", module: "residents", requiredAction: "canApprove" },
      { title: "Household", href: "/residents/household", module: "residents" },
      { title: "Senior Citizen", href: "/residents/senior", module: "residents" },
      { title: "PWD", href: "/residents/pwd", module: "residents" },
      { title: "4Ps Records", href: "/residents/4ps", module: "residents" },
    ],
  },
  {
    title: "Documents & Services",
    icon: FileText,
    module: "documents",
    children: [
      { title: "Document Requests", href: "/documents/requests", module: "documents" },
      { title: "Certificates", href: "/documents/certificates", module: "documents" },
      { title: "Business Clearance", href: "/documents/business-clearance", module: "documents" },
    ],
  },
  {
    title: "Community Management",
    icon: Building2,
    module: "community",
    children: [
      { title: "Barangay Officials", href: "/community/officials", module: "community" },
      { title: "Purok Management", href: "/community/purok", module: "community" },
      { title: "Precinct Management", href: "/community/precinct", module: "community" },
    ],
  },
  {
    title: "Cases & Reports",
    icon: Scale,
    module: "cases",
    children: [
      { title: "Complaints", href: "/cases/complaints", module: "cases" },
      { title: "Katarungang Pambarangay", href: "/cases/katarungang-pambarangay", module: "cases" },
      { title: "Incident Reports", href: "/cases/incident-reports", module: "cases" },
    ],
  },
  {
    title: "Business Management",
    icon: Briefcase,
    module: "business",
    children: [
      { title: "Business Registry", href: "/business/registry", module: "business" },
      { title: "Business Permit", href: "/business/permits", module: "business" },
    ],
  },
  {
    title: "Communication & Transactions",
    icon: Megaphone,
    module: "communication",
    children: [
      { title: "Announcements", href: "/communication/announcements", module: "communication" },
      { title: "Appointments", href: "/communication/appointments", module: "communication" },
      { title: "Notifications", href: "/communication/notifications", module: "communication" },
      { title: "Transaction History", href: "/communication/transactions", module: "communication" },
    ],
  },
  {
    title: "Administration",
    icon: Settings,
    module: "administration",
    children: [
      { title: "Users", href: "/administration/users", module: "administration", requiredAction: "canView" },
      { title: "Roles & Permissions", href: "/administration/roles", module: "administration", requiredAction: "canEdit" },
      { title: "Reports", href: "/administration/reports", module: "administration" },
      { title: "Settings", href: "/administration/settings", module: "administration", requiredAction: "canEdit" },
      { title: "Audit Logs", href: "/administration/audit", module: "administration" },
    ],
  },
];
