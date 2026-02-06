import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  User,
  LogOut,
  Package,
  Receipt,
  ShoppingCart,
  Store,
  TrendingDown,
  Calendar,
  Edit2,
  Loader2,
  BarChart3
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { format } from 'date-fns';

export default function Profile() {
  const queryClient = useQueryClient();
  const { user, logout, isLoadingAuth } = useAuth();
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');

  const userLoading = isLoadingAuth;

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: priceEntries = [] } = useQuery({
    queryKey: ['all-prices'],
    queryFn: () => base44.entities.PriceEntry.list()
  });

  const { data: lists = [] } = useQuery({
    queryKey: ['shopping-lists'],
    queryFn: () => base44.entities.ShoppingList.list()
  });

  const updateUserMutation = useMutation({
    mutationFn: (data) => base44.auth.updateMe(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['user']);
      setShowEdit(false);
      toast.success('Profile updated');
    }
  });

  const handleLogout = () => {
    logout();
  };

  const handleSaveProfile = () => {
    updateUserMutation.mutate({ full_name: editName });
  };

  const openEditDialog = () => {
    setEditName(user?.full_name || '');
    setShowEdit(true);
  };

  // Calculate stats
  const totalProducts = products.length;
  const totalPriceEntries = priceEntries.length;
  const totalLists = lists.length;
  const uniqueStores = new Set(priceEntries.map(p => p.store_name)).size;

  // Calculate monthly spending
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);
  const monthlyEntries = priceEntries.filter(p => {
    const date = new Date(p.date_recorded || p.created_date);
    return date >= startOfMonth;
  });
  const monthlySpending = monthlyEntries.reduce((sum, p) => sum + (p.price * (p.quantity || 1)), 0);

  // Calculate total savings (difference between highest and lowest prices)
  const totalSavings = products.reduce((savings, product) => {
    const productPrices = priceEntries.filter(p => String(p.product_id) === String(product.id));
    if (productPrices.length < 2) return savings;
    const prices = productPrices.map(p => p.price);
    return savings + (Math.max(...prices) - Math.min(...prices));
  }, 0);

  if (userLoading) {
    return (
      <div className="px-4 py-6 space-y-6">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Profile Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center overflow-hidden">
            {user?.picture ? (
              <img src={user.picture} alt={user.full_name} className="w-full h-full object-cover" />
            ) : (
              <User className="w-8 h-8 text-white" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-800">
              {user?.username ? `@${user.username}` : (user?.full_name || 'Guest User')}
            </h2>
            {user?.username && user?.full_name && (
              <p className="text-slate-500 text-sm font-medium">{user.full_name}</p>
            )}
            <p className="text-slate-500 text-sm">{user?.email || 'Sign in to sync your data'}</p>
          </div>
          <Button 
            variant="ghost" 
            size="icon"
            onClick={openEditDialog}
            className="rounded-xl"
          >
            <Edit2 className="w-5 h-5 text-slate-400" />
          </Button>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between text-sm">
          <span className="text-slate-500">Member since</span>
          <span className="font-medium text-slate-700">
            {user?.created_date ? format(new Date(user.created_date), 'MMMM yyyy') : 'N/A'}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalProducts}</p>
          <p className="text-sm text-slate-500">Products tracked</p>
        </div>
        
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mb-3">
            <Receipt className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalPriceEntries}</p>
          <p className="text-sm text-slate-500">Price entries</p>
        </div>
        
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-3">
            <Store className="w-5 h-5 text-amber-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{uniqueStores}</p>
          <p className="text-sm text-slate-500">Stores visited</p>
        </div>
        
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-pink-100 flex items-center justify-center mb-3">
            <ShoppingCart className="w-5 h-5 text-pink-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{totalLists}</p>
          <p className="text-sm text-slate-500">Shopping lists</p>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl p-5 text-white">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5" />
          <h3 className="font-semibold">This Month</h3>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-emerald-100 text-sm">Total Spending</p>
            <p className="text-3xl font-bold">${monthlySpending.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-emerald-100 text-sm">Potential Savings</p>
            <p className="text-3xl font-bold">${totalSavings.toFixed(2)}</p>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="bg-white rounded-2xl p-5 border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-500" />
          Activity Summary
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-600">Entries this month</span>
            <span className="font-semibold text-slate-800">{monthlyEntries.length}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-600">Avg. price per entry</span>
            <span className="font-semibold text-slate-800">
              ${priceEntries.length > 0 
                ? (priceEntries.reduce((sum, p) => sum + p.price, 0) / priceEntries.length).toFixed(2)
                : '0.00'
              }
            </span>
          </div>
          <div className="flex items-center justify-between py-2">
            <span className="text-slate-600">Best savings found</span>
            <span className="font-semibold text-emerald-600">
              {totalSavings > 0 ? `$${totalSavings.toFixed(2)}` : 'N/A'}
            </span>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <Button 
        variant="outline"
        onClick={handleLogout}
        className="w-full h-12 rounded-xl border-red-200 text-red-600 hover:bg-red-50"
      >
        <LogOut className="w-5 h-5 mr-2" />
        Sign Out
      </Button>

      {/* Edit Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Full Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Your name"
                className="h-12"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveProfile}
              disabled={updateUserMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              {updateUserMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}