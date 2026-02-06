import { useState } from 'react';
import { Package, Tag, FileText, Image, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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

export default function ProductRegistrationForm({ 
  barcode, 
  initialData = {}, 
  onSubmit, 
  isLoading 
}) {
  const [formData, setFormData] = useState({
    name: initialData.name || '',
    brand: initialData.brand || '',
    category: initialData.category || 'other',
    description: initialData.description || '',
    image_url: initialData.image_url || '',
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      barcode
    });
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Barcode Display */}
      <div className="bg-slate-100 rounded-xl p-4 text-center">
        <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Barcode</p>
        <p className="font-mono text-lg font-semibold text-slate-800">{barcode}</p>
      </div>

      {/* Product Name */}
      <div className="space-y-2">
        <Label className="text-slate-700 font-medium flex items-center gap-2">
          <Package className="w-4 h-4 text-emerald-600" />
          Product Name *
        </Label>
        <Input
          value={formData.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="e.g., Organic Whole Milk"
          className="bg-slate-50 border-slate-200 focus:bg-white h-12"
          required
        />
      </div>

      {/* Brand */}
      <div className="space-y-2">
        <Label className="text-slate-700 font-medium flex items-center gap-2">
          <Tag className="w-4 h-4 text-emerald-600" />
          Brand
        </Label>
        <Input
          value={formData.brand}
          onChange={(e) => updateField('brand', e.target.value)}
          placeholder="e.g., Horizon"
          className="bg-slate-50 border-slate-200 focus:bg-white h-12"
        />
      </div>

      {/* Category */}
      <div className="space-y-2">
        <Label className="text-slate-700 font-medium">Category</Label>
        <Select value={formData.category} onValueChange={(v) => updateField('category', v)}>
          <SelectTrigger className="bg-slate-50 border-slate-200 h-12">
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

      {/* Description */}
      <div className="space-y-2">
        <Label className="text-slate-700 font-medium flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-600" />
          Description / Notes
        </Label>
        <Textarea
          value={formData.description}
          onChange={(e) => updateField('description', e.target.value)}
          placeholder="Any additional details about this product..."
          className="bg-slate-50 border-slate-200 focus:bg-white resize-none"
          rows={3}
        />
      </div>

      {/* Image URL */}
      <div className="space-y-2">
        <Label className="text-slate-700 font-medium flex items-center gap-2">
          <Image className="w-4 h-4 text-emerald-600" />
          Image URL (optional)
        </Label>
        <Input
          value={formData.image_url}
          onChange={(e) => updateField('image_url', e.target.value)}
          placeholder="https://..."
          className="bg-slate-50 border-slate-200 focus:bg-white h-12"
        />
        {formData.image_url && (
          <div className="w-20 h-20 rounded-xl overflow-hidden bg-slate-100">
            <img 
              src={formData.image_url} 
              alt="Preview" 
              className="w-full h-full object-cover"
              onError={(e) => e.target.style.display = 'none'}
            />
          </div>
        )}
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={isLoading || !formData.name}
        className="w-full h-14 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-lg font-semibold rounded-2xl shadow-lg shadow-emerald-500/20"
      >
        {isLoading ? (
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
        ) : null}
        Register Product
      </Button>
    </form>
  );
}