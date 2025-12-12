import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Loader2, Search } from 'lucide-react';
import { userApi } from '@/lib/api';
import { toast } from 'sonner';

/**
 * 带自动完成的用户搜索输入框
 * @param {Object} props
 * @param {Function} props.onSelectUser - 选择用户时的回调
 * @param {Object} props.selectedUser - 当前选择的用户对象
 */
export function UserSearchInput({ onSelectUser, selectedUser }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const data = await userApi.getList({ search: searchQuery, limit: 10 });
      setSearchResults(data.items || []);
    } catch (error) {
      console.error('搜索用户失败:', error);
      toast.error('搜索用户失败');
    } finally {
      setSearching(false);
    }
  };

  const handleSelectUser = (user) => {
    onSelectUser(user);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleClearUser = () => {
    onSelectUser(null);
  };

  return (
    <div className="space-y-2">
      <Label>选择用户</Label>
      {selectedUser ? (
        <div className="flex items-center justify-between p-3 border rounded-lg bg-muted">
          <span className="font-medium">{selectedUser.username}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearUser}
          >
            更换
          </Button>
        </div>
      ) : (
        <>
          <div className="flex gap-2">
            <Input
              placeholder="搜索用户名或邮箱"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
            <Button onClick={handleSearch} disabled={searching}>
              {searching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Search className="h-4 w-4" />
              )}
            </Button>
          </div>
          {searchResults.length > 0 && (
            <div className="border rounded-lg divide-y max-h-48 overflow-y-auto">
              {searchResults.map((user) => (
                <button
                  key={user.id}
                  className="w-full p-3 text-left hover:bg-muted transition-colors"
                  onClick={() => handleSelectUser(user)}
                >
                  <div className="font-medium">{user.username}</div>
                  <div className="text-sm text-muted-foreground">{user.email}</div>
                </button>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
