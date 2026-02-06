import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { 
  ArrowLeft,
  Plus,
  Trash2,
  MoreVertical,
  Edit2,
  Check,
  Star,
  Minus,
  Package,
  MapPin,
  ShoppingCart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function ShoppingListDetail() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  // For HashRouter, parameters are in the hash part of the URL
  const getListId = () => {
    const hash = window.location.hash;
    const searchPart = hash.split('?')[1];
    if (searchPart) {
      const params = new URLSearchParams(searchPart);
      return params.get('id');
    }
    // Fallback to standard search params
    return new URLSearchParams(window.location.search).get('id');
  };
  
  const listId = getListId();

  const [showAddProduct, setShowAddProduct] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBudget, setEditBudget] = useState('');

  const { data: list, isLoading: listLoading } = useQuery({
    queryKey: ['shopping-list', listId],
    queryFn: async () => {
      const lists = await base44.entities.ShoppingList.list();
      return lists.find(l => String(l.id) === String(listId));
    },
    enabled: !!listId
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: priceEntries = [] } = useQuery({
    queryKey: ['all-prices'],
    queryFn: () => base44.entities.PriceEntry.list()
  });

  const { data: allLists = [] } = useQuery({
    queryKey: ['shopping-lists'],
    queryFn: () => base44.entities.ShoppingList.list()
  });

  const updateListMutation = useMutation({
    mutationFn: (data) => base44.entities.ShoppingList.update(listId, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['shopping-list', listId]);
      queryClient.invalidateQueries(['shopping-lists']);
    }
  });

  const deleteListMutation = useMutation({
    mutationFn: () => base44.entities.ShoppingList.delete(listId),
    onSuccess: () => {
      queryClient.invalidateQueries(['shopping-lists']);
      navigate(createPageUrl('ShoppingLists'));
      toast.success('List deleted');
    }
  });

  const setActiveMutation = useMutation({
    mutationFn: async () => {
      // Deactivate all other lists
      for (const l of allLists) {
        if (l.id !== listId && l.is_active) {
          await base44.entities.ShoppingList.update(l.id, { is_active: false });
        }
      }
      // Activate this list
      return base44.entities.ShoppingList.update(listId, { is_active: true });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['shopping-lists']);
      queryClient.invalidateQueries(['shopping-list', listId]);
      toast.success('Set as active list');
    }
  });

  const getProductPrice = (productId, storeFilter = null) => {
    const productPrices = priceEntries.filter(p => 
      String(p.product_id) === String(productId) && (!storeFilter || p.store_name === storeFilter)
    );
    if (productPrices.length === 0) return null;
    return Math.min(...productPrices.map(p => p.price));
  };

  const getProductById = (productId) => products.find(p => String(p.id) === String(productId));

  // Calculate store totals
  const getStoreComparison = () => {
    const stores = {};
    
    list?.items?.forEach(item => {
      const productPrices = priceEntries.filter(p => String(p.product_id) === String(item.product_id));
      productPrices.forEach(price => {
        if (!stores[price.store_name]) {
          stores[price.store_name] = { 
            total: 0, 
            itemCount: 0, 
            address: price.store_address 
          };
        }
      });
    });

    Object.keys(stores).forEach(storeName => {
      list?.items?.forEach(item => {
        const storePrice = getProductPrice(item.product_id, storeName);
        if (storePrice) {
          stores[storeName].total += storePrice * (item.desired_quantity || 1);
          stores[storeName].itemCount++;
        }
      });
    });

    return Object.entries(stores)
      .filter(([, data]) => data.itemCount > 0)
      .sort((a, b) => a[1].total - b[1].total);
  };

  const handleToggleItem = (index) => {
    const newItems = [...(list.items || [])];
    newItems[index].checked = !newItems[index].checked;
    updateListMutation.mutate({ items: newItems });
  };

  const handleUpdateQuantity = (index, delta) => {
    const newItems = [...(list.items || [])];
    newItems[index].desired_quantity = Math.max(1, (newItems[index].desired_quantity || 1) + delta);
    updateListMutation.mutate({ items: newItems });
  };

  const handleRemoveItem = (index) => {
    const newItems = [...(list.items || [])];
    newItems.splice(index, 1);
    updateListMutation.mutate({ items: newItems });
    toast.success('Item removed');
  };

  const handleAddProduct = () => {
    if (!selectedProductId) return;
    const product = products.find(p => p.id === selectedProductId);
    const newItems = [...(list.items || [])];
    const existingIndex = newItems.findIndex(i => i.product_id === selectedProductId);
    
    if (existingIndex >= 0) {
      newItems[existingIndex].desired_quantity += quantity;
    } else {
      newItems.push({
        product_id: selectedProductId,
        product_name: product.name,
        desired_quantity: quantity,
        checked: false
      });
    }
    
    updateListMutation.mutate({ items: newItems });
    setShowAddProduct(false);
    setSelectedProductId('');
    setQuantity(1);
    toast.success('Product added to list');
  };

  const handleSaveEdit = () => {
    updateListMutation.mutate({
      name: editName,
      budget: editBudget ? parseFloat(editBudget) : null
    });
    setShowEdit(false);
    toast.success('List updated');
  };

  const openEditDialog = () => {
    setEditName(list.name);
    setEditBudget(list.budget?.toString() || '');
    setShowEdit(true);
  };

  const storeComparison = list ? getStoreComparison() : [];
  const totalItems = list?.items?.length || 0;
  const checkedItems = list?.items?.filter(i => i.checked)?.length || 0;
  const progress = totalItems > 0 ? (checkedItems / totalItems) * 100 : 0;
  const estimatedTotal = storeComparison[0]?.[1]?.total || 0;

  if (listLoading) {
    return (
      <div className="px-4 py-6 space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-32 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="px-4 py-20 text-center">
        <ShoppingCart className="w-16 h-16 mx-auto text-slate-300 mb-4" />
        <h2 className="text-xl font-semibold text-slate-800 mb-2">List Not Found</h2>
        <Link to={createPageUrl('ShoppingLists')}>
          <Button>Back to Lists</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="pb-6">
      {/* Header */}
      <div className="bg-white border-b border-slate-100 px-4 py-3 sticky top-16 z-10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon"
              onClick={() => navigate(createPageUrl('ShoppingLists'))}
              className="rounded-xl"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-semibold text-slate-800">{list.name}</h1>
                {list.is_active && (
                  <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                )}
              </div>
              <p className="text-xs text-slate-500">{totalItems} items</p>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-xl">
                <MoreVertical className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {!list.is_active && (
                <DropdownMenuItem onClick={() => setActiveMutation.mutate()}>
                  <Star className="w-4 h-4 mr-2" />
                  Set as Active
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={openEditDialog}>
                <Edit2 className="w-4 h-4 mr-2" />
                Edit List
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => deleteListMutation.mutate()}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete List
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="px-4 py-6 space-y-6">
        {/* Progress & Budget */}
        {totalItems > 0 && (
          <div className="bg-white rounded-2xl p-5 border border-slate-100">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-slate-500">Shopping Progress</span>
              <span className="font-semibold text-emerald-600">{progress.toFixed(0)}%</span>
            </div>
            <Progress value={progress} className="h-3 mb-4" />
            
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <div>
                <p className="text-xs text-slate-500">Estimated Total</p>
                <p className="text-2xl font-bold text-slate-800">${estimatedTotal.toFixed(2)}</p>
              </div>
              {list.budget && (
                <div className="text-right">
                  <p className="text-xs text-slate-500">Budget</p>
                  <p className={`text-lg font-semibold ${estimatedTotal > list.budget ? 'text-red-500' : 'text-emerald-600'}`}>
                    ${list.budget.toFixed(2)}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Store Comparison */}
        {storeComparison.length > 0 && (
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-800">Best Stores for This List</h3>
            <div className="space-y-2">
              {storeComparison.slice(0, 3).map(([storeName, data], idx) => (
                <div 
                  key={storeName}
                  className={`bg-white rounded-xl p-4 border ${idx === 0 ? 'border-emerald-200 ring-2 ring-emerald-100' : 'border-slate-100'}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {idx === 0 && (
                        <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center">
                          <Star className="w-4 h-4 text-emerald-600 fill-emerald-600" />
                        </div>
                      )}
                      <div>
                        <p className="font-semibold text-slate-800">{storeName}</p>
                        <p className="text-xs text-slate-400">{data.itemCount} items available</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold text-slate-800">${data.total.toFixed(2)}</p>
                      {idx > 0 && storeComparison[0] && (
                        <p className="text-xs text-red-500">
                          +${(data.total - storeComparison[0][1].total).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Items List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-800">Items</h3>
            <Button 
              onClick={() => setShowAddProduct(true)}
              size="sm"
              className="bg-emerald-500 hover:bg-emerald-600 rounded-xl"
            >
              <Plus className="w-4 h-4 mr-1" />
              Add
            </Button>
          </div>

          {list.items?.length > 0 ? (
            <div className="space-y-2">
              {list.items.map((item, idx) => {
                const product = getProductById(item.product_id);
                const price = getProductPrice(item.product_id);
                return (
                  <div 
                    key={idx}
                    className={`bg-white rounded-xl p-4 border transition-all ${item.checked ? 'border-emerald-200 bg-emerald-50/50' : 'border-slate-100'}`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={item.checked}
                        onCheckedChange={() => handleToggleItem(idx)}
                        className="h-6 w-6 rounded-full"
                      />
                      <div className="flex-1 min-w-0">
                        <Link 
                          to={`/ProductDetail?id=${item.product_id}`}
                        >
                          <p className={`font-medium ${item.checked ? 'line-through text-slate-400' : 'text-slate-800'}`}>
                            {item.product_name || product?.name || 'Unknown Product'}
                          </p>
                        </Link>
                        {price && (
                          <p className="text-sm text-slate-500">
                            ${price.toFixed(2)} each
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUpdateQuantity(idx, -1)}
                          className="h-8 w-8 rounded-full"
                        >
                          <Minus className="w-4 h-4" />
                        </Button>
                        <span className="w-8 text-center font-semibold">
                          {item.desired_quantity || 1}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleUpdateQuantity(idx, 1)}
                          className="h-8 w-8 rounded-full"
                        >
                          <Plus className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(idx)}
                          className="h-8 w-8 rounded-full text-slate-400 hover:text-red-500"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-8 border border-slate-100 text-center">
              <Package className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-slate-500 text-sm mb-4">No items in this list yet</p>
              <Button 
                onClick={() => setShowAddProduct(true)}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add First Item
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Add Product Dialog */}
      <Dialog open={showAddProduct} onOpenChange={setShowAddProduct}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Product to List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Select Product</Label>
              <Select value={selectedProductId} onValueChange={setSelectedProductId}>
                <SelectTrigger className="h-12">
                  <SelectValue placeholder="Choose a product..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name} {p.brand && `(${p.brand})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                >
                  <Minus className="w-4 h-4" />
                </Button>
                <span className="text-2xl font-bold w-12 text-center">{quantity}</span>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setQuantity(quantity + 1)}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddProduct(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddProduct}
              disabled={!selectedProductId}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              Add to List
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit List Dialog */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit List</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>List Name</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
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
                  value={editBudget}
                  onChange={(e) => setEditBudget(e.target.value)}
                  className="pl-8 h-12"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit}
              className="bg-emerald-500 hover:bg-emerald-600"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}