
import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  ArrowLeft, 
  Zap, 
  Barcode, 
  Plus, 
  Trash2, 
  Loader2,
  Package,
  ChevronRight,
  ScanLine
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import BarcodeScanner from '@/components/scanner/BarcodeScanner';
import { useAuth } from '@/lib/AuthContext';
import { cn } from '@/lib/utils';

export default function FastList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const [scanning, setScanning] = useState(false);
  const [showInputModal, setShowInputModal] = useState(false);
  const [currentBarcode, setCurrentBarcode] = useState('');
  const [itemValue, setItemValue] = useState('');
  const [itemQuantity, setItemQuantity] = useState('1');
  
  const priceInputRef = useRef(null);

  // Fetch or initialize the singleton Fast List
  const { data: lists = [], isLoading: listsLoading } = useQuery({
    queryKey: ['shopping-lists', user?.id],
    queryFn: async () => {
      // Now the backend handles the filtering
      const allLists = await base44.entities.ShoppingList.list('-created_date', null, user?.id);
      return allLists;
    },
    enabled: !!user?.id
  });

  const fastList = lists.find(l => l.is_fast_list);

  const createFastListMutation = useMutation({
    mutationFn: async () => {
      // Delete existing fast lists first
      const existingFastLists = lists.filter(l => l.is_fast_list);
      for (const l of existingFastLists) {
        await base44.entities.ShoppingList.delete(l.id);
      }
      
      return base44.entities.ShoppingList.create({
        name: 'Fast List',
        is_fast_list: true,
        items: [],
        user_id: user?.id,
        is_active: false
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shopping-lists']);
    }
  });

  const updateFastListMutation = useMutation({
    mutationFn: (data) => base44.entities.ShoppingList.update(fastList.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['shopping-lists']);
    }
  });

  // Background enrichment effect
  useEffect(() => {
    if (fastList?.items) {
      const itemsToEnrich = fastList.items.filter(i => !i.is_enriched && i.barcode);
      
      if (itemsToEnrich.length > 0) {
        const enrichItems = async () => {
          let updated = false;
          const newItems = [...fastList.items];
          
          for (let i = 0; i < newItems.length; i++) {
            const item = newItems[i];
            if (!item.is_enriched && item.barcode) {
              try {
                // 1. Check local DB
                const products = await base44.entities.Product.list();
                const localProduct = products.find(p => String(p.barcode) === String(item.barcode));
                
                if (localProduct) {
                  newItems[i] = {
                    ...item,
                    product_name: localProduct.name,
                    image_url: localProduct.image_url,
                    is_enriched: true
                  };
                  updated = true;
                } else {
                  // 2. Check OpenFoodFacts
                  const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${item.barcode}.json`);
                  if (response.ok) {
                    const data = await response.json();
                    if (data.status === 1 && data.product) {
                      newItems[i] = {
                        ...item,
                        product_name: data.product.product_name || item.product_name,
                        image_url: data.product.image_url || item.image_url,
                        is_enriched: true
                      };
                      updated = true;
                    }
                  }
                }
              } catch (e) {
                console.error("Enrichment error:", e);
              }
            }
          }
          
          if (updated) {
            updateFastListMutation.mutate({ items: newItems });
          }
        };
        
        enrichItems();
      }
    }
  }, [fastList?.items]);

  // Effect to ensure a Fast List exists and is unique
  useEffect(() => {
    if (!listsLoading && user?.id) {
      const fastLists = lists.filter(l => l.is_fast_list);
      if (fastLists.length === 0 && !createFastListMutation.isPending) {
        createFastListMutation.mutate();
      } else if (fastLists.length > 1) {
        // Keep only the newest one
        const toDelete = fastLists.slice(1);
        toDelete.forEach(l => base44.entities.ShoppingList.delete(l.id));
        queryClient.invalidateQueries(['shopping-lists']);
      }
    }
  }, [listsLoading, lists, user?.id]);

  const handleBarcodeScan = (barcode) => {
    setCurrentBarcode(barcode);
    setScanning(false);
    
    // Check if item already exists in list
    const existingItem = fastList?.items?.find(i => i.barcode === barcode);
    if (existingItem) {
      setItemValue(existingItem.price.toString());
      setItemQuantity(existingItem.quantity.toString());
    } else {
      setItemValue('');
      setItemQuantity('1');
    }
    
    setShowInputModal(true);
    // Focus price input after modal opens
    setTimeout(() => priceInputRef.current?.focus(), 100);
  };

  const handleAddItem = () => {
    if (!itemValue || !itemQuantity) return;
    
    const price = parseFloat(itemValue);
    const quantity = parseInt(itemQuantity);
    
    const newItems = [...(fastList.items || [])];
    const existingIndex = newItems.findIndex(i => i.barcode === currentBarcode);
    
    if (existingIndex >= 0) {
      newItems[existingIndex] = {
        ...newItems[existingIndex],
        price,
        quantity
      };
    } else {
      newItems.push({
        barcode: currentBarcode,
        price,
        quantity,
        product_name: `Product ${currentBarcode.slice(-4)}`, // Temporary name
        added_at: new Date().toISOString()
      });
    }
    
    updateFastListMutation.mutate({ items: newItems });
    setShowInputModal(false);
    toast.success('Item added to Fast List');
  };

  const handleRemoveItem = (barcode) => {
    const newItems = fastList.items.filter(i => i.barcode !== barcode);
    updateFastListMutation.mutate({ items: newItems });
  };

  const cumulativeValue = fastList?.items?.reduce((sum, item) => sum + (item.price * item.quantity), 0) || 0;

  if (listsLoading || !fastList) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin mb-4" />
        <p className="text-slate-600">Initializing Fast List...</p>
      </div>
    );
  }

  if (scanning) {
    return (
      <BarcodeScanner 
        onScan={handleBarcodeScan}
        onClose={() => setScanning(false)}
      />
    );
  }

  return (
    <div className="pb-24">
      {/* Sticky Header with Cumulative Value */}
      <div className="bg-white border-b border-slate-100 px-4 py-4 sticky top-16 z-20 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h1 className="font-bold text-slate-800 text-lg">Fast List</h1>
          </div>
          <Button 
            variant="ghost" 
            size="sm" 
            className="text-red-500 hover:text-red-600 hover:bg-red-50"
            onClick={() => createFastListMutation.mutate()}
          >
            <Trash2 className="w-4 h-4 mr-1" />
            Clear List
          </Button>
        </div>
        
        <div className="bg-slate-900 rounded-2xl p-4 text-white flex items-center justify-between">
          <div>
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Total Amount</p>
            <p className="text-3xl font-bold">${cumulativeValue.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-400 text-xs font-medium uppercase tracking-wider">Items</p>
            <p className="text-xl font-semibold">{fastList.items?.length || 0}</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-6 space-y-4">
        {fastList.items?.length === 0 ? (
          <div className="bg-white rounded-3xl p-10 border border-dashed border-slate-200 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-amber-50 flex items-center justify-center">
              <Barcode className="w-8 h-8 text-amber-500" />
            </div>
            <h3 className="font-semibold text-slate-800 mb-2">List is Empty</h3>
            <p className="text-slate-500 text-sm mb-6">
              Start scanning items to see the total cost before you reach the checkout.
            </p>
            <Button 
              onClick={() => setScanning(true)}
              className="bg-emerald-500 hover:bg-emerald-600 rounded-xl h-12 px-6"
            >
              <ScanLine className="w-5 h-5 mr-2" />
              Scan First Item
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {[...(fastList.items || [])].reverse().map((item) => (
              <div 
                key={item.barcode}
                className="bg-white rounded-2xl p-4 border border-slate-100 flex items-center gap-4 shadow-sm"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0">
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="w-full h-full object-cover rounded-xl" />
                  ) : (
                    <Package className="w-6 h-6 text-slate-300" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-800 truncate">
                    {item.product_name || (item.is_enriched ? 'Unknown Product' : 'Loading...')}
                  </h4>
                  <p className="text-xs text-slate-400 font-mono">{item.barcode}</p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-sm font-bold text-emerald-600">${item.price.toFixed(2)}</span>
                    <span className="text-xs text-slate-400">× {item.quantity}</span>
                  </div>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <span className="font-bold text-slate-800">${(item.price * item.quantity).toFixed(2)}</span>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-slate-300 hover:text-red-500"
                    onClick={() => handleRemoveItem(item.barcode)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Floating Scan Button */}
      <div className="fixed bottom-24 left-0 right-0 px-4 z-30 pointer-events-none">
        <div className="max-w-lg mx-auto flex justify-center">
          <Button 
            onClick={() => setScanning(true)}
            className="h-16 w-16 rounded-full bg-emerald-500 hover:bg-emerald-600 shadow-xl shadow-emerald-500/40 pointer-events-auto"
          >
            <ScanLine className="w-8 h-8 text-white" />
          </Button>
        </div>
      </div>

      {/* Input Modal */}
      <Dialog open={showInputModal} onOpenChange={setShowInputModal}>
        <DialogContent className="sm:max-w-[425px] rounded-3xl p-0 overflow-hidden max-h-[90vh] flex flex-col">
          <DialogHeader className="p-6 pb-2">
            <DialogTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-500" />
              Item Details
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex-1 overflow-y-auto px-6 py-2 space-y-6">
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
              <p className="text-xs text-slate-400 font-medium uppercase mb-1">Scanned Barcode</p>
              <p className="font-mono font-bold text-slate-700">{currentBarcode}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  ref={priceInputRef}
                  value={itemValue}
                  onChange={(e) => setItemValue(e.target.value)}
                  placeholder="0.00"
                  className="h-14 text-xl font-bold rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  inputMode="numeric"
                  value={itemQuantity}
                  onChange={(e) => setItemQuantity(e.target.value)}
                  placeholder="1"
                  className="h-14 text-xl font-bold rounded-2xl"
                />
              </div>
            </div>
            {/* Spacer to ensure content is visible above keyboard on some devices */}
            <div className="h-4" />
          </div>

          <DialogFooter className="p-6 pt-2 flex-row gap-3 bg-white border-t border-slate-50">
            <Button 
              variant="outline" 
              onClick={() => setShowInputModal(false)}
              className="flex-1 h-12 rounded-xl"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddItem}
              disabled={!itemValue || !itemQuantity}
              className="flex-1 h-12 bg-emerald-500 hover:bg-emerald-600 rounded-xl"
            >
              Add to List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
