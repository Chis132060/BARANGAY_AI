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
  allowedRoles?: string[];
}

export interface NavigationModule {
  title: string;
  icon: LucideIcon;
  href?: string;
  children?: NavigationChild[];
  allowedRoles?: string[];
}

export const navigationConfig: NavigationModule[] = [
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",
  },
  {
    title: "Residents Management",
    icon: Users,
    children: [
      { title: "Residents", href: "/residents" },
      { title: "Verification Queue", href: "/residents/verification" },
      { title: "Household", href: "/residents/household" },
      { title: "Senior Citizen", href: "/residents/senior" },
      { title: "PWD", href: "/residents/pwd" },
      { title: "4Ps Records", href: "/residents/4ps" },
    ],
  },
  {
    title: "Documents & Services",
    icon: FileText,
    children: [
      { title: "Document Requests", href: "/documents/requests" },
      { title: "Certificates", href: "/documents/certificates" },
      { title: "Business Clearance", href: "/documents/business-clearance" },
    ],
  },
  {
    title: "Community Management",
    icon: Building2,
    children: [
      { title: "Barangay Officials", href: "/community/officials" },
      { title: "Purok Management", href: "/community/purok" },
      { title: "Precinct Management", href: "/community/precinct" },
    ],
  },
  {
    title: "Cases & Reports",
    icon: Scale,
    children: [
      { title: "Complaints", href: "/cases/complaints" },
      { title: "Katarungang Pambarangay", href: "/cases/katarungang-pambarangay" },
      { title: "Incident Reports", href: "/cases/incident-reports" },
    ],
  },
  {
    title: "Business Management",
    icon: Briefcase,
    children: [
      { title: "Business Registry", href: "/business/registry" },
      { title: "Business Permit", href: "/business/permits" },
    ],
  },
  {
    title: "Communication & Transactions",
    icon: Megaphone,
    children: [
      { title: "Announcements", href: "/communication/announcements" },
      { title: "Appointments", href: "/communication/appointments" },
      { title: "Notifications", href: "/communication/notifications" },
      { title: "Transaction History", href: "/communication/transactions" },
    ],
  },
  {
    title: "Administration",
    icon: Settings,
    allowedRoles: ["Super Admin", "Barangay Captain", "Secretary"],
    children: [
      { title: "Users", href: "/administration/users", allowedRoles: ["Super Admin"] },
      { title: "Roles & Permissions", href: "/administration/roles", allowedRoles: ["Super Admin"] },
      { title: "Reports", href: "/administration/reports" },
      { title: "Settings", href: "/administration/settings", allowedRoles: ["Super Admin", "Barangay Captain"] },
      { title: "Audit Logs", href: "/administration/audit", allowedRoles: ["Super Admin", "Barangay Captain"] },
    ],
  },
];
