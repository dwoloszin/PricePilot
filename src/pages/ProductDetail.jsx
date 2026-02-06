
import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Package, 
  Plus, 
  History, 
  TrendingDown, 
  TrendingUp,
  MapPin,
  Calendar,
  MoreVertical,
  Edit,
  Trash2,
  Share2,
  ShoppingCart,
  PlusCircle,
  Clock
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import PriceEntryForm from '@/components/products/PriceEntryForm';
import { ProductEditDialog } from '@/components/products/ProductEditDialog';
import { UserTag } from '@/components/ui/user-tag';
import { LikeDislike } from '@/components/ui/like-dislike';
import { useAuth } from '@/lib/AuthContext';
import { format } from 'date-fns';

export default function ProductDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [showPriceForm, setShowPriceForm] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);

  const getProductId = () => {
    const hash = window.location.hash;
    const searchPart = hash.split('?')[1];
    if (searchPart) {
      const params = new URLSearchParams(searchPart);
      return params.get('id');
    }
    return new URLSearchParams(window.location.search).get('id');
  };

  const productId = getProductId();

  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product', productId],
    queryFn: () => base44.entities.Product.get(productId),
    enabled: !!productId
  });

  const { data: priceEntries = [], isLoading: pricesLoading } = useQuery({
    queryKey: ['product-prices', productId],
    queryFn: () => base44.entities.PriceEntry.filter({ product_id: productId }),
    enabled: !!productId
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  const { data: lists = [] } = useQuery({
    queryKey: ['shopping-lists'],
    queryFn: () => base44.entities.ShoppingList.list()
  });

  const createPriceEntryMutation = useMutation({
    mutationFn: (data) => base44.entities.PriceEntry.create(data, user?.id),
    onSuccess: () => {
      queryClient.invalidateQueries(['product-prices', productId]);
      queryClient.invalidateQueries(['prices']);
      setShowPriceForm(false);
      toast.success('Price entry added');
    }
  });

  const deleteProductMutation = useMutation({
    mutationFn: () => base44.entities.Product.delete(productId),
    onSuccess: () => {
      queryClient.invalidateQueries(['products']);
      navigate('/Products');
      toast.success('Product deleted');
    }
  });

  const handleAddPrice = async (data) => {
    // 1. Ensure store exists in Store entity
    try {
      const existingStores = await base44.entities.Store.list();
      const existingStore = existingStores.find(s => s.name.toLowerCase() === data.store_name.toLowerCase());
      
      if (!existingStore) {
        await base44.entities.Store.create({
          name: data.store_name,
          address: data.store_address,
          type: data.store_type,
          latitude: data.latitude,
          longitude: data.longitude
        }, user?.id);
      } else {
        // Update existing store if it doesn't have an address but the new entry does
        if (!existingStore.address && data.store_address) {
          await base44.entities.Store.update(existingStore.id, {
            address: data.store_address
          }, user?.id);
        }
      }
    } catch (error) {
      console.error('Failed to handle store persistence:', error);
    }

    // 2. Create price entry
    createPriceEntryMutation.mutate({
      ...data,
      product_id: productId
    });
  };

  const handleAddToList = (list) => {
    const newItems = [...(list.items || [])];
    const existingItem = newItems.find(i => i.product_id === productId);
    
    if (existingItem) {
      toast.error('Product already in this list');
      return;
    }

    newItems.push({
      product_id: productId,
      added_date: new Date().toISOString(),
      checked: false
    });

    base44.entities.ShoppingList.update(list.id, { items: newItems })
      .then(() => {
        queryClient.invalidateQueries(['shopping-lists']);
        toast.success(`Added to ${list.name}`);
      });
  };

  const handleLike = async () => {
    if (!user?.id) return;
    await base44.entities.Product.toggleLike(productId, user.id);
    queryClient.invalidateQueries(['product', productId]);
  };

  const handleDislike = async () => {
    if (!user?.id) return;
    await base44.entities.Product.toggleDislike(productId, user.id);
    queryClient.invalidateQueries(['product', productId]);
  };

  const isLoading = productLoading || pricesLoading;

  if (isLoading) {
    return (
      <div className="px-4 py-6 space-y-6">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="px-4 py-20 text-center">
        <Package className="w-16 h-16 mx-auto text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-800 mb-2">Product Not Found</h2>
        <Button onClick={() => navigate('/Products')}>Back to Products</Button>
      </div>
    );
  }

  const sortedPrices = [...priceEntries].sort((a, b) => 
    new Date(b.date_recorded || b.created_date) - new Date(a.date_recorded || a.created_date)
  );
  
  const latestPrice = sortedPrices[0];
  const lowestPrice = priceEntries.length > 0 
    ? Math.min(...priceEntries.map(p => p.price))
    : null;
  const highestPrice = priceEntries.length > 0 
    ? Math.max(...priceEntries.map(p => p.price))
    : null;

  return (
    <div className="pb-24">
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
              {product.name}
            </h1>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="rounded-xl">
              <Share2 className="w-5 h-5 text-slate-400" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-xl">
                  <MoreVertical className="w-5 h-5 text-slate-400" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-xl">
                <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit Product
                </DropdownMenuItem>
                <DropdownMenuItem 
                  className="text-red-600"
                  onClick={() => {
                    if (confirm('Are you sure you want to delete this product?')) {
                      deleteProductMutation.mutate();
                    }
                  }}
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Product
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Product Card */}
        <div className="bg-white rounded-3xl overflow-hidden border border-slate-100 shadow-sm">
          <div className="aspect-square bg-slate-50 relative">
            {product.image_url ? (
              <img 
                src={product.image_url} 
                alt={product.name}
                className="w-full h-full object-contain p-4"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Package className="w-20 h-20 text-slate-200" />
              </div>
            )}
            {latestPrice && lowestPrice && latestPrice.price === lowestPrice && (
              <Badge className="absolute top-4 left-4 bg-emerald-500 hover:bg-emerald-500">
                Best Price
              </Badge>
            )}
          </div>
          
          <div className="p-6 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-800 mb-1">{product.name}</h2>
                <div className="flex items-center gap-2">
                  {product.brand && (
                    <span className="text-slate-500 font-medium">{product.brand}</span>
                  )}
                  {product.brand && product.category && (
                    <span className="text-slate-300">•</span>
                  )}
                  {product.category && (
                    <Badge variant="secondary" className="capitalize">
                      {product.category.replace('_', ' ')}
                    </Badge>
                  )}
                </div>
              </div>
              {latestPrice && (
                <div className="text-right">
                  <p className="text-3xl font-bold text-emerald-600">${latestPrice.price.toFixed(2)}</p>
                  <p className="text-xs text-slate-400 font-medium uppercase tracking-wider mt-1">Latest Price</p>
                </div>
              )}
            </div>

            {/* User Attribution & Voting */}
            <div className="flex items-center justify-between py-4 border-t border-slate-50">
              <UserTag 
                userId={product.created_by}
                userName={product.created_by_name}
                timestamp={product.created_date}
                size="small"
              />
              
              <LikeDislike
                likes={product.likes || []}
                dislikes={product.dislikes || []}
                currentUserId={user?.id}
                onLike={handleLike}
                onDislike={handleDislike}
              />
            </div>

            {product.description && (
              <div className="pt-4 border-t border-slate-50">
                <p className="text-slate-600 text-sm leading-relaxed">{product.description}</p>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex-1 h-12 rounded-xl border-slate-200">
                    <PlusCircle className="w-4 h-4 mr-2" />
                    Add to List
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56 rounded-xl">
                  {lists.length > 0 ? (
                    lists.map(list => (
                      <DropdownMenuItem key={list.id} onClick={() => handleAddToList(list)}>
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        {list.name}
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem onClick={() => navigate('/ShoppingLists')}>
                      Create first list
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
              
              <Button 
                onClick={() => setShowPriceForm(true)}
                className="flex-1 h-12 rounded-xl bg-emerald-500 hover:bg-emerald-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Update Price
              </Button>
            </div>
          </div>
        </div>

        {/* Price Stats */}
        {priceEntries.length > 1 && (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl p-4 border border-slate-100 text-center">
              <TrendingDown className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-slate-800">${lowestPrice?.toFixed(2)}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Lowest Price</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-slate-100 text-center">
              <TrendingUp className="w-6 h-6 text-red-500 mx-auto mb-2" />
              <p className="text-2xl font-bold text-slate-800">${highestPrice?.toFixed(2)}</p>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Highest Price</p>
            </div>
          </div>
        )}

        {/* Price History */}
        <div className="space-y-4">
          <h3 className="font-semibold text-slate-800 flex items-center gap-2">
            <History className="w-5 h-5 text-emerald-600" />
            Price History
          </h3>
          
          {sortedPrices.length > 0 ? (
            <div className="space-y-3">
              {sortedPrices.map((entry, idx) => (
                <div key={entry.id} className="bg-white rounded-2xl p-4 border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-start">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center">
                        <MapPin className="w-5 h-5 text-slate-400" />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-800">{entry.store_name}</p>
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" />
                          {format(new Date(entry.date_recorded || entry.created_date), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-slate-800">${entry.price.toFixed(2)}</p>
                      {idx === 0 && <Badge variant="outline" className="text-[10px] h-4">Latest</Badge>}
                    </div>
                  </div>
                  {entry.notes && (
                    <p className="mt-3 text-sm text-slate-500 italic bg-slate-50 p-2 rounded-lg">
                      "{entry.notes}"
                    </p>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center">
              <Clock className="w-12 h-12 mx-auto text-slate-200 mb-3" />
              <p className="text-slate-500">No price history available yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Update Price Drawer/Dialog */}
      <Drawer open={showPriceForm} onOpenChange={setShowPriceForm}>
        <DrawerContent className="max-h-[90vh]">
          <div className="mx-auto w-full max-w-lg">
            <DrawerHeader>
              <DrawerTitle>Update Product Price</DrawerTitle>
              <DrawerDescription>
                Share a new price you found for this product.
              </DrawerDescription>
            </DrawerHeader>
            <div className="p-4 overflow-y-auto">
              <PriceEntryForm 
                onSubmit={handleAddPrice} 
                isLoading={createPriceEntryMutation.isPending}
                existingStores={stores}
              />
            </div>
          </div>
        </DrawerContent>
      </Drawer>

      <ProductEditDialog
        product={product}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        currentUserId={user?.id}
        onSave={() => {
          queryClient.invalidateQueries(['product', productId]);
          queryClient.invalidateQueries(['products']);
        }}
      />
    </div>
  );
}
