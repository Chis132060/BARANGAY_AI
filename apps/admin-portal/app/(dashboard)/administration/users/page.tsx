export default function UsersAdministrationPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between border-b pb-5">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Users</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage admin roles and system operators.</p>
        </div>
      </div>
      <div className="border border-dashed rounded-xl p-12 text-center bg-card shadow-sm">
        <p className="text-muted-foreground font-medium">RBAC User management table ready.</p>
      </div>
    </div>
  );
}
