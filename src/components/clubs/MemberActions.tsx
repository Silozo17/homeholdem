import { useState } from 'react';
import { MoreHorizontal, Crown, Shield, User, LogOut, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MemberActionsProps {
  memberId: string;
  memberUserId: string;
  memberName: string;
  memberRole: 'owner' | 'admin' | 'member';
  currentUserRole: 'owner' | 'admin' | 'member';
  currentUserId: string;
  clubId: string;
  onUpdate: () => void;
}

export function MemberActions({
  memberId,
  memberUserId,
  memberName,
  memberRole,
  currentUserRole,
  currentUserId,
  clubId,
  onUpdate,
}: MemberActionsProps) {
  const [removeDialogOpen, setRemoveDialogOpen] = useState(false);
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const isCurrentUser = memberUserId === currentUserId;
  const isOwner = currentUserRole === 'owner';
  const isAdminOrOwner = currentUserRole === 'owner' || currentUserRole === 'admin';
  const canManageRoles = isOwner && !isCurrentUser && memberRole !== 'owner';
  const canRemoveMember = isAdminOrOwner && !isCurrentUser && memberRole !== 'owner';
  const canLeave = isCurrentUser && memberRole !== 'owner';

  // Don't show menu if no actions available
  if (!canManageRoles && !canRemoveMember && !canLeave) {
    return null;
  }

  const handlePromoteToAdmin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('club_members')
        .update({ role: 'admin' })
        .eq('id', memberId);

      if (error) throw error;
      toast.success(`${memberName} promoted to Admin`);
      onUpdate();
    } catch (error) {
      toast.error('Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoteToMember = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('club_members')
        .update({ role: 'member' })
        .eq('id', memberId);

      if (error) throw error;
      toast.success(`${memberName} demoted to Member`);
      onUpdate();
    } catch (error) {
      toast.error('Failed to update role');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveMember = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('club_members')
        .delete()
        .eq('id', memberId);

      if (error) throw error;
      toast.success(`${memberName} removed from club`);
      setRemoveDialogOpen(false);
      onUpdate();
    } catch (error) {
      toast.error('Failed to remove member');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveClub = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from('club_members')
        .delete()
        .eq('club_id', clubId)
        .eq('user_id', currentUserId);

      if (error) throw error;
      toast.success('Left the club');
      // Navigate will happen in parent component
      onUpdate();
    } catch (error) {
      toast.error('Failed to leave club');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" disabled={loading}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          {/* Role Management - Owner only */}
          {canManageRoles && (
            <>
              {memberRole === 'member' ? (
                <DropdownMenuItem onClick={handlePromoteToAdmin}>
                  <Shield className="h-4 w-4 mr-2" />
                  Promote to Admin
                </DropdownMenuItem>
              ) : memberRole === 'admin' ? (
                <DropdownMenuItem onClick={handleDemoteToMember}>
                  <User className="h-4 w-4 mr-2" />
                  Demote to Member
                </DropdownMenuItem>
              ) : null}
            </>
          )}

          {/* Remove Member - Admin/Owner */}
          {canRemoveMember && (
            <>
              {canManageRoles && <DropdownMenuSeparator />}
              <DropdownMenuItem 
                onClick={() => setRemoveDialogOpen(true)}
                className="text-destructive focus:text-destructive"
              >
                <UserMinus className="h-4 w-4 mr-2" />
                Remove from Club
              </DropdownMenuItem>
            </>
          )}

          {/* Leave Club - Self */}
          {canLeave && (
            <DropdownMenuItem 
              onClick={() => setLeaveDialogOpen(true)}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="h-4 w-4 mr-2" />
              Leave Club
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Remove Member Confirmation */}
      <AlertDialog open={removeDialogOpen} onOpenChange={setRemoveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {memberName}?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove {memberName} from the club. They will need to rejoin using the invite code.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRemoveMember}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Leave Club Confirmation */}
      <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave Club?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to leave this club? You'll need an invite code to rejoin.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleLeaveClub}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? 'Leaving...' : 'Leave Club'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
