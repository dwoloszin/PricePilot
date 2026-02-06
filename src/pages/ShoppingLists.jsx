import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  Plus, 
  ShoppingCart,
  Loader2
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
import ShoppingListCard from '@/components/lists/ShoppingListCard';
import { useAuth } from '@/lib/AuthContext';

export default function ShoppingLists() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showCreate, setShowCreate] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListBudget, setNewListBudget] = useState('');

  const { data: lists = [], isLoading } = useQuery({
    queryKey: ['shopping-lists', user?.id],
    queryFn: async () => {
      // Now the backend handles the filtering, but we can keep client-side as backup
      const allLists = await base44.entities.ShoppingList.list('-created_date', null, user?.id);
      return allLists;
    },
    enabled: !!user?.id
  });

  const { data: priceEntries = [] } = useQuery({
    queryKey: ['all-prices'],
    queryFn: () => base44.entities.PriceEntry.list()
  });

  const createListMutation = useMutation({
    mutationFn: (data) => base44.entities.ShoppingList.create(data),
    onSuccess: (newList) => {
      queryClient.invalidateQueries(['shopping-lists']);
      setShowCreate(false);
      setNewListName('');
      setNewListBudget('');
      toast.success('Shopping list created!');
      // Use hash-based navigation for GitHub Pages
      window.location.hash = `#/ShoppingListDetail?id=${newList.id}`;
    }
  });

  const getEstimatedTotal = (list) => {
    if (!list.items || list.items.length === 0) return 0;
    
    if (list.is_fast_list) {
      return list.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }
    
    let total = 0;
    list.items.forEach(item => {
      const productPrices = priceEntries.filter(p => String(p.product_id) === String(item.product_id));
      if (productPrices.length > 0) {
        const lowestPrice = Math.min(...productPrices.map(p => p.price));
        total += lowestPrice * (item.desired_quantity || 1);
      }
    });
    return total;
  };

  const handleCreateList = () => {
    createListMutation.mutate({
      name: newListName,
      budget: newListBudget ? parseFloat(newListBudget) : null,
      items: [],
      user_id: user?.id,
      is_active: lists.length === 0
    });
  };

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-800">Shopping Lists</h1>
        <Button 
          onClick={() => setShowCreate(true)}
          className="bg-emerald-500 hover:bg-emerald-600 rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          New List
        </Button>
      </div>

      {/* Lists */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl p-5 border border-slate-100">
              <div className="flex gap-4">
                <Skeleton className="w-12 h-12 rounded-xl" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-5 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {/* Always show Fast List option at the top */}
          <div 
            className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl p-5 border border-amber-200 cursor-pointer hover:shadow-md transition-shadow"
            onClick={() => window.location.hash = `#/FastList`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-semibold text-slate-800">Fast List</h3>
                  <p className="text-xs text-slate-500">Quick add & scan items</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-400">→</p>
              </div>
            </div>
          </div>

          {/* Regular shopping lists */}
          {lists.length > 0 ? (
            <div className="space-y-3">
              {[...lists].filter(l => !l.is_fast_list).sort((a, b) => new Date(b.created_date) - new Date(a.created_date)).map(list => (
                <ShoppingListCard 
                  key={list.id}
                  list={list}
                  estimatedTotal={getEstimatedTotal(list)}
                  onClick={() => {
                    // Use hash-based navigation for GitHub Pages
                    window.location.hash = `#/ShoppingListDetail?id=${list.id}`;
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-purple-100 flex items-center justify-center">
                <ShoppingCart className="w-8 h-8 text-purple-400" />
              </div>
              <h3 className="font-semibold text-slate-800 mb-2">No Shopping Lists Yet</h3>
              <p className="text-slate-500 text-sm mb-4">
                Create a list to start tracking your shopping and comparing prices
              </p>
              <Button 
                onClick={() => setShowCreate(true)}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Your First List
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Shopping List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>List Name</Label>
              <Input
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="e.g., Monthly Groceries"
                className="h-12"
              />
            </div>
            <div className="space-y-2">
              <Label>Budget (optional)</Label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">$</span>
                <Input
                  type="number"
                  step="0.01"
                  value={newListBudget}
                  onChange={(e) => setNewListBudget(e.target.value)}
                  placeholder="0.00"
                  className="pl-8 h-12"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateList}
              disabled={!newListName.trim() || createListMutation.isPending}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              {createListMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Create List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}