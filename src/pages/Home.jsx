
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/lib/AuthContext';
import { 
  ScanLine, 
  Plus, 
  ShoppingCart, 
  TrendingDown,
  Clock,
  ArrowRight,
  Sparkles,
  Package
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import ProductCard from '@/components/products/ProductCard';

export default function Home() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-created_date', 10)
  });

  const { data: priceEntries = [], isLoading: pricesLoading } = useQuery({
    queryKey: ['recent-prices'],
    queryFn: () => base44.entities.PriceEntry.list('-created_date', 50)
  });

  const { data: lists = [] } = useQuery({
    queryKey: ['shopping-lists'],
    queryFn: () => base44.entities.ShoppingList.list()
  });

  const activeList = lists.find(l => l.is_active);

  // Get latest price for each product
  const getLatestPrice = (productId) => {
    const productPrices = priceEntries.filter(p => p.product_id === productId);
    return productPrices.sort((a, b) => 
      new Date(b.date_recorded || b.created_date) - new Date(a.date_recorded || a.created_date)
    )[0];
  };

  // Calculate price changes
  const getPriceChange = (productId) => {
    const productPrices = priceEntries
      .filter(p => p.product_id === productId)
      .sort((a, b) => new Date(b.date_recorded || b.created_date) - new Date(a.date_recorded || a.created_date));
    if (productPrices.length < 2) return 0;
    return ((productPrices[0].price - productPrices[1].price) / productPrices[1].price) * 100;
  };

  // Get products with price drops
  const priceDropProducts = products.filter(p => getPriceChange(p.id) < -5);

  const isLoading = productsLoading || pricesLoading;

  return (
    <div className="px-4 py-6 space-y-8">
      {/* Hero Section */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 p-6 text-white">
        <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full translate-y-1/2 -translate-x-1/2" />
        
        <div className="relative z-10 text-center">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Find the Best Prices</h1>
          <p className="text-white/80 text-sm md:text-base mb-6">
            Scan products and compare prices across stores
          </p>
          
          <div className="flex justify-center">
            <Link to={createPageUrl('Scanner')}>
              <Button 
                size="lg"
                className="bg-white text-emerald-600 hover:bg-white/90 rounded-2xl h-14 px-8 font-semibold shadow-lg"
              >
                <ScanLine className="w-5 h-5 mr-2" />
                Scan Product
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Link to={createPageUrl('ShoppingLists')}>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <ShoppingCart className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Shopping Lists</h3>
            <p className="text-xs text-slate-500 mt-1">
              {activeList ? `Active: ${activeList.name}` : 'Create a list'}
            </p>
          </div>
        </Link>
        
        <Link to={createPageUrl('PriceComparison')}>
          <div className="bg-white rounded-2xl p-4 border border-slate-100 hover:border-emerald-200 hover:shadow-md transition-all group">
            <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
              <TrendingDown className="w-5 h-5 text-amber-600" />
            </div>
            <h3 className="font-semibold text-slate-800">Compare Prices</h3>
            <p className="text-xs text-slate-500 mt-1">Find the best deals</p>
          </div>
        </Link>
      </div>

      {/* Price Drops Alert */}
      {priceDropProducts.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              <h2 className="font-semibold text-slate-800">Price Drops</h2>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {priceDropProducts.slice(0, 3).map(product => (
              <ProductCard 
                key={product.id}
                product={product}
                latestPrice={getLatestPrice(product.id)}
                priceChange={getPriceChange(product.id)}
                currentUserId={user?.id}
                onClick={() => navigate(`/ProductDetail?id=${product.id}`)}
                onLike={async (p) => {
                  if (user?.id) {
                    await base44.entities.Product.toggleLike(p.id, user.id);
                    queryClient.invalidateQueries(['products']);
                  }
                }}
                onDislike={async (p) => {
                  if (user?.id) {
                    await base44.entities.Product.toggleDislike(p.id, user.id);
                    queryClient.invalidateQueries(['products']);
                  }
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Recent Scans */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            <h2 className="font-semibold text-slate-800">Recent Products</h2>
          </div>
          <Link 
            to={createPageUrl('Products')} 
            className="text-sm text-emerald-600 font-medium flex items-center gap-1 hover:gap-2 transition-all"
          >
            View all <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white rounded-2xl overflow-hidden border border-slate-100">
                <Skeleton className="w-full aspect-square rounded-t-2xl" />
                <div className="p-4 space-y-2">
                  <Skeleton className="h-5 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-10 w-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        ) : products.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.slice(0, 5).map(product => (
              <ProductCard 
                key={product.id}
                product={product}
                latestPrice={getLatestPrice(product.id)}
                priceChange={getPriceChange(product.id)}
                currentUserId={user?.id}
                onClick={() => navigate(`/ProductDetail?id=${product.id}`)}
                onLike={async (p) => {
                  if (user?.id) {
                    await base44.entities.Product.toggleLike(p.id, user.id);
                    queryClient.invalidateQueries(['products']);
                  }
                }}
                onDislike={async (p) => {
                  if (user?.id) {
                    await base44.entities.Product.toggleDislike(p.id, user.id);
                    queryClient.invalidateQueries(['products']);
                  }
                }}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-100 flex items-center justify-center">
              <Package className="w-8 h-8 text-slate-300" />
            </div>
            <h3 className="font-semibold text-slate-800 mb-2">No Products Yet</h3>
            <p className="text-slate-500 text-sm mb-4">
              Start by scanning a product to track its prices
            </p>
            <Link to={createPageUrl('Scanner')}>
              <Button className="bg-emerald-500 hover:bg-emerald-600">
                <ScanLine className="w-4 h-4 mr-2" />
                Scan First Product
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
