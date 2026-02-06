
import React, { useState, useEffect } from 'react';
import { Edit, Save, X, Store } from 'lucide-react';
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
import { EditHistory } from '@/components/ui/edit-history';
import { UserTag } from '@/components/ui/user-tag';
import { LikeDislike } from '@/components/ui/like-dislike';
import { base44 } from '@/api/base44Client';

const storeTypes = [
  { value: 'supermarket', label: 'Supermarket' },
  { value: 'warehouse', label: 'Warehouse Club' },
  { value: 'local_market', label: 'Local Market' },
  { value: 'convenience', label: 'Convenience Store' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'online', label: 'Online' },
  { value: 'other', label: 'Other' },
];

export function StoreEditDialog({ 
  store, 
  open, 
  onOpenChange, 
  onSave,
  currentUserId 
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

  useEffect(() => {
    if (store) {
      setFormData({
        name: store.name || '',
        address: store.address || '',
        type: store.type || 'supermarket',
        description: store.description || '',
        latitude: store.latitude || null,
        longitude: store.longitude || null,
      });
    }
  }, [store]);

  const handleSave = async () => {
    if (!store) return;
    
    setIsSaving(true);
    try {
      const updatedStore = await base44.entities.Store.update(
        store.id,
        formData,
        currentUserId
      );
      onSave?.(updatedStore);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update store:', error);
      alert('Failed to update store. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLike = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!store || !currentUserId) return;
    try {
      const updated = await base44.entities.Store.toggleLike(store.id, currentUserId);
      onSave?.(updated);
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const handleDislike = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!store || !currentUserId) return;
    try {
      const updated = await base44.entities.Store.toggleDislike(store.id, currentUserId);
      onSave?.(updated);
    } catch (error) {
      console.error('Failed to toggle dislike:', error);
    }
  };

  if (!store) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-screen overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-emerald-600" />
            Edit Store
          </DialogTitle>
          <DialogDescription>
            Update the information for this store.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto flex-1 px-2">
          {/* Creator and Like/Dislike */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <UserTag
              userId={store.created_by}
              userName={store.created_by_name}
              timestamp={store.created_date}
              action="created"
            />
            <LikeDislike
              likes={store.likes || []}
              dislikes={store.dislikes || []}
              currentUserId={currentUserId}
              onLike={handleLike}
              onDislike={handleDislike}
            />
          </div>

          {/* Edit History */}
          {store.edit_history && store.edit_history.length > 0 && (
            <EditHistory history={store.edit_history} />
          )}

          {/* Store Form */}
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
            onClick={handleSave}
            disabled={isSaving || !formData.name}
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
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
