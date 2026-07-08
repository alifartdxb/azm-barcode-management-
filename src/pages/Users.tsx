import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { 
  Users as UsersIcon, Plus, Search, MoreHorizontal,
  Shield, Key, Lock, CheckCircle2, X
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';

export default function Users() {
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'Cashier', status: 'active' });

  const users = useLiveQuery(() => db.users.toArray(), []) || [];

  useEffect(() => {
    // Add default admin if empty
    db.users.count().then(count => {
      if (count === 0) {
        db.users.add({ name: 'Admin User', email: 'admin@alzahra.com', role: 'Administrator', status: 'active', lastLogin: 'Just now' });
      }
    });
  }, []);

  const filtered = users.filter(u => 
    u.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (u.email && u.email.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    await db.users.add({
      ...form,
      lastLogin: 'Never'
    });
    setIsModalOpen(false);
    setForm({ name: '', email: '', role: 'Cashier', status: 'active' });
  };

  const handleDelete = async (id?: number) => {
    if (id && confirm('Delete this user?')) {
      await db.users.delete(id);
    }
  };

  return (
    <div className="flex flex-col h-full bg-background relative">
      <div className="flex flex-wrap gap-4 items-center justify-between shrink-0 p-6 border-b bg-card">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Users & Roles</h1>
          <p className="text-sm text-muted-foreground">Manage system access, roles, and permissions.</p>
        </div>
        
        <div className="flex gap-3 items-center">
          <Button onClick={() => setIsModalOpen(true)} className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add User
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-6">
        <Card className="h-full flex flex-col">
          <div className="px-6 py-4 border-b flex justify-between items-center bg-card gap-4">
            <div className="relative max-w-md w-full">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input 
                type="search"
                placeholder="Search users..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9 bg-background w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Manage Roles
              </Button>
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User Name</TableHead>
                  <TableHead>Email Address</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last Login</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-primary">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs uppercase">
                          {user.name.substring(0, 2)}
                        </div>
                        {user.name}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.email}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-medium bg-background text-xs">{user.role}</Badge>
                    </TableCell>
                    <TableCell>
                      {user.status === 'active' ? (
                        <Badge variant="success" className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400 gap-1"><CheckCircle2 className="w-3 h-3" /> Active</Badge>
                      ) : (
                        <Badge variant="secondary" className="text-muted-foreground gap-1"><Lock className="w-3 h-3" /> Inactive</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{user.lastLogin || 'Never'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-600" onClick={() => handleDelete(user.id)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {isModalOpen && (
        <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <Card className="w-full max-w-md shadow-2xl">
             <div className="px-6 py-4 border-b flex justify-between items-center">
               <h3 className="font-bold text-lg">Add User</h3>
               <Button variant="ghost" size="icon" onClick={() => setIsModalOpen(false)} className="h-8 w-8">
                 <X className="w-4 h-4" />
               </Button>
             </div>
             <CardContent className="p-6">
               <form onSubmit={handleSave} className="flex flex-col gap-4">
                 <div className="space-y-2">
                   <label className="text-sm font-medium">Full Name</label>
                   <Input required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="User Name" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-medium">Email</label>
                   <Input required type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="Email" />
                 </div>
                 <div className="space-y-2">
                   <label className="text-sm font-medium">Role</label>
                   <select 
                     required 
                     value={form.role} 
                     onChange={e => setForm({...form, role: e.target.value})}
                     className="w-full flex h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                   >
                     <option value="Administrator">Administrator</option>
                     <option value="Sales Manager">Sales Manager</option>
                     <option value="Cashier">Cashier</option>
                     <option value="Inventory Clerk">Inventory Clerk</option>
                   </select>
                 </div>
                 <div className="flex gap-3 pt-4 border-t mt-2">
                   <Button type="button" variant="outline" className="flex-1" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                   <Button type="submit" className="flex-1">Add User</Button>
                 </div>
               </form>
             </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
