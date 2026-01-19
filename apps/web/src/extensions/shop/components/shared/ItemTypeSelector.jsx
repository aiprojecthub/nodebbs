import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ItemTypeIcon } from './ItemTypeIcon';
import { getItemTypeOptions } from '../../utils/itemTypes';

/**
 * Tabs for filtering by item type
 * @param {Object} props
 * @param {string} props.value - Current selected type
 * @param {Function} props.onChange - Callback when type changes
 * @param {boolean} props.showAll - Whether to show "all" tab
 * @param {React.ReactNode} props.children - Content to render in TabsContent
 */
export function ItemTypeSelector({ value, onChange, showAll = true, excludedTypes = [], children }) {
  const options = getItemTypeOptions(showAll).filter(
    option => !excludedTypes.includes(option.value)
  );

  return (
    <Tabs value={value} onValueChange={onChange} className="space-y-6">
      <div className="flex justify-center w-full">
        <TabsList className="h-auto w-full md:w-auto flex items-center justify-between md:justify-center rounded-full bg-background/60 backdrop-blur-xl border border-border/50 p-1 md:p-1.5">
          {options.map((option) => (
            <TabsTrigger 
              key={option.value} 
              value={option.value} 
              className="
                rounded-full 
                flex-1 md:flex-none
                px-1 md:px-6 
                py-2 
                text-xs md:text-sm font-medium transition duration-300
                data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-none
                data-[state=inactive]:text-muted-foreground data-[state=inactive]:hover:bg-muted/50
                flex items-center justify-center gap-1 md:gap-2
              "
            >
              <ItemTypeIcon 
                type={option.value} 
                className={`h-3.5 w-3.5 md:h-4 md:w-4 transition-transform duration-300 ${value === option.value ? 'scale-110' : 'opacity-70'}`} 
              />
              <span className="whitespace-nowrap">{option.label}</span>
            </TabsTrigger>
          ))}
        </TabsList>
      </div>
      <TabsContent value={value} className='mt-0 animate-in fade-in-50 slide-in-from-bottom-2 duration-500'>
        {children}
      </TabsContent>
    </Tabs>
  );
}
