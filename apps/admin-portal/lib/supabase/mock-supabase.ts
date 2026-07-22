// Local Mock Supabase Client for Admin Portal Development

const mockResidents: any[] = [
  {
    id: "res-1",
    first_name: "Juan",
    middle_name: "Santos",
    last_name: "Dela Cruz",
    birth_date: "1990-05-15",
    gender: "Male",
    civil_status: "Married",
    contact_number: "09171234567",
    voter_status: true,
    senior_status: false,
    pwd_status: false,
    four_ps_status: false,
    created_at: new Date().toISOString(),
    address: { house_number: "123", street: "Rizal St", purok: "Purok 1" },
  },
  {
    id: "res-2",
    first_name: "Maria",
    middle_name: "Cruz",
    last_name: "Santos",
    birth_date: "1945-08-20",
    gender: "Female",
    civil_status: "Widowed",
    contact_number: "09187654321",
    voter_status: true,
    senior_status: true,
    pwd_status: false,
    four_ps_status: false,
    created_at: new Date().toISOString(),
    address: { house_number: "456", street: "Magsaysay Ave", purok: "Purok 2" },
  },
  {
    id: "res-3",
    first_name: "Teresa",
    middle_name: "A.",
    last_name: "Mendoza",
    birth_date: "1982-11-02",
    gender: "Female",
    civil_status: "Married",
    contact_number: "09223334444",
    voter_status: true,
    senior_status: false,
    pwd_status: false,
    four_ps_status: true,
    created_at: new Date().toISOString(),
    address: { house_number: "789", street: "Bonifacio St", purok: "Purok 1" },
  },
  {
    id: "res-4",
    first_name: "Rodrigo",
    middle_name: "B.",
    last_name: "Reyes",
    birth_date: "1978-04-12",
    gender: "Male",
    civil_status: "Single",
    contact_number: "09334445555",
    voter_status: true,
    senior_status: false,
    pwd_status: false,
    four_ps_status: true,
    created_at: new Date().toISOString(),
    address: { house_number: "104", street: "Mabini St", purok: "Purok 4" },
  },
  {
    id: "res-5",
    first_name: "Jose",
    middle_name: "M.",
    last_name: "Rizal",
    birth_date: "1960-06-19",
    gender: "Male",
    civil_status: "Married",
    contact_number: "09445556666",
    voter_status: true,
    senior_status: true,
    pwd_status: true,
    four_ps_status: false,
    created_at: new Date().toISOString(),
    address: { house_number: "619", street: "Rizal St", purok: "Purok 3" },
  },
];

const mockHouseholds: any[] = [
  { id: "h-1", household_number: "HH-001", household_head_id: "res-1", monthly_income: 15000, housing_type: "Owned" },
  { id: "h-2", household_number: "HH-002", household_head_id: "res-3", monthly_income: 8000, housing_type: "Rented" },
];

const mockDocumentTypes: any[] = [
  { id: "dt-1", name: "Barangay Clearance", description: "Official clearance for employment, ID, or travel." },
  { id: "dt-2", name: "Certificate of Residency", description: "Proof of residency for official transactions." },
  { id: "dt-3", name: "Certificate of Indigency", description: "Assistance certificate for medical/financial aid." },
  { id: "dt-4", name: "Business Clearance", description: "Barangay permit for commercial operation." },
];

const mockDocumentRequests: any[] = [
  {
    id: "req-1",
    resident_id: "res-1",
    document_type_id: "dt-1",
    status: "Pending",
    remarks: "For Employment Application",
    requested_date: new Date().toISOString(),
    approved_by: null,
    released_date: null,
    resident: { first_name: "Juan", last_name: "Dela Cruz" },
    document_type: { name: "Barangay Clearance" },
  },
  {
    id: "req-2",
    resident_id: "res-3",
    document_type_id: "dt-2",
    status: "Approved",
    remarks: "Bank Account Requirement",
    requested_date: new Date(Date.now() - 86400000).toISOString(),
    approved_by: "user-1",
    released_date: new Date().toISOString(),
    resident: { first_name: "Teresa", last_name: "Mendoza" },
    document_type: { name: "Certificate of Residency" },
  },
];

const mockComplaints: any[] = [
  {
    id: "c-1",
    complainant_id: "res-1",
    respondent_id: "res-4",
    category: "Noise Complaint",
    description: "Loud karaoke music past midnight on weekdays.",
    status: "Filed",
    created_at: new Date().toISOString(),
    complainant: { first_name: "Juan", last_name: "Dela Cruz" },
    respondent: { first_name: "Rodrigo", last_name: "Reyes" },
  },
];

const mockBusinesses: any[] = [
  {
    id: "b-1",
    owner_id: "res-1",
    business_name: "Sari-Sari Store Ni Juan",
    business_type: "Retail",
    address: "Purok 1, Rizal St",
    status: "Active",
    created_at: new Date().toISOString(),
    owner: { first_name: "Juan", last_name: "Dela Cruz" },
  },
];

const mockAnnouncements: any[] = [
  {
    id: "a-1",
    title: "General Assembly Meeting",
    description: "Monthly community assembly to discuss safety and upcoming projects.",
    category: "Community Meeting",
    published_date: new Date().toISOString(),
    status: "Published",
  },
  {
    id: "a-2",
    title: "Barangay Health Caravan",
    description: "Free medical check-ups and vaccines this coming weekend at the gym.",
    category: "Health & Wellness",
    published_date: new Date(Date.now() - 86400000).toISOString(),
    status: "Published",
  },
];

const mockAppointments: any[] = [
  {
    id: "apt-1",
    resident_id: "res-1",
    type: "Document Pickup",
    schedule_date: new Date(Date.now() + 86400000).toISOString(),
    status: "Pending",
    resident: { first_name: "Juan", last_name: "Dela Cruz" },
  },
];

const mockNotifications: any[] = [
  {
    id: "n-1",
    user_id: "user-1",
    title: "New Request",
    message: "Juan Dela Cruz requested Barangay Clearance",
    read_status: false,
    created_at: new Date().toISOString(),
  },
];

const mockTransactions: any[] = [
  {
    id: "t-1",
    user_id: "user-1",
    module: "Documents",
    action: "Approved Request",
    description: "Approved Barangay Clearance for Juan Dela Cruz",
    created_at: new Date().toISOString(),
  },
];

const mockAuditLogs: any[] = [
  {
    id: "audit-1",
    action: "LOGIN",
    module: "AUTH",
    created_at: new Date().toISOString(),
    operator: { name: "Admin Officer", email: "admin@barangay.gov" },
  },
];

const mockAddresses: any[] = [
  { id: "addr-1", resident_id: "res-1", house_number: "123", street: "Rizal St", purok: "Purok 1" },
  { id: "addr-2", resident_id: "res-2", house_number: "456", street: "Magsaysay Ave", purok: "Purok 2" },
  { id: "addr-3", resident_id: "res-3", house_number: "789", street: "Bonifacio St", purok: "Purok 1" },
  { id: "addr-4", resident_id: "res-4", house_number: "104", street: "Mabini St", purok: "Purok 4" },
  { id: "addr-5", resident_id: "res-5", house_number: "619", street: "Rizal St", purok: "Purok 3" },
];

const mockChatMessages: any[] = [];

const tables: Record<string, any[]> = {
  residents: mockResidents,
  households: mockHouseholds,
  document_types: mockDocumentTypes,
  document_requests: mockDocumentRequests,
  complaints: mockComplaints,
  businesses: mockBusinesses,
  announcements: mockAnnouncements,
  appointments: mockAppointments,
  notifications: mockNotifications,
  transactions: mockTransactions,
  audit_logs: mockAuditLogs,
  addresses: mockAddresses,
  chat_messages: mockChatMessages,
};

const mockUser = {
  id: "mock-admin-id",
  email: "admin@barangay.gov",
  user_metadata: {
    role: "Super Admin",
    name: "Admin Officer",
  },
  app_metadata: {},
};

const mockSession = {
  access_token: "mock-token",
  token_type: "bearer",
  expires_in: 3600,
  refresh_token: "mock-refresh-token",
  user: mockUser,
};

function checkIsLoggedIn(cookieStore?: any): boolean {
  if (cookieStore && typeof cookieStore.get === "function") {
    const val = cookieStore.get("mock-logged-in");
    if (val && (val === "true" || val.value === "true")) return true;
    // Cookie explicitly not present — user is NOT logged in
    return false;
  }
  if (typeof document !== "undefined") {
    return document.cookie.includes("mock-logged-in=true");
  }
  // Server-side with no cookie store — treat as NOT logged in
  return false;
}

class MockQueryBuilder {
  private tableName: string;
  private filters: Array<(item: any) => boolean> = [];
  private limitVal: number | null = null;
  private isSingle = false;
  private isMaybeSingle = false;
  private isCount = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(columns?: string, options?: { count?: string; head?: boolean }) {
    if (options?.count) {
      this.isCount = true;
    }
    return this;
  }

  insert(data: any) {
    const list = tables[this.tableName] || [];
    const items = Array.isArray(data) ? data : [data];
    const newItems = items.map((item) => ({
      id: item.id || `mock-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: new Date().toISOString(),
      ...item,
    }));
    list.push(...newItems);

    const query = new MockQueryBuilder(this.tableName);
    (query as any).execute = async () => ({
      data: Array.isArray(data) ? newItems : newItems[0],
      error: null,
    });
    return query;
  }

  update(data: any) {
    const list = tables[this.tableName] || [];
    (this as any).execute = async () => {
      const items = list.filter((item) => this.filters.every((f) => f(item)));
      items.forEach((item) => Object.assign(item, data));
      return { data: items, error: null };
    };
    return this;
  }

  delete() {
    const list = tables[this.tableName] || [];
    (this as any).execute = async () => {
      const remaining = list.filter((item) => !this.filters.every((f) => f(item)));
      tables[this.tableName] = remaining;
      return { data: [], error: null };
    };
    return this;
  }

  upsert(data: any) {
    return this.insert(data);
  }

  eq(col: string, val: any) {
    this.filters.push((item) => {
      if (col.includes(".")) return true;
      return item[col] === val;
    });
    return this;
  }

  neq(col: string, val: any) {
    this.filters.push((item) => item[col] !== val);
    return this;
  }

  or(expr: string) {
    this.filters.push((item) => {
      const parts = expr.split(",");
      return parts.some((part) => {
        const [subCol, op, searchVal] = part.split(".");
        if (op === "ilike" && searchVal) {
          const rawSearch = searchVal.replace(/%/g, "").toLowerCase();
          return item[subCol]?.toString().toLowerCase().includes(rawSearch);
        }
        return false;
      });
    });
    return this;
  }

  order() {
    return this;
  }

  limit(val: number) {
    this.limitVal = val;
    return this;
  }

  single() {
    this.isSingle = true;
    return this;
  }

  maybeSingle() {
    this.isMaybeSingle = true;
    return this;
  }

  range() {
    return this;
  }

  async then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    try {
      const res = await (this as any).execute();
      return onfulfilled ? onfulfilled(res) : res;
    } catch (err) {
      if (onrejected) return onrejected(err);
      throw err;
    }
  }

  private async execute() {
    const list = tables[this.tableName] || [];
    let filtered = list.filter((item) => this.filters.every((f) => f(item)));

    if (this.isCount) {
      return { data: null, error: null, count: filtered.length };
    }

    if (this.limitVal !== null) {
      filtered = filtered.slice(0, this.limitVal);
    }

    if (this.isSingle || this.isMaybeSingle) {
      if (filtered.length === 0) {
        if (this.isSingle) {
          return { data: null, error: { message: "Record not found" } };
        }
        return { data: null, error: null };
      }
      return { data: filtered[0], error: null };
    }

    return { data: filtered, error: null };
  }
}

export function getMockSupabaseClient(cookieStore?: any) {
  return {
    auth: {
      async getSession() {
        const loggedIn = checkIsLoggedIn(cookieStore);
        return {
          data: { session: loggedIn ? mockSession : null },
          error: null,
        };
      },
      async getUser() {
        const loggedIn = checkIsLoggedIn(cookieStore);
        return {
          data: { user: loggedIn ? mockUser : null },
          error: null,
        };
      },
      async signInWithPassword({ email }: { email: string }) {
        if (typeof document !== "undefined") {
          document.cookie = "mock-logged-in=true; path=/";
        }
        if (cookieStore && typeof cookieStore.set === "function") {
          cookieStore.set("mock-logged-in", "true", { path: "/" });
        }
        return {
          data: {
            user: { ...mockUser, email },
            session: mockSession,
          },
          error: null,
        };
      },
      async signUp({ email }: { email: string }) {
        if (typeof document !== "undefined") {
          document.cookie = "mock-logged-in=true; path=/";
        }
        return {
          data: {
            user: { ...mockUser, email },
            session: mockSession,
          },
          error: null,
        };
      },
      async exchangeCodeForSession() {
        return { data: { session: mockSession, user: mockUser }, error: null };
      },
      async signOut() {
        if (typeof document !== "undefined") {
          document.cookie = "mock-logged-in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
        }
        if (cookieStore && typeof cookieStore.remove === "function") {
          cookieStore.remove("mock-logged-in", { path: "/" });
        }
        return { error: null };
      },
      onAuthStateChange(callback: any) {
        const loggedIn = checkIsLoggedIn(cookieStore);
        callback("SIGNED_IN", loggedIn ? mockSession : null);
        return {
          data: {
            subscription: {
              unsubscribe: () => {},
            },
          },
        };
      },
    },
    from(tableName: string) {
      return new MockQueryBuilder(tableName);
    },
  };
}
