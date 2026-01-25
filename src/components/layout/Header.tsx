import { Activity, LogOut, User, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onNavigate?: (page: string) => void;
  currentPage?: string;
}

const Header = ({ onNavigate, currentPage }: HeaderProps) => {
  const { user, signOut } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-16 items-center justify-between">
        {/* Logo */}
        <div
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => onNavigate?.('dashboard')}
        >
          <div className="relative">
            <Activity className="w-8 h-8 text-primary" />
            <div className="absolute inset-0 w-8 h-8 animate-pulse-ring bg-primary/20 rounded-full" />
          </div>
          <div>
            <h1 className="font-display font-bold text-xl tracking-wider text-glow-primary text-primary">
              CARDIO<span className="text-accent">VISION</span>
            </h1>
            <p className="text-[10px] text-muted-foreground uppercase tracking-widest -mt-1">
              ECG Monitoring System
            </p>
          </div>
        </div>

        {/* Navigation */}
        <nav className="hidden md:flex items-center gap-1">
          {[
            { id: 'dashboard', label: 'Dashboard' },
            { id: 'monitor', label: 'Live Monitor' },
            { id: 'history', label: 'History' },
            { id: 'reports', label: 'Reports' },
          ].map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              size="sm"
              className={cn(
                'text-sm font-mono uppercase tracking-wider transition-all duration-300',
                currentPage === item.id
                  ? 'text-primary bg-primary/10'
                  : 'text-muted-foreground hover:text-primary hover:bg-primary/5'
              )}
              onClick={() => onNavigate?.(item.id)}
            >
              {item.label}
            </Button>
          ))}
        </nav>

        {/* User menu */}
        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="relative rounded-full border border-primary/30 bg-primary/5 hover:bg-primary/10"
                >
                  <User className="w-4 h-4 text-primary" />
                  <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-risk-low rounded-full animate-pulse" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">{user.email}</p>
                  <p className="text-xs text-muted-foreground">Active Session</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onNavigate?.('profile')}>
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onNavigate?.('settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={signOut} className="text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="border-primary/30 text-primary hover:bg-primary/10"
              onClick={() => onNavigate?.('auth')}
            >
              Sign In
            </Button>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
