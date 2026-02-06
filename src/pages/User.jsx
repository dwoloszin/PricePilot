import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { User as UserIcon, Calendar, Package, Receipt, Store, ShoppingCart, BarChart3 } from 'lucide-react';
import { LikeDislike } from '@/components/ui/like-dislike';
import { useAuth } from '@/lib/AuthContext';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

function getUserIdFromSearch() {
  // Support both normal and hash routing (HashRouter puts query into the hash)
  const hash = window.location.hash;
  const hashQuery = hash && hash.includes('?') ? new URLSearchParams(hash.split('?')[1]) : null;
  if (hashQuery) return hashQuery.get('id');
  return new URLSearchParams(window.location.search).get('id');
}

export default function UserPage() {
  const navigate = useNavigate();
  const userId = getUserIdFromSearch();

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['user-public', userId],
    queryFn: () => base44.entities.User.get(String(userId)),
    enabled: !!userId
  });

  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();

  const { data: allProducts = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: allPriceEntries = [] } = useQuery({
    queryKey: ['all-prices'],
    queryFn: () => base44.entities.PriceEntry.list()
  });

  if (!userId) {
    return (
      <div className="px-4 py-20 text-center">
        <h2 className="text-xl font-semibold">User not specified</h2>
        <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
      </div>
    );
  }

  if (userLoading) {
    return (
      <div className="px-4 py-6 space-y-6">
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="px-4 py-20 text-center">
        <h2 className="text-xl font-semibold">User not found</h2>
        <Button onClick={() => navigate(-1)} className="mt-4">Go Back</Button>
      </div>
    );
  }

  // Filter contributions by this user
  const userPriceEntries = allPriceEntries.filter(p => String(p.created_by) === String(userId) || String(p.by) === String(userId));
  const contributedProducts = allProducts.filter(p => String(p.created_by) === String(userId));

  // Determine member since: prefer user.created_date else earliest price entry date
  let memberSince = user.created_date || null;
  if (!memberSince && userPriceEntries.length > 0) {
    const dates = userPriceEntries.map(pe => pe.created_date || pe.date_recorded).filter(Boolean).map(d => new Date(d));
    if (dates.length > 0) {
      memberSince = new Date(Math.min(...dates.map(d => d.getTime()))).toISOString();
    }
  }

  const uniqueStores = new Set(userPriceEntries.map(p => p.store_name || p.store_id)).size;

  return (
    <div className="px-4 py-6 space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center overflow-hidden">
            {user?.picture ? (
              <img src={user.picture} alt={user.username || 'user'} className="w-full h-full object-cover" />
            ) : (
              <UserIcon className="w-8 h-8 text-white" />
            )}
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-slate-800">{user?.username ? `@${user.username}` : 'Anonymous'}</h2>
            <p className="text-slate-500 text-sm">Public profile — activity only</p>
          </div>
          <div className="flex items-center gap-2">
            <LikeDislike
              likes={user?.likes || []}
              dislikes={user?.dislikes || []}
              currentUserId={currentUser?.id}
              onLike={async () => {
                try {
                  await base44.entities.User.toggleLike(String(userId), currentUser || currentUser?.id);
                  queryClient.invalidateQueries(['user-public', userId]);
                } catch (e) {
                  console.error('Failed to like user', e);
                }
              }}
              onDislike={async () => {
                try {
                  await base44.entities.User.toggleDislike(String(userId), currentUser || currentUser?.id);
                  queryClient.invalidateQueries(['user-public', userId]);
                } catch (e) {
                  console.error('Failed to dislike user', e);
                }
              }}
            />
            <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="rounded-xl">Back</Button>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-100 flex items-center justify-between text-sm">
          <span className="text-slate-500">Member since</span>
          <span className="font-medium text-slate-700">
            {memberSince ? format(new Date(memberSince), 'MMMM yyyy') : 'N/A'}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
            <Package className="w-5 h-5 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{contributedProducts.length}</p>
          <p className="text-sm text-slate-500">Products contributed</p>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-100">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mb-3">
            <Receipt className="w-5 h-5 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-slate-800">{userPriceEntries.length}</p>
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
          <p className="text-2xl font-bold text-slate-800">—</p>
          <p className="text-sm text-slate-500">Shopping lists</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 border border-slate-100">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-emerald-500" />
          Activity Summary
        </h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-600">Entries total</span>
            <span className="font-semibold text-slate-800">{userPriceEntries.length}</span>
          </div>
          <div className="flex items-center justify-between py-2 border-b border-slate-100">
            <span className="text-slate-600">Products contributed</span>
            <span className="font-semibold text-slate-800">{contributedProducts.length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
