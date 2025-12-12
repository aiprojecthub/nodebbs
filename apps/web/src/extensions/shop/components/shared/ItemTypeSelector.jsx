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
    <Tabs value={value} onValueChange={onChange}>
      <TabsList className="grid w-full grid-cols-4">
        {options.map((option) => (
          <TabsTrigger key={option.value} value={option.value} className="gap-2">
            {option.value !== 'all' && <ItemTypeIcon type={option.value} className="h-4 w-4" />}
            {option.label}
          </TabsTrigger>
        ))}
      </TabsList>
      <TabsContent value={value}>
        {children}
      </TabsContent>
    </Tabs>
  );
}
