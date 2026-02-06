import { ShoppingCart, Package, ChevronRight, DollarSign, Target, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

export default function ShoppingListCard({ list, estimatedTotal, onClick }) {
  const itemCount = list.items?.length || 0;
  const checkedCount = list.items?.filter(i => i.checked)?.length || 0;
  const progress = itemCount > 0 ? (checkedCount / itemCount) * 100 : 0;
  const budgetUsed = list.budget && estimatedTotal ? (estimatedTotal / list.budget) * 100 : 0;

  return (
    <div 
      onClick={onClick}
      className={cn(
        "bg-white rounded-2xl p-5 shadow-sm border transition-all duration-300 cursor-pointer group",
        list.is_active 
          ? "border-emerald-200 ring-2 ring-emerald-100" 
          : "border-slate-100 hover:border-slate-200 hover:shadow-md"
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-start gap-4">
          <div className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center",
            list.is_fast_list
              ? "bg-amber-500 shadow-lg shadow-amber-500/20"
              : list.is_active 
                ? "bg-gradient-to-br from-emerald-500 to-teal-500" 
                : "bg-slate-100"
          )}>
            {list.is_fast_list ? (
              <Zap className="w-6 h-6 text-white" />
            ) : (
              <ShoppingCart className={cn(
                "w-6 h-6",
                list.is_active ? "text-white" : "text-slate-400"
              )} />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-slate-800 group-hover:text-emerald-600 transition-colors">
                {list.name}
              </h3>
              {list.is_active && (
                <Badge className="bg-emerald-100 text-emerald-700 text-[10px]">
                  Active
                </Badge>
              )}
            </div>
            {list.description && (
              <p className="text-sm text-slate-500 mt-0.5">{list.description}</p>
            )}
            <div className="flex items-center gap-3 mt-2 text-sm text-slate-400">
              <span className="flex items-center gap-1">
                <Package className="w-3.5 h-3.5" />
                {itemCount} items
              </span>
              {estimatedTotal > 0 && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3.5 h-3.5" />
                  Est. ${estimatedTotal.toFixed(2)}
                </span>
              )}
            </div>
          </div>
        </div>
        <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all" />
      </div>

      {/* Progress Bar */}
      {itemCount > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">{checkedCount} of {itemCount} completed</span>
            <span className="font-medium text-emerald-600">{progress.toFixed(0)}%</span>
          </div>
          <Progress value={progress} className="h-2 bg-slate-100" />
        </div>
      )}

      {/* Budget Warning */}
      {list.budget && budgetUsed > 80 && (
        <div className={cn(
          "mt-3 flex items-center gap-2 px-3 py-2 rounded-lg text-xs",
          budgetUsed >= 100 
            ? "bg-rose-50 text-rose-600" 
            : "bg-amber-50 text-amber-600"
        )}>
          <Target className="w-3.5 h-3.5" />
          {budgetUsed >= 100 
            ? `Over budget by $${(estimatedTotal - list.budget).toFixed(2)}`
            : `${(100 - budgetUsed).toFixed(0)}% budget remaining`
          }
        </div>
      )}
    </div>
  );
}