
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  Search, 
  Package, 
  ArrowLeft,
  Plus
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import ProductCard from '@/components/products/ProductCard';
import { useAuth } from '@/lib/AuthContext';

const categories = [
  { value: 'all', label: 'All Categories' },
  { value: 'food', label: 'Food' },
  { value: 'beverages', label: 'Beverages' },
  { value: 'household', label: 'Household' },
  { value: 'personal_care', label: 'Personal Care' },
  { value: 'baby', label: 'Baby' },
  { value: 'pet', label: 'Pet Supplies' },
  { value: 'health', label: 'Health' },
  { value: 'frozen', label: 'Frozen' },
  { value: 'dairy', label: 'Dairy' },
  { value: 'produce', label: 'Produce' },
  { value: 'meat', label: 'Meat' },
  { value: 'bakery', label: 'Bakery' },
  { value: 'snacks', label: 'Snacks' },
];

export default function Products() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list('-created_date')
  });

  const { data: priceEntries = [] } = useQuery({
    queryKey: ['recent-prices'],
    queryFn: () => base44.entities.PriceEntry.list('-created_date', 100)
  });

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

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) ||
                         (product.brand && product.brand.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = selectedCategory === 'all' || product.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="pb-20">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 sticky top-16 z-10">
        <div className="flex items-center gap-3 mb-3">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => navigate(-1)}
            className="rounded-xl"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-semibold text-slate-800">Browse Products</h1>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <Input 
            placeholder="Search products or brands..." 
            className="pl-10 h-11 bg-slate-50 border-slate-200 rounded-xl"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* Categories */}
      <div className="flex overflow-x-auto gap-2 px-4 py-4 scrollbar-hide">
        {categories.map(cat => (
          <Badge
            key={cat.value}
            variant={selectedCategory === cat.value ? "default" : "secondary"}
            className={`
              px-4 py-2 rounded-xl cursor-pointer whitespace-nowrap text-sm font-medium
              ${selectedCategory === cat.value ? 'bg-emerald-500 hover:bg-emerald-600' : 'bg-white border-slate-100 hover:border-emerald-200'}
            `}
            onClick={() => setSelectedCategory(cat.value)}
          >
            {cat.label}
          </Badge>
        ))}
      </div>

      {/* Product List */}
      <div className="px-4 space-y-4">
        {productsLoading ? (
          <div className="space-y-4">
            {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-32 rounded-2xl w-full" />)}
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="space-y-4">
            {filteredProducts.map(product => (
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
          <div className="text-center py-20">
            <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package className="w-10 h-10 text-slate-300" />
            </div>
            <h3 className="text-lg font-semibold text-slate-800">No products found</h3>
            <p className="text-slate-500 mb-6">Try a different search term or category</p>
            <Button 
              onClick={() => navigate('/Scanner')}
              className="bg-emerald-500 hover:bg-emerald-600 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add New Product
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
