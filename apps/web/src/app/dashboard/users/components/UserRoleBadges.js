import { Badge } from '@/components/ui/badge';

function getRoleBadgeStyle(role) {
  if (role?.color) {
    return {
      backgroundColor: `${role.color}20`,
      color: role.color,
      borderColor: `${role.color}40`,
    };
  }
  return {};
}

export function UserRoleBadges({ user }) {
  const userRoleList = user.userRoles || [];

  if (userRoleList.length === 0) {
    return <span className="text-xs text-muted-foreground">无角色</span>;
  }

  return (
    <div className="flex items-center gap-1 flex-wrap">
      {userRoleList.slice(0, 3).map((role) => (
        <Badge
          key={role.id}
          variant="outline"
          className="text-xs"
          style={getRoleBadgeStyle(role)}
        >
          {role.name || role.slug}
        </Badge>
      ))}
      {userRoleList.length > 3 && (
        <Badge variant="secondary" className="text-xs">
          +{userRoleList.length - 3}
        </Badge>
      )}
      {user.isFounder && (
        <Badge variant="outline" className="text-xs">
          创始人
        </Badge>
      )}
    </div>
  );
}
