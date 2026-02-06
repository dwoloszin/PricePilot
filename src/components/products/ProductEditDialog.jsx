import React, { useState, useEffect } from 'react';
import { Edit, Save, X, Package } from 'lucide-react';
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
import { CameraCapture } from '@/components/ui/camera-capture';
import { base44 } from '@/api/base44Client';

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

export function ProductEditDialog({ 
  product, 
  open, 
  onOpenChange, 
  onSave,
  currentUserId 
}) {
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    category: 'other',
    description: '',
    image_url: '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        brand: product.brand || '',
        category: product.category || 'other',
        description: product.description || '',
        image_url: product.image_url || '',
      });
    }
  }, [product]);

  const handleSave = async () => {
    if (!product) return;
    
    setIsSaving(true);
    try {
      const updatedProduct = await base44.entities.Product.update(
        product.id,
        formData,
        currentUserId
      );
      onSave?.(updatedProduct);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to update product:', error);
      alert('Failed to update product. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ 
        file, 
        compress: true 
      });
      setFormData(prev => ({ ...prev, image_url: file_url }));
    } catch (error) {
      console.error('Upload failed:', error);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleLike = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!product || !currentUserId) return;
    try {
      const updated = await base44.entities.Product.toggleLike(product.id, currentUserId);
      onSave?.(updated);
    } catch (error) {
      console.error('Failed to toggle like:', error);
    }
  };

  const handleDislike = async (e) => {
    if (e && e.stopPropagation) e.stopPropagation();
    if (!product || !currentUserId) return;
    try {
      const updated = await base44.entities.Product.toggleDislike(product.id, currentUserId);
      onSave?.(updated);
    } catch (error) {
      console.error('Failed to toggle dislike:', error);
    }
  };

  if (!product) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-screen overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="w-5 h-5 text-emerald-600" />
            Edit Product
          </DialogTitle>
          <DialogDescription>
            Update the information for this product.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto flex-1 px-2">
          {/* Creator and Like/Dislike */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
            <UserTag
              userId={product.created_by}
              userName={product.created_by_name}
              timestamp={product.created_date}
              action="created"
            />
            <LikeDislike
              likes={product.likes || []}
              dislikes={product.dislikes || []}
              currentUserId={currentUserId}
              onLike={handleLike}
              onDislike={handleDislike}
            />
          </div>

          {/* Edit History */}
          {product.edit_history && product.edit_history.length > 0 && (
            <EditHistory history={product.edit_history} />
          )}

          {/* Product Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Product Name *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Organic Whole Milk"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Brand</Label>
                <Input
                  value={formData.brand}
                  onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                  placeholder="e.g., Horizon"
                />
              </div>

              <div className="space-y-2">
                <Label>Category</Label>
                <Select 
                  value={formData.category} 
                  onValueChange={(v) => setFormData(prev => ({ ...prev, category: v }))}
                >
                  <SelectTrigger>
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
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Any details about this product..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label>Product Photo</Label>
              <CameraCapture
                onCapture={async (file) => {
                  setUploadingImage(true);
                  try {
                    const { file_url } = await base44.integrations.Core.UploadFile({ 
                      file, 
                      compress: true 
                    });
                    setFormData(prev => ({ ...prev, image_url: file_url }));
                  } catch (error) {
                    console.error('Upload failed:', error);
                  } finally {
                    setUploadingImage(false);
                  }
                }}
                onUpload={handleImageUpload}
                isUploading={uploadingImage}
              />
              
              <Input
                value={formData.image_url}
                onChange={(e) => setFormData(prev => ({ ...prev, image_url: e.target.value }))}
                placeholder="Or paste image URL"
              />
              
              {formData.image_url && (
                <div className="w-32 h-32 rounded-xl overflow-hidden bg-slate-100">
                  <img 
                    src={formData.image_url} 
                    alt="Preview" 
                    className="w-full h-full object-cover"
                    onError={(e) => e.target.style.display = 'none'}
                  />
                </div>
              )}
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
