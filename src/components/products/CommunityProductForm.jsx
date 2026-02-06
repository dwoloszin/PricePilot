
import React, { useState, useEffect } from 'react';
import { 
  Package, 
  Tag, 
  FileText, 
  Image, 
  Loader2, 
  DollarSign,
  MapPin,
  Store,
  Navigation,
  Upload,
  User,
  Plus,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Slider } from '@/components/ui/slider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { CameraCapture } from '@/components/ui/camera-capture';
import { useAuth } from '@/lib/AuthContext';

const categories = [
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
  { value: 'other', label: 'Other' },
];

const storeTypes = [
  { value: 'supermarket', label: 'Supermarket' },
  { value: 'warehouse', label: 'Warehouse Club' },
  { value: 'local_market', label: 'Local Market' },
  { value: 'convenience', label: 'Convenience Store' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'online', label: 'Online' },
  { value: 'other', label: 'Other' },
];

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

export default function CommunityProductForm({ 
  barcode, 
  initialData = {}, 
  onSubmit, 
  isLoading 
}) {
  const { user } = useAuth();
  const [formData, setFormData] = useState({
    // Product info
    name: initialData?.name || '',
    brand: initialData?.brand || '',
    category: initialData?.category || 'other',
    description: initialData?.description || '',
    image_url: initialData?.image_url || '',
    // Price info
    price: '',
    quantity: 1,
    // Store info
    store_name: '',
    store_address: '',
    store_type: 'supermarket',
  });

  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({
        ...prev,
        name: initialData.name || prev.name,
        brand: initialData.brand || prev.brand,
        category: initialData.category || prev.category,
        description: initialData.description || prev.description,
        image_url: initialData.image_url || prev.image_url,
      }));
    }
  }, [initialData]);

  const [location, setLocation] = useState(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [searchRange, setSearchRange] = useState(1); // Default 1km

  const { data: existingStores = [] } = useQuery({
    queryKey: ['stores'],
    queryFn: () => base44.entities.Store.list().catch(() => [])
  });

  const filteredStores = existingStores.filter(store => {
    if (!location || !store.latitude || !store.longitude) return true;
    const distance = getDistance(location.latitude, location.longitude, store.latitude, store.longitude);
    return distance <= searchRange;
  });

  useEffect(() => {
    if (navigator.geolocation) {
      setGettingLocation(true);
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude
          });
          setGettingLocation(false);
        },
        (error) => {
          console.log('Location error:', error);
          setGettingLocation(false);
        },
        { timeout: 5000, enableHighAccuracy: false, maximumAge: 60000 }
      );
    }
  }, []);

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateField('image_url', file_url);
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleImageCapture = async (file) => {
    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateField('image_url', file_url);
    } catch (error) {
      console.error('Capture upload failed:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const normalizeStoreName = (name) => {
    if (!name) return "";
    return name.trim();
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      productData: {
        name: formData.name,
        brand: formData.brand,
        category: formData.category,
        description: formData.description,
        image_url: formData.image_url,
        barcode
      },
      priceData: {
        price: parseFloat(formData.price),
        quantity: formData.quantity,
        store_name: normalizeStoreName(formData.store_name),
        store_address: formData.store_address,
        store_type: formData.store_type,
        latitude: location?.latitude,
        longitude: location?.longitude,
        date_recorded: new Date().toISOString().split('T')[0]
      }
    });
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Community Notice */}
      <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-2xl p-4 border border-emerald-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center flex-shrink-0">
            <User className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-emerald-900 mb-1">
              Help Build Our Community Database
            </h3>
            <p className="text-sm text-emerald-700">
              You're adding a new product! Your contribution helps everyone save money.
            </p>
          </div>
        </div>
      </div>

      {/* Barcode */}
      <div className="bg-slate-100 rounded-xl p-4 text-center">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Barcode</p>
        <p className="font-mono text-lg font-semibold text-slate-800">{barcode}</p>
      </div>

      {/* Product Information Section */}
      <div className="space-y-4">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Package className="w-5 h-5 text-emerald-600" />
          Product Information
        </h3>

        <div className="space-y-2">
          <Label className="text-slate-700 font-medium">Product Name *</Label>
          <Input
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="e.g., Organic Whole Milk"
            className="bg-slate-50 border-slate-200 focus:bg-white h-12 rounded-xl"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-slate-700 font-medium">Brand</Label>
            <Input
              value={formData.brand}
              onChange={(e) => updateField('brand', e.target.value)}
              placeholder="e.g., Horizon"
              className="bg-slate-50 border-slate-200 h-12 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700 font-medium">Category</Label>
            <Select value={formData.category} onValueChange={(v) => updateField('category', v)}>
              <SelectTrigger className="bg-slate-50 border-slate-200 h-12 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {categories.map(cat => (
                  <SelectItem key={cat.value} value={cat.value}>
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-slate-700 font-medium">Description</Label>
          <Textarea
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            placeholder="Any details about this product..."
            className="bg-slate-50 border-slate-200 focus:bg-white resize-none rounded-xl"
            rows={2}
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-700 font-medium flex items-center gap-2">
            <Image className="w-4 h-4 text-emerald-600" />
            Product Photo
          </Label>
          
          <CameraCapture
            onCapture={handleImageCapture}
            onUpload={handleImageUpload}
            isUploading={uploadingImage}
          />
          
          {formData.image_url && (
            <div className="mt-2 w-32 h-32 rounded-2xl overflow-hidden bg-slate-100 border border-slate-200">
              <img 
                src={formData.image_url} 
                alt="Preview" 
                className="w-full h-full object-cover"
              />
            </div>
          )}
        </div>
      </div>

      {/* Price Information Section */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-emerald-600" />
          Initial Price
        </h3>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-slate-700 font-medium">Price *</Label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 font-semibold">$</span>
              <Input
                type="number"
                step="0.01"
                value={formData.price}
                onChange={(e) => updateField('price', e.target.value)}
                placeholder="0.00"
                className="bg-slate-50 border-slate-200 h-12 pl-8 rounded-xl"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-700 font-medium">Quantity</Label>
            <Input
              type="number"
              value={formData.quantity}
              onChange={(e) => updateField('quantity', parseInt(e.target.value) || 1)}
              className="bg-slate-50 border-slate-200 h-12 rounded-xl"
              min="1"
            />
          </div>
        </div>
      </div>

      {/* Store Information Section */}
      <div className="space-y-4 pt-4 border-t border-slate-200">
        <h3 className="font-semibold text-slate-800 flex items-center gap-2">
          <Store className="w-5 h-5 text-emerald-600" />
          Store Information
        </h3>

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
                  setFormData(prev => ({
                    ...prev,
                    store_name: store.name,
                    store_address: store.address || '',
                    store_type: store.type || store.store_type || 'supermarket'
                  }));
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

        <div className="space-y-2">
          <Label className="text-slate-700 font-medium">Store Name *</Label>
          <Input
            value={formData.store_name}
            onChange={(e) => updateField('store_name', e.target.value)}
            placeholder="e.g., Walmart"
            className="bg-slate-50 border-slate-200 h-12 rounded-xl"
            required
          />
        </div>

        <div className="space-y-2">
          <Label className="text-slate-700 font-medium">Store Address</Label>
          <div className="relative">
            <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              value={formData.store_address}
              onChange={(e) => updateField('store_address', e.target.value)}
              placeholder="e.g., 123 Main St"
              className="bg-slate-50 border-slate-200 h-12 pl-10 rounded-xl"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label className="text-slate-700 font-medium">Store Type</Label>
          <Select value={formData.store_type} onValueChange={(v) => updateField('store_type', v)}>
            <SelectTrigger className="bg-slate-50 border-slate-200 h-12 rounded-xl">
              <SelectValue />
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

      <Button
        type="submit"
        disabled={isLoading || uploadingImage}
        className="w-full h-14 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-2xl shadow-lg shadow-emerald-500/20"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
        ) : (
          <Plus className="w-5 h-5 mr-2" />
        )}
        Register Product & Price
      </Button>
    </form>
  );
}
