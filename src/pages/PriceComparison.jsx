import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LikeDislike } from '@/components/ui/like-dislike';
import { StoreEditDialog } from '@/components/stores/StoreEditDialog';
import { StoreAddDialog } from '@/components/stores/StoreAddDialog';
import { useAuth } from '@/lib/AuthContext';
import { 
  Search, 
  Store,
  TrendingDown,
  MapPin,
  Star,
  Package,
  ArrowRight,
  Filter,
  Plus
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function PriceComparison() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStore, setSelectedStore] = useState('all');
  const [editingStore, setEditingStore] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: priceEntries = [], isLoading: pricesLoading } = useQuery({
    queryKey: ['all-prices'],
    queryFn: () => base44.entities.PriceEntry.list()
  });

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list()
  });

  // Get unique stores from price entries
  const uniqueStores = [...new Set(priceEntries.map(p => p.store_name))].filter(Boolean);

  // Calculate store statistics
  const getStoreStats = () => {
    const stats = {};
    
    // 1. First, initialize stats with all actual store entities (keyed by ID to allow duplicates by name)
    stores.forEach(store => {
      const storePrices = priceEntries.filter(p => 
        p.store_id === store.id || 
        (p.store_name && p.store_name.trim().toLowerCase() === store.name.trim().toLowerCase())
      );
      
      stats[store.id] = {
        ...store,
        productCount: new Set(storePrices.map(p => p.product_id)).size,
        avgPrice: storePrices.length > 0 
          ? storePrices.reduce((sum, p) => sum + p.price, 0) / storePrices.length 
          : 0,
        totalEntries: storePrices.length,
        address: store.address || storePrices[0]?.store_address
      };
    });

    // 2. Then, add "temp" stores from price entries that don't have a matching entity
    uniqueStores.forEach(storeName => {
      const lowerName = storeName.trim().toLowerCase();
      // Check if any store entity matches this name
      const hasMatchingEntity = Object.values(stats).some(s => 
        s.name.trim().toLowerCase() === lowerName
      );
      
      if (!hasMatchingEntity) {
        const storePrices = priceEntries.filter(p => p.store_name.trim().toLowerCase() === lowerName);
        
        const tempKey = `temp-${storeName}`;
        stats[tempKey] = {
          id: tempKey, 
          name: storeName,
          likes: [],
          dislikes: [],
          productCount: new Set(storePrices.map(p => p.product_id)).size,
          avgPrice: storePrices.length > 0 
            ? storePrices.reduce((sum, p) => sum + p.price, 0) / storePrices.length 
            : 0,
          totalEntries: storePrices.length,
          address: storePrices[0]?.store_address
        };
      }
    });

    return Object.values(stats).sort((a, b) => b.productCount - a.productCount);
  };

  // Find best deals (products with significant price differences)
  const getBestDeals = () => {
    const deals = [];
    
    products.forEach(product => {
      const productPrices = priceEntries.filter(p => String(p.product_id) === String(product.id));
      if (productPrices.length < 2) return;
      
      const prices = productPrices.map(p => p.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const savings = ((maxPrice - minPrice) / maxPrice) * 100;
      
      if (savings >= 10) {
        const cheapestEntry = productPrices.find(p => p.price === minPrice);
        deals.push({
          product,
          minPrice,
          maxPrice,
          savings,
          bestStore: cheapestEntry?.store_name,
          bestStoreAddress: cheapestEntry?.store_address
        });
      }
    });

    return deals.sort((a, b) => b.savings - a.savings);
  };

  // Search products
  const filteredProducts = products.filter(p => 
    !searchQuery || 
    p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.brand?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const storeStats = getStoreStats();
  const bestDeals = getBestDeals();
  const isLoading = productsLoading || pricesLoading;

  return (
    <div className="px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Price Comparison</h1>
          <p className="text-slate-500 text-sm mt-1">Find the best deals across stores</p>
        </div>
        <Button 
          onClick={() => setShowAddDialog(true)}
          className="bg-emerald-500 hover:bg-emerald-600 rounded-xl"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Store
        </Button>
      </div>

      <Tabs defaultValue="deals" className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-slate-100 p-1 rounded-xl">
          <TabsTrigger 
            value="deals"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs"
          >
            Best Deals
          </TabsTrigger>
          <TabsTrigger 
            value="stores"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs"
          >
            Stores
          </TabsTrigger>
          <TabsTrigger 
            value="search"
            className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs"
          >
            Search
          </TabsTrigger>
        </TabsList>

        {/* Best Deals Tab */}
        <TabsContent value="deals" className="mt-4 space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-32 rounded-2xl" />
              ))}
            </div>
          ) : bestDeals.length > 0 ? (
            <div className="space-y-3">
              {bestDeals.map((deal, idx) => (
                <Link 
                  key={deal.product.id} 
                  to={`/ProductDetail?id=${deal.product.id}`}
                >
                  <div className="bg-white rounded-2xl p-4 border border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all">
                    <div className="flex gap-4">
                      <div className="w-16 h-16 rounded-xl bg-slate-100 flex-shrink-0 overflow-hidden">
                        {deal.product.image_url ? (
                          <img 
                            src={deal.product.image_url} 
                            alt={deal.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-slate-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-800">{deal.product.name}</h3>
                            {deal.product.brand && (
                              <p className="text-sm text-slate-500">{deal.product.brand}</p>
                            )}
                          </div>
                          <Badge className="bg-emerald-100 text-emerald-700">
                            Save {deal.savings.toFixed(0)}%
                          </Badge>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-3">
                          <div>
                            <p className="text-xs text-slate-400">Best Price</p>
                            <p className="text-lg font-bold text-emerald-600">${deal.minPrice.toFixed(2)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-400">Highest</p>
                            <p className="text-lg font-bold text-slate-400 line-through">${deal.maxPrice.toFixed(2)}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 mt-2 text-xs text-emerald-600">
                          <Star className="w-3 h-3 fill-current" />
                          <span>{deal.bestStore}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center">
              <TrendingDown className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h3 className="font-semibold text-slate-800 mb-2">No Deals Found</h3>
              <p className="text-slate-500 text-sm">
                Add more prices from different stores to find the best deals
              </p>
            </div>
          )}
        </TabsContent>

        {/* Stores Tab */}
        <TabsContent value="stores" className="mt-4 space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-24 rounded-2xl" />
              ))}
            </div>
          ) : storeStats.length > 0 ? (
            <div className="space-y-3">
              {storeStats.map((store, idx) => (
                <div 
                  key={store.name}
                  onClick={() => {
                    if (store.id && !store.id.startsWith('temp-')) {
                      navigate(`/StoreDetail?id=${store.id}`);
                    } else {
                      setEditingStore(store);
                      setShowEditDialog(true);
                    }
                  }}
                  className="bg-white rounded-2xl p-4 border border-slate-100 cursor-pointer hover:border-emerald-200 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        idx === 0 ? 'bg-emerald-100' : 'bg-slate-100'
                      }`}>
                        <Store className={`w-6 h-6 ${idx === 0 ? 'text-emerald-600' : 'text-slate-400'}`} />
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-800 capitalize">{store.name}</h3>
                        {store.address && (
                          <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3" />
                            {store.address}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-slate-800">{store.productCount}</p>
                      <p className="text-xs text-slate-400">products</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100 text-sm">
                    <div className="flex items-center gap-4">
                      <span className="text-slate-500">{store.totalEntries} price entries</span>
                      <LikeDislike
                        likes={store.likes || []}
                        dislikes={store.dislikes || []}
                        currentUserId={user?.id}
                        onLike={async (e) => {
                          if (e) e.stopPropagation();
                          if (store.id && !store.id.startsWith('temp-')) {
                            await base44.entities.Store.toggleLike(store.id, user.id);
                            queryClient.invalidateQueries(['stores']);
                          }
                        }}
                        onDislike={async (e) => {
                          if (e) e.stopPropagation();
                          if (store.id && !store.id.startsWith('temp-')) {
                            await base44.entities.Store.toggleDislike(store.id, user.id);
                            queryClient.invalidateQueries(['stores']);
                          }
                        }}
                        size="small"
                      />
                    </div>
                    <span className="text-slate-600">
                      Avg: <span className="font-semibold">${store.avgPrice.toFixed(2)}</span>
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center">
              <Store className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <h3 className="font-semibold text-slate-800 mb-2">No Stores Yet</h3>
              <p className="text-slate-500 text-sm">
                Start scanning products and adding prices to see store comparisons
              </p>
            </div>
          )}
        </TabsContent>

        {/* Search Tab */}
        <TabsContent value="search" className="mt-4 space-y-4">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search products to compare..."
              className="pl-12 h-12 bg-white border-slate-200 rounded-xl"
            />
          </div>

          {searchQuery && (
            <div className="space-y-3">
              {filteredProducts.length > 0 ? (
                filteredProducts.slice(0, 10).map(product => {
                  const productPrices = priceEntries.filter(p => String(p.product_id) === String(product.id));
                  const prices = productPrices.map(p => p.price);
                  const minPrice = prices.length > 0 ? Math.min(...prices) : null;
                  const maxPrice = prices.length > 0 ? Math.max(...prices) : null;
                  const storeCount = new Set(productPrices.map(p => p.store_name)).size;

                  return (
                    <Link 
                      key={product.id}
                      to={`/ProductDetail?id=${product.id}`}
                    >
                      <div className="bg-white rounded-xl p-4 border border-slate-100 hover:border-emerald-200 transition-all">
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-semibold text-slate-800">{product.name}</h3>
                            {product.brand && (
                              <p className="text-sm text-slate-500">{product.brand}</p>
                            )}
                            <p className="text-xs text-slate-400 mt-1">
                              {storeCount} store{storeCount !== 1 ? 's' : ''} • {productPrices.length} price{productPrices.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                          <div className="text-right">
                            {minPrice ? (
                              <>
                                <p className="text-lg font-bold text-emerald-600">${minPrice.toFixed(2)}</p>
                                {maxPrice > minPrice && (
                                  <p className="text-xs text-slate-400">to ${maxPrice.toFixed(2)}</p>
                                )}
                              </>
                            ) : (
                              <p className="text-sm text-slate-400">No prices</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  );
                })
              ) : (
                <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center">
                  <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
                  <h3 className="font-semibold text-slate-800 mb-2">No Products Found</h3>
                  <p className="text-slate-500 text-sm">
                    Try a different search term
                  </p>
                </div>
              )}
            </div>
          )}

          {!searchQuery && (
            <div className="bg-slate-50 rounded-2xl p-8 text-center">
              <Search className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 text-sm">
                Search for a product to compare prices across stores
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {editingStore && (
        <StoreEditDialog
          store={editingStore}
          open={showEditDialog}
          onOpenChange={setShowEditDialog}
          currentUserId={user?.id}
          onSave={() => {
            queryClient.invalidateQueries(['stores']);
          }}
        />
      )}

      <StoreAddDialog
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        currentUserId={user?.id}
        existingStores={stores}
        onSave={() => {
          queryClient.invalidateQueries(['stores']);
        }}
      />
    </div>
  );
}