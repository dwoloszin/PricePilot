
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  Store, 
  MapPin, 
  Edit, 
  Package, 
  TrendingDown, 
  Clock,
  Info,
  Trash2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { UserTag } from '@/components/ui/user-tag';
import { LikeDislike } from '@/components/ui/like-dislike';
import { StoreEditDialog } from '@/components/stores/StoreEditDialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useAuth } from '@/lib/AuthContext';
import { format } from 'date-fns';

export default function StoreDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const getStoreId = () => {
    const hash = window.location.hash;
    const searchPart = hash.split('?')[1];
    if (searchPart) {
      const params = new URLSearchParams(searchPart);
      return params.get('id');
    }
    return new URLSearchParams(window.location.search).get('id');
  };

  const storeId = getStoreId();

  const { data: store, isLoading: storeLoading } = useQuery({
    queryKey: ['store', storeId],
    queryFn: () => base44.entities.Store.get(storeId),
    enabled: !!storeId
  });

  const { data: priceEntries = [], isLoading: pricesLoading } = useQuery({
    queryKey: ['store-prices', store?.name],
    queryFn: async () => {
      if (!store?.name) return [];
      const allPrices = await base44.entities.PriceEntry.list();
      return allPrices.filter(p => p.store_name === store.name);
    },
    enabled: !!store?.name
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const isLoading = storeLoading || pricesLoading;

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await base44.entities.Store.delete(storeId);
      queryClient.invalidateQueries(['stores']);
      navigate('/PriceComparison');
    } catch (error) {
      console.error('Failed to delete store:', error);
      alert('Failed to delete store. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteDialog(false);
    }
  };

  if (isLoading) {
    return (
      <div className="px-4 py-6 space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!store) {
    return (
      <div className="px-4 py-20 text-center">
        <Store className="w-16 h-16 mx-auto text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Store Not Found</h2>
        <Button onClick={() => navigate(-1)}>Go Back</Button>
      </div>
    );
  }

  const getProduct = (productId) => products.find(p => String(p.id) === String(productId));

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 sticky top-16 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-semibold text-slate-800 truncate max-w-[200px]">
              {store.name}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowEditDialog(true)}
              className="rounded-xl"
            >
              <Edit className="w-5 h-5" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setShowDeleteDialog(true)}
              className="rounded-xl text-red-500 hover:text-red-600 hover:bg-red-50"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Store Card */}
        <div className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
              <Store className="w-8 h-8 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-slate-800 capitalize">{store.name}</h2>
              {store.address && (
                <p className="text-slate-500 flex items-center gap-1 mt-1">
                  <MapPin className="w-4 h-4 text-emerald-500" />
                  {store.address}
                </p>
              )}
              {store.type && (
                <Badge variant="secondary" className="mt-2 capitalize">
                  {store.type.replace('_', ' ')}
                </Badge>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-50">
            <UserTag 
              userId={store.created_by}
              userName={store.created_by_name}
              timestamp={store.created_date}
              size="small"
            />
            
            <LikeDislike
              likes={store.likes || []}
              dislikes={store.dislikes || []}
              currentUserId={user?.id}
              onLike={async () => {
                if (user?.id) {
                  await base44.entities.Store.toggleLike(store.id, user.id);
                  queryClient.invalidateQueries(['store', storeId]);
                }
              }}
              onDislike={async () => {
                if (user?.id) {
                  await base44.entities.Store.toggleDislike(store.id, user.id);
                  queryClient.invalidateQueries(['store', storeId]);
                }
              }}
              size="default"
            />
          </div>
        </div>

        {store.description && (
          <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 flex gap-3">
            <Info className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700 leading-relaxed">
              {store.description}
            </p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-2xl p-4 border border-slate-100 text-center">
            <Package className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800">{new Set(priceEntries.map(p => p.product_id)).size}</p>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Products</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 text-center">
            <TrendingDown className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-slate-800">${
              priceEntries.length > 0 
                ? (priceEntries.reduce((sum, p) => sum + p.price, 0) / priceEntries.length).toFixed(2)
                : '0.00'
            }</p>
            <p className="text-xs text-slate-500 uppercase tracking-wider">Avg Price</p>
          </div>
        </div>

        {/* Products at this store */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <Clock className="w-5 h-5 text-emerald-600" />
            Recent Prices at this Store
          </h3>
          
          {priceEntries.length > 0 ? (
            <div className="space-y-3">
              {priceEntries.sort((a, b) => new Date(b.date_recorded || b.created_date) - new Date(a.date_recorded || a.created_date)).map(entry => {
                const product = getProduct(entry.product_id);
                return (
                  <Link 
                    key={entry.id} 
                    to={`/ProductDetail?id=${entry.product_id}`}
                    className="block bg-white rounded-xl p-4 border border-slate-100 hover:border-emerald-200 transition-all"
                  >
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden">
                          {product?.image_url ? (
                            <img src={product.image_url} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <Package className="w-5 h-5 text-slate-300" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium text-slate-800">{product?.name || 'Unknown Product'}</p>
                          <p className="text-xs text-slate-400">
                            {format(new Date(entry.date_recorded || entry.created_date), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-emerald-600">${entry.price.toFixed(2)}</p>
                        {entry.quantity > 1 && <p className="text-xs text-slate-400">×{entry.quantity}</p>}
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center">
              <Package className="w-12 h-12 mx-auto text-slate-200 mb-3" />
              <p className="text-slate-500">No price entries found for this store.</p>
            </div>
          )}
        </div>
      </div>

      <StoreEditDialog
        store={store}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        currentUserId={user?.id}
        onSave={() => {
          queryClient.invalidateQueries(['store', storeId]);
          queryClient.invalidateQueries(['stores']);
        }}
      />

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the store <strong>{store.name}</strong>. 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              disabled={isDeleting}
              className="bg-red-500 hover:bg-red-600"
            >
              {isDeleting ? 'Deleting...' : 'Delete Store'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
