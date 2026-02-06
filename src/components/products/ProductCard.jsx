
import React from 'react';
import { Package, Tag, MapPin, TrendingDown, TrendingUp } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { LikeDislike } from '@/components/ui/like-dislike';
import { UserTag } from '@/components/ui/user-tag';
import { cn } from '@/lib/utils';

const categoryColors = {
  food: 'bg-orange-100 text-orange-700',
  beverages: 'bg-blue-100 text-blue-700',
  household: 'bg-purple-100 text-purple-700',
  personal_care: 'bg-pink-100 text-pink-700',
  baby: 'bg-rose-100 text-rose-700',
  pet: 'bg-amber-100 text-amber-700',
  health: 'bg-red-100 text-red-700',
  frozen: 'bg-cyan-100 text-cyan-700',
  dairy: 'bg-yellow-100 text-yellow-700',
  produce: 'bg-green-100 text-green-700',
  meat: 'bg-red-100 text-red-700',
  bakery: 'bg-amber-100 text-amber-700',
  snacks: 'bg-orange-100 text-orange-700',
  other: 'bg-slate-100 text-slate-700',
};

export default function ProductCard({ 
  product, 
  latestPrice, 
  priceChange, 
  onClick,
  currentUserId,
  onLike,
  onDislike
}) {
  return (
    <div 
      onClick={onClick}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md hover:border-slate-200 transition-all duration-300 cursor-pointer group flex flex-col h-full"
    >
      {/* Product Image */}
      <div className="w-full aspect-square rounded-t-2xl bg-slate-100 overflow-hidden flex-shrink-0">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Package className="w-12 h-12 text-slate-300" />
          </div>
        )}
      </div>

      {/* Product Info */}
      <div className="p-4 flex flex-col flex-1">
        {/* Name and Brand */}
        <div className="mb-2">
          <h3 className="font-semibold text-slate-800 line-clamp-2 group-hover:text-emerald-600 transition-colors">
            {product.name}
          </h3>
          {product.brand && (
            <p className="text-sm text-slate-500 line-clamp-1">{product.brand}</p>
          )}
        </div>

        {/* Price and Category */}
        <div className="mb-3 space-y-2">
          {latestPrice && (
            <div className="flex items-center justify-between">
              <p className="font-bold text-lg text-slate-800">${latestPrice.price?.toFixed(2)}</p>
              {priceChange !== undefined && priceChange !== 0 && (
                <div className={cn(
                  "flex items-center gap-1 text-xs font-semibold",
                  priceChange < 0 ? "text-emerald-600" : "text-red-500"
                )}>
                  {priceChange < 0 ? (
                    <TrendingDown className="w-3 h-3" />
                  ) : (
                    <TrendingUp className="w-3 h-3" />
                  )}
                  <span>{Math.abs(priceChange).toFixed(0)}%</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 flex-wrap">
            {product.category && (
              <Badge 
                variant="secondary" 
                className={cn("text-xs", categoryColors[product.category])}
              >
                {product.category.replace('_', ' ')}
              </Badge>
            )}
            {latestPrice?.store_name && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {latestPrice.store_name}
              </span>
            )}
          </div>
        </div>

        {/* User Tag - Under Product Picture */}
        <div className="mb-3 border-t border-slate-100 pt-3">
          <UserTag 
            userId={product.created_by}
            userName={product.created_by_name}
            timestamp={product.created_date}
            size="small"
          />
        </div>

        {/* Like/Dislike - More space */}
        <div className="mt-auto" onClick={(e) => e.stopPropagation()}>
          <LikeDislike
            likes={product.likes || []}
            dislikes={product.dislikes || []}
            currentUserId={currentUserId}
            onLike={() => onLike && onLike(product)}
            onDislike={() => onDislike && onDislike(product)}
            size="small"
          />
        </div>
      </div>
    </div>
  );
}
