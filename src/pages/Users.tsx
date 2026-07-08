import React, { useState } from 'react';
import { 
  Users as UsersIcon, Plus, Search, MoreHorizontal,
  Shield, Key, Lock, CheckCircle2
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from '../components/ui/table';
import { Badge } from '../components/ui/badge';

const MOCK_USERS = [
  { id: 'USR-001', name: 'Admin User', email: 'admin@alzahra.com', role: 'Administrator', status: 'active', lastLogin: '2 mins ago' },
  { id: 'USR-002', name: 'Sales Manager', email: 'sales@alzahra.com', role: 'Sales Manager', status: 'active', lastLogin: '1 hour ago' },
  { id: 'USR-003', name: 'Cashier 1', email: 'pos1@alzahra.com', role: 'Cashier', status: 'active', lastLogin: '3 hours ago' },
  { id: 'USR-004', name: 'Warehouse Staff', email: 'stock@alzahra.com', role: 'Inventory Clerk', status: 'active', lastLogin: '1 day ago' },
  { id: 'USR-005', name: 'Temp Staff', email: 'temp@alzahra.com', role: 'Cashier', status: 'inactive', lastLogin: '2 months ago' },
];

export default function Users() {
  const [searchTerm, setSearchTerm] = useState('');

  return (
    <div className="flex flex-col h-full bg-background relative">
      <div className="flex flex-wrap gap-4 items-center justify-between shrink-0 p-6 border-b bg-card">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight">Users & Roles</h1>
          <p className="text-sm text-muted-foreground">Manage system access, roles, and permissions.</p>
        </div>
        
        <div className="flex gap-3 items-center">
          <Button className="flex items-center gap-2">
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
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_USERS.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium text-primary">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                          {user.name.substring(0, 2).toUpperCase()}
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
                    <TableCell className="text-sm text-muted-foreground">{user.lastLogin}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </div>
  );
}
