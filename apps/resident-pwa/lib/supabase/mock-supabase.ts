// Local Mock Supabase Client for Resident PWA Development

const mockResidentUser = {
  id: "mock-resident-id",
  email: "resident@barangay.gov",
  user_metadata: {
    name: "Juan Dela Cruz",
    role: "Resident",
  },
  app_metadata: {},
};

const mockSession = {
  access_token: "mock-token-pwa",
  token_type: "bearer",
  expires_in: 3600,
  refresh_token: "mock-refresh-token",
  user: mockResidentUser,
};

const mockDocumentTypes: any[] = [
  { id: "dt-1", name: "Barangay Clearance", description: "Official clearance for employment, ID, or travel." },
  { id: "dt-2", name: "Certificate of Residency", description: "Proof of residency for official transactions." },
  { id: "dt-3", name: "Certificate of Indigency", description: "Assistance certificate for medical/financial aid." },
  { id: "dt-4", name: "Business Clearance", description: "Barangay permit for commercial operation." },
];

const mockDocumentRequests: any[] = [
  {
    id: "req-1",
    resident_id: "mock-resident-id",
    document_type_id: "dt-1",
    status: "Pending",
    remarks: "For Employment Application",
    requested_date: new Date().toISOString(),
    document_type: { name: "Barangay Clearance" },
  },
  {
    id: "req-2",
    resident_id: "mock-resident-id",
    document_type_id: "dt-2",
    status: "Approved",
    remarks: "Bank Requirement",
    requested_date: new Date(Date.now() - 86400000).toISOString(),
    document_type: { name: "Certificate of Residency" },
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

const mockChatMessages: any[] = [];
const mockResidents: any[] = [];

const tables: Record<string, any[]> = {
  document_types: mockDocumentTypes,
  document_requests: mockDocumentRequests,
  announcements: mockAnnouncements,
  chat_messages: mockChatMessages,
  residents: mockResidents,
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

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select() {
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

  eq(col: string, val: any) {
    this.filters.push((item) => item[col] === val);
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
          data: { user: loggedIn ? mockResidentUser : null },
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
            user: { ...mockResidentUser, email },
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
            user: { ...mockResidentUser, email },
            session: mockSession,
          },
          error: null,
        };
      },
      async exchangeCodeForSession() {
        return { data: { session: mockSession, user: mockResidentUser }, error: null };
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
