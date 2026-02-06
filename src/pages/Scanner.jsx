
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Package, 
  Plus,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import BarcodeScanner from '@/components/scanner/BarcodeScanner';
import CommunityProductForm from '@/components/products/CommunityProductForm';
import PriceEntryForm from '@/components/products/PriceEntryForm';
import { useAuth } from '@/lib/AuthContext';

export default function Scanner() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [scanning, setScanning] = useState(true);
  const [scannedBarcode, setScannedBarcode] = useState(null);
  const [existingProduct, setExistingProduct] = useState(null);
  const [fetchedProductData, setFetchedProductData] = useState(null);
  const [isSearching, setIsSearching] = useState(false);
  const [renderError, setRenderError] = useState(null);

  // Safety timeout: If searching takes too long, force stop
  useEffect(() => {
    let timer;
    if (isSearching) {
      timer = setTimeout(() => {
        console.warn("Search taking too long, forcing stop");
        setIsSearching(false);
      }, 10000); // 10s safety limit
    }
    return () => clearTimeout(timer);
  }, [isSearching]);

  const { data: stores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list().catch(() => [])
  });

  const createCommunityEntryMutation = useMutation({
    mutationFn: async ({ productData, priceData }) => {
      // 1. Create product
      const product = await base44.entities.Product.create(productData, user?.id);
      
      // 2. Handle store
      const allStores = await base44.entities.Store.list().catch(() => []);
      const existingStore = allStores.find(s => 
        s.name.toLowerCase() === priceData.store_name.toLowerCase()
      );
      
      let storeId = existingStore?.id;
      if (!existingStore) {
        const newStore = await base44.entities.Store.create({
          name: priceData.store_name,
          address: priceData.store_address,
          type: priceData.store_type,
          latitude: priceData.latitude,
          longitude: priceData.longitude
        }, user?.id);
        storeId = newStore.id;
      }
      
      // 3. Create price entry
      await base44.entities.PriceEntry.create({
        ...priceData,
        product_id: product.id,
        store_id: storeId
      }, user?.id);
      
      return product;
    },
    onSuccess: (product) => {
      queryClient.invalidateQueries(['products']);
      queryClient.invalidateQueries(['prices']);
      toast.success('Product registered successfully!');
      navigate(`/ProductDetail?id=${product.id}`);
    },
    onError: (error) => {
      console.error('Registration error:', error);
      toast.error('Failed to register product');
    }
  });

  const createPriceEntryMutation = useMutation({
    mutationFn: async (data) => {
      const allStores = await base44.entities.Store.list().catch(() => []);
      const existingStore = allStores.find(s => 
        s.name.toLowerCase() === data.store_name.toLowerCase()
      );
      
      let storeId = existingStore?.id;
      if (!existingStore) {
        const newStore = await base44.entities.Store.create({
          name: data.store_name,
          address: data.store_address,
          type: data.store_type,
          latitude: data.latitude,
          longitude: data.longitude
        }, user?.id);
        storeId = newStore.id;
      }

      await base44.entities.PriceEntry.create({
        ...data,
        store_id: storeId,
        product_id: existingProduct.id
      }, user?.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['prices']);
      toast.success('Price updated!');
      navigate(`/ProductDetail?id=${existingProduct.id}`);
    }
  });

  const handleBarcodeScan = async (barcode) => {
    console.log(">>> SCANNER: handleBarcodeScan triggered with:", barcode);
    if (!barcode) {
      toast.error("Invalid barcode");
      setScanning(true);
      return;
    }

    // 1. Set initial states
    setScannedBarcode(barcode);
    setScanning(false);
    setIsSearching(true);
    setExistingProduct(null);
    setFetchedProductData(null);
    
    let foundProduct = null;
    let apiData = null;

    try {
      console.log(">>> SCANNER: Searching local database...");
      const dbPromise = base44.entities.Product.list();
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database timeout')), 3000)
      );

      try {
        const products = await Promise.race([dbPromise, timeoutPromise]);
        foundProduct = products.find(p => String(p.barcode) === String(barcode));
        console.log(">>> SCANNER: Local search result:", foundProduct ? "FOUND" : "NOT FOUND");
      } catch (e) {
        console.warn('>>> SCANNER: Database search timed out or failed');
      }

      // 3. External API SECOND if not found locally
      if (!foundProduct) {
        console.log(">>> SCANNER: Searching external API...");
        const controller = new AbortController();
        const apiTimeoutId = setTimeout(() => controller.abort(), 4000);

        try {
          const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
            signal: controller.signal
          });
          clearTimeout(apiTimeoutId);

          if (response.ok) {
            const data = await response.json();
            if (data.status === 1 && data.product) {
              const p = data.product;
              console.log(">>> SCANNER: API found product:", p.product_name);
              apiData = {
                name: p.product_name || '',
                brand: p.brands || '',
                category: mapCategory(p.categories_tags?.[0]),
                image_url: p.image_url || '',
                barcode: barcode
              };
            }
          }
        } catch (e) {
          console.log('>>> SCANNER: External API skipped or timed out');
        }
      }
    } catch (error) {
      console.error('>>> SCANNER: Scan process error:', error);
    } finally {
      console.log(">>> SCANNER: Finalizing search state...");
      // 4. FINAL STATE UPDATE
      setExistingProduct(foundProduct);
      setFetchedProductData(apiData);
      setIsSearching(false);
      console.log(">>> SCANNER: Search finished. isSearching set to false.");
    }
  };

  const mapCategory = (cat) => {
    if (!cat) return 'other';
    const c = cat.toLowerCase();
    if (c.includes('beverage')) return 'beverages';
    if (c.includes('dairy')) return 'dairy';
    if (c.includes('snack')) return 'snacks';
    if (c.includes('frozen')) return 'frozen';
    if (c.includes('meat')) return 'meat';
    return 'food';
  };

  if (scanning) {
    return (
      <BarcodeScanner 
        onScan={handleBarcodeScan}
        onClose={() => navigate('/')}
      />
    );
  }

  // Error Boundary Fallback
  if (renderError) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <Package className="w-10 h-10 text-red-500" />
        </div>
        <h2 className="text-2xl font-bold text-slate-800 mb-2">Something went wrong</h2>
        <p className="text-slate-600 mb-8">We couldn't load the product form. Please try again.</p>
        <Button onClick={() => window.location.reload()} className="bg-emerald-500 hover:bg-emerald-600 text-white px-8 h-12 rounded-xl">
          Reload App
        </Button>
      </div>
    );
  }

  // Simplified rendering logic to prevent white screen
  console.log(">>> SCANNER: Rendering UI. State:", { scanning, isSearching, hasExisting: !!existingProduct, hasFetched: !!fetchedProductData });

  return (
    <div className="min-h-screen bg-slate-50 relative">
      {/* Header always visible */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 sticky top-0 z-[60]">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => setScanning(true)} className="rounded-xl">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="font-semibold text-slate-800">
              {isSearching ? 'Searching...' : (existingProduct ? 'Add Price' : 'New Product')}
            </h1>
            <p className="text-xs text-slate-500">Barcode: {scannedBarcode || '---'}</p>
          </div>
        </div>
      </div>

      <div className="p-4 max-w-lg mx-auto pb-32">
        {isSearching && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
            <p className="text-slate-600 font-medium">Searching product...</p>
            <p className="text-xs text-slate-400 mt-2">Checking database and online sources</p>
          </div>
        )}

        {!isSearching && scannedBarcode && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {existingProduct ? (
              <div className="bg-white rounded-3xl p-5 border border-emerald-100 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-800">{existingProduct.name}</h2>
                    <p className="text-sm text-slate-500">{existingProduct.brand}</p>
                  </div>
                </div>
                <PriceEntryForm 
                  onSubmit={(data) => createPriceEntryMutation.mutate(data)}
                  isLoading={createPriceEntryMutation.isPending}
                  existingStores={stores || []}
                />
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-emerald-50 rounded-2xl p-4 border border-emerald-100 flex items-start gap-3">
                  <Plus className="w-5 h-5 text-emerald-500" />
                  <p className="text-sm text-emerald-700 font-medium">New product! Be the first to share its price.</p>
                </div>
                <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm">
                  <CommunityProductForm 
                    barcode={scannedBarcode}
                    initialData={fetchedProductData || {}}
                    onSubmit={(data) => createCommunityEntryMutation.mutate(data)}
                    isLoading={createCommunityEntryMutation.isPending}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {!isSearching && !scannedBarcode && !scanning && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Package className="w-12 h-12 text-slate-300 mb-4" />
            <p className="text-slate-500">No barcode scanned yet.</p>
            <Button onClick={() => setScanning(true)} className="mt-4 bg-emerald-500 text-white">
              Open Scanner
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
