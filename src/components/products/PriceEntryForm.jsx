import React, { useState, useEffect } from 'react';
import { Minus, Plus, MapPin, Store, DollarSign, StickyNote, Loader2, CheckCircle2, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

// Haversine formula to calculate distance between two points in km
function getDistance(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity;
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c; // Distance in km
  return d;
}

function deg2rad(deg) {
  return deg * (Math.PI / 180);
}

const storeTypes = [
  { value: 'supermarket', label: 'Supermarket' },
  { value: 'warehouse', label: 'Warehouse Club' },
  { value: 'local_market', label: 'Local Market' },
  { value: 'convenience', label: 'Convenience Store' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'online', label: 'Online Store' },
  { value: 'other', label: 'Other' },
];

export default function PriceEntryForm({ onSubmit, isLoading, existingStores = [] }) {
  const [price, setPrice] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [storeName, setStoreName] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [storeType, setStoreType] = useState('supermarket');
  const [notes, setNotes] = useState('');
  const [location, setLocation] = useState(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [searchRange, setSearchRange] = useState(1); // Default 1km

  useEffect(() => {
    getLocation();
  }, []);

  const getLocation = () => {
    setLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setLocationLoading(false);
        },
        (error) => {
          console.log('Location error:', error);
          setLocationLoading(false);
        }
      );
    } else {
      setLocationLoading(false);
    }
  };

  const normalizeStoreName = (name) => {
    if (!name) return "";
    return name.trim();
  };

  const handleSubmit = (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (!price || !storeName) return;

    onSubmit({
      price: parseFloat(price),
      quantity,
      store_name: storeName.trim(),
      store_address: storeAddress,
      store_type: storeType,
      latitude: location?.latitude,
      longitude: location?.longitude,
      notes,
      date_recorded: new Date().toISOString().split('T')[0]
    });
  };

  const total = price ? (parseFloat(price) * quantity).toFixed(2) : '0.00';

  const filteredStores = existingStores.filter(store => {
    if (!location || !store.latitude || !store.longitude) return true;
    const distance = getDistance(location.latitude, location.longitude, store.latitude, store.longitude);
    return distance <= searchRange;
  });

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <form id="price-entry-form" onSubmit={handleSubmit} className="space-y-6 pb-24 overflow-y-auto px-4 py-6 flex-1">
        {/* Price Input */}
        <div className="space-y-2">
          <Label className="text-slate-700 font-semibold flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-emerald-600" />
            Unit Price *
          </Label>
          <div className="relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-lg">$</span>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="0.00"
              className="pl-8 h-16 text-3xl font-bold bg-slate-50 border-slate-200 focus:bg-white rounded-2xl"
              required
            />
          </div>
        </div>

        {/* Quantity Controls */}
        <div className="space-y-3">
          <Label className="text-slate-700 font-semibold">Quantity</Label>
          <div className="flex items-center gap-4 bg-white p-2 rounded-2xl border border-slate-100 shadow-sm">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="h-12 w-12 rounded-xl bg-slate-50 hover:bg-slate-100"
            >
              <Minus className="w-5 h-5 text-slate-600" />
            </Button>
            <div className="flex-1 text-center">
              <span className="text-3xl font-black text-slate-800">{quantity}</span>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setQuantity(quantity + 1)}
              className="h-12 w-12 rounded-xl bg-slate-50 hover:bg-slate-100"
            >
              <Plus className="w-5 h-5 text-slate-600" />
            </Button>
          </div>
          <div className="flex justify-between items-center px-4 py-3 bg-emerald-50 rounded-2xl border border-emerald-100">
            <span className="text-emerald-700 font-medium">Total Amount:</span>
            <span className="text-emerald-700 font-black text-2xl">${total}</span>
          </div>
        </div>

        {/* Store Selection */}
        <div className="space-y-4 pt-2">
          <Label className="text-slate-700 font-semibold flex items-center gap-2">
            <Store className="w-4 h-4 text-emerald-600" />
            Store Details *
          </Label>
          
          {existingStores.length > 0 && (
            <div className="space-y-4">
              {location && (
                <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <div className="flex items-center justify-between">
                    <Label className="text-xs text-slate-500 font-medium uppercase tracking-wider flex items-center gap-2">
                      <Navigation className="w-3 h-3" />
                      Search Range: {searchRange}km
                    </Label>
                    <span className="text-xs font-bold text-emerald-600">{filteredStores.length} stores found</span>
                  </div>
                  <Slider
                    value={[searchRange]}
                    min={0.5}
                    max={20}
                    step={0.5}
                    onValueChange={(val) => setSearchRange(val[0])}
                    className="py-2"
                  />
                </div>
              )}

              <div className="space-y-2">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">
                  {location ? 'Nearby Stores' : 'Recent Stores'}
                </p>
                <Select onValueChange={(storeId) => {
                  const store = filteredStores.find(s => s.id === storeId);
                  if (store) {
                    setStoreName(store.name);
                    setStoreAddress(store.address || '');
                    setStoreType(store.type || store.store_type || 'supermarket');
                  }
                }}>
                  <SelectTrigger className="bg-slate-50 border-slate-200 h-12 rounded-xl">
                    <SelectValue placeholder={location ? "Select a nearby store..." : "Select a recent store..."} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredStores.length > 0 ? (
                      filteredStores.map((store) => (
                        <SelectItem key={store.id} value={store.id}>
                          {store.name}
                          {store.address && ` • ${store.address}`}
                        </SelectItem>
                      ))
                    ) : (
                      <div className="p-4 text-center text-sm text-slate-500">
                        No stores found in this range.
                      </div>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <Input
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="Enter store name"
              className="bg-slate-50 border-slate-200 h-12 rounded-xl focus:bg-white"
              required
            />

            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <Input
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                placeholder="Store address (optional)"
                className="pl-9 bg-slate-50 border-slate-200 h-12 rounded-xl focus:bg-white"
              />
            </div>

            <Select value={storeType} onValueChange={setStoreType}>
              <SelectTrigger className="bg-slate-50 border-slate-200 h-12 rounded-xl">
                <SelectValue placeholder="Store Type" />
              </SelectTrigger>
              <SelectContent>
                {storeTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Location Status */}
        <div className={cn(
          "flex items-center justify-between p-4 rounded-2xl border transition-all",
          location 
            ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
            : "bg-slate-50 border-slate-100 text-slate-400"
        )}>
          <div className="flex items-center gap-3">
            {locationLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : location ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <MapPin className="w-5 h-5" />
            )}
            <span className="text-sm font-semibold">
              {locationLoading ? 'Locating store...' : 
               location ? 'Location captured' : 'Location unavailable'}
            </span>
          </div>
          {!location && !locationLoading && (
            <Button 
              type="button" 
              variant="ghost" 
              size="sm" 
              onClick={getLocation}
              className="text-xs h-8 text-emerald-600 hover:bg-emerald-100"
            >
              Retry
            </Button>
          )}
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <Label className="text-slate-700 font-semibold flex items-center gap-2">
            <StickyNote className="w-4 h-4 text-emerald-600" />
            Notes
          </Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g., Clearance sale, promotion price..."
            className="bg-slate-50 border-slate-200 focus:bg-white resize-none rounded-xl"
            rows={2}
          />
        </div>
      </form>

      {/* Submit Button - Fixed at the bottom of the screen */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-100 z-[70]">
        <div className="max-w-lg mx-auto">
          <Button
            form="price-entry-form"
            type="submit"
            disabled={isLoading || !price || !storeName}
            className="w-full h-16 bg-emerald-500 hover:bg-emerald-600 text-white text-xl font-bold rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98]"
          >
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
            ) : (
              <CheckCircle2 className="w-6 h-6 mr-2" />
            )}
            Confirm Price Update
          </Button>
        </div>
      </div>
    </div>
  );
}
