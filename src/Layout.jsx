import { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { createPageUrl } from './utils';
import { useAuth } from '@/lib/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { 
  Home, 
  ScanLine, 
  ShoppingCart, 
  BarChart3, 
  User,
  Menu,
  X,
  Zap
} from 'lucide-react';
import { cn } from '@/lib/utils';

// Mock data storage for local-only functionality
const getLocalData = (key) => JSON.parse(localStorage.getItem(key) || '[]');

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { user: currentUser, isAuthenticated } = useAuth();

  // Redirect to username setup if user doesn't have username
  useEffect(() => {
    if (isAuthenticated && currentUser && !currentUser.username && currentPageName !== 'UsernameSetup') {
      navigate(createPageUrl('UsernameSetup'));
    }
  }, [currentUser, isAuthenticated, currentPageName, navigate]);

  const { data: priceEntries = [] } = useQuery({
    queryKey: ['monthly-spending'],
    queryFn: async () => {
      const allPrices = getLocalData('price_entries');
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const startStr = startOfMonth.toISOString().split('T')[0];
      
      return allPrices.filter(p => (p.date_recorded || p.created_date) >= startStr);
    }
  });

  const monthlyTotal = priceEntries.reduce((sum, entry) => 
    sum + (entry.price * (entry.quantity || 1)), 0
  );

  const navItems = [
    { name: 'Home', page: 'Home', icon: Home },
    { name: 'Scan', page: 'Scanner', icon: ScanLine },
    { name: 'Lists', page: 'ShoppingLists', icon: ShoppingCart },
    { name: 'Compare', page: 'PriceComparison', icon: BarChart3 },
    { name: 'Profile', page: 'Profile', icon: User },
  ];

  // Don't render layout for Login, UsernameSetup, or Scanner page
  if (currentPageName === 'Login' || currentPageName === 'UsernameSetup' || currentPageName === 'Scanner') {
    return children;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top Header with Monthly Total */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-slate-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <ScanLine className="w-5 h-5 text-white" />
            </div>
            <span className="font-semibold text-slate-800 tracking-tight">PricePilot</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full">
              <span className="text-xs text-slate-500">This month</span>
              <span className="font-semibold text-emerald-600">${monthlyTotal.toFixed(2)}</span>
            </div>
            {!isAuthenticated && (
              <Link 
                to={createPageUrl('Login')}
                className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
              >
                <User className="w-5 h-5" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="pt-16 pb-24 min-h-screen">
        <div className="max-w-lg mx-auto">
          {children}
        </div>
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-xl border-t border-slate-100 pb-safe">
        <div className="max-w-lg mx-auto px-2">
          <div className="flex items-center justify-around py-2">
            {navItems.map((item) => {
              const isActive = currentPageName === item.page;
              const Icon = item.icon;
              return (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={cn(
                    "flex flex-col items-center gap-1 px-4 py-2 rounded-2xl transition-all duration-300",
                    isActive 
                      ? "bg-emerald-50 text-emerald-600" 
                      : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  <Icon className={cn("w-5 h-5", isActive && "scale-110")} strokeWidth={isActive ? 2.5 : 2} />
                  <span className={cn(
                    "text-[10px] font-medium",
                    isActive && "text-emerald-700"
                  )}>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </div>
  );
}
