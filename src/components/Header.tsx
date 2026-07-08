import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Search, Bell, Sun, Moon, Globe, Building2, 
  MapPin, User, Menu, Plus, Wifi, RefreshCw, Calendar as CalendarIcon 
} from 'lucide-react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { cn } from '../lib/utils';
import { format } from 'date-fns';

interface HeaderProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export function Header({ sidebarOpen, setSidebarOpen }: HeaderProps) {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [isDark, setIsDark] = useState(false);
  const [date, setDate] = useState(new Date());
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const userStr = localStorage.getItem('currentUser');
    if (userStr) {
      setCurrentUser(JSON.parse(userStr));
    }

    const handleUserChange = () => {
      const u = localStorage.getItem('currentUser');
      setCurrentUser(u ? JSON.parse(u) : null);
    };

    window.addEventListener('storage', handleUserChange);
    window.addEventListener('user-login-change', handleUserChange);
    return () => {
      window.removeEventListener('storage', handleUserChange);
      window.removeEventListener('user-login-change', handleUserChange);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    window.dispatchEvent(new Event('user-login-change'));
    navigate('/');
  };

  useEffect(() => {
    const timer = setInterval(() => setDate(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery('');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b bg-card px-4 shadow-sm shrink-0 print:hidden transition-colors">
      <div className="flex items-center gap-4 flex-1">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="text-muted-foreground hover:text-foreground"
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <form onSubmit={handleSearch} className="hidden md:flex relative max-w-md w-full items-center">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input 
            type="search" 
            placeholder="Global search (Ctrl+K)..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 bg-muted/50 border-transparent focus:bg-background focus:border-ring transition-all" 
          />
        </form>
      </div>
      
      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
        <div className="hidden lg:flex items-center gap-4 mr-4 text-xs font-medium text-muted-foreground">
          <div className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
            <Building2 className="h-3.5 w-3.5" />
            <span className="max-w-[200px] truncate" title="Al Zahra Al Malakia Building Materials Trading LLC">Al Zahra Al Malakia</span>
          </div>
          <div className="flex items-center gap-1.5 cursor-pointer hover:text-foreground transition-colors">
            <MapPin className="h-3.5 w-3.5" />
            <span>Shj. Br.</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarIcon className="h-3.5 w-3.5" />
            <span>{format(date, 'MMM dd, yyyy')}</span>
          </div>
          <div className="flex items-center gap-1.5 text-green-600 dark:text-green-400">
            <Wifi className="h-3.5 w-3.5" />
            <span>Online</span>
          </div>
          <div className="flex items-center gap-1.5">
            <RefreshCw className="h-3 w-3" />
            <span>Synced</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="hidden sm:inline-flex text-muted-foreground">
            <Globe className="h-4 w-4" />
          </Button>
          
          <Button variant="ghost" size="icon" onClick={toggleTheme} className="text-muted-foreground">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>
          
          <Button variant="ghost" size="icon" className="relative text-muted-foreground">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-destructive border border-card" />
          </Button>
        </div>

        <div className="h-6 w-px bg-border hidden sm:block mx-1" />

        <div className="flex items-center gap-2">
          <Button onClick={() => navigate('/products')} size="sm" className="hidden sm:flex gap-1.5 bg-primary text-primary-foreground">
            <Plus className="h-4 w-4" />
            <span>New Item</span>
          </Button>

          <div className="relative group">
            <Button variant="ghost" className="relative h-9 w-9 rounded-full ml-1 p-0 overflow-hidden border border-border flex items-center justify-center bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer">
              {currentUser?.profilePic ? (
                <img src={currentUser.profilePic} alt={currentUser.name} className="h-full w-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <User className="h-4 w-4" />
              )}
            </Button>
            
            <div className="absolute right-0 top-full mt-2 w-56 bg-card border rounded-lg shadow-xl py-2 opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto transition-all z-50 duration-200">
              <div className="px-4 py-2 border-b">
                <p className="text-sm font-semibold text-foreground truncate">{currentUser?.name || 'Staff User'}</p>
                <p className="text-[10px] text-muted-foreground truncate">{currentUser?.email || 'sales@alzahrabm.com'}</p>
                <Badge variant="outline" className="mt-1 text-[9px] uppercase tracking-wider font-bold bg-primary/10 text-primary border-primary/20">
                  {currentUser?.role || 'Guest'}
                </Badge>
              </div>
              <div className="px-4 py-2 text-[11px] text-muted-foreground space-y-1">
                <p><strong>Branch:</strong> {currentUser?.branch || 'Sharjah Branch'}</p>
                <p><strong>Dept:</strong> {currentUser?.department || 'Sales'}</p>
              </div>
              <div className="border-t mt-2 pt-2 px-2">
                <Button 
                  onClick={handleLogout} 
                  variant="destructive" 
                  size="sm" 
                  className="w-full h-8 text-xs font-bold bg-red-600 hover:bg-red-500 text-white"
                >
                  Secure Logout
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
