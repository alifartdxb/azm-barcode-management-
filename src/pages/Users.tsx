import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { logActivity } from '../utils/logger';
import { 
  Users as UsersIcon, Plus, Search, MoreHorizontal,
  Shield, Key, Lock, CheckCircle2, X, Edit2, ShieldCheck, 
  UserCheck, AlertTriangle, Trash2, Building, Layers, Eye, EyeOff
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';

// Available departments and branches
const DEPARTMENTS = ['IT & Administration', 'Sales', 'POS Billing', 'Warehouse', 'Purchasing', 'Accounting', 'Marketing'];
const BRANCHES = ['Sharjah Branch (HQ)', 'Sajaa Warehouse 1', 'Dubai Branch'];

// Predefined ERP roles
const SYSTEM_ROLES = [
  'Super Administrator',
  'Administrator',
  'Sales Manager',
  'Sales Executive',
  'Warehouse Manager',
  'Warehouse Staff',
  'Purchase Manager',
  'Purchase Staff',
  'Cashier',
  'Accountant',
  'Marketing',
  'Viewer'
];

// Initial permissions state for role matrix
const DEFAULT_PERMISSIONS: Record<string, Record<string, boolean>> = {
  'Super Administrator': { 'Inventory': true, 'POS': true, 'CRM': true, 'Purchasing': true, 'Users': true, 'Reports': true },
  'Administrator': { 'Inventory': true, 'POS': true, 'CRM': true, 'Purchasing': true, 'Users': true, 'Reports': true },
  'Sales Manager': { 'Inventory': true, 'POS': true, 'CRM': true, 'Purchasing': false, 'Users': false, 'Reports': true },
  'Sales Executive': { 'Inventory': true, 'POS': true, 'CRM': true, 'Purchasing': false, 'Users': false, 'Reports': false },
  'Warehouse Manager': { 'Inventory': true, 'POS': false, 'CRM': false, 'Purchasing': true, 'Users': false, 'Reports': true },
  'Warehouse Staff': { 'Inventory': true, 'POS': false, 'CRM': false, 'Purchasing': false, 'Users': false, 'Reports': false },
  'Purchase Manager': { 'Inventory': true, 'POS': false, 'CRM': false, 'Purchasing': true, 'Users': false, 'Reports': true },
  'Purchase Staff': { 'Inventory': false, 'POS': false, 'CRM': false, 'Purchasing': true, 'Users': false, 'Reports': false },
  'Cashier': { 'Inventory': false, 'POS': true, 'CRM': false, 'Purchasing': false, 'Users': false, 'Reports': false },
  'Accountant': { 'Inventory': false, 'POS': false, 'CRM': false, 'Purchasing': false, 'Users': false, 'Reports': true },
  'Marketing': { 'Inventory': false, 'POS': false, 'CRM': true, 'Purchasing': false, 'Users': false, 'Reports': false },
  'Viewer': { 'Inventory': true, 'POS': false, 'CRM': false, 'Purchasing': false, 'Users': false, 'Reports': true }
};

export default function Users() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState('all');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState('all');
  
  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isMatrixOpen, setIsMatrixOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);

  // Form inputs state
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('Sales Executive');
  const [department, setDepartment] = useState('Sales');
  const [branch, setBranch] = useState('Sharjah Branch (HQ)');
  const [status, setStatus] = useState('active');
  const [profilePic, setProfilePic] = useState('https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&h=100&fit=crop&crop=faces');

  // Interactive matrix permissions state
  const [matrixPermissions, setMatrixPermissions] = useState<Record<string, Record<string, boolean>>>(() => {
    const saved = localStorage.getItem('erp_role_permissions');
    return saved ? JSON.parse(saved) : DEFAULT_PERMISSIONS;
  });

  const [formError, setFormError] = useState('');
  const [showFormPassword, setShowFormPassword] = useState(false);

  const users = useLiveQuery(() => db.users.toArray(), []) || [];

  // Sync permissions to localStorage
  useEffect(() => {
    localStorage.setItem('erp_role_permissions', JSON.stringify(matrixPermissions));
  }, [matrixPermissions]);

  // Open modal for Adding a new user
  const handleOpenAdd = () => {
    setEditingUser(null);
    setFullName('');
    setUsername('');
    setEmail('');
    setPhone('');
    setPassword('');
    setConfirmPassword('');
    setRole('Sales Executive');
    setDepartment('Sales');
    setBranch('Sharjah Branch (HQ)');
    setStatus('active');
    setProfilePic('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces');
    setFormError('');
    setIsFormOpen(true);
  };

  // Open modal for Editing an existing user
  const handleOpenEdit = (user: any) => {
    setEditingUser(user);
    setFullName(user.name);
    setUsername(user.username);
    setEmail(user.email);
    setPhone(user.phone || '');
    setPassword(user.password || '');
    setConfirmPassword(user.password || '');
    setRole(user.role);
    setDepartment(user.department || 'Sales');
    setBranch(user.branch || 'Sharjah Branch (HQ)');
    setStatus(user.status);
    setProfilePic(user.profilePic || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces');
    setFormError('');
    setIsFormOpen(true);
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!fullName.trim() || !username.trim() || !email.trim() || !phone.trim() || !password) {
      setFormError('Mandatory fields must be completed.');
      return;
    }

    if (password !== confirmPassword) {
      setFormError('Passwords do not match.');
      return;
    }

    // Weak password check
    const hasNumOrSpec = /[0-9!@#$%^&*(),.?":{}|<>]/;
    if (password.length < 5 || !hasNumOrSpec.test(password)) {
      setFormError('Weak Password: Minimum 5 characters, containing at least one number or special character.');
      return;
    }

    // Phone Validation
    const cleanPhone = phone.replace(/[^0-9+]/g, '');
    if (cleanPhone.length < 7) {
      setFormError('Invalid Phone Number: Please enter a valid telephone contact.');
      return;
    }

    try {
      // Duplication Checks
      const dupeUser = await db.users.where('username').equals(username.trim().toLowerCase()).first();
      if (dupeUser && (!editingUser || dupeUser.id !== editingUser.id)) {
        setFormError(`Username "${username.trim()}" already exists.`);
        return;
      }

      const dupeEmail = await db.users.where('email').equals(email.trim().toLowerCase()).first();
      if (dupeEmail && (!editingUser || dupeEmail.id !== editingUser.id)) {
        setFormError(`Email address "${email.trim()}" is already registered.`);
        return;
      }

      const userData = {
        name: fullName.trim(),
        username: username.trim().toLowerCase(),
        email: email.trim().toLowerCase(),
        phone: cleanPhone,
        password: password,
        role: role,
        department: department,
        branch: branch,
        status: status,
        profilePic: profilePic,
        lastLogin: editingUser ? editingUser.lastLogin : 'Never'
      };

      const adminUserStr = localStorage.getItem('currentUser');
      const adminUsername = adminUserStr ? JSON.parse(adminUserStr).username : 'Admin';

      if (editingUser) {
        // Edit flow
        await db.users.update(editingUser.id, userData);
        await logActivity(adminUsername, `Modified user profile for: ${userData.username}`, 'User Management', 'info');
      } else {
        // Add flow
        await db.users.add(userData);
        await logActivity(adminUsername, `Created new staff account for: ${userData.username}`, 'User Management', 'info');
      }

      setIsFormOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'An error occurred while saving user.');
    }
  };

  const handleDeleteUser = async (user: any) => {
    const adminUserStr = localStorage.getItem('currentUser');
    const adminUsername = adminUserStr ? JSON.parse(adminUserStr).username : 'Admin';

    if (user.username === 'admin') {
      alert('The root "admin" account is protected and cannot be deleted.');
      return;
    }

    if (user.username === adminUsername) {
      alert('You cannot delete your own active session account.');
      return;
    }

    if (confirm(`Are you sure you want to permanently delete user account: ${user.name}?`)) {
      await db.users.delete(user.id);
      await logActivity(adminUsername, `Permanently deleted user account: ${user.username}`, 'User Management', 'critical');
    }
  };

  const toggleUserStatus = async (user: any) => {
    const adminUserStr = localStorage.getItem('currentUser');
    const adminUsername = adminUserStr ? JSON.parse(adminUserStr).username : 'Admin';

    if (user.username === 'admin') {
      alert('The root "admin" account status cannot be changed.');
      return;
    }

    const nextStatus = user.status === 'active' ? 'inactive' : 'active';
    await db.users.update(user.id, { status: nextStatus });
    await logActivity(adminUsername, `Set account status for ${user.username} to ${nextStatus.toUpperCase()}`, 'User Management', 'warning');
  };

  // Filter criteria
  const filteredUsers = users.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = selectedRoleFilter === 'all' || u.role === selectedRoleFilter;
    const matchesBranch = selectedBranchFilter === 'all' || u.branch === selectedBranchFilter;
    return matchesSearch && matchesRole && matchesBranch;
  });

  // Toggle single cell in permission matrix
  const handleToggleMatrix = (roleName: string, moduleName: string) => {
    setMatrixPermissions(prev => ({
      ...prev,
      [roleName]: {
        ...prev[roleName],
        [moduleName]: !prev[roleName]?.[moduleName]
      }
    }));
  };

  return (
    <div className="flex flex-col h-full bg-background relative">
      
      {/* Header Bar */}
      <div className="flex flex-wrap gap-4 items-center justify-between shrink-0 p-6 border-b bg-card">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Staff & Security Management</h1>
          <p className="text-sm text-muted-foreground">Manage corporate users, configure branches, and define system role permissions.</p>
        </div>
        
        <div className="flex gap-3 items-center">
          <Button variant="outline" onClick={() => setIsMatrixOpen(true)} className="flex items-center gap-2 border-primary/20 text-primary hover:bg-primary/5">
            <Shield className="w-4 h-4" />
            Role Permission Matrix
          </Button>
          <Button onClick={handleOpenAdd} className="flex items-center gap-2 bg-primary text-primary-foreground">
            <Plus className="w-4 h-4" />
            Add New Staff Account
          </Button>
        </div>
      </div>

      {/* Grid Filter Bar */}
      <div className="p-6 pb-0 grid grid-cols-1 sm:grid-cols-3 gap-4 shrink-0">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input 
            type="search"
            placeholder="Search by name, username or email..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 bg-card w-full"
          />
        </div>

        <div>
          <select 
            value={selectedRoleFilter}
            onChange={e => setSelectedRoleFilter(e.target.value)}
            className="w-full flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Roles</option>
            {SYSTEM_ROLES.map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div>
          <select 
            value={selectedBranchFilter}
            onChange={e => setSelectedBranchFilter(e.target.value)}
            className="w-full flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="all">All Branches</option>
            {BRANCHES.map(b => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Table Content */}
      <div className="flex-1 overflow-auto p-6">
        <Card className="h-full flex flex-col">
          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Member</TableHead>
                  <TableHead>Contact Details</TableHead>
                  <TableHead>Role & Department</TableHead>
                  <TableHead>Branch Location</TableHead>
                  <TableHead className="text-center">Account Status</TableHead>
                  <TableHead>Last Logged In</TableHead>
                  <TableHead className="w-[120px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => (
                    <TableRow key={user.id} className="hover:bg-muted/30">
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-3">
                          <img 
                            src={user.profilePic || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=100&h=100&fit=crop&crop=faces'} 
                            alt={user.name} 
                            className="h-10 w-10 rounded-full border object-cover shrink-0" 
                            referrerPolicy="no-referrer"
                          />
                          <div className="flex flex-col">
                            <span className="text-sm font-semibold text-foreground leading-snug">{user.name}</span>
                            <span className="text-xs text-muted-foreground font-mono">@{user.username}</span>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs space-y-0.5">
                          <span className="font-medium text-foreground">{user.email}</span>
                          <span className="text-muted-foreground font-mono">{user.phone || 'No phone'}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col items-start gap-1">
                          <Badge variant="outline" className="text-[10px] uppercase font-bold tracking-wider bg-primary/5 text-primary border-primary/20">
                            {user.role}
                          </Badge>
                          <span className="text-[11px] text-muted-foreground">{user.department}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{user.branch || 'Sharjah Branch'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <button 
                          onClick={() => toggleUserStatus(user)}
                          className="focus:outline-none focus:ring-0 active:scale-95 transition-transform"
                          title="Click to toggle status"
                        >
                          {user.status === 'active' ? (
                            <Badge variant="success" className="bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300 gap-1 hover:bg-green-100 cursor-pointer">
                              <CheckCircle2 className="w-3 h-3" /> Active
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 gap-1 hover:bg-red-100 cursor-pointer">
                              <Lock className="w-3 h-3" /> Inactive
                            </Badge>
                          )}
                        </button>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground font-mono">
                        {user.lastLogin || 'Never'}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-primary hover:bg-primary/10"
                            onClick={() => handleOpenEdit(user)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-600 hover:bg-red-50 hover:text-red-700"
                            onClick={() => handleDeleteUser(user)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No matching staff members found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* MODAL: STAFF ADD / EDIT FORM */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-xl shadow-2xl bg-card border border-border/80 text-foreground animate-in zoom-in-95 duration-200">
            <CardHeader className="border-b px-6 py-4 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-bold">{editingUser ? 'Modify Staff Profile' : 'Add New Staff Member'}</CardTitle>
                <CardDescription className="text-xs mt-0.5">Please provide exact organizational credentials.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsFormOpen(false)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6">
              <form onSubmit={handleSaveUser} className="space-y-4">
                
                {formError && (
                  <div className="p-3 bg-red-100 dark:bg-red-950/40 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Full Name *</label>
                    <Input 
                      required 
                      value={fullName} 
                      onChange={e => setFullName(e.target.value)} 
                      placeholder="e.g. Ibrahim Al-Zahra" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Username *</label>
                    <Input 
                      required 
                      disabled={!!editingUser}
                      value={username} 
                      onChange={e => setUsername(e.target.value)} 
                      placeholder="e.g. ibrahim" 
                      className="font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Email Address *</label>
                    <Input 
                      required 
                      type="email" 
                      value={email} 
                      onChange={e => setEmail(e.target.value)} 
                      placeholder="ibrahim@alzahrabm.com" 
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Mobile Number *</label>
                    <Input 
                      required 
                      value={phone} 
                      onChange={e => setPhone(e.target.value)} 
                      placeholder="+971 52 684 3809" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Password *</label>
                    <div className="relative">
                      <Input 
                        required 
                        type={showFormPassword ? 'text' : 'password'} 
                        value={password} 
                        onChange={e => setPassword(e.target.value)} 
                        placeholder="••••••••" 
                      />
                      <button
                        type="button"
                        onClick={() => setShowFormPassword(!showFormPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300"
                      >
                        {showFormPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Confirm Password *</label>
                    <Input 
                      required 
                      type="password" 
                      value={confirmPassword} 
                      onChange={e => setConfirmPassword(e.target.value)} 
                      placeholder="••••••••" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Department</label>
                    <select 
                      value={department} 
                      onChange={e => setDepartment(e.target.value)}
                      className="w-full flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm"
                    >
                      {DEPARTMENTS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Role</label>
                    <select 
                      value={role} 
                      onChange={e => setRole(e.target.value)}
                      className="w-full flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm"
                    >
                      {SYSTEM_ROLES.map(r => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Branch</label>
                    <select 
                      value={branch} 
                      onChange={e => setBranch(e.target.value)}
                      className="w-full flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm"
                    >
                      {BRANCHES.map(b => (
                        <option key={b} value={b}>{b}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Status</label>
                    <select 
                      value={status} 
                      onChange={e => setStatus(e.target.value)}
                      className="w-full flex h-10 rounded-md border border-input bg-card px-3 py-2 text-sm"
                    >
                      <option value="active">Active (Access Allowed)</option>
                      <option value="inactive">Inactive (Access Suspended)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avatar Url</label>
                    <Input 
                      value={profilePic} 
                      onChange={e => setProfilePic(e.target.value)} 
                      placeholder="Image address" 
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-5 border-t mt-4">
                  <Button type="button" variant="outline" className="flex-1" onClick={() => setIsFormOpen(false)}>Cancel</Button>
                  <Button type="submit" className="flex-1 bg-primary text-primary-foreground">
                    {editingUser ? 'Save Updates' : 'Create Staff User'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}

      {/* MODAL: ROLE PERMISSION MATRIX */}
      {isMatrixOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-4xl shadow-2xl bg-card border text-foreground animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <CardHeader className="border-b px-6 py-4 flex flex-row items-center justify-between shrink-0">
              <div>
                <CardTitle className="text-lg font-bold flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-cyan-600" />
                  Role-Based System Permission Matrix
                </CardTitle>
                <CardDescription className="text-xs mt-0.5">Define which functional modules are authorized for each system role.</CardDescription>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsMatrixOpen(false)} className="h-8 w-8 text-muted-foreground hover:text-foreground">
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent className="p-6 overflow-auto flex-1">
              <div className="border rounded-lg overflow-hidden bg-background">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[200px] font-bold text-foreground">ERP Role</TableHead>
                      <TableHead className="text-center font-bold text-foreground">Inventory</TableHead>
                      <TableHead className="text-center font-bold text-foreground">POS Billing</TableHead>
                      <TableHead className="text-center font-bold text-foreground">CRM / Marketing</TableHead>
                      <TableHead className="text-center font-bold text-foreground">Purchasing</TableHead>
                      <TableHead className="text-center font-bold text-foreground">User Management</TableHead>
                      <TableHead className="text-center font-bold text-foreground">Reports & Audit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {SYSTEM_ROLES.map((roleName) => (
                      <TableRow key={roleName} className="hover:bg-muted/30">
                        <TableCell className="font-semibold text-sm">{roleName}</TableCell>
                        
                        {/* Inventory */}
                        <TableCell className="text-center">
                          <input 
                            type="checkbox" 
                            disabled={roleName === 'Super Administrator'}
                            checked={!!matrixPermissions[roleName]?.['Inventory']}
                            onChange={() => handleToggleMatrix(roleName, 'Inventory')}
                            className="rounded border-slate-300 bg-card text-cyan-600 focus:ring-0 cursor-pointer disabled:opacity-50"
                          />
                        </TableCell>

                        {/* POS Billing */}
                        <TableCell className="text-center">
                          <input 
                            type="checkbox" 
                            disabled={roleName === 'Super Administrator'}
                            checked={!!matrixPermissions[roleName]?.['POS']}
                            onChange={() => handleToggleMatrix(roleName, 'POS')}
                            className="rounded border-slate-300 bg-card text-cyan-600 focus:ring-0 cursor-pointer disabled:opacity-50"
                          />
                        </TableCell>

                        {/* CRM / Marketing */}
                        <TableCell className="text-center">
                          <input 
                            type="checkbox" 
                            disabled={roleName === 'Super Administrator'}
                            checked={!!matrixPermissions[roleName]?.['CRM']}
                            onChange={() => handleToggleMatrix(roleName, 'CRM')}
                            className="rounded border-slate-300 bg-card text-cyan-600 focus:ring-0 cursor-pointer disabled:opacity-50"
                          />
                        </TableCell>

                        {/* Purchasing */}
                        <TableCell className="text-center">
                          <input 
                            type="checkbox" 
                            disabled={roleName === 'Super Administrator'}
                            checked={!!matrixPermissions[roleName]?.['Purchasing']}
                            onChange={() => handleToggleMatrix(roleName, 'Purchasing')}
                            className="rounded border-slate-300 bg-card text-cyan-600 focus:ring-0 cursor-pointer disabled:opacity-50"
                          />
                        </TableCell>

                        {/* User Management */}
                        <TableCell className="text-center">
                          <input 
                            type="checkbox" 
                            disabled={roleName === 'Super Administrator'}
                            checked={!!matrixPermissions[roleName]?.['Users']}
                            onChange={() => handleToggleMatrix(roleName, 'Users')}
                            className="rounded border-slate-300 bg-card text-cyan-600 focus:ring-0 cursor-pointer disabled:opacity-50"
                          />
                        </TableCell>

                        {/* Reports & Audit */}
                        <TableCell className="text-center">
                          <input 
                            type="checkbox" 
                            disabled={roleName === 'Super Administrator'}
                            checked={!!matrixPermissions[roleName]?.['Reports']}
                            onChange={() => handleToggleMatrix(roleName, 'Reports')}
                            className="rounded border-slate-300 bg-card text-cyan-600 focus:ring-0 cursor-pointer disabled:opacity-50"
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              <div className="mt-4 p-3 bg-cyan-950/20 border border-cyan-800/30 rounded-lg text-xs text-muted-foreground flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-cyan-500 shrink-0 mt-0.5" />
                <span>Note: Permission updates are stored in client-side secure store and evaluated during route or module load. Super Administrator has hardcoded bypass permission for all components.</span>
              </div>
            </CardContent>
            <div className="p-4 border-t bg-muted/20 shrink-0 flex justify-end">
              <Button onClick={() => setIsMatrixOpen(false)} className="bg-primary text-primary-foreground font-semibold px-6">
                Save & Apply Permissions
              </Button>
            </div>
          </Card>
        </div>
      )}

    </div>
  );
}
