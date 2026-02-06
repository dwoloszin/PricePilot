
import React, { useState } from 'react';
import { Plus, Save, X, AlertTriangle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

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

export function StoreAddDialog({ 
  open, 
  onOpenChange, 
  onSave,
  currentUserId,
  existingStores = []
}) {
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    type: 'supermarket',
    description: '',
    latitude: null,
    longitude: null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState(null);

  const normalizeName = (name) => name.toLowerCase().trim();

  const checkDuplicates = () => {
    const normalizedNewName = normalizeName(formData.name);
    
    // Check for same name
    const sameNameStore = existingStores.find(s => normalizeName(s.name) === normalizedNewName);
    if (sameNameStore) {
      return { type: 'name', store: sameNameStore };
    }

    // Check for nearby stores (within 100 meters)
    if (formData.latitude && formData.longitude) {
      const nearbyStore = existingStores.find(s => {
        if (s.latitude && s.longitude) {
          const distance = getDistance(formData.latitude, formData.longitude, s.latitude, s.longitude);
          return distance < 0.1; // 100 meters
        }
        return false;
      });
      if (nearbyStore) {
        return { type: 'location', store: nearbyStore };
      }
    }

    return null;
  };

  const handleSave = async (force = false) => {
    if (!formData.name) return;

    if (!force) {
      const duplicate = checkDuplicates();
      if (duplicate) {
        setDuplicateWarning(duplicate);
        return;
      }
    }
    
    setIsSaving(true);
    try {
      const newStore = await base44.entities.Store.create(
        formData,
        currentUserId
      );
      onSave?.(newStore);
      resetForm();
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to create store:', error);
      alert('Failed to create store. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      address: '',
      type: 'supermarket',
      description: '',
      latitude: null,
      longitude: null,
    });
    setDuplicateWarning(null);
  };

  return (
    <Dialog open={open} onOpenChange={(val) => {
      if (!val) resetForm();
      onOpenChange(val);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-600" />
            Add New Store
          </DialogTitle>
          <DialogDescription>
            Enter the details of the new store to add it to the system.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {duplicateWarning && (
            <Alert variant="destructive" className="bg-amber-50 border-amber-200 text-amber-800">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              <AlertTitle>Potential Duplicate Found</AlertTitle>
              <AlertDescription className="space-y-3">
                <p>
                  A store with {duplicateWarning.type === 'name' ? 'the same name' : 'a very similar location'} already exists: 
                  <strong> {duplicateWarning.store.name}</strong>
                  {duplicateWarning.store.address && ` (${duplicateWarning.store.address})`}.
                </p>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="border-amber-300 hover:bg-amber-100 text-amber-800"
                    onClick={() => setDuplicateWarning(null)}
                  >
                    Edit Details
                  </Button>
                  <Button 
                    size="sm" 
                    className="bg-amber-600 hover:bg-amber-700 text-white"
                    onClick={() => handleSave(true)}
                  >
                    Add Anyway
                  </Button>
                </div>
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Store Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Walmart Supercenter"
                required
              />
            </div>

            <div className="space-y-2">
              <Label>Address</Label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                placeholder="e.g., 123 Main St, City, State"
              />
            </div>

            <div className="space-y-2">
              <Label>Store Type</Label>
              <Select 
                value={formData.type} 
                onValueChange={(v) => setFormData(prev => ({ ...prev, type: v }))}
              >
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Any additional information about this store..."
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Latitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.latitude || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    latitude: e.target.value ? parseFloat(e.target.value) : null 
                  }))}
                  placeholder="e.g., 40.7128"
                />
              </div>

              <div className="space-y-2">
                <Label>Longitude</Label>
                <Input
                  type="number"
                  step="any"
                  value={formData.longitude || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    longitude: e.target.value ? parseFloat(e.target.value) : null 
                  }))}
                  placeholder="e.g., -74.0060"
                />
              </div>
            </div>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="text-xs"
              onClick={() => {
                if (navigator.geolocation) {
                  navigator.geolocation.getCurrentPosition((pos) => {
                    setFormData(prev => ({
                      ...prev,
                      latitude: pos.coords.latitude,
                      longitude: pos.coords.longitude
                    }));
                  });
                }
              }}
            >
              Use Current Location
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            <X className="w-4 h-4 mr-2" />
            Cancel
          </Button>
          <Button
            onClick={() => handleSave(false)}
            disabled={isSaving || !formData.name || !!duplicateWarning}
            className="bg-emerald-500 hover:bg-emerald-600"
          >
            {isSaving ? (
              <>
                <span className="animate-spin mr-2">⏳</span>
                Saving...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Add Store
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
